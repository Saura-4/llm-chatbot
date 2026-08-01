from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user
from app.database import get_db
from app.crud import message as message_crud, conversation as conversation_crud
from app.llm_service import get_chat_response, stream_chat_response
from app.schemas import ChatRequest, ChatResponse, MessageOut
from app.models import User, MessageRole

import json
from fastapi.responses import StreamingResponse


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


@router.post("/chat/streams")
def chat_stream(
    payload: ChatRequest,
    db: Session=Depends(get_db),
    current_user: User= Depends(get_current_user),

):
    conversation=conversation_crud.get_conversation_by_id(db,payload.conversation_id)

    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation Not Found")
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your Conversation")

    user_message= message_crud.create_message(db,conversation.id,MessageRole.USER,payload.content)

    history=[
        {"role":message.role.value, "content": message.content}
        for message in conversation.messages
    ]

    def event_generator():
        full_reply=""
        try:
            for piece in stream_chat_response(history):
                full_reply += piece
                yield f"data: {json.dumps({'content': piece})}\n\n"
        except Exception:
            yield f"data: {json.dumps({'error': 'Failed to get a response from the language model.'})}\n\n"
            return 

        message_crud.create_message(db,conversation.id,MessageRole.ASSISTANT,full_reply)
        yield "event: done\ndata: {}\n\n"
        
    return StreamingResponse(event_generator(), media_type="text/event-stream")