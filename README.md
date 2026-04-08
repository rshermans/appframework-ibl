# RELIA Research Wizard

IBL Framework with OpenAI + Prisma + Supabase.

## Structure

```
/app              -> Next.js app router and API routes
/components       -> React components
/lib              -> AI, DB and canonical prompt registry
/docs             -> engineering architecture notes
/types            -> TypeScript types
/store            -> Zustand state
/prisma           -> Prisma schema
```

## Quick start (recommended)

Run:

```bat
Appframework-start.bat
```

What it does:
- closes old local Node servers on ports 3000 and 3011
- prefers port 3011 (falls back if 3011 is busy by non-Node process)
- installs dependencies only if needed
- regenerates Prisma client
- tries `prisma db push`
- starts Next.js dev server

## Manual start

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

Default URL: `http://localhost:3011`

## Environment

Set `.env.local` with:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL=http://localhost:3011`

## Prompt architecture

The canonical prompt registry lives in `lib/prompts.ts`.

- Domain prompt IDs: `rq_generation`, `rq_analysis`, `rq_synthesis`, `copilot`
- Legacy step aliases such as `step0` and `step1` resolve to the canonical prompt IDs
- UI should send structured inputs to `/api/ai`; prompt assembly happens on the server

## Workflow architecture

The engineerable workflow model lives in:

- `types/research-workflow.ts` for domain contracts
- `lib/workflow.ts` for step contracts and transition rules
- `docs/system-architecture.md` for the high-level system model

## Build

```bash
npm run build
```
