from sqlalchemy.orm import Session

from app.models import  Message, MessageRole      



def create_message(
        db: Session,
        conversation_id: int,
        role: MessageRole,
        content: str
        
):
    message=Message(
            conversation_id=conversation_id,
            role= role,
            content=content
        )
    db.add(message)
    db.commit()
    db.refresh(message)

    return message
    