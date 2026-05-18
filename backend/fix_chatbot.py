import google.generativeai as genai

def fix_chatbot_model():
    try:
        genai.configure(api_key="AIzaSyCgyadeSdVgWvzbWk9Fk4WDLTTx9O98P8U")
        
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"FOUND WORKING MODEL: {m.name}")
                model = genai.GenerativeModel(m.name)
                response = model.generate_content("Testing.")
                print(f"TEST SUCCESS: {response.text}")
                return m.name
    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")

if __name__ == "__main__":
    fix_chatbot_model()
