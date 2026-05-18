from openai import OpenAI
from django.conf import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are CardioGo AI, a healthcare assistant.

Rules:
- Give general medical guidance only
- DO NOT diagnose diseases
- DO NOT give medication doses
- If symptoms are dangerous → tell user to go to hospital immediately
- Be simple, clear, and helpful
"""

def ask_ai(user_message, user, health_data=None, history=None):
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]

    # 🧠 Add patient context
    if user:
        messages.append({
            "role": "system",
            "content": f"Patient: Age {user.age}, Gender {user.gender}"
        })

    if health_data:
        messages.append({
            "role": "system",
            "content": f"""
Latest Health Data:
Heart Rate: {health_data.heart_rate}
SpO2: {health_data.sp02}
Temperature: {health_data.temperature}
"""
        })

    # 🧠 Add memory (last messages)
    if history:
        for msg in history:
            messages.append({
                "role": msg.sender,
                "content": msg.message
            })

    # 🧠 Add user question
    messages.append({
        "role": "user",
        "content": user_message
    })

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages
    )

    return response.choices[0].message.content