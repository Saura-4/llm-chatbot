from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserLogin, Token
from app.auth import hash_password,verify_password,create_access_token

router=APIRouter()

@router.post("/signup",response_model=Token)
def signup(user_data:UserCreate,db:Session=Depends(get_db)):
    existing_user=db.query(User).filter(User.email==user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_pw=hash_password(user_data.password)
    new_user=User(email=user_data.email,hashed_password=hashed_pw,)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token=create_access_token({"sub": new_user.email})
    return {"access_token":token,"token_type":"bearer"}

@router.post("/login",response_model=Token)
def login(user_data: UserLogin,db: Session= Depends(get_db)):
    user=db.query(User).filter(User.email==user_data.email).first()
    if not user or not verify_password(user_data.password,user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token= create_access_token({"sub":user.email})
    return {"access_token":token,"token_type":"bearer"}
    

    
    