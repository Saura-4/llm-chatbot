from sqlalchemy import Column, Integer, String, DateTime, ForeignKey ,Text
from sqlalchemy.sql import func 
from sqlalchemy.orm import relationship
from app.database import Base
from enum import Enum
from sqlalchemy import Enum as SQLEnum

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class User(Base):
    __tablename__= "users"

    id=Column(Integer, primary_key=True,index=True)

    email=Column(String,unique=True,index=True,nullable=False)

    hashed_password=Column(String,nullable=False)

    created_at=Column(DateTime(timezone=True),server_default=func.now())

    conversations=relationship(
        "Conversation",
        back_populates="user",
        cascade="all,delete-orphan"
    )


class Conversation(Base):
    __tablename__="conversations"

    id=Column(Integer,primary_key=True,index=True)

    user_id=Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    title=Column(
        String,
        nullable=False
    )

    created_at=Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at=Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    user=relationship(
        "User",
        back_populates="conversations"
    )

    messages=relationship(
        "Message",
        back_populates="conversation",
        cascade="all,delete-orphan",
        order_by="Message.created_at"
    )

class Message(Base):
    __tablename__="messages" 

    id=Column(
        Integer,
        primary_key=True,
        index=True
    )

    conversation_id=Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False
    )

    role = Column(
        SQLEnum(MessageRole),
        nullable=False
    )
    content=Column(
        Text,
        nullable=False
    )

    created_at=Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    
    conversation=relationship(
        "Conversation",
        back_populates="messages"
    )