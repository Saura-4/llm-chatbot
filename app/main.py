from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth_routes, conversation_routes, chat_routes
from app.config import FRONTEND_ORIGINS

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


app.include_router(auth_routes.router , prefix="/auth", tags=["auth"])

@app.get("/hello")
def say_hello():
    return {"message":"hello"}

app.include_router(conversation_routes.router, tags=["conversations"])

app.include_router(chat_routes.router, tags=["chat"])

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "LLM Chatbot API",
        "docs": "/docs"
    }

@app.get("/healthz")
def health():
    return {"status": "healthy"}