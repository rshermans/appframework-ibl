# 🚀 Deployment Guide

Guia completo para fazer deploy da aplicação IBL-AI em diferentes ambientes.

## 📋 Pré-requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- Conta no Supabase ou PostgreSQL configurado
- Conta no OpenAI

## 🌍 Ambientes Suportados

- **Local:** Desenvolvimento local
- **Staging:** Teste/pré-produção
- **Production:** Produção

## 📦 Variáveis de Ambiente por Ambiente

### Local Development

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3011
DATABASE_URL=postgresql://user:pass@localhost:5432/appframework
DIRECT_URL=postgresql://user:pass@localhost:5432/appframework
OPENAI_API_KEY=sk-test_...
OPENAI_MODEL=gpt-4-turbo
```

### Staging

```env
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging-appframework-ibl.app
DATABASE_URL=postgresql://postgres.<ref>:password@supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.<ref>:password@supabase.com:5432/postgres
OPENAI_API_KEY=sk-prod_...
OPENAI_MODEL=gpt-4-turbo
```

### Production

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://appframework-ibl.app
DATABASE_URL=postgresql://postgres.<ref>:password@supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.<ref>:password@supabase.com:5432/postgres
OPENAI_API_KEY=sk-prod_...
OPENAI_MODEL=gpt-4-turbo
```

## 🚀 Deployment em Vercel (Recomendado)

### 1. Conectar Repositório

```bash
# Login no Vercel
npm i -g vercel
vercel login

# Deploy
vercel
```

### 2. Configurar Variáveis de Ambiente

No dashboard do Vercel:

1. Vá a: Project → Settings → Environment Variables
2. Adicione todas as variáveis de `.env.local`
3. Configure para cada ambiente (Production, Preview, Development)

### 3. Deploy Automático

Cada push na branch `main` faz deploy automático em produção.

## 🐳 Deployment com Docker

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build
RUN npm run prisma:generate

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3011

CMD ["npm", "start"]
```

### Build e Deploy

```bash
# Build image
docker build -t appframework-ibl:latest .

# Run container
docker run -p 3011:3011 \
  -e DATABASE_URL=postgresql://... \
  -e OPENAI_API_KEY=sk-... \
  appframework-ibl:latest
```

## ☁️ Deployment em Outras Plataformas

### Railway

```bash
# 1. Conectar Repositório
# 2. Adicionar variáveis de ambiente
# 3. Configurar comando de start:
npm run build && npm start
```

### Render

```bash
# 1. Conectar GitHub
# 2. Criar Web Service
# 3. Build Command: npm run build
# 4. Start Command: npm start
```

### AWS (Elastic Beanstalk)

```bash
# 1. Instalar EB CLI
pip install awsebcli

# 2. Inicializar
eb init -p node.js-20 appframework-ibl

# 3. Deploy
eb create production
eb deploy
```

## 📊 Database Migration

### Em Desenvolvimento

```bash
npm run prisma:push
```

### Em Produção

```bash
# 1. Backup da database
# (Feito automaticamente no Supabase dashboard)

# 2. Deploy migrations
npm run prisma:deploy

# 3. Verificar status
npm run prisma:studio
```

## 🔄 Rollback

Caso algo corra mal:

```bash
# Vercel
vercel rollback

# Manual
git revert <commit-hash>
git push origin main
```

## ✅ Pre-Deployment Checklist

- [ ] Todos os testes passam (`npm run lint`, `npm run type-check`)
- [ ] Build local funciona (`npm run build`)
- [ ] Migrações prismadas estão up-to-date
- [ ] Variáveis de ambiente configuradas
- [ ] Backup da database feito
- [ ] Revisão de código aprovada
- [ ] CHANGELOG atualizado
- [ ] Versão em package.json incrementada

## 🔍 Monitoramento Pós-Deploy

```bash
# Verificar logs
vercel logs

# Health check
curl https://appframework-ibl.app/api/health

# Monitor Prisma
npm run prisma:studio
```

## 🆘 Troubleshooting

### Build falha

```bash
# Limpar cache
rm -rf .next
rm -rf node_modules

# Reconstruir
npm install
npm run build
```

### Database connection error

```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Testar conexão
npm run prisma:push --preview
```

### Memory issues

Aumentar memory para Node.js:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

## 📝 Release Notes Template

Antes de cada release:

```markdown
# Version X.Y.Z - YYYY-MM-DD

## ✨ Features

- Feature 1
- Feature 2

## 🐛 Bug Fixes

- Fix 1
- Fix 2

## 📚 Documentation

- Doc update 1

## 🚀 Performance

- Perf improvement 1
```

## 🔐 Security

- ✅ Todas as secrets em variáveis de ambiente
- ✅ Nenhuma chave hardcoded no repositório
- ✅ HTTPS forçado em produção
- ✅ CORS configurado corretamente
- ✅ Rate limiting on APIs
- ✅ Database backups regulares

---

Para dúvidas, consulte [docs/system-architecture.md](../docs/system-architecture.md)
