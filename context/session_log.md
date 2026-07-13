# Session Log

## 2026-07-13
- Decided project scope: practice LLM chatbot backend (FastAPI, Postgres, 
  Redis, JWT, SSE streaming via Groq) to build backend skills before 
  serving the RAG project.
- Taught: JWT structure and verification, bcrypt hashing, FastAPI basics 
  (routes, Pydantic models, Depends()), request anatomy (headers/body/auth).
- Hit Docker Desktop Hyper-V issue (known, previously spent 8h unresolved). 
  Solved via Ubuntu VM + native Docker inside VM + VirtualBox shared folder 
  (Windows S:\project\RAG\llm-chatbot-backend ↔ VM ~/work/RAG/llm-chatbot-backend) 
  + port forwarding (5432, 6379 host→guest) so the FastAPI app itself runs 
  natively on Windows while Postgres/Redis run in Docker inside the VM.
- Set up SQLAlchemy (engine, session, Base) and `User` model. Verified 
  `users` table created in Postgres via psql.
- Initialized git repo, set up .gitignore, pushed to GitHub 
  (Saura-4/llm-chatbot).
- Created PROJECT_CONTEXT.md (current state snapshot) and this SESSION_LOG.md 
  (running history).
- Next step: signup/login routes (bcrypt + JWT issuing), then 
  get_current_user dependency.