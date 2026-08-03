from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth_routes, conversation_routes, chat_routes
from app.config import FRONTEND_ORIGINS

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
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