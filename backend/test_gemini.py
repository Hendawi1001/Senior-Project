import google.generativeai as genai
import sys

def test_gemini():
    try:
        genai.configure(api_key="AIzaSyCgyadeSdVgWvzbWk9Fk4WDLTTx9O98P8U")
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Hello, this is a test.")
        print(f"SUCCESS: {response.text}")
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    test_gemini()
