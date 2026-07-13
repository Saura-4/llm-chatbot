# LLM Chatbot Backend — Project Context
_(regenerated: 2026-07-13)_

## Purpose
An LLM chatbot backend, built with production-grade practices: FastAPI,
JWT auth, Postgres, Redis, Docker, and SSE streaming. Portfolio-worthy on
its own merits.

## Learning approach
- Concepts explained first, then code given to type manually (not copy-paste)
  into the editor — typing builds retention.
- Priority is understanding, not speed.
- Full request-flow mental model reinforced every session: request →
  validation gate → business logic → response. Not isolated code explanations.

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
- `bcrypt` used directly (not `passlib`) — see Decisions

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
- [x] `schemas.py` — UserCreate, UserLogin, UserOut, Token
- [x] `auth.py` — hash_password() / verify_password() (bcrypt direct)
- [ ] `auth.py` — JWT encode/decode functions — NEXT STEP
- [ ] `auth_routes.py` — signup/login endpoints
- [ ] `get_current_user` dependency (JWT verification via Depends())
- [ ] Conversation + Message models
- [ ] Chat endpoint with SSE streaming to Groq
- [ ] Redis rate limiting on chat endpoint
- [ ] `requirements.txt` filled in (packages installed ad-hoc so far)
- [ ] Dockerfile for the FastAPI app itself (currently only Postgres/Redis
      are Dockerized, not the app)

## Concepts mastered (checklist — don't re-teach, build on these)
- JWT structure (header.payload.signature) and stateless HMAC verification
- Why bcrypt over SHA-256 for passwords (deliberate slowness, work factor)
- FastAPI basics: path operations, Pydantic validation, Depends()
- Request anatomy: headers/body/auth, plaintext-over-TLS rationale
- Pydantic v2 strict-by-default typing (no silent int→str coercion)
- Extra request fields are silently dropped, not rejected (mass assignment defense)
- `from_attributes=True`: attribute-access (getattr) vs dict-access, for
  reading SQLAlchemy objects into Pydantic models
- bcrypt hash anatomy: `$2b$12$<22-char-salt><31-char-hash>`, packed by
  position, not merged mathematically
- verify_password mechanism: extract salt from stored hash → rehash
  candidate with that salt → string compare
- Division of responsibility: Pydantic validates shape/type only; business
  logic (wrong email/password, raising HTTPException) is the route
  function's own responsibility — nothing automatic

## Current file structure
````
llm-chatbot-backend/
├── app/
│   ├── __init__.py
│   ├── main.py             # bare FastAPI app so far
│   ├── config.py           # loads DATABASE_URL, SECRET_KEY from .env
│   ├── database.py         # engine, SessionLocal, Base, get_db()
│   ├── models.py           # User model only so far
│   ├── schemas.py          # UserCreate, UserLogin, UserOut, Token — DONE
│   ├── auth.py             # hash_password, verify_password — DONE
│   │                       # JWT encode/decode — NOT started, NEXT
│   ├── redis_client.py     # empty, not started
│   └── routers/
│       ├── __init__.py
│       ├── auth_routes.py  # empty, not started
│       └── chat_routes.py  # empty, not started
├── create_tables.py
├── requirements.txt         # not filled in yet, packages installed ad-hoc
├── docker-compose.yml       # postgres + redis services defined
├── Dockerfile               # empty, not started
├── .env                     # DATABASE_URL, SECRET_KEY (gitignored)
├── .env.example             # should be added, template for the above
└── .gitignore
````

## Decisions
- Using `bcrypt` directly instead of `passlib` — passlib has a known
  compatibility bug with bcrypt>=4.1 (`AttributeError: module 'bcrypt' has
  no attribute '__about__'`). Avoided rather than pinned.

## How I learn (standing preferences)
- Full request-flow mental model every time: request → validation gate →
  business logic → response. Not isolated code explanations.
- No sandbox/code execution without asking permission first — every chat.
- Type code manually, don't paste it in — want line-by-line understanding,
  not delegation.
- Session scope kept deliberately narrow per chat — better to fully
  understand one unit than rush through several shallowly.

## Next session's starting point
JWT issuing (encode/decode functions in `auth.py`) → wire up
`auth_routes.py` signup/login endpoints → `get_current_user` dependency.