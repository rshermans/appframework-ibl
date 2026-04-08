# RELIA Research Wizard

IBL Framework with OpenAI + Prisma + Supabase.

## Structure

```
/app              -> Next.js app router
/api              -> legacy API routes mirror
/components       -> React components
/lib              -> AI, DB and prompts
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

## Build

```bash
npm run build
```
