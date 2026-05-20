import RiskPredictor from './RiskPredictor';
import chatbotData from './chatbot_dataset.json';

class NLPBot {
    constructor() {
        this.lastContext = null;
        this.negativeWords = new Set([
            'pain', 'hurt', 'scared', 'fear', 'bad', 'worse', 'terrible', 'emergency', 'dying', 'sick', 'ill', 'stress', 'anxious', 'panic',
            'ألم', 'وجع', 'خائف', 'خوف', 'سيء', 'أسوأ', 'طوارئ', 'موت', 'مريض', 'مرض', 'توتر', 'قلق', 'مصاب'
        ]);
        
        this.intents = chatbotData.intents;

        this.stopWordsEn = new Set(["a", "an", "the", "and", "or", "but", "is", "are", "am", "it", "to", "for", "with", "my", "of", "in", "on", "what", "how", "do", "i", "me", "this", "that"]);
        this.stopWordsAr = new Set(["في", "من", "على", "إلى", "عن", "مع", "هل", "ما", "كيف", "و", "أو", "هو", "هي", "أنا", "يا"]);
        
        this.vocabulary = new Set();
        this.wordIDF = {};
        this.totalPatterns = 0;
        
        this.buildVocabulary();
        this.calculateIDF();
    }

    isArabic(word) {
        return /[\u0600-\u06FF]/.test(word);
    }

