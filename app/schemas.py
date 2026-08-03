import re
from pydantic import BaseModel, field_validator
from datetime import datetime
from app.models import MessageRole

class UserCreate(BaseModel):
    email:str
    password:str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", v):
            raise ValueError("Invalid email address format.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character.")
        return v


class UserLogin(BaseModel):
    email:str
    password:str


class UserOut(BaseModel):
    id: int
    email:str
    created_at:datetime

    class Config:
        from_attributes=True


class Token(BaseModel):
    access_token:str
    token_type:str="bearer"


class ConversationCreate(BaseModel):
    title: str | None= None

class ConversationOut(BaseModel):
    id:int
    title:str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes=True

class MessageOut(BaseModel):
    id:int
    role:MessageRole
    content:str
    created_at:datetime

    class Config:
        from_attributes=True

class ConversationDetail(ConversationOut):
    messages: list[MessageOut]


class ConversationRename(BaseModel):
    title: str

    @field_validator("title")
    @classmethod
    def normalize_title(cls,value:str) ->str:
        value=" ".join(value.split())

        if not value:
            raise ValueError("Title cannot be empty.")

        return value


class MessageCreate(BaseModel):
    content:str

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Message cannot be empty.")

        return value

class ChatRequest(BaseModel):
    conversation_id: int 
    content: str

class ChatResponse(BaseModel):
    user_message: MessageOut
    assistant_message: MessageOut