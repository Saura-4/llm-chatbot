# LLM Chatbot Backend — Project Context

## Purpose
Build a production-grade LLM chatbot backend using FastAPI, PostgreSQL, SQLAlchemy, JWT authentication, Redis, Docker, Groq API, and Server-Sent Events (SSE). The project should be portfolio-quality on its own. 
---

# Learning approach

- Concepts come before implementation.
- Every topic should end with a complete mental model of **what is happening, why it is happening, and how the components interact** before writing code.
- Prefer understanding execution flow over memorizing APIs or syntax.
- Code should be typed manually rather than copy-pasted.
- Understanding always takes priority over speed.
- Learn through reasoning, prediction, and discussion before implementation.
- Cover related concepts when they improve long-term understanding, not only the minimum required to write the next function.
- Once a concept is mastered, build upon it rather than re-teaching it.
- Push back whenever implementation starts before the conceptual model is solid.
- Every important line of code should have a clear reason for existing.
- Code is shown once the mental model is solid — not withheld indefinitely — since exposure to real code patterns is still needed before writing them unaided. Code is then typed manually into the project to internalize it.

---

# Tech stack

- FastAPI
- SQLAlchemy
- PostgreSQL
- Redis
- JWT
- bcrypt
- PyJWT
- Groq API
- SSE Streaming
- Docker Compose

---

# Environment setup

- Windows host.
- Ubuntu VM (VirtualBox) runs Docker because Docker Desktop cannot be used due to Hyper-V conflicts.
- Project folder is shared between Windows and the VM.
- PostgreSQL and Redis run inside Docker.
- VirtualBox port forwarding exposes PostgreSQL and Redis to Windows.
- FastAPI runs inside a Windows virtual environment.
- Protected routes are tested using `curl.exe` from PowerShell.

---

# Progress

## Authentication

- [x] FastAPI application
- [x] SQLAlchemy setup
- [x] PostgreSQL connection
- [x] User model
- [x] User schemas
- [x] Signup
- [x] Login
- [x] JWT authentication
- [x] Password hashing
- [x] `get_current_user()`
- [x] `/auth/me`

## Conversation system

- [x] Conversation model
- [x] Message model
- [x] SQLAlchemy relationships
- [x] Alembic initialized
- [x] Alembic configured
- [x] Shared `DATABASE_URL`
- [x] First migration generated
- [x] Migration reviewed
- [x] Migration executed
- [x] Database schema updated successfully
- [x] Conversation schemas (`ConversationCreate`, `ConversationOut`, `MessageOut`, `ConversationDetail`)
- [x] `POST /conversations` (create)
- [x] `GET /conversations` (list, filter-based ownership)
- [x] `GET /conversations/{conversation_id}` (fetch-then-verify ownership, 404/403)
- [ ] `PATCH /conversations/{conversation_id}` (rename)
- [ ] `DELETE /conversations/{conversation_id}`
- [ ] Message persistence

---

# Next milestones

- [ ] Rename/delete conversation endpoints
- [ ] Message persistence
- [ ] Chat endpoint
- [ ] Groq integration
- [ ] SSE streaming
- [ ] Redis integration
- [ ] Docker deployment
- [ ] Optional RAG integration

---

# Concepts mastered (do not re-teach)

## Authentication

- JWT workflow
- Stateless authentication
- bcrypt hashing
- Password verification
- JWT claims
- HS256 vs RS256 (conceptually)
- Dependency Injection
- OAuth2PasswordBearer
- Pydantic validation
- SQLAlchemy CRUD workflow
- Why `get_current_user()` performs a DB lookup instead of trusting JWT claims alone (JWT signature = cryptographic validity only; DB lookup = current account state, revocation/deletion/suspension safety). Redis caching of this lookup is the standard optimization, not a redesign.

## SQLAlchemy

- ORM fundamentals
- Model definition
- Primary keys
- Foreign keys
- Relationships
- `relationship()`
- `back_populates`
- Lazy loading — confirmed with real code: accessing a relationship attribute (e.g. `conversation.messages`) is what silently triggers the underlying `SELECT`, not an explicit call.
- Cascades
- Database normalization
- `server_default`
- `func.now()`
- `onupdate`
- Enum columns
- Indexes as the mechanism that makes single-table, foreign-key-filtered queries fast at scale (B-tree lookup vs. full scan); why per-user tables would be an anti-pattern.
- `primary_key=True` on an `Integer` column maps to a Postgres `SERIAL`/`IDENTITY`, which auto-generates `id` at insert time — this is why `db.refresh()` is needed after `db.commit()`.
- N+1 query problem — named and understood conceptually (not yet hit in practice); relevant if relationships are lazy-loaded across a list rather than a single object.

## Pydantic / API schema design

- Schemas (Pydantic) vs. models (SQLAlchemy): schemas define the API boundary contract, models define storage.
- `from_attributes = True` — required because SQLAlchemy objects expose data as attributes, not dict keys; Pydantic does `getattr(obj, field_name)` per field.
- The link between a schema field and an ORM object is a **plain string name match** — e.g. `messages: list[MessageOut]` only works because the field is literally named `messages`, matching the `relationship()` attribute name exactly. The type (`MessageOut`) only governs the shape enforced on what's found, not where it's found. Renaming the field breaks it silently (`AttributeError` at request time, not caught by type checking).
- Schema inheritance (`class ConversationDetail(ConversationOut)`) used to give different endpoints different response sizes (list view vs. detail view) rather than always returning full nested data.
- Preferring a stricter type (e.g. `role: MessageRole` over `role: str`) when the underlying model already constrains the value, since `MessageRole(str, Enum)` still serializes identically to plain strings.

## FastAPI routing

- Three distinct parameter sources in one function signature, distinguished purely by declaration style: Pydantic model type → request body; `Depends(...)` → dependency injection; plain type matching a `{name}` in the path → path parameter.
- `response_model=` on the decorator is what triggers schema-based response conversion; the route function itself just returns the raw ORM object.
- Two ownership-check patterns: **filter-based** (bake `user_id = current_user.id` into the query itself — used for list endpoints) vs. **fetch-then-verify** (fetch by untrusted client-supplied ID first, then explicitly check existence (404) before ownership (403) — used for single-resource endpoints). Existence must be checked before ownership to avoid a crash on `None`.
- This fetch-then-verify pattern exists specifically to prevent IDOR (Insecure Direct Object Reference) vulnerabilities.

## Alembic

- Purpose of migrations
- Difference between models and database schema
- `Base.metadata`
- Alembic revision chain
- `alembic_version`
- `alembic init`
- `alembic.ini`
- `env.py`
- `target_metadata`
- Shared application configuration
- `revision --autogenerate`
- Reviewing autogenerated migrations
- `upgrade head`
- `downgrade()`
- Online vs Offline migrations
- Autogenerated migrations are drafts and should always be reviewed before execution.

## Chat architecture

- LLMs are stateless.
- Conversation history reconstructs context.
- Database acts as persistent memory.
- Every request rebuilds context before calling the LLM.
- RAG is an optional retrieval layer that can later augment the chatbot with external knowledge.

---

# Current database schema

## User

Fields

- id
- email
- hashed_password
- created_at

Relationships

- conversations

---

## Conversation

Fields

- id
- user_id
- title (`nullable=False`; defaulted to `"New Conversation"` in application code when the client omits it — see Decisions)
- created_at
- updated_at

Relationships

- user
- messages

---

## Message

Fields

- id
- conversation_id
- role (Enum)
- content
- created_at

Relationships

- conversation

---

# Decisions

- bcrypt instead of passlib.
- JWT helper functions remain framework-agnostic.
- Authentication dependency lives in `dependencies.py`.
- Conversation and Message are normalized relational entities.
- SQLAlchemy relationships are preferred over manual joins whenever navigating object graphs.
- PostgreSQL generates timestamps.
- SQLAlchemy Enum is used for message roles.
- Alembic manages every future schema change.
- `Conversation.title` stays `nullable=False` at the DB level; missing/empty client-supplied titles are defaulted to `"New Conversation"` in the route (`payload.title or "New Conversation"`) rather than relaxing the column — avoids a migration, mirrors how chat UIs show a placeholder title immediately.
- Conversation CRUD lives in its own `conversation_routes.py`, separate from `chat_routes.py`, which is reserved for the future Groq/SSE chat endpoint — keeps "manage conversations" and "talk to the LLM" as separate concerns.
- `MessageOut.role` is typed as `MessageRole` (not `str`) to match the model's actual constraint.

---

# Current file structure

```text
llm-chatbot-backend/
├── alembic/
│   ├── versions/
│   ├── env.py
│   └── alembic.ini
├── app/
│   ├── main.py
│   ├── database.py
│   ├── config.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── dependencies.py
│   ├── redis_client.py
│   └── routers/
│       ├── auth_routes.py
│       ├── chat_routes.py
│       └── conversation_routes.py
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env
```

---

# How I learn

- One major topic per session whenever practical.
- Concepts before implementation.
- Build a complete mental model before writing code.
- Understand **what**, **why**, and **how**, not just **what to type**.
- Prefer execution-flow diagrams when learning a new concept.
- Learn through prediction and reasoning before explanation.
- Manual typing over copy-paste.
- Small focused sessions with minimal context switching.
- Every important line should have a clear purpose.
- Once a concept is mastered, continue building on it rather than repeating it.
- Code is given once the mental model is solid, then typed manually — not withheld indefinitely, since real code exposure is part of building the ability to write it unaided.

---

# Next session

Implement rename (`PATCH`) and delete (`DELETE`) endpoints for conversations, then move to message persistence.

Suggested order:

1. `PATCH /conversations/{conversation_id}` (rename) — same fetch-then-verify pattern already covered
2. `DELETE /conversations/{conversation_id}`
3. Message persistence
4. Chat endpoint
5. Groq integration