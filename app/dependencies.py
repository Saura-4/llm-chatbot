from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import decode_access_token
from app.models import User


oauth2_scheme=OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
)->User:
    credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    )
    try:
        email=decode_access_token(token).get("sub")
        
        if email is None:
            raise credentials_exception
        
    except ValueError:
            raise credentials_exception

    current_user=db.query(User).filter(User.email == email).first()

    if current_user is None:
        raise credentials_exception

    return current_user


