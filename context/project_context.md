# LLM Chatbot Backend — Project Context

## Purpose
An LLM chatbot backend, built with production-grade practices: FastAPI, 
JWT auth, Postgres, Redis, Docker, and SSE streaming. Portfolio-worthy on 
its own merits.

## Learning approach
- Concepts explained first, then code given to type manually (not copy-paste)
  into the editor — typing builds retention.
- Priority is understanding, not speed.

## Tech stack
- FastAPI (Python)
- Postgres (via SQLAlchemy ORM)
- Redis (rate limiting / caching)
- JWT auth (multi-user, since this simulates a real deployed app with 
  multiple people using it)
- Groq API for the LLM itself (chosen over local Ollama — goal is backend 
  plumbing skill, not model hosting; Groq also forces practice with async 
  HTTP calls and re-streaming a stream)
- SSE for streaming chat responses token-by-token
- Docker Compose (Postgres + Redis containers)

## Environment setup (important, non-obvious)
- Developer uses Windows, but Docker Desktop doesn't work due to an 
  unresolved Hyper-V conflict (8+ hours already spent, not worth revisiting 
  now).
- Workaround: Ubuntu VM (VirtualBox) with Docker installed natively inside 
  it (no Hyper-V conflict on Linux).
- Project folder is a **VirtualBox shared folder**: 
  Windows `S:\project\RAG\llm-chatbot-backend` ↔ VM `~/work/RAG/llm-chatbot-backend`
- **Docker containers (Postgres, Redis) run inside the VM.**
- **Port forwarding** set up in VirtualBox (NAT adapter, ports 5432 and 6379 
  forwarded host→guest), so the app itself runs natively on **Windows** 
  (normal Windows venv, normal `uvicorn`), connecting to `localhost:5432` / 
  `localhost:6379` as if Postgres/Redis were local — forwarding makes this 
  transparent.
- Workflow: start VM → `cd ~/work/RAG/llm-chatbot-backend` → `docker compose 
  up -d` inside VM → then all actual coding/running of FastAPI happens from 
  Windows PowerShell as normal.
- A `venv_linux` was created once inside the VM for a native-install 
  experiment, then deleted — not needed since port forwarding solved it. 
  Ignore any references to it.

## Progress so far
- [x] FastAPI bare app running, `/hello` and `/docs` confirmed working
- [x] Postgres + Redis running via Docker Compose inside VM, reachable from 
      Windows via port forwarding
- [x] SQLAlchemy engine/session/Base set up (`app/database.py`)
- [x] `User` model created (`app/models.py`) — id, email, hashed_password, 
      created_at
- [x] Tables created and verified in Postgres (`users` table confirmed via psql)
- [x] Git repo initialized, `.gitignore` set up (excludes .env, venv, 
      venv_linux, __pycache__), pushed to GitHub: Saura-4/llm-chatbot
- [ ] Signup/login routes (bcrypt hashing + JWT issuing) — NEXT STEP
- [ ] `get_current_user` dependency (JWT verification via Depends())
- [ ] Conversation + Message models
- [ ] Chat endpoint with SSE streaming to Groq
- [ ] Redis rate limiting on chat endpoint
- [ ] Dockerfile for the FastAPI app itself (currently only Postgres/Redis 
      are Dockerized, not the app)

## Concepts already taught in depth (don't re-explain from scratch, just 
reference)
- JWT: header.payload.signature structure, why it's stateless, HMAC 
  signature verification (recompute-and-compare, not a database lookup), 
  password hashing with bcrypt (slow + salted, why not SHA-256)
- FastAPI basics: path operations/decorators, URL path parameters with type 
  validation, Pydantic models for request body validation, dependency 
  injection via Depends() (including chained dependencies)
- Request structure: method + path + headers (Authorization: Bearer 
  <token>) + body, and why passwords are sent as plaintext-over-TLS rather 
  than hashed client-side

## Current file structure
```
llm-chatbot-backend/
├── app/
│   ├── __init__.py
│   ├── main.py             # bare FastAPI app so far
│   ├── config.py           # loads DATABASE_URL, SECRET_KEY from .env
│   ├── database.py         # engine, SessionLocal, Base, get_db()
│   ├── models.py           # User model only so far
│   ├── schemas.py           # empty, not started
│   ├── auth.py              # empty, not started — NEXT
│   ├── redis_client.py      # empty, not started
│   └── routers/
│       ├── __init__.py
│       ├── auth_routes.py   # empty, not started
│       └── chat_routes.py   # empty, not started
├── create_tables.py
├── requirements.txt         # not filled in yet, packages installed ad-hoc
├── docker-compose.yml       # postgres + redis services defined
├── Dockerfile               # empty, not started
├── .env                     # DATABASE_URL, SECRET_KEY (gitignored)
├── .env.example             # should be added, template for the above
└── .gitignore
```