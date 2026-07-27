# Session Log

## Session 1–4: Backend Foundation (Environment, Authentication & Core Architecture)

**Date:** 2026-07 (multiple sessions)

**Scope in:** Established the development environment, project structure, SQLAlchemy setup, authentication system, protected-route infrastructure, and the initial database schema. Covered the full request flow from incoming request through validation, authentication, business logic, and database interaction.

**Concepts covered, with confirmed understanding (comprehension-checked, correct answer stated first):**
- FastAPI request flow is: request → validation (Pydantic/dependencies) → business logic → response.
- Pydantic validates request shape and types only; business logic and authorization decisions remain the route's responsibility.
- Pydantic v2 is strict by default and does not silently coerce incompatible types.
- Extra request fields are ignored by default, preventing mass-assignment vulnerabilities.
- `from_attributes=True` allows Pydantic to read SQLAlchemy objects using attribute access instead of dictionary lookup.
- bcrypt stores the algorithm, cost factor, salt, and hash together in the stored hash string; password verification extracts the salt from the stored hash and recomputes the hash for comparison.
- bcrypt operates on bytes, requiring UTF-8 encoding before hashing or verification.
- JWT payloads are readable but protected against modification by an HMAC signature.
- JWT expiration is an application-level security policy rather than a property of the cryptographic signature.
- JWT decoding should explicitly whitelist acceptable algorithms instead of trusting the token header.
- `decode_access_token()` returns validated claims, not a user object; application code must retrieve the user from the database.
- `OAuth2PasswordBearer` extracts bearer tokens from incoming requests, while `tokenUrl` is documentation metadata used only by Swagger UI.
- Missing authentication headers are rejected by `OAuth2PasswordBearer` before dependency logic executes.
- `get_current_user()` validates the token, extracts the subject claim, queries the database, and returns the authenticated user.
- Authentication failures intentionally return identical responses regardless of the exact failure point to avoid leaking information.
- SQLAlchemy relationships, normalization, conversation/message schema design, lazy loading, `relationship()`, `back_populates`, cascade behaviour, and navigation semantics were fully understood and implemented.

**Initial misunderstandings (resolved — for pattern-tracking only):**
- Extra request fields: initially expected validation failure; corrected to silent omission by default.
- `from_attributes=True`: initially thought it converted objects into dictionaries; corrected to attribute-based access.
- Password verification failures: initially attributed to Pydantic; corrected to explicit application logic.
- JWT expiration: initially treated as cryptographic expiry; corrected to an application-enforced security policy.
- `tokenUrl`: initially assumed to participate in runtime authentication; corrected to Swagger/OpenAPI metadata only.
- `credentials_exception`: initially treated as a callable; corrected to raising the existing `HTTPException` instance.

**Files touched:**
- `database.py` — SQLAlchemy engine, session management, declarative base, dependency.
- `models.py` — User, Conversation, and Message models with relationships.
- `schemas.py` — Request/response models.
- `auth.py` — Password hashing, verification, JWT creation and validation.
- `dependencies.py` — Authentication dependency (`get_current_user()`).
- `routers/auth_routes.py` — Signup, login, and protected `/auth/me` endpoint.
- `main.py` — Router registration.
- `requirements.txt` — Project dependencies.
- `.gitignore` — Repository configuration.
- `PROJECT_CONTEXT.md` and `SESSION_LOG.md` — Initial project documentation.

**Other notes (environment/workflow facts, not project state):**
- Docker Desktop was replaced with an Ubuntu VM running Docker because of Hyper-V conflicts.
- PostgreSQL and Redis run inside the VM and are exposed to Windows through VirtualBox port forwarding.
- FastAPI runs natively on Windows while using the VM-hosted services.
- End-to-end authentication flow and protected-route behaviour were verified against the live PostgreSQL database.

**Working-style event (only if it produced a standing preference):**
- Multiple interactions reinforced the "concepts before code" workflow, which is maintained as the authoritative learning approach in `project_context.md`.

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


## Session 6: Alembic Mental Model & Autogeneration

**Date:** 2026-07-26
**Scope in:** Built the conceptual foundation of Alembic before using any commands. Covered why Alembic exists, migration history, revision chains, `alembic_version`, `upgrade()`/`downgrade()`, `head`, `Base.metadata`, `target_metadata`, autogeneration, model registration, and how Alembic compares models with the live database.
**Scope deferred:** Alembic initialization (`alembic init`), generated file walkthrough (`alembic.ini`, `env.py`, `versions/` in the actual project), configuration, creating the first migration, reviewing the generated migration, and applying it. Deferred to keep this session purely conceptual.

**Concepts covered, with confirmed understanding (comprehension-checked, correct answer stated first):**
- PostgreSQL tables do not update automatically when SQLAlchemy models change; existing tables require explicit schema migrations.
- `Base.metadata.create_all()` only creates missing tables and does not modify existing tables.
- Database schema evolution should be controlled through explicit, versioned migrations rather than automatic application startup logic.
- Alembic records schema evolution as a sequence of migration revisions rather than repeatedly recreating the entire schema.
- Alembic stores the database's current revision in the `alembic_version` table and upgrades only the missing revisions.
- `alembic upgrade <target>` migrates only from the database's current revision to the specified target revision rather than replaying all migrations.
- `upgrade()` moves the schema forward and `downgrade()` attempts to reverse the schema changes made by that migration.
- Dropping tables or columns is data-destructive; a downgrade can usually recreate the schema but cannot automatically restore deleted data.
- Alembic autogeneration produces a draft migration that must be reviewed by the developer because it cannot infer intent such as column renames versus drop-and-add operations.
- During autogeneration, the live PostgreSQL database is the source of truth for the current schema being compared.
- Alembic compares `Base.metadata` with the live database schema during autogeneration; it does not compare models directly with previous migration files.
- `Base.metadata` is an in-memory description of the database schema constructed from imported SQLAlchemy model classes.
- SQLAlchemy registers models into `Base.metadata` only when their modules are imported and executed in the current Python process.
- Alembic runs in a separate Python process from the FastAPI application, so models must be imported again for that process to populate `Base.metadata`.
- If a model is omitted from `Base.metadata` but its table exists in the database, Alembic will likely generate a migration to remove that table because it trusts `Base.metadata` as the desired schema.
- If both `Base.metadata` and the database contain no tables, Alembic correctly generates an empty migration because it detects no schema differences.
- Alembic computes schema differences before writing a migration file, ensuring a migration file is created only after successful comparison.

**Initial misunderstandings (resolved — for pattern-tracking only):**
- Migration history: initially assumed a database already at the latest revision would be affected by deleting an earlier migration; corrected to understanding that existing upgraded databases are unaffected immediately, but future upgrades, fresh databases, and downgrades depend on an intact migration chain.
- Model registration: initially assumed models already executed by the FastAPI application would automatically exist in Alembic's `Base.metadata`; corrected to understanding that Alembic runs in a separate Python process and must import models independently.

**Files touched:**
- none

**Other notes (environment/workflow facts, not project state):**
- None.

**Working-style event (only if it produced a standing preference):**
- Session structure preference refined; see `project_context.md` ("How I learn") for the authoritative learning workflow.

**Next session scope:**
- Initialize Alembic in the project with `alembic init`, inspect every generated file (`alembic.ini`, `env.py`, `versions/`), understand the role of each configuration item, connect Alembic to the project's SQLAlchemy models via `target_metadata`, and prepare for generating the first migration.


## Session 7: Alembic Implementation

**Date:** 2026-07-27

**Scope in:** Configure Alembic for the project, connect it to the SQLAlchemy models, generate the first migration, review the generated migration, execute it, and understand the complete migration workflow.

**Scope deferred:** Conversation CRUD, message persistence, and chat endpoint implementation were intentionally deferred until database versioning was complete.

**Concepts covered, with confirmed understanding (comprehension-checked, correct answer stated first):**
- `alembic init` creates Alembic's working structure; it does not inspect models or modify the database.
- `alembic.ini` provides Alembic configuration and points to the migration environment.
- `target_metadata` must reference `Base.metadata` so Alembic knows the desired schema.
- Alembic must import model modules so `Base.metadata` is populated before schema comparison.
- Sharing `DATABASE_URL` between FastAPI and Alembic provides a single source of truth.
- `revision --autogenerate` generates a migration by comparing SQLAlchemy metadata with the current database schema.
- Autogenerated migrations should always be reviewed before execution.
- `upgrade head` executes pending migrations and records the applied revision in `alembic_version`.
- Online migrations connect directly to the database and execute SQL; offline migrations generate SQL scripts without connecting to the database.

**Initial misunderstandings (resolved — for pattern-tracking only):**
- Alembic configuration: initially unclear how `engine_from_config()` obtained the database URL; corrected to overriding `sqlalchemy.url` in the Alembic configuration before engine creation.
- Timestamp columns: initially assumed `server_default` alone was sufficient; corrected to explicitly setting `nullable=False` before generating the first migration.

**Files touched:**
- `alembic.ini` — reviewed configuration.
- `alembic/env.py` — connected project metadata and shared application configuration.
- `app/models.py` — updated timestamp columns with `nullable=False`.
- `alembic/versions/...` — generated the initial migration.
- PostgreSQL schema — applied the first migration.

**Other notes (environment/workflow facts, not project state):**
- First migration executed successfully.
- `alembic_version` table was created automatically.
- Existing `users` table remained unchanged while new tables were added.

**Working-style event (only if it produced a standing preference):**
- None.

**Next session scope:**
Implement Conversation CRUD followed by message persistence to prepare the foundation for the chat endpoint.