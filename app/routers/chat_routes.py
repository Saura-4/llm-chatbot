from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user
from app.database import get_db
from app.crud import message as message_crud, conversation as conversation_crud
from app.llm_service import get_chat_response
from app.schemas import ChatRequest, ChatResponse, MessageOut
from app.models import User, MessageRole

router=APIRouter()

@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session=Depends(get_db),
    Current_user: User= Depends(get_current_user),
):
    conversation=conversation_crud.get_conversation_by_id(db,payload.conversation_id)

    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Conversation Not Found")
    if conversation.user_id != Current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your Conversation")

    user_message=message_crud.create_message(db,conversation.id,MessageRole.USER,payload.content)

    history=[
        {"role": message.role.value , "content": message.content}
        for message in conversation.messages
    ]
    try:
        reply_text=get_chat_response(history)

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": "Failed to get a response from the language model.",
                "user_message": MessageOut.model_validate(user_message).model_dump(),
            }
        )
        
    assistant_message=message_crud.create_message(db,conversation.id,MessageRole.ASSISTANT,reply_text)

    return ChatResponse(user_message=user_message, assistant_message=assistant_message)
