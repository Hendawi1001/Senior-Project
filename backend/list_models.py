import google.generativeai as genai

def list_models():
    try:
        genai.configure(api_key="AIzaSyCgyadeSdVgWvzbWk9Fk4WDLTTx9O98P8U")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(m.name)
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    list_models()
