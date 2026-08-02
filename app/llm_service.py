from groq import Groq
from app.config import GROQ_API_KEY, GROQ_MODEL
import re

client= Groq(api_key=GROQ_API_KEY)
THINK_PATTERN = re.compile(
    r"<think>.*?</think>\s*",
    flags=re.DOTALL,
)

def strip_thinking(text: str) -> str:
    if not text:
        return ""

    return THINK_PATTERN.sub("", text).strip()

def get_chat_response(messages: list[dict])->str:
    response=client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages
    )
    return strip_thinking(
    response.choices[0].message.content
)

def stream_chat_response(messages: list[dict]):
    """
    Yields small text pieces as Groq generates them, instead of
    returning one complete string. This is a blocking generator
    (no async/await) - it relies on the calling route being a plain
    `def` route, which FastAPI runs in a threadpool automatically.
    """
    stream=client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        stream=True,
    )
    for chunk in stream:
        delta=chunk.choices[0].delta.content

        if delta:
            yield delta