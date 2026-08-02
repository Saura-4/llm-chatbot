from fastapi import FastAPI
from app.routers import auth_routes, conversation_routes, chat_routes

app=FastAPI()

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