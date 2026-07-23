# LLM Chatbot Backend — Project Context

## Purpose
An LLM chatbot backend, built with production-grade practices: FastAPI,
JWT auth, Postgres, Redis, Docker, and SSE streaming. Portfolio-worthy on
its own merits.

## Learning approach
- Concepts explained first, then code given to type manually (not copy-paste)
  into the editor — typing builds retention.
- Priority is understanding, not speed. Developer will explicitly push back
  if a session drifts toward code before he's built real familiarity with a
  new concept/API surface — treat this as a hard rule, not a preference to
  be balanced against pace.
- Full request-flow mental model reinforced every session: request →
  validation gate → business logic → response. Not isolated code explanations.
- Developer wants to learn broadly around a topic, not just the minimum
  needed to write the next function — it's fine to cover more than gets
  directly used in code, as long as it's genuinely related to the concept
  at hand (e.g. HS256 vs RS256, token storage tradeoffs were covered even
  though not implemented).

## Tech stack
- FastAPI (Python)
- Postgres (via SQLAlchemy ORM)
- Redis (rate limiting / caching — not wired up yet)
- JWT auth (multi-user, since this simulates a real deployed app with
  multiple people using it)
- Groq API for the LLM itself (chosen over local Ollama — goal is backend
  plumbing skill, not model hosting; Groq also forces practice with async
  HTTP calls and re-streaming a stream)
- SSE for streaming chat responses token-by-token
- Docker Compose (Postgres + Redis containers)
- `bcrypt` used directly (not `passlib`) — see Decisions
- `PyJWT` for JWT encode/decode (HS256)

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
- Testing protected routes is also done from Windows PowerShell via
  `curl.exe` (not `curl`, which is aliased to `Invoke-WebRequest` on
  PowerShell) — Swagger UI's Authorize popup for `OAuth2PasswordBearer`
  has no field to paste a raw token, only username/password/client
  fields, which don't match this app's JSON-body `/auth/login`.
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
- [x] `auth.py` — hash_password() / verify_password() (bcrypt direct, bug
      found and self-fixed: hashed_bytes was built from plain_bytes instead
      of the hashed_password argument)
- [x] `auth.py` — JWT encode/decode functions (create_access_token,
      decode_access_token — HS256, `sub` + `exp` claims)
- [x] `auth_routes.py` — signup/login endpoints, auto-login-on-signup
- [x] `main.py` — auth router mounted at `/auth` prefix
- [x] `requirements.txt` filled in with real pinned versions
- [x] Signup/login verified end-to-end via `/docs`: 200 signup, 400
      duplicate email, 200 login, 401 wrong password — all confirmed
      working against real Postgres
- [x] `app/dependencies.py` — `get_current_user()` dependency, built and
      tested end-to-end via curl: no-header → 401 (from `oauth2_scheme`
      itself), garbage token → 401 (`credentials_exception`), real token →
      200 with correct user
- [x] `GET /auth/me` — throwaway verification route added to
      `auth_routes.py`, confirmed the dependency works; can stay or be
      stripped later
- [ ] Conversation + Message models — **NEXT STEP**. A `Conversation`
      belongs to a `User` (FK), a `Message` belongs to a `Conversation`
      (role + content + ordering). No code written yet.
- [ ] Chat endpoint with SSE streaming to Groq
- [ ] Redis rate limiting on chat endpoint
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
- JWT encode: header + payload base64-encoded, HMAC-SHA256 signature
  computed over `header.payload` using SECRET_KEY, all three glued with dots
- JWT decode: signature recomputed server-side and compared (integrity
  check), THEN `exp` checked separately against current time (freshness
  check) — two independent checks, either can fail alone
- JWTs are signed, not encrypted — payload is plainly readable by anyone
  (base64), never put secrets/passwords in it
- `algorithms=[...]` on decode is a server-defined whitelist, preventing
  alg-tampering attacks (e.g. attacker setting `alg: none`) — decode never
  trusts the token's own `alg` header claim
- JWT revocation problem: no native way to invalidate a token before `exp`;
  real systems use a blacklist (Redis) or short expiry + refresh tokens
