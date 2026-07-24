# Session Log

## Session 1: Environment Setup + Core Concepts

**Date:** 2026-07-13
**Scope in:** Project scoping, dev environment setup, DB/model foundation, git init.
**Scope deferred:** Auth routes, JWT issuing.

**Concepts covered (explained, not yet comprehension-checked):**
- JWT structure and verification (header.payload.signature, HMAC recompute)
- bcrypt hashing rationale
- FastAPI basics: routes, Pydantic models, Depends()
- Request anatomy: headers, body, auth

**Files touched:**
- database.py — engine, SessionLocal, Base, get_db()
- models.py — User model (id, email, hashed_password, created_at)
- .gitignore, git init — repo pushed to GitHub (Saura-4/llm-chatbot)
- PROJECT_CONTEXT.md, SESSION_LOG.md — created

**Comprehension checks:** none run this session (foundational/setup session,
no concept was quizzed).

**Other notes (environment, not project state):**
- Docker Desktop Hyper-V issue — solved via Ubuntu VM + native Docker inside
  VM + VirtualBox shared folder + port forwarding (5432, 6379 host→guest).
  Current, working setup — not an open problem.
- `users` table creation verified via psql.

**Next session scope:** Signup/login routes (bcrypt + JWT issuing), then
get_current_user dependency.

---

## Session 2: Schemas + Password Hashing

**Date:** 2026-07-13
**Scope in:** schemas.py (all 4 classes) + hashing half of auth.py.
**Scope deferred:** JWT issuing, auth_routes.py, get_current_user — held back
deliberately to avoid shallow coverage in one sitting.

**Concepts covered, with confirmed understanding (comprehension-checked,
correct answer stated first):**
- Pydantic v2 is strict by default — no silent int→str coercion (unlike v1).
- Extra fields on a request are silently dropped, not rejected — this is the
  mass-assignment defense mechanism.
- `from_attributes=True` switches Pydantic from dict-style `[]` lookup to
  attribute-style `getattr` — required because SQLAlchemy objects aren't
  subscriptable.
- bcrypt hash structure: `$2b$12$<22-char-salt><31-char-hash>` — algorithm,
  cost factor, salt, and hash packed by fixed character position, not merged
  mathematically.
- Password verification = extract salt from the stored hash → rehash the
  candidate password with that same salt → string-compare to the stored
  hash. (Proven live via `bcrypt.hashpw(pw, existing_hash)`.)
- Pydantic validates shape/type only, at the request boundary. All
  business-logic checks (wrong email, wrong password) happen inside the
  route function itself, including manually raising `HTTPException` — this
  is not automatic.
- `.encode("utf-8")` is required before hashing/verifying because bcrypt's
  implementation operates on bytes, not Python `str` — separate concern from
  Pydantic's type guarantee.

**Initial misunderstandings (resolved — listed for pattern-tracking only,
not carryover facts):**
- Extra request fields: initially assumed this raises an error; corrected to
  "silently dropped."
- `from_attributes=True`: initially described as "converts to a dict
  internally"; corrected to "changes access pattern to attribute-style,
  no dict involved."
- Who catches a failed `verify_password()`: initially attributed to
  Pydantic; corrected to "the route author, manually."

**Files touched:**
- schemas.py — UserCreate, UserLogin, UserOut, Token
- auth.py — hash_password(), verify_password() (bcrypt direct, not passlib —
  see project_context.md Decisions for why)

**Working-style event (resulted in a standing preference, not a fact about
the project):** ran two sandbox calls without re-confirming scope, triggered
a rate-limit cooldown. Resulting rule already captured in project_context.md
("How I learn") — not repeated here as project state.

**Next session scope:** JWT issuing (`auth.py`) + `auth_routes.py`
signup/login endpoints + `get_current_user` dependency.

## Session 3: JWT Issuing + Auth Routes (Signup/Login)

**Date:** 2026-07-21
**Scope in:** JWT encode/decode functions in auth.py, auth_routes.py
(signup + login, auto-login-on-signup), wiring router into main.py,
requirements.txt filled in with real pinned versions, full end-to-end
testing via /docs.
**Scope deferred:** get_current_user dependency — concept (OAuth2PasswordBearer,
what it does) was explained, but file location (new app/dependencies.py vs.
adding to auth.py) was left as an open decision, and no code was written yet.

**Concepts covered, with confirmed understanding (comprehension-checked,
correct answer stated first):**
- Encode builds `header.payload` (both base64, both plainly readable, NOT
  encrypted) then signs that exact string with HMAC-SHA256 using SECRET_KEY;
  decode recomputes the same HMAC server-side and compares it to the token's
  embedded signature — a mismatch means tampering.
- `exp` gets special treatment vs. every other payload key (like `sub`)
  because it's a name PyJWT specifically knows to auto-check against current
  time on decode; other claims are inert data the caller must check manually.
- The `exp` check exists as a deliberate security decision (time-boxing
  exposure if a token leaks), not because an old signature becomes
  mathematically invalid — HMAC validity doesn't decay with time.
