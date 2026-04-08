# RELIA Research Wizard 🧬

IBL Framework with ChatGPT 4.5 Mini + Database Logging

## 📋 Estrutura

```
/app              → Next.js pages
/api              → API routes (ChatGPT integration)
/components       → React components (Stage 1 Research)
/lib              → AI, DB, Prompts
/types            → TypeScript types
/store            → Zustand state (stage/step navigation)
/prisma           → Database schema
```

## 🚀 Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

`.env.local` já tem a chave OpenAI

### 3. Database

```bash
npx prisma migrate dev --name init
```

Cria SQLite em `prisma/dev.db`

### 4. Run

```bash
npm run dev
```

Abre http://localhost:3000

## 🔄 Fluxo (Stage 1, Step 0)

1. Enter research topic
2. Click "Generate Research Questions"
3. ChatGPT gera 5 questões (gravadas na BD)
4. Vê resultado estruturado
5. Histórico está na BD

## 📊 Database

**Projects** → um projeto por research topic
**ProjectInteractions** → cada chamada ao ChatGPT + resposta + tokens

## 🎯 Próximos passos

- [ ] Step 1 (Epistemic Analysis)
- [ ] Step 2 (Search Strings)
- [ ] PDF Export
- [ ] Full Stage 1 (10 steps)
- [ ] Stages 0, 2, 3

## 🔑 Decisões importantes

- ✅ Usando ChatGPT 4.5 Mini
- ✅ BD: SQLite + Prisma
- ✅ Histórico: Sim
- ✅ PDF Export: Sim (próximo)
