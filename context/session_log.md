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