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