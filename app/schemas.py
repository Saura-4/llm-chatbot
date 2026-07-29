from pydantic import BaseModel, field_validator
from datetime import datetime
from app.models import MessageRole

class UserCreate(BaseModel):
    email:str
    password:str


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