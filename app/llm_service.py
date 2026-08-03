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

    text = THINK_PATTERN.sub("", text)
    if "<think>" in text:
        text = text.split("<think>")[0]

    return text.strip()

def get_chat_response(messages: list[dict])->str:
    response=client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages
    )
    return strip_thinking(
    response.choices[0].message.content
)

def generate_title(user_message: str) -> str:
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "Generate a short, concise 3-5 word title for the conversation based on this first message. Do not include quotes, periods, or extra punctuation."},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3,
            max_tokens=15,
        )
        title = strip_thinking(response.choices[0].message.content).strip('"\' .\n')
        return title if title else "New Conversation"
    except Exception:
        return "New Conversation"

def stream_chat_response(messages: list[dict]):
    """
    Yields small text pieces as Groq generates them, instead of
    returning one complete string. This is a blocking generator
    (no async/await) - it relies on the calling route being a plain
    `def` route, which FastAPI runs in a threadpool automatically.
    """
    stream = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        stream=True,
    )
    
    in_think = False
    buffer = ""
    
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if not delta:
            continue
            
        buffer += delta
        
        while True:
            if in_think:
                if "</think>" in buffer:
                    _, post = buffer.split("</think>", 1)
                    buffer = post.lstrip() # remove leading spaces/newlines after </think>
                    in_think = False
                else:
                    # Prevent unbounded memory growth while inside <think>
                    if len(buffer) > 10:
                        buffer = buffer[-10:]
                    break
            else:
                if "<think>" in buffer:
                    pre, post = buffer.split("<think>", 1)
                    if pre:
                        yield pre
                    buffer = post
                    in_think = True
                else:
                    # Check if we might be in the middle of receiving a "<think>" tag
                    partial = False
                    for i in range(len(buffer)):
                        if buffer[i] == '<':
                            if "<think>".startswith(buffer[i:]):
                                partial = True
                                if i > 0:
                                    yield buffer[:i]
                                    buffer = buffer[i:]
                                break
                    if not partial:
                        yield buffer
                        buffer = ""
                    break

    if not in_think and buffer:
        yield buffer