- `algorithms=[ALGORITHM]` on decode is an explicit whitelist the server
  defines in advance — decode never trusts the token's own `alg` header
  claim blindly, which is what prevents the classic "attacker edits alg to
  none, strips signature" forgery.
- decode returns the payload dict, not a bool, because the real question
  isn't just "valid?" but "valid, and whose token is this?" — `sub` is
  needed downstream to look the user up in the DB.

**Initial misunderstandings (resolved — for pattern-tracking only):**
- `exp` check: initially framed as "old token = broken/incorrect"; corrected
  to "signature stays valid forever, exp is a deliberate risk-window
  decision, not a correctness issue."

**Files touched:**
- auth.py — added `create_access_token()`, `decode_access_token()` (PyJWT,
  HS256, `sub` + `exp` claims, ValueError raised on invalid/expired rather
  than letting PyJWT exceptions leak past this module)
- auth_routes.py — `/signup` and `/login` routes written; signup does
  auto-login (returns a Token immediately, not just the created user)
- main.py — `auth_routes.router` mounted via `include_router(prefix="/auth",
  tags=["auth"])`
- requirements.txt — filled in with actual installed pinned versions
  (fastapi, uvicorn, SQLAlchemy, psycopg2-binary, python-dotenv, bcrypt,
  PyJWT, pydantic, redis, python-multipart)

**Other notes (environment/workflow facts, not project state):**
- Full round-trip verified live via `/docs` against Postgres/Redis running
  in the Ubuntu VM: signup → 200 with token; duplicate signup with same
  email → 400 "Email already registered"; login with correct password →
  200 with a new token; login with wrong password → 401 "Invalid
  credentials." All four checked out, no bugs found in this session's new
  code (the one pre-existing bug in `verify_password`, found last session,
  was already self-fixed before this session started).
- `datetime.utcnow()` is deprecated (Python 3.12+); developer is already
  using `datetime.now(timezone.utc)` in his own version instead — this is
  the actual code in his repo, not merely a suggestion pending adoption.

**Working-style event (see project_context.md "How I learn" for the
standing rule):** developer pushed back mid-session on chat moving to code
before he'd built genuine familiarity with a new API surface (JWT
encode/decode). Reinforces the existing "concepts before code" rule already
captured in project_context.md — not a new rule, just a live enforcement of
it worth noting so future sessions don't drift back toward code-first.

**Next session scope:** Build `get_current_user` — first decide where it
lives (new `app/dependencies.py` vs. inside `auth.py`), then implement:
`OAuth2PasswordBearer(tokenUrl="/auth/login")` scheme, a dependency function
that takes the extracted token, calls `decode_access_token()`, pulls `sub`
out of the payload, queries `User` by email, and either returns the `User`
object or raises `HTTPException(401)` on any failure. This is the last item
before protected routes (chat endpoint) become possible.

## Session 4: get_current_user Dependency

**Date:** 2026-07-23
**Scope in:** Decided file location for the dependency (new `app/dependencies.py`,
kept separate from `auth.py` to preserve its framework-agnostic status).
Built `get_current_user()`: `OAuth2PasswordBearer` scheme, token decode via
`decode_access_token()`, `sub` claim extraction, DB lookup by email, single
collapsed 401 (`credentials_exception`) across all failure paths. Added a
throwaway `GET /auth/me` route in `auth_routes.py` purely to verify the
dependency end-to-end. Tested all three paths (no header / garbage token /
real token) via curl from Windows PowerShell.
**Scope deferred:** none — this closes out the item that was open at the
end of Session 3.

**Concepts covered, with confirmed understanding (comprehension-checked,
correct answer stated first):**
- `tokenUrl` on `OAuth2PasswordBearer` is metadata consumed only by Swagger
  UI's "Authorize" popup (tells it where to POST a login attempt); it is
  never read during real request handling — actual token extraction just
  reads the `Authorization` header directly, `tokenUrl` or not.
- The "Authorize" button only appears in `/docs` once at least one route
  in the app actually depends on `oauth2_scheme` (directly or via
  `get_current_user`) — FastAPI builds the OpenAPI security schema by
  scanning routes, not by the mere existence of `OAuth2PasswordBearer`
  somewhere in the codebase.
- When a request has no `Authorization` header at all, `oauth2_scheme`
  itself rejects it with a 401 before `get_current_user`'s function body
  ever runs — dependency resolution happens before the function executes,
  so `credentials_exception` never fires for this specific case.
- `decode_access_token()` returns the payload dict (not a `User`), so the
  `sub` claim (the email) must be pulled out and used for a separate DB
  query to get the actual `User` row.
- Collapsing "token invalid/expired" and "user not found" into one
  identical 401 message is deliberate, for the same reason login collapses
  "no such email" and "wrong password" — prevents an attacker from
  learning which specific check failed (and, for the user-not-found case,
  prevents leaking whether a signature-valid token's `sub` still maps to
  a live account).
- Swagger UI's Authorize popup for `OAuth2PasswordBearer` only exposes
  username/password/client_id/client_secret fields (form-encoded, sent to
  `tokenUrl`) — there is no field to paste a raw bearer token directly, and
  since this app's `/auth/login` expects a JSON body (not form-encoded
  username/password), using the popup's login form itself throws a 422.

