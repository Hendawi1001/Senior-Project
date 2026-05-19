import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal, Alert, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import api from '../services/api';
import NLPBot from '../ml/NLPBot';
import RiskPredictor from '../ml/RiskPredictor';
import { LanguageContext } from '../context/LanguageContext';

const ChatbotScreen = ({ navigation }) => {
  const { t } = useContext(LanguageContext);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [profilePic, setProfilePic] = useState(null);

  // Live vitals state, fetched from the Django database
  const [liveVitals, setLiveVitals] = useState({
    bpm: 86,
    spo2: 98,
    sys: 120,
    dia: 80,
    temp: 36.6
  });

  const flatListRef = useRef(null);
  const textInputRef = useRef(null);

  // Fetch actual patient vitals and user profile on focus
  useFocusEffect(
    useCallback(() => {
      fetchLatestVitals();
      fetchUserProfile();
    }, [])
  );

  // Load chat history whenever liveVitals change to ensure greeting displays correct vitals
  useEffect(() => {
    loadChatHistory();
  }, [liveVitals]);

  const fetchUserProfile = async () => {
    try {
      const currentUsername = await AsyncStorage.getItem('current_username');
      if (currentUsername) {
        const savedAvatar = await AsyncStorage.getItem(`@cardio_avatar_${currentUsername}`);
        if (savedAvatar) {
          setProfilePic(savedAvatar);
        }
      }
    } catch (e) {
      console.log('Failed to load profile pic', e);
    }
  };

  const fetchLatestVitals = async () => {
    try {
      const response = await api.get('health/data/');
      if (response.data && response.data.length > 0) {
        const latest = response.data[0];
        setLiveVitals({
          bpm: latest.heart_rate || 86,
          spo2: latest.sp02 || 98,
          sys: latest.blood_pressure_sys || 120,
          dia: latest.blood_pressure_dia || 80,
          temp: latest.temperature || 36.6
        });
      }
    } catch (e) {
      console.log('Failed to fetch latest vitals from API, using defaults.', e);
    }
  };

  const loadChatHistory = async () => {
    try {
      const currentUsername = await AsyncStorage.getItem('current_username') || 'default_user';
      const historyKey = `@cardio_chat_history_${currentUsername}`;
      
      // Try to fetch from Django server first to sync with backend DB
      try {
        const response = await api.get('chat/');
        const savedHistory = await AsyncStorage.getItem(historyKey);
        const localMsgs = savedHistory ? JSON.parse(savedHistory) : [];

        if (response.data && response.data.length > 0) {
          const formatted = response.data.map((m, idx) => ({
            id: m.id ? m.id.toString() : (Date.now() + idx).toString(),
            sender: m.sender,
            message: m.message,
            timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now()
          }));
          setMessages(formatted);
          await AsyncStorage.setItem(historyKey, JSON.stringify(formatted));
          return;
        } else if (localMsgs.length > 0) {
          // CLOUD SYNC GAP: Local has chats but server has 0 chats!
          // Upload existing local offline messages to Django in the background
          const syncLocalToCloud = async () => {
            try {
              for (const msg of localMsgs) {
                if (msg.id === '1') continue; // Skip default welcome message
                await api.post('chat/', {
                  is_sync: true,
                  sender: msg.sender,
                  message: msg.message
                });
              }
              console.log("Successfully synced local chat logs to the server!");
            } catch (syncErr) {
              console.log("Background local-to-cloud sync failed", syncErr.message);
            }
          };
          syncLocalToCloud();
          setMessages(localMsgs);
          return;
        }
      } catch (apiErr) {
        console.log("Offline mode: falling back to local AsyncStorage for chat logs", apiErr.message);
      }

      const savedHistory = await AsyncStorage.getItem(historyKey);
      if (savedHistory) {
        setMessages(JSON.parse(savedHistory));
      } else {
        resetToDefaultGreeting(liveVitals);
      }
    } catch (e) {
      console.log('Failed to load chat history', e);
      resetToDefaultGreeting(liveVitals);
    }
  };

  const resetToDefaultGreeting = (vitals) => {
    const greetingText = `Hello! I've been monitoring your active vitals. Your heart rate is currently ${vitals.bpm} bpm and your SpO2 is ${vitals.spo2}%. Anything specific you'd like me to analyze for you?`;
    const defaultMsg = [{
      id: '1',
      sender: 'ai',
      message: greetingText,
      timestamp: Date.now()
    }];
    setMessages(defaultMsg);
    saveChatHistory(defaultMsg);
  };

  const saveChatHistory = async (newMessages) => {
    try {
      const currentUsername = await AsyncStorage.getItem('current_username') || 'default_user';
      const historyKey = `@cardio_chat_history_${currentUsername}`;
      await AsyncStorage.setItem(historyKey, JSON.stringify(newMessages));
    } catch (e) {
      console.log('Failed to save chat history', e);
    }
  };

  const sendMessage = async (textOverride = null) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsgId = Date.now().toString();
    const userMsg = { id: userMsgId, sender: 'user', message: textToSend, timestamp: Date.now() };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);

    if (!textOverride) setInputText('');

    // POST user message to Django in background to store in backend SQLite DB
    const postUserMsg = async () => {
      try {
        await api.post('chat/', { message: textToSend });
      } catch (e) {
        console.log("Offline: user message saved locally only", e.message);
      }
    };
    postUserMsg();

    setIsTyping(true);
    // Simulate thinking delay between 1.0 and 1.8 seconds
    const delay = Math.floor(Math.random() * 800) + 1000;

    setTimeout(() => {
      // Execute the offline rule-based NLP matcher passing live patient vitals
      const aiResponse = NLPBot.getResponse(textToSend, {
        bpm: liveVitals.bpm,
        spo2: liveVitals.spo2,
        sys: liveVitals.sys,
        dia: liveVitals.dia,
        temp: liveVitals.temp
      });

      setIsTyping(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg = {
        id: aiMsgId,
        sender: 'ai',
        message: aiResponse,
        timestamp: Date.now()
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
    }, delay);
  };

  const handleMicrophonePress = () => {
    textInputRef.current?.focus();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('Hint') || 'Voice Dictation Enabled',
      t('Please tap the microphone icon on your smartphone keyboard to speak directly into the chat!') || 'Please tap the microphone icon on your smartphone keyboard to speak directly into the chat!'
    );
  };

  const clearChat = () => {
    Alert.alert(
      t('Clear Chat') || 'Clear Chat',
      t('Are you sure you want to delete all messages?') || 'Are you sure you want to delete all messages?',
      [
        { text: t('Cancel') || 'Cancel', style: 'cancel' },
        { 
          text: t('Delete') || 'Delete', 
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const currentUsername = await AsyncStorage.getItem('current_username') || 'default_user';
            const historyKey = `@cardio_chat_history_${currentUsername}`;
            await AsyncStorage.removeItem(historyKey);
            resetToDefaultGreeting(liveVitals);
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
      {item.sender === 'ai' && (
        <View style={styles.aiAvatarWrapper}>
          <FontAwesome5 name="robot" size={14} color="#ff4b4b" />
        </View>
      )}
      <View style={[styles.messageBlock, item.sender === 'user' ? styles.userBlock : styles.aiBlock]}>
        {item.sender === 'ai' && item.message.includes(liveVitals.bpm.toString()) && liveVitals.bpm !== 86 ? (
          <View style={styles.vitalSnippet}>
            <Ionicons name="heart" size={16} color="#ff4b4b" />
            <Text style={styles.vitalSnippetVal}> {liveVitals.bpm} bpm </Text>
            <Text style={styles.vitalSnippetLabel}>- Live Vital</Text>
          </View>
        ) : null}
        <Text style={[styles.messageText, item.sender === 'user' ? styles.userText : styles.aiText]}>{item.message}</Text>
        <Text style={[styles.timeText, item.sender === 'user' ? { color: 'rgba(255,255,255,0.7)' } : null]}>
          {new Date(item.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {item.sender === 'user' && (
        <View style={styles.userAvatarWrapper}>
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={{ width: 30, height: 30, borderRadius: 15 }} />
          ) : (
            <Ionicons name="person" size={16} color="#fff" />
          )}
        </View>
      )}
    </View>
  );

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    return (
      <View style={[styles.messageBubble, styles.aiBubble]}>
        <View style={styles.aiAvatarWrapper}>
          <FontAwesome5 name="robot" size={14} color="#ff4b4b" />
        </View>
        <View style={[styles.messageBlock, styles.aiBlock, { paddingVertical: 12, paddingHorizontal: 20 }]}>
          <View style={styles.typingIndicatorRow}>
            <Text style={[styles.messageText, styles.aiText, { fontStyle: 'italic', color: '#888' }]}>CardioGo AI is thinking</Text>
            <ActivityIndicator size="small" color="#ff4b4b" style={{ marginLeft: 8 }} />
          </View>
        </View>
      </View>
    );
  };

  const filteredMessages = messages.filter(msg =>
    (msg.message || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4ba1ff', '#2d7df6']} style={styles.header}>
        {isSearching ? (
          <View style={styles.searchHeaderInner}>
            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TextInput
              style={styles.headerSearchInput}
              placeholder="Search messages..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        ) : (
          <>
            <View style={styles.headerIconGrp}>
              <View style={styles.headerAiAvatar}><FontAwesome5 name="robot" size={20} color="#ff4b4b" /></View>
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.headerTitle}>CardioGo AI</Text>
                <Text style={styles.headerStatus}>• Online & Offline Mode</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => setIsSearching(true)}>
                <Ionicons name="search" size={24} color="#fff" style={{ marginRight: 15 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuVisible(true)}>
                <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </LinearGradient>

      {/* Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuBox}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('Home'); }}>
              <Ionicons name="home-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>{t('home')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('Dashboard'); }}>
              <Ionicons name="stats-chart-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>{t('dashboard')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }}>
              <Ionicons name="person-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>{t('profile')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); clearChat(); }}>
              <Ionicons name="trash-outline" size={20} color="#ff4b4b" />
              <Text style={[styles.menuItemText, { color: '#ff4b4b' }]}>{t('Clear Chat') || 'Clear Chat'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <KeyboardAvoidingView style={styles.contentWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={searchQuery ? filteredMessages : messages}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          ListFooterComponent={searchQuery ? null : renderTypingIndicator}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => !searchQuery && flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => !searchQuery && flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.bottomArea}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptsRow}>
            <TouchableOpacity style={styles.promptBtn} onPress={() => sendMessage("Generate a 7-day health schedule for me")}>
              <Text style={styles.promptText}>🗓️ 7-Day Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.promptBtn} onPress={() => sendMessage("What are the risks of heart disease?")}>
              <Text style={styles.promptText}>🫀 Risk Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.promptBtn} onPress={() => sendMessage("Explain my latest health data")}>
              <Text style={styles.promptText}>💡 Data Insight</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.promptBtn} onPress={() => sendMessage("Give me 5 sleep tips")}>
              <Text style={styles.promptText}>🌙 Sleep Tips</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              ref={textInputRef}
              style={styles.inputBox}
              placeholder="Type your message..."
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage(null)}>
              <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 3, marginTop: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10
  },
  headerIconGrp: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerAiAvatar: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerStatus: {
    fontSize: 12,
    color: '#e6f0ff',
    marginTop: 2
  },
  headerActions: {
    flexDirection: 'row'
  },
  searchHeaderInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40
  },
  headerSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20
  },
  menuBox: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: 180,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20
  },
  menuItemText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500'
  },
  contentWrap: {
    flex: 1
  },
  chatList: {
    padding: 20,
    paddingBottom: 10
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end'
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  aiBubble: {
    justifyContent: 'flex-start',
  },
  aiAvatarWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1
  },
  userAvatarWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2b225e',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    overflow: 'hidden'
  },
  messageBlock: {
    maxWidth: '75%',
    padding: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1
  },
  userBlock: {
    backgroundColor: '#3282f6',
    borderBottomRightRadius: 5
  },
  aiBlock: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 5
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22
  },
  userText: {
    color: '#fff'
  },
  aiText: {
    color: '#333'
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.4)',
    alignSelf: 'flex-end',
    marginTop: 5
  },
  vitalSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0f0',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10
  },
  vitalSnippetVal: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#222'
  },
  vitalSnippetLabel: {
    fontSize: 12,
    color: '#888'
  },
  bottomArea: {
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 5
  },
  promptsRow: {
    paddingLeft: 15,
    marginBottom: 10
  },
  promptBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3282f6',
    marginRight: 10,
    backgroundColor: '#fff'
  },
  promptText: {
    color: '#3282f6',
    fontWeight: '600'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15
  },
  iconBtn: {
    padding: 10
  },
  inputBox: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    height: 45,
    borderRadius: 25,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#eee',
    color: '#333'
  },
  sendBtn: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#3282f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    shadowColor: '#3282f6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3
  },
  typingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center'
  }
});

export default ChatbotScreen;
