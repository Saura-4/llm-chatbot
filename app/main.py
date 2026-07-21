from fastapi import FastAPI
from app.routers import auth_routes

app=FastAPI()

app.include_router(auth_routes.router , prefix="/auth", tags=["auth"])

@app.get("/hello")
def say_hello():
    return {"message":"hello"}