    buildVocabulary() {
        this.intents.forEach(intent => {
            const allPatterns = [...intent.patterns_en, ...intent.patterns_ar];
            allPatterns.forEach(pattern => {
                const words = pattern.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/);
                words.forEach(w => {
                    const stemmed = this.stem(w);
                    if (stemmed && !this.stopWordsEn.has(stemmed) && !this.stopWordsAr.has(stemmed)) {
                        this.vocabulary.add(stemmed);
                    }
                });
            });
        });
    }

    levenshtein(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        let matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));
        for (let i = 0; i <= a.length; i += 1) { matrix[i][0] = i; }
        for (let j = 0; j <= b.length; j += 1) { matrix[0][j] = j; }
        for (let i = 1; i <= a.length; i += 1) {
            for (let j = 1; j <= b.length; j += 1) {
                let cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1, 
                    matrix[i][j - 1] + 1, 
                    matrix[i - 1][j - 1] + cost 
                );
            }
        }
        return matrix[a.length][b.length];
    }

    correctTypo(word) {
        if (this.vocabulary.has(word)) return word;
        let closestWord = word;
        let minDistance = 3; 

        this.vocabulary.forEach(vWord => {
            const dist = this.levenshtein(word, vWord);
            if (dist < minDistance && Math.abs(word.length - vWord.length) <= 2) {
                minDistance = dist;
                closestWord = vWord;
            }
        });
        return closestWord;
    }

    stem(word) {
        if (this.isArabic(word)) return word; // not apply english stemming in Arabic text
        if (word.endsWith('ing') && word.length > 4) return word.replace(/ing$/, '');
        if (word.endsWith('es') && word.length > 4) return word.replace(/es$/, '');
        if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) return word.replace(/s$/, '');
        return word;
    }

    tokenizeAndCorrect(text) {
        const rawTokens = text.toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .split(/\s+/)
            .filter(word => word.length > 0 && !this.stopWordsEn.has(word) && !this.stopWordsAr.has(word))
            .map(word => this.stem(word));
        
        return rawTokens.map(word => this.correctTypo(word));
    }

    calculateIDF() {
        let dfMap = {};
        this.intents.forEach(intent => {
            const allPatterns = [...intent.patterns_en, ...intent.patterns_ar];
            allPatterns.forEach(pattern => {
                this.totalPatterns++;
                let uniqueTokens = new Set(this.tokenizeAndCorrect(pattern));
                uniqueTokens.forEach(token => {
                    dfMap[token] = (dfMap[token] || 0) + 1;
                });
            });
        });

        for (let token in dfMap) {
            this.wordIDF[token] = Math.log(this.totalPatterns / dfMap[token]);
        }
    }

    getTFIDFScore(inputTokens, patternText) {
        const patternTokens = this.tokenizeAndCorrect(patternText);
        let score = 0;
        
        inputTokens.forEach(token => {
            if (patternTokens.includes(token)) {
                score += (this.wordIDF[token] || 1); 
            }
        });
        return score;
    }

    analyzeSentiment(text) {
        let negativityScore = 0;
        const words = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/);
        words.forEach(w => {
            if (this.negativeWords.has(this.stem(w))) negativityScore++;
        });
        return negativityScore;
    }

    predictIntent(text) {
        const inputTokens = this.tokenizeAndCorrect(text);
        if (inputTokens.length === 0) return null;

        let bestMatch = { tag: null, score: 0 };

        this.intents.forEach(intent => {
            let maxPatternScore = 0;
            const allPatterns = [...intent.patterns_en, ...intent.patterns_ar];

            allPatterns.forEach(pattern => {
                const score = this.getTFIDFScore(inputTokens, pattern);
                if (score > maxPatternScore) {
                    maxPatternScore = score;
                }
            });

            if (maxPatternScore > bestMatch.score) {
                bestMatch = { tag: intent.tag, score: maxPatternScore };
            }
        });

        if (bestMatch.score > 0.3) {
            return bestMatch.tag;
        }
        return null;
    }

    handleFollowUp(lang) {
        if (lang === 'ar') {
            switch(this.lastContext) {
                case 'ask_heart_rate':
                    return "بشكل عام، من 60 إلى 100 نبضة يعتبر طبيعياً. إذا كنت مسترخياً فقد يكون أقل، وإذا كنت متوتراً فقد يكون أعلى.";
                case 'ask_spo2':
                    return "نسبة الأكسجين يجب أن تكون بين 95% و 100%. أي شيء أقل من 90% يتطلب رعاية طبية فورية.";
                case 'ask_blood_pressure':
                    return "الضغط الصحي يكون بين 90/60 و 120/80. إذا كان خارج هذا النطاق بشكل كبير فقد يشير لارتفاع أو انخفاض.";
                case 'ask_risk':
                    return "يتم حساب الخطر عبر نموذج GRU العميق، والذي يحلل نبضك، ونسبة الأكسجين، وحرارتك لحساب نسبة الخطر الفعلية.";
                default:
                    return "عذرًا، يبدو أنني فقدت مسار الموضوع. هل يمكنك إعادة سؤالك؟";
            }
        } else {
            switch(this.lastContext) {
                case 'ask_heart_rate':
                    return "Generally, between 60 and 100 BPM is considered normal. If you are very relaxed or athletic, it might be lower. If you're stressed or active, it will be higher.";
                case 'ask_spo2':
                    return "SpO2 should sit comfortably between 95% and 100%. Anything below 90% typically requires immediate medical attention as it indicates low oxygen in your blood.";
                case 'ask_blood_pressure':
                    return "A healthy bracket is 90/60 to 120/80. If yours is wildly outside this bracket, it may indicate hypertension (high) or hypotension (low).";
                case 'ask_risk':
                    return "Your risk is calculated via the GRU deep learning model, which analyzes a sequence of your vitals to generate a real-time risk percentage.";
                default:
                    return "I'm sorry, I seem to have lost track of our topic. Could you please ask your original question again?";
            }
        }
    }

    getRandomResponse(tag, lang) {
        if (tag === 'follow_up') {
            return this.handleFollowUp(lang);
        }

        const intent = this.intents.find(i => i.tag === tag);
        if (!intent) {
            return lang === 'ar' 
                ? "لست متأكداً كيف أجيب على هذا بعد! هل يمكنني مساعدتك بخصوص النبض، الضغط، أو نصائح طبية؟"
                : "I'm not exactly sure how to answer that yet! Can I help you analyze your blood pressure, heart rate, or maybe give some diet tips?";
        }
        
        if (tag !== 'greeting' && tag !== 'app_usage') {
            this.lastContext = tag;
        }
        
        const responsesArray = lang === 'ar' ? intent.responses_ar : intent.responses_en;
        const randomIndex = Math.floor(Math.random() * responsesArray.length);
        return responsesArray[randomIndex];
    }

    getResponse(inputText, liveData) {
        const lang = this.isArabic(inputText) ? 'ar' : 'en';
        
        const intentTag = this.predictIntent(inputText);
        
        const negativity = this.analyzeSentiment(inputText);
        let prefix = "";
        if (negativity >= 1 && intentTag !== 'first_aid') {
            prefix = lang === 'ar' ? "يبدو أنك تشعر بالضيق أو التعب. " : "It sounds like you might be distressed. ";
        }

        let responseText = this.getRandomResponse(intentTag, lang);

        if (responseText) {
             const mlPrediction = RiskPredictor.predict(liveData.bpm, liveData.spo2, liveData.sys, liveData.temp);
             
             let riskTranslated = mlPrediction.riskLabel;
             if (lang === 'ar') {
                 if (riskTranslated === 'Low Risk') riskTranslated = 'مخاطر منخفضة';
                 if (riskTranslated === 'Elevated Risk') riskTranslated = 'مخاطر مرتفعة';
                 if (riskTranslated === 'High Risk') riskTranslated = 'مخاطر عالية جدًا';
             }

             responseText = responseText.replace(/{bpm}/g, liveData.bpm)
                                        .replace(/{spo2}/g, liveData.spo2)
                                        .replace(/{sys}/g, liveData.sys)
                                        .replace(/{dia}/g, liveData.dia)
                                        .replace(/{temp}/g, liveData.temp)
                                        .replace(/{risk}/g, riskTranslated);
        }

        return prefix + responseText;
    }
}

export default new NLPBot();
