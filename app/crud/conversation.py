
from sqlalchemy.orm import Session

from app.models import Conversation 

def create_conversation(
        db:Session,
        current_user_id: int,
        title:str
):
    conversation=Conversation(
        user_id= current_user_id,
        title= title
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation

def get_conversation_by_id(
    db: Session,
    conversation_id: int
)->Conversation | None :
    return (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )

def delete_conversation(
        db:Session,
        conversation: Conversation
):
    db.delete(conversation)
    db.commit()

def rename_conversation(
        db: Session,
        conversation: Conversation,
        title: str
):
    conversation.title=title
    db.commit()
    db.refresh(conversation)


def list_conversations(
        db:Session,
        current_user_id: int
):
    return db.query(Conversation).filter(Conversation.user_id == current_user_id).all()