**Initial misunderstandings (resolved — for pattern-tracking only):**
- `tokenUrl`'s role: initially unclear whether it had any functional effect
  on auth; corrected via a step-by-step Authorize-popup walkthrough to
  "Swagger-only convenience metadata, not read by real request handling."
- Raising the collapsed exception: initially written as `credentials_exception()`
  (calling it like a function); corrected to `raise credentials_exception`
  (it's already a constructed `HTTPException` object, not a callable).
- Variable naming: initially `Current_user` (PascalCase); corrected to
  `current_user` (snake_case), consistent with the rest of the codebase.

**Files touched:**
- `app/dependencies.py` — new file. `oauth2_scheme` (`OAuth2PasswordBearer`)
  + `get_current_user()` dependency, fully working.
- `app/routers/auth_routes.py` — added `GET /me` (throwaway verification
  route, returns `UserOut` for the authenticated user).

**Other notes (environment/workflow facts, not project state):**
- Swagger UI's Authorize popup for this scheme has no raw-token-paste
  field in this version, so verification was done via `curl.exe` from
  Windows PowerShell instead (the app runs natively on Windows per the
  existing port-forwarding setup — no need to touch the VM for this).
- All three cases confirmed via curl: no header → 401 (FastAPI's own
  "Not authenticated", from `oauth2_scheme`, not app code); garbage token
  → 401 `"Could not validate credentials"` (app's `credentials_exception`);
  real token from `/auth/login` → 200 with correct `id`/`email`/`created_at`.

**Next session scope:**
Conversation + Message models (SQLAlchemy) in `models.py`: a `Conversation`
belongs to a `User` (foreign key), and a `Message` belongs to a
`Conversation`, storing role (user/assistant) and content, in order. This
is the schema needed before the chat endpoint can persist anything.

## Session 5: Conversation & Message ORM Design

**Date:** 2026-07-25

**Scope in:**
Designed the Conversation and Message database schema from first principles, learned SQLAlchemy relationships in depth, implemented both ORM models, and finalized the database design before introducing Alembic.

**Scope deferred:**
Alembic migrations were intentionally postponed until the database design and SQLAlchemy relationship system were fully understood.

---

### Concepts covered, with confirmed understanding (comprehension-checked, correct answer stated first):

- A Conversation is a first-class database entity because it owns metadata (title, timestamps, owner) and groups related messages.
- A Message belongs to exactly one Conversation through a foreign key.
- The chatbot's memory lives inside the database; every request reconstructs conversation history before calling the LLM.
- SQLAlchemy `relationship()` defines object navigation rather than immediately executing SQL.
- SQLAlchemy relationships use lazy loading by default; related tables are queried only when the relationship attribute is accessed.
- `ForeignKey` supplies SQLAlchemy with the information required to determine how two tables are joined.
- Without a valid `ForeignKey`, SQLAlchemy cannot infer join conditions for relationships.
- `back_populates` connects two relationship definitions so both sides stay synchronized in memory.
- `cascade="all, delete-orphan"` deletes dependent child records when the parent is removed or when children become orphaned.
- `server_default=func.now()` delegates timestamp creation to PostgreSQL rather than Python.
- `onupdate=func.now()` automatically updates modification timestamps whenever a row changes.
- Conversation titles are appropriately stored as `String`; message bodies are appropriately stored as `Text`.
- One-to-many relationships return a list of ORM objects; many-to-one relationships return a single ORM object.
- Database enums enforce valid values and provide stronger integrity than unrestricted strings.
- Extending message roles (e.g. adding `SYSTEM`) should expand the existing enum rather than introducing another database column.

---

### Initial misunderstandings (resolved — for pattern-tracking only):

- Conversation table: initially viewed mainly as a container for messages; corrected to understanding it as an independent entity with its own lifecycle and metadata.
- SQLAlchemy relationship: initially assumed it immediately queried the database; corrected to understanding that it registers navigation instructions and performs lazy loading.
- Relationship mapping: initially unclear how SQLAlchemy determines joins; corrected to understanding that `ForeignKey` provides the join information.
- Bidirectional relationships: initially viewed as independent definitions; corrected to understanding that `back_populates` synchronizes both sides of the relationship.
- Message roles: initially implemented using `String`; corrected to preferring a database-backed Enum for stronger integrity.

---

### Files touched:

- `app/models.py` — implemented `Conversation` model.
- `app/models.py` — implemented `Message` model.
- `app/models.py` — added bidirectional relationships between User, Conversation, and Message.


---

### Other notes (environment/workflow facts, not project state):

- Database schema was intentionally finalized before introducing Alembic to separate ORM understanding from migration mechanics.

---

### Working-style event (only if it produced a standing preference):

- None.

---

### Next session scope:

Introduce Alembic from first principles, explain the relationship between SQLAlchemy models, migration files, and the PostgreSQL schema, generate the migration for Conversation and Message models, inspect the generated migration, execute it against PostgreSQL, and verify the resulting database schema.