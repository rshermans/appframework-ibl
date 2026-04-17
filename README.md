# 📚 IBL-AI - Research Intelligence Platform

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)](https://www.typescriptlang.org/)

> **IBL-AI** é uma plataforma inteligente de pesquisa baseada em Inquiry-Based Learning (IBL), combinando Inteligência Artificial com metodologias de investigação avançadas.

## 🎯 Sobre o Projeto

O **IBL-AI** é um framework completo para investigação e pesquisa educacional, desenvolvido para a Universidade do Minho. Integra:

- 🤖 **IA Avançada** com OpenAI para geração e análise de conteúdo
- 📊 **Gestão de Dados** com Prisma e Supabase
- 🎨 **UI Moderna** com React e Tailwind CSS
- 🌐 **Backend Robusto** com Next.js API routes
- 🔄 **Wizard Interativo** para fluxos de investigação estruturados

## 🚀 Features Principais

✅ Wizard de pesquisa interativo com múltiplas etapas  
✅ Geração de questões de pesquisa baseadas em IA  
✅ Busca semântica e síntese de evidências  
✅ Estruturação automática de resultados  
✅ Suporte multilíngue (i18n)  
✅ Exportação de projeto em múltiplos formatos  
✅ Gestão de estado avançada com Zustand  
✅ Interface responsiva e acessível

## 📋 Tech Stack

| Tecnologia       | Versão | Uso                 |
| ---------------- | ------ | ------------------- |
| **Next.js**      | 14+    | Framework fullstack |
| **React**        | 18+    | UI Frontend         |
| **TypeScript**   | 5+     | Type Safety         |
| **Tailwind CSS** | 3+     | Styling             |
| **Prisma**       | 5+     | ORM & Database      |
| **Supabase**     | Latest | PostgreSQL Database |
| **OpenAI API**   | Latest | IA & ML             |
| **Zustand**      | Latest | State Management    |
| **i18next**      | 14+    | Internacionalização |

## 📁 Estrutura do Projeto

```
IBL-AI/
├── 📄 package.json              # Dependências e scripts
├── 📄 tsconfig.json             # Configuração TypeScript
├── 📄 next.config.js            # Configuração Next.js
├── 📄 tailwind.config.js        # Configuração Tailwind
├── 📄 postcss.config.js         # PostCSS config
│
├── 📁 app/                      # Next.js App Router
│   ├── layout.tsx               # Layout principal
│   ├── page.tsx                 # Página home
│   ├── globals.css              # Estilos globais
│   └── api/                     # API Routes
│       ├── ai/                  # Endpoints IA
│       ├── search/              # Endpoints busca
│       └── export/              # Endpoints exportação
│
├── 📁 components/               # React Components
│   ├── Wizard.tsx               # Componente wizard principal
│   ├── Stage1Research.tsx       # Palco 1 - Pesquisa
│   ├── Step1A.tsx → Step5Explanation.tsx  # Steps do wizard
│   ├── LocaleSwitcher.tsx       # Seletor de idioma
│   └── steps/                   # Componentes reutilizáveis
│
├── 📁 lib/                      # Utilitários e lógica
│   ├── ai.ts                    # Integração OpenAI
│   ├── db.ts                    # Prisma Client
│   ├── search.ts                # Lógica de busca
│   ├── workflow.ts              # Fluxo de trabalho
│   └── prompts.ts               # Prompts para IA
│
├── 📁 store/                    # Estado Global
│   └── wizardStore.ts           # Zustand store wizard
│
├── 📁 types/                    # TypeScript Types
│   ├── wizard.ts                # Tipos wizard
│   └── research-workflow.ts     # Tipos workflow
│
├── 📁 prisma/                   # Database ORM
│   ├── schema.prisma            # Schema database
│   └── migrations/              # Histórico migrações
│
├── 📁 docs/                     # Documentação
│   └── system-architecture.md   # Arquitetura sistema
│
└── 📁 wizard/                   # Páginas wizard
    └── page.tsx                 # Página wizard principal
```

## 🎬 Quick Start (Recomendado)

### ⚡ Execução Automática

Execute o ficheiro de startup Windows:

```bat
Appframework-start.bat
```

**O script faz automaticamente:**

- ✅ Encerra servers antigos nas portas 3000 e 3011
- ✅ Prefere porta 3011 (recua se ocupada por processo não-Node)
- ✅ Instala dependências (se necessário)
- ✅ Regenera cliente Prisma
- ✅ Sincroniza base de dados
- ✅ Inicia servidor Next.js dev

### 📦 Instalação Manual

```bash
# 1. Instalar dependências
npm install

# 2. Gerar cliente Prisma
npm run prisma:generate

# 3. Sincronizar com base de dados
npm run prisma:push

# 4. Iniciar servidor dev
npm run dev
```

**URL por defeito:** `http://localhost:3011`

## ⚙️ Configuração

### Variáveis de Ambiente

Crie ficheiro `.env.local` na raiz do projeto:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk_test_your_api_key_here
OPENAI_MODEL=gpt-4-turbo

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/appframework
DIRECT_URL=postgresql://user:password@localhost:5432/appframework

# Optional: App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3011
```

### Autenticação IA

1. Gere chave API em [platform.openai.com](https://platform.openai.com/api-keys)
2. Copie para `OPENAI_API_KEY` em `.env.local`

### Database (Supabase)

1. Crie projeto em [supabase.com](https://supabase.com)
2. Copie credenciais PostgreSQL
3. Configure `DATABASE_URL` e `DIRECT_URL`
4. Execute `npm run prisma:push`

## 🔄 Scripts Disponíveis

```bash
npm run dev              # Inicia servidor desenvolvimento (porta 3011)
npm run build            # Build para produção
npm run start            # Inicia servidor produção
npm run lint             # ESLint check
npm run prisma:generate  # Gera cliente Prisma
npm run prisma:push      # Sincroniza schema com BD
npm run prisma:studio    # Abre Prisma Studio (UI BD)
npm run prisma:seed      # Populate BD com dados iniciais
```

## 📚 Documentação

- [🏗️ System Architecture](docs/system-architecture.md) - Documentação técnica detalhada
- [🗃️ Database Schema](prisma/schema.prisma) - Estrutura da base de dados
- [📋 API Endpoints](docs/api-endpoints.md) - Documentação endpoints (em breve)

## 💡 Como Usar

### 1️⃣ Aceder à Plataforma

```
http://localhost:3011
```

### 2️⃣ Fluxo de Pesquisa (Wizard)

O wizard guia o utilizador através de 5 etapas:

1. **Seleção de Domínio** - Escolhe área de pesquisa
2. **Pesquisa Inicial** - Coleta informação base
3. **Busca Semântica** - Identifica fontes relevantes
4. **Evidências** - Analisa e compila evidências
5. **Estruturação** - Organiza em relatório estruturado
6. **Explicação** - Gera síntese final com IA

### 3️⃣ Exportação

Exporte o projeto em formato JSON ou markdown via API:

```bash
POST /api/export/[projectId]
```

## 🤝 Contribuição

Siga estas guidelines para contribuir:

1. **Fork** o repositório
2. Crie **branch** para sua feature: `git checkout -b feature/MinhaFeature`
3. **Commit** mudanças: `git commit -am 'Add MinhaFeature'`
4. **Push** para branch: `git push origin feature/MinhaFeature`
5. Abra **Pull Request**

### Padrões de Código

- ✅ Use TypeScript em novos ficheiros
- ✅ Siga convenção de nomenclatura camelCase
- ✅ Add tipos específicos (evite `any`)
- ✅ Mantenha componentes pequenos e reutilizáveis
- ✅ Documentar funções complexas

## 📝 Roadmap

- [ ] Autenticação utilizador avançada
- [ ] Colaboração em tempo real
- [ ] Mais modelos IA (Claude, Gemini)
- [ ] Dashboard analytics
- [ ] Sistema de templates
- [ ] Mobile app nativa
- [ ] Integração com mais bases dados

## 🐛 Troubleshooting

### Problema: Servidor não inicia

```bash
# Solução 1: Limpar cache
rm -r node_modules/.cache

# Solução 2: Atualizar dependências
npm install --legacy-peer-deps

# Solução 3: Verificar porta
lsof -i :3011  # macOS/Linux
netstat -ano | findstr :3011  # Windows
```

### Problema: Erro Prisma

```bash
# Reset migrações
npx prisma migrate reset

# Regenerar cliente
npx prisma generate
```

### Problema: Erro OpenAI API

- Verificar `OPENAI_API_KEY` em `.env.local`
- Confirmar quota na [dashboard OpenAI](https://platform.openai.com/account/billing/overview)
- Validar modelo em `OPENAI_MODEL`

## 📝 Licença

Este projeto está licenciado sob a **MIT License** - veja ficheiro [LICENSE](LICENSE) para detalhes.

## 👥 Autores & Créditos

**Desenvolvido para:** Universidade do Minho  
**Framework:** IBL-AI  
**Versão:** 1.0.0  
**Data:** Abril 2026

## 📞 Suporte

- 📧 **Email:** support@appframework.dev
- 💬 **Discussions:** [GitHub Discussions](https://github.com/rshermans/appframework-ibl/discussions)
- 🐛 **Issues:** [GitHub Issues](https://github.com/rshermans/appframework-ibl/issues)

---

<div align="center">

**[⬆ voltar ao topo](#-ibl-ai---research-intelligence-platform)**

Made with ❤️ for the IBL Research Community

</div>
- `NEXT_PUBLIC_APP_URL=http://localhost:3011`
- `SEMANTIC_SCHOLAR_API_KEY` or `S2_API_KEY` (optional, recommended for `/api/search`)

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

## Retrieval layer

- `/app/api/search/route.ts` exposes the retrieval API used in Step 2.5
- `lib/search.ts` normalizes provider responses into a common article schema
- `Semantic Scholar` requests are serialized with a `1100ms` minimum spacing to respect the `1 request/second` limit

## Build

```bash
npm run build
```
