from groq import Groq
from app.config import GROQ_API_KEY, GROQ_MODEL

client= Groq(api_key=GROQ_API_KEY)

def get_chat_response(messages: list[dict])->str:
    response=client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages
    )
    return response.choices[0].message.content