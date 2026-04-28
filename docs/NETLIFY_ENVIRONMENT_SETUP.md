# 🚀 Netlify Environment Setup

## Problema

A página de telemetry falhava com erro "Application error" no Netlify porque as variáveis de ambiente do banco de dados não estavam configuradas.

## ✅ Solução

### 1. Aceder ao Netlify Dashboard

1. Vá para [netlify.com](https://netlify.com)
2. Faça login na sua conta
3. Selecione o site "appframework-ibl" (ou o seu site)

### 2. Configurar Variáveis de Ambiente

**Caminho:** Site Settings → Build & Deploy → Environment

Clique em "Edit variables" e adicione:

| Variável              | Valor                                                 | Descrição                                      |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| `DATABASE_URL`        | `postgresql://user:pass@host:5432/db?sslmode=require` | Connection string para Prisma (pooling)        |
| `DIRECT_URL`          | `postgresql://user:pass@host:5432/db?sslmode=require` | Direct connection para migrations (serverless) |
| `OPENAI_API_KEY`      | `sk-proj-...`                                         | Sua chave OpenAI                               |
| `AUTH_GOOGLE_ID`      | `...`                                                 | ID do Google OAuth                             |
| `AUTH_GOOGLE_SECRET`  | `...`                                                 | Secret do Google OAuth                         |
| `AUTH_SECRET`         | `...`                                                 | Secret para NextAuth.js                        |
| `S2_API_KEY`          | `...`                                                 | API key para Stage 2                           |
| `NEXT_PUBLIC_APP_URL` | `https://seusite.netlify.app`                         | URL pública (sem `http://localhost`)           |

### 3. Exemplo com Supabase

Se estiver usando Supabase (recomendado):

```env
DATABASE_URL=postgresql://postgres.PROJETO:SENHA@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require

DIRECT_URL=postgresql://postgres.PROJETO:SENHA@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**Nota:** A diferença está em `pooler.supabase.com` (DATABASE_URL para aplicações) vs `db.supabase.co` (DIRECT_URL para Prisma migrations).

### 4. Redeploy

Depois de adicionar as variáveis:

1. Clique em "Deployments"
2. Selecione o último deploy
3. Clique em "Redeploy"

Ou simplesmente faça push para a branch `main`:

```bash
git push origin main
```

### 5. Testar Telemetry

Após o deploy completar, visite: `https://seusite.netlify.app/telemetry`

Deve funcionar agora! ✅

## 🔧 Troubleshooting

### Erro "DATABASE_URL is missing"

- Confirme que adicionou ambas as variáveis: `DATABASE_URL` e `DIRECT_URL`
- Aguarde 2-3 minutos para o Netlify processar as mudanças
- Redeploy manualmente se necessário

### Erro "Prisma migration failed"

```bash
# Local: execute as migrations manualmente
npx prisma migrate deploy

# Depois commit e push
git add .
git push origin main
```

### Erro "Connection timeout"

- Verifique se o DATABASE_URL está correto
- Teste a conexão localmente: `psql <DATABASE_URL>`
- Verifique se o IP do Netlify está autorizado no firewall do banco

## 📚 Referências

- [Netlify Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)
- [Prisma + Serverless](https://www.prisma.io/docs/orm/deployment/guides/deploying-to-netlify)
- [Supabase Connection Strings](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-parameters)
