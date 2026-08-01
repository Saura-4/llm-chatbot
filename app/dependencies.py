from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from types import SimpleNamespace
import json

from app.database import get_db
from app.auth import decode_access_token
from app.models import User
from app.redis_client import redis_client


oauth2_scheme=OAuth2PasswordBearer(tokenUrl="/auth/login")

USER_CACHE_TTL_SECONDS=300

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

    cache_key = f"user:{email}"
    cached = redis_client.get(cache_key)

    if cached:
        return SimpleNamespace(**json.loads(cached))

    print("DB hit")
    current_user=db.query(User).filter(User.email == email).first()

    if current_user is None:
        raise credentials_exception

    user_data= {
        "id": current_user.id,
        "email":current_user.email,
        "created_at": current_user.created_at.isoformat(),
    }

    redis_client.setex( cache_key, USER_CACHE_TTL_SECONDS, json.dumps(user_data))

    return current_user