- Interview-level JWT scope: structure, signed-vs-encrypted, stateless
  tradeoff (can't revoke natively), HS256 vs RS256 at a conceptual level,
  client-side storage tradeoffs (XSS vs CSRF), access/refresh token pattern
- SQLAlchemy query pattern: `db.query(Model).filter(Column == value).first()`
  — `Column == value` builds a SQL condition object, not a Python bool
- `db.add()` → `db.commit()` → `db.refresh()` write pattern — refresh is
  needed to pull server-generated fields (id, created_at) back into the
  in-memory object
- `APIRouter()` + `app.include_router(prefix=...)` pattern for organizing
  routes by feature instead of one flat main.py
- Same error message/status for "no such email" and "wrong password" on
  login is deliberate — prevents email enumeration
- `OAuth2PasswordBearer`'s `tokenUrl` is Swagger-only convenience metadata
  (tells the Authorize popup where to send a login attempt) — never read
  during real request handling; token extraction only reads the
  `Authorization` header itself
- The `/docs` "Authorize" button only appears once at least one route
  actually depends on `oauth2_scheme` — FastAPI scans routes to build the
  OpenAPI security schema, it isn't triggered by the scheme merely existing
  in the codebase
- Dependency resolution order: `Depends(oauth2_scheme)` inside
  `get_current_user`'s signature must succeed before the function body
  runs — a missing `Authorization` header is rejected by `oauth2_scheme`
  itself (FastAPI's own 401), never reaching the function's own error
  handling
- `decode_access_token()` returns the payload dict, not a `User` — the
  `sub` claim (email) must be extracted and used for a separate DB lookup
  to get the actual `User` row
- Collapsing distinct internal failure reasons (invalid/expired token vs.
  user not found) into one identical 401 response is deliberate, same
  principle as login's identical error for bad email vs. bad password —
  prevents leaking which specific check failed

## Current file structure
````
llm-chatbot-backend/
├── app/
│ ├── init.py
│ ├── main.py # FastAPI app + auth router mounted at /auth
│ ├── config.py # loads DATABASE_URL, SECRET_KEY from .env
│ ├── database.py # engine, SessionLocal, Base, get_db()
│ ├── models.py # User model only so far
│ ├── schemas.py # UserCreate, UserLogin, UserOut, Token — DONE
│ ├── auth.py # hash_password, verify_password,
│ │ # create_access_token, decode_access_token — DONE
│ ├── dependencies.py # get_current_user (OAuth2PasswordBearer) — DONE
│ ├── redis_client.py # empty, not started
│ └── routers/
│ ├── init.py
│ ├── auth_routes.py # signup + login + /me — DONE, tested end-to-end
│ └── chat_routes.py # empty, not started
├── create_tables.py
├── requirements.txt # filled in with real pinned versions — DONE
├── docker-compose.yml # postgres + redis services defined
├── Dockerfile # empty, not started
├── .env # DATABASE_URL, SECRET_KEY (gitignored)
├── .env.example # template for the above
└── .gitignore
````

## Decisions
- Using `bcrypt` directly instead of `passlib` — passlib has a known
  compatibility bug with bcrypt>=4.1 (`AttributeError: module 'bcrypt' has
  no attribute '__about__'`). Avoided rather than pinned.
- Signup performs auto-login: returns a `Token` immediately (not just the
  created user) — deliberate choice over the alternative of signup-then-
  separate-login.
- `auth.py`'s JWT functions raise a plain `ValueError` on invalid/expired
  tokens rather than letting PyJWT's own exceptions propagate — keeps
  `auth.py` framework-agnostic; the HTTP-translation (401) belongs to
  whichever layer calls it (route or dependency), not to this module.
- `get_current_user` lives in a new `app/dependencies.py`, not inside
  `auth.py` — keeps `auth.py` free of any FastAPI imports (framework-
  agnostic), and gives future `Depends()`-based functions (e.g. an
  admin-only check) a dedicated home.
- `credentials_exception` (the collapsed 401) is defined once as a local
  variable at the top of `get_current_user`'s body, not at module level —
  its scope/purpose is entirely local to that one function.

## How I learn (standing preferences)
- Full request-flow mental model every time: request → validation gate →
  business logic → response. Not isolated code explanations.
- No sandbox/code execution without asking permission first — every chat.
- Type code manually, don't paste it in — want line-by-line understanding,
  not delegation.
- Session scope kept deliberately narrow per chat — better to fully
  understand one unit than rush through several shallowly.
- Learning should not be bounded by "only what this exact function needs" —
  genuinely related concepts (even ones not directly coded) are wanted.
  Move to code only once nothing else *relevant* is left to cover, not
  merely once the minimum viable understanding is reached.

## Next session's starting point
Design and build `Conversation` and `Message` SQLAlchemy models in
`models.py`: a `Conversation` belongs to a `User` (foreign key to
`users.id`), and a `Message` belongs to a `Conversation` (foreign key),
storing a role (user/assistant) and content, with ordering (created_at or
an explicit sequence). This is the schema the chat endpoint will read from
and write to — nothing here depends on Groq or SSE yet, it's pure data
modeling first.