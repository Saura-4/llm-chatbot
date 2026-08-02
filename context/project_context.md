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
- Neon PostgreSQL
- Upstash Redis
- Render

---

# Environment setup

Development

- Windows host.
- Ubuntu VM (VirtualBox) runs Docker because Docker Desktop cannot be used due to Hyper-V conflicts.
- Project folder is shared between Windows and the VM.
- PostgreSQL and Redis run inside Docker.
- VirtualBox port forwarding exposes PostgreSQL and Redis to Windows.
- FastAPI runs inside a Windows virtual environment.
- Protected routes are tested using `curl.exe` from PowerShell or `Invoke-RestMethod`.

Production

- Backend deployed on Render.
- PostgreSQL migrated to Neon.
- Redis migrated to Upstash.
- Environment variables managed through Render.
- Database migrations managed with Alembic.

---

# Testing reference — PowerShell + curl.exe quoting

PowerShell's parser mangles `\"`-escaped JSON before `curl.exe` ever sees it, causing `json_invalid` errors even when the command looks correct. Two working formats:

**Standard pattern (single-quote the outer `-d` string):**
```powershell
curl.exe -X POST http://127.0.0.1:8000/some/endpoint `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -d '{\"field\": \"value\"}'
```

**Alternative (native PowerShell, no escaping issues at all):**
```powershell
$headers = @{ Authorization = "Bearer <token>" }
$body = @{ field = "value" } | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/some/endpoint" -Method Post -Headers $headers -ContentType "application/json" -Body $body
```

Standard pattern is what's actually in use; `Invoke-RestMethod` is the recommended long-term fix if the quoting keeps being friction.

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
- [x] `PATCH /conversations/{conversation_id}` (rename)
- [x] `DELETE /conversations/{conversation_id}`
- [x] Message persistence — `POST /conversations/{conversation_id}/messages`
- [x] `crud/` service layer introduced (`crud/conversation.py`, `crud/message.py`); all conversation + message routes refactored to delegate DB logic to it
- [x] End-to-end verification: create conversation → create message → fetch conversation → message appears in `messages[]`

---

# Next milestones

- [x] Chat endpoint (`POST /chat`)
- [x] Groq integration
- [x] SSE streaming
- [x] Redis integration (caching only — revocation/ban deferred)
- [x] Production deployment (Render)
- [x] Neon PostgreSQL deployment
- [x] Upstash Redis deployment
- [x] Initial Alembic migration created
- [x] Production database migrated
- [x] End-to-end production deployment verified
- [ ] Frontend (framework undecided)
- [ ] Deferred: `is_banned` column + migration, admin role, ban endpoint, JWT revocation list

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
- Lazy loading — confirmed with real code (twice now: conversation.messages in Session 8, and again end-to-end with a real inserted message in Session 10) — accessing a relationship attribute triggers the underlying `SELECT`, not an explicit call.
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
- Field-level normalization via `field_validator` is not one-size-fits-all — the correct normalization depends on the field's semantics, not just its type. `ConversationRename.title` collapses internal whitespace (a title is a single-line label; internal whitespace is noise). `MessageCreate.content` only trims leading/trailing whitespace (content can be intentionally multi-line/structured — e.g. code blocks — so internal whitespace is meaningful data, not noise).
- Server-derived fields should never be exposed as client-settable schema fields. `MessageCreate` deliberately has no `role` field — the server hardcodes it based on which endpoint was called, the same trust principle as deriving user identity from a validated JWT rather than a client-supplied field.

## FastAPI routing

- Three distinct parameter sources in one function signature, distinguished purely by declaration style: Pydantic model type → request body; `Depends(...)` → dependency injection; plain type matching a `{name}` in the path → path parameter.
- `response_model=` on the decorator is what triggers schema-based response conversion; the route function itself just returns the raw ORM object.
- Two ownership-check patterns: **filter-based** (bake `user_id = current_user.id` into the query itself — used for list endpoints) vs. **fetch-then-verify** (fetch by untrusted client-supplied ID first, then explicitly check existence (404) before ownership (403) — used for single-resource endpoints, and reused as-is for the message-creation endpoint). Existence must be checked before ownership to avoid a crash on `None`.
- This fetch-then-verify pattern exists specifically to prevent IDOR (Insecure Direct Object Reference) vulnerabilities.
- **Resource URLs vs. action URLs**: existing routes (`/conversations`, `/conversations/{id}/messages`) are nouns — they map to a row being created/fetched. An operation with no corresponding database table of its own (e.g. the future chat endpoint — there's no `Chat` table) is a verb, not a resource, and shouldn't be nested under a resource path it doesn't belong to (e.g. `/conversations/{id}/chat` looks RESTful but is a common anti-pattern). Comparable to `POST /auth/login` — an action endpoint, not a resource. Settled design: `POST /chat` with `conversation_id` in the request body.
- Frontend routing URLs (e.g. a webpage at `/chat/{id}` for displaying a conversation page) are a completely separate concept from backend API URLs (e.g. `POST /chat` as a server action) — same id, different layer, different job.

## Service / CRUD layer architecture

- Route functions should handle HTTP concerns only (auth, path params, status codes, exceptions); actual database operations belong in a separate layer.
- CRUD functions must stay "dumb" — no `HTTPException`, no knowledge of HTTP at all. They return the object or `None`; the **router** decides what HTTP status a missing/unauthorized result maps to. This keeps the CRUD layer reusable by any caller (a REST router today, the future chat endpoint tomorrow) regardless of what HTTP behavior that caller wants.
- Organized as `crud/conversation.py` and `crud/message.py` — one file per resource/model, mirroring the existing `routers/` and `models.py` organization — rather than one flat `crud.py`, since new resources (chat, later RAG) can each get their own file without restructuring.
- "Shared logic, not shared HTTP call": when the future chat endpoint needs to persist both a user message and an assistant reply, it calls `message_crud.create_message()` directly (twice, with different `role` values) — it does not make an internal HTTP request to `POST /conversations/{id}/messages`. Reusing logic across features means sharing the underlying function, not chaining API calls to yourself.
- CRUD functions should only take the minimal data they actually operate on (e.g. `conversation_id: int`, not the full `Conversation` object) — passing a whole object when only its `id` is used creates a false impression that more of the object is needed, and couples the function to how the caller obtained that object.
- Function-name collisions across route functions and CRUD functions are a non-issue in Python — different modules are different namespaces; calling through the module (`message_crud.create_message(...)`) disambiguates naturally, same mechanism as `datetime.date`.

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

## Caching / Redis

- Redis is a separate, independently-running process (own lifecycle, like Postgres) — used here purely for caching `get_current_user()`'s DB lookup.
- Cache entries are stored as JSON strings with a TTL (`setex`, 300s); reconstructed via `SimpleNamespace` on a hit to preserve dot-attribute access without a real ORM object.
- Caching is a bounded-staleness performance optimization, not a security mechanism — deliberately separate from (and in tension with) instant ban/revocation, which is deferred.

---

## Chat architecture

- LLMs are stateless.
- Conversation history reconstructs context.
- Database acts as persistent memory.
- Every request rebuilds context before calling the LLM.
- User messages are persisted independently of LLM generation; assistant messages exist only after successful generation.
- Conversation history is converted into the provider's message format before being sent to the LLM.
- Chat endpoints are action endpoints rather than resource endpoints because they execute an operation instead of directly representing a database resource.
- LLM integrations belong in a dedicated service layer, keeping routers responsible only for HTTP concerns.
- RAG is an optional retrieval layer that can later augment the chatbot with external knowledge.
- SSE (Server-Sent Events) keeps one HTTP response open, writing `data: ...\n\n` chunks as they're generated, instead of returning one final JSON blob.
- Streaming and blocking/concurrency are independent concerns — streaming changes when bytes reach the client; async/threading changes whether the server can serve other requests meanwhile.
- Plain `def` FastAPI routes run in a threadpool automatically, avoided needing manual thread handling for today's blocking Groq stream loop; `run_in_threadpool` remains the flagged upgrade path for a more correct async version.
- `response_model=` does not apply to routes returning a `Response` subclass (e.g. `StreamingResponse`) — those bypass FastAPI's serialization entirely.
- Assistant messages from a stream are accumulated in-memory and persisted once, after the generator completes — never per-chunk.
- Assistant reasoning blocks (`<think>...</think>`) are stripped inside `llm_service.py` before persistence and before the API response is returned, ensuring conversation history contains only user-visible responses.

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
- `MessageCreate` is content-only (no `role`, no `conversation_id`) — role is always server-set, `conversation_id` always comes from the URL path.
- The future chat endpoint is `POST /chat` (flat, action-style, `conversation_id` in body) — not nested under `/conversations/{id}/...` — since "run the LLM" is an operation, not a resource with its own table.
- Database logic extracted into a `crud/` layer (`crud/conversation.py`, `crud/message.py`); routers now only handle HTTP concerns (fetch-then-verify, status codes) and delegate all reads/writes to CRUD functions.
- Image/attachment support for messages explicitly deferred — `MessageCreate` intentionally stays text-only (`content: str`) for now.
- Groq integration uses the official Groq Python SDK rather than constructing raw HTTP requests.
- `GROQ_API_KEY` and `GROQ_MODEL` are loaded from `.env` through `config.py`.
- LLM communication is isolated in `llm_service.py`; routers orchestrate request flow but do not directly communicate with external APIs.
- `/chat` follows the sequence: authenticate → verify conversation → persist user message → rebuild history → call the LLM → persist assistant reply → return the response.
- If the LLM request fails, the user message remains persisted while no assistant message is created.
- `/chat/streams` (SSE) added alongside the original non-streaming `/chat`, which is left untouched — not a replacement.
- SSE errors mid-stream are sent as an in-band event, not an HTTP exception, since the response has already started and its status code can't change.
- `get_current_user()` checks Redis before Postgres; on a miss it queries Postgres and repopulates Redis with a 5-minute TTL.
- Ban/admin/revocation-list work (originally scoped alongside Redis) is explicitly deferred to a future session — caching was implemented alone today.
- Deployment target finalized: Render (FastAPI), Neon (PostgreSQL), and Upstash (Redis).
- Redis uses a single `REDIS_URL` connection string (`redis.from_url(...)`) instead of separate host/port/password variables.
- Initial Alembic migration was regenerated before the first production deployment to establish a clean migration history.
- Production deployments use Neon as the canonical database.
- Assistant reasoning (`<think>...</think>`) is removed in the backend (`llm_service.py`) before persistence instead of being filtered in the frontend.

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
│   ├── config.py            # DATABASE_URL, REDIS_URL, GROQ settings
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── dependencies.py      # now Redis-cache-aware
│   ├── redis_client.py      # uses redis.from_url(REDIS_URL)
│   ├── llm_service.py       # now includes stream_chat_response()
│   ├── crud/
│   │   ├── conversation.py
│   │   └── message.py
│   └── routers/
│       ├── auth_routes.py
│       ├── chat_routes.py   # now includes /chat/streams (SSE)
│       └── conversation_routes.py
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env                      # DATABASE_URL (Neon), REDIS_URL (Upstash), GROQ settings
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
Frontend development — authentication flow, conversation sidebar, chat interface, and integration with the deployed backend.