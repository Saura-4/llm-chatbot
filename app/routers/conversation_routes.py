from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, MessageRole      
from app.schemas import ConversationCreate, ConversationDetail, ConversationOut, ConversationRename ,MessageCreate, MessageOut
from app.crud import conversation as conversation_crud, message as message_crud

router=APIRouter()

@router.post("/conversations",response_model=ConversationOut)
def create_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = conversation_crud.create_conversation(db,current_user.id,payload.title or "New Conversation")
    
    return conversation


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation_list=conversation_crud.list_conversations(db,current_user.id)
    return conversation_list


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
        conversation_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends( get_current_user),
):
    conversation=conversation_crud.get_conversation_by_id(db,conversation_id)

    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your conversation")

    return conversation

@router.patch("/conversations/{conversation_id}", response_model=ConversationOut)
def rename_conversation(
    conversation_id: int,
    payload: ConversationRename,
    db: Session =Depends(get_db),
    current_user: User= Depends(get_current_user),
):
    conversation =conversation_crud.get_conversation_by_id(db,conversation_id)

    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your conversation")

    if conversation.title == payload.title:
        return conversation 
    
    conversation_crud.rename_conversation(db,conversation,payload.title)

    return conversation

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id:int,
    db: Session= Depends(get_db),
    current_user: User= Depends(get_current_user),
):
    conversation=conversation_crud.get_conversation_by_id(db, conversation_id)

    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your conversation")

    conversation_crud.delete_conversation(db,conversation)

@router.post("/conversations/{conversation_id}/messages",response_model=MessageOut)
def create_message(
    payload: MessageCreate,
    conversation_id: int,
    db: Session=Depends(get_db),
    current_user: User=Depends(get_current_user),
):
    conversation=conversation_crud.get_conversation_by_id(db,conversation_id)

    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your conversation")

    message=message_crud.create_message(db,conversation_id,MessageRole.USER,payload.content)

    return message