# AP Calculus AB/BC — Cursor Rules

## Scope & Guardrails
- **Scope now:** `subject='calc'` only; `exam_variant ∈ {calc_ab, calc_bc}`. Do not add other subjects unless explicitly requested.
- **Quality goals:** verified_share ≥ 0.985, verifier_equiv ≥ 0.99 on the golden set. Ship only if gates pass.

## Architecture
- Monorepo with pnpm + Turborepo. Packages: `@ap/shared`, `@ap/tutor`, `@ap/payments`, `@ap/analyzer`. Apps: `api-gateway`, `web`, `admin-lite`. Python services: `py/verifier`, `py/processor`.
- **Data:** Supabase Postgres + **pgvector**. Keep a retrieval adapter boundary to allow Pinecone later without changing APIs.

## Coding Principles
- **SOLID** in packages; **functional core, imperative shell**.
- TypeScript `"strict": true`. No `any`, no `ts-ignore`. Prefer named exports.
- Python: Black + isort; pydantic models at I/O boundaries; explicit types.

## Security & Compliance
- RLS on all KB tables; partition-based access: `public_kb` (all), `paraphrased_kb` (calc_paid/teacher/all_paid), `private_kb` (teacher).
- Webhooks: **raw-body** HMAC verification; **idempotency** via `webhook_event` with unique (provider, dedupe_key).
- Log redaction: NEVER log secrets or raw webhook payloads; hash or summarize.
- CSP locked down; CORS allowlist in env.

## Tutor Engine (VAM)
- **Default Verified Answer Mode (VAM) ON**. Steps: retrieve → canonical-first → generate → rubric enforce → verifier → trust score.
- **Abstain** when trust < `VAM_MIN_TRUST` (default 0.92) after one corrective decode; return ≥3 actionable suggestions (KB links).
- Cache **only verified** answers (key includes subject, exam_variant, content hash).

## Retrieval
- Hybrid: keyword + pgvector → variant-aware boost (exact match > null > other) → dual-stage rerank (lexical/semantic/metadata).
- Return snippet provenance for citations. Never fabricate citations.

## Rubrics & Formatting
- Use `rubrics/calc.defaults.json`. Enforce units/sig-figs/justifications (e.g., theorem naming for MVT/IVT/Rolle when invoked).
- Numeric formatting via `@ap/shared/numeric`: **half-away-from-zero** rounding; preserve trailing zeros when sig figs specified.

## Verifier (Python)
- Endpoints for derivative/integral/limit/algebra and dimensional analysis. Use safe SymPy parser allowlist.
- Numeric probes for sanity; for integrals treat constants of integration as equivalent (configurable).
- On verifier failure, attempt one corrective decode; else abstain.

## Payments
- Stripe only. Product→role mapping to `calc_paid` (or `all_paid`). Webhook handlers must be idempotent (dedupe on event.id).
- On cancel, downgrade carefully (respect `all_paid`).

## Testing
- **TDD-first**. Packages ≥95% coverage; apps ≥80% coverage. CI fails PR below thresholds.
- Unit tests: happy + edge + failure (signature mismatch, invalid inputs).
- Integration: supertest for API; external calls mocked (nock/respx).
- E2E: Playwright smoke (`/coach` verified flow; admin review loop).

## CI/CD & Gates
- CI: lint, typecheck, unit, e2e smoke, build. Upload coverage + OpenAPI artifact.
- Deploy gates (staging/prod): run QA harness → block if verified_share < 0.985 or verifier_equiv < 0.99.
- Migrations: gated job; idempotent; never drop public data without a migration plan.

## Observability
- OTEL spans around LLM, DB, HTTP; pino structured logs; redact PII. Emit analytics_event for VAM outcomes.

## UX
- Single unified app (`apps/web`): AB/BC **track selector** persisted; Verified badge + trust meter; citations sidebar; KaTeX rendering.
- Graceful errors with suggestions; accessible components (ARIA, keyboard support).

## Non‑Negotiables
- No scaffolding/TODOs/empty stubs. Every public function has JSDoc/docstrings.
- Do not expand scope (subjects, providers, features) unless a prompt explicitly says so.

## Project Structure
```
ap-bot/
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
├─ tsconfig.base.json
├─ .editorconfig
├─ .prettierrc
├─ .eslintrc.cjs
├─ .gitignore
├─ .env.example
├─ .cursor/
│  └─ rules.md
├─ supabase/
│  ├─ README.md
│  ├─ migrations/
│  │  ├─ 0001_init_core.sql                 # users/roles, kb_document (+pgvector), embeddings, partitions, RLS
│  │  ├─ 0002_ab_bc_variant.sql             # exam_variant: calc_ab | calc_bc + checks + indexes
│  │  ├─ 0003_canonical.sql                 # kb_canonical_solution + kb_canonical_embedding
│  │  ├─ 0004_webhook_event.sql             # webhook_event log (idempotency/audit)
│  │  ├─ 0005_review_hitl.sql               # review_case/review_action (HiTL)
│  │  ├─ 0006_analytics_event.sql           # minimal analytics sink
│  │  └─ 0007_seeds_calc.sql                # small public/paraphrased seeds (AB/BC)
│  └─ seeds/
│     └─ calc/
│        └─ canonical_min.yaml
├─ packages/
│  ├─ shared/
│  │  ├─ package.json
│  │  ├─ src/
│  │  │  ├─ config.ts                       # env schema
│  │  │  ├─ supabase.ts                     # typed client (service & anon)
│  │  │  ├─ logger.ts                       # pino
│  │  │  ├─ tracing.ts                      # OTEL setup
│  │  │  ├─ http.ts                         # ky client w/ retries
│  │  │  ├─ numeric.ts                      # deterministic rounding/sig-figs
│  │  │  ├─ rateLimit.ts
│  │  │  └─ types.ts
│  │  └─ tests/...
│  ├─ tutor/
│  │  ├─ package.json
│  │  ├─ src/
│  │  │  ├─ llm.ts                          # GPT‑5 adapter w/ fallbacks
│  │  │  ├─ retrieval/
│  │  │  │  ├─ hybrid.ts                    # pgvector + keyword + variant boost + rerank
│  │  │  │  └─ query.ts                     # query expansion for Calc
│  │  │  ├─ canonical.ts                    # canonical-first selection
│  │  │  ├─ verify.ts                       # CAS/units calls to py/verifier; trust score
│  │  │  ├─ postprocess.ts                  # rubric enforcer + numeric formatting
│  │  │  ├─ coach.ts                        # VAM orchestration (text)
│  │  │  ├─ video.ts                        # (optional) video-aware Q&A (behind flag)
│  │  │  ├─ rubrics/
│  │  │  │  └─ calc.defaults.json
│  │  │  └─ index.ts
│  │  └─ tests/...
│  ├─ payments/
│  │  ├─ package.json
│  │  ├─ src/
│  │  │  ├─ roles.ts                        # Stripe product→role: calc_paid
│  │  │  ├─ stripe.ts                       # signature verify + event handlers
│  │  │  └─ index.ts
│  │  └─ tests/...
│  └─ analyzer/
│     ├─ package.json
│     ├─ src/
│     │  ├─ vam.ts                          # verified share, abstain rate
│     │  └─ gate.ts                         # CI deploy gate script
│     └─ tests/...
├─ apps/
│  ├─ api-gateway/
│  │  ├─ package.json
│  │  ├─ src/
│  │  │  ├─ server.ts                       # Fastify bootstrap
│  │  │  ├─ plugins/
│  │  │  │  ├─ security.ts                  # helmet/CSP; CORS allowlist
│  │  │  │  ├─ rawBody.ts                   # raw body for Stripe
│  │  │  │  └─ rateLimit.ts
│  │  │  ├─ routes/
│  │  │  │  ├─ health.ts
│  │  │  │  ├─ kb.ts                        # /kb/search
│  │  │  │  ├─ coach.ts                     # /coach
│  │  │  │  ├─ webhooks/
│  │  │  │  │  └─ stripe.ts                 # /webhooks/stripe
│  │  │  │  └─ review.ts                    # HiTL endpoints
│  │  │  └─ openapi.yaml
│  │  └─ tests/...
│  ├─ web/                                  # unified student app (Calc only)
│  │  ├─ package.json
│  │  ├─ next.config.mjs
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  │  ├─ layout.tsx
│  │  │  │  ├─ page.tsx                     # landing
│  │  │  │  ├─ coach/page.tsx               # chat UI + AB/BC selector
│  │  │  │  ├─ lessons/[id]/page.tsx
│  │  │  │  └─ account/page.tsx             # checkout + role state
│  │  │  ├─ components/...
│  │  │  └─ lib/api.ts
│  │  └─ tests/...
│  └─ admin-lite/
│     ├─ package.json
│     ├─ src/
│     │  ├─ app/review/page.tsx             # HiTL queue
│     │  └─ lib/api.ts
│     └─ tests/...
├─ py/
│  ├─ verifier/
│  │  ├─ pyproject.toml
│  │  ├─ Dockerfile
│  │  └─ src/verifier/
│  │     ├─ app.py                          # FastAPI
│  │     ├─ calculus.py                     # derivative/integral/limit/algebra/unit checks
│  │     └─ tests/...
│  └─ processor/
│     ├─ pyproject.toml
│     ├─ src/processor/
│     │  ├─ cli.py                          # ingest paraphrase→tag AB/BC→embed→upsert
│     │  ├─ ingest.py
│     │  ├─ paraphrase.py
│     │  ├─ tagging.py
│     │  ├─ embeddings.py
│     │  ├─ supabase_io.py
│     │  └─ tests/...
├─ tests/
│  ├─ qa-harness/
│  │  ├─ package.json
│  │  ├─ data/gold/ap_calc.jsonl
│  │  └─ src/{runner,report}.ts
│  └─ rls/
│     ├─ package.json
│     └─ src/rls.spec.ts
├─ .github/workflows/
│  ├─ ci.yml                                # typecheck, lint, unit, e2e smoke, build
│  ├─ migrate.yml                           # gated supabase migrations
│  └─ deploy.yml                            # optional (staging)
└─ docs/
   ├─ runbooks/{ingest.md, roles.md, quality-gates.md}
   └─ architecture/adr/ADR-0001-calc-only.md
```

## Development Workflow
1. Follow the 12 CALC-P prompts in order for initial setup
2. Use TDD approach - write tests first
3. Ensure all code meets coverage thresholds
4. Run quality gates before any deployment
5. Document all public functions with JSDoc/docstrings
6. Never commit scaffolding or empty stubs

## Key Dependencies
- **TypeScript**: Strict mode, no `any` types
- **pnpm**: Package management with workspaces
- **Turborepo**: Monorepo build orchestration
- **Supabase**: Database with pgvector for embeddings
- **Fastify**: API server with security plugins
- **Next.js**: React framework for web app
- **Stripe**: Payment processing
- **OpenAI**: LLM and embeddings
- **Python**: SymPy for calculus verification
- **Playwright**: E2E testing
- **Vitest**: Unit testing framework
