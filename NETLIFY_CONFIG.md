# Configuração Recomendada para Deploy no Netlify

## 1. netlify.toml (Raiz do projeto)

```toml
[build]
  command = "npm run build"
  functions = ".next/server"
  publish = ".next/static"

[functions]
  node_bundler = "nft"
  # Timeout padrão: 30s (plano básico) ou 60s (plano pro)
  # Nossas funções targetam <25s

[dev]
  command = "npm run dev"
  port = 3011
  # Permite hot reload

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api*"
  status = 200

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"

[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'"
```

## 2. Environment Variables (.env.production)

Configurar no Netlify Dashboard → Site settings → Build & deploy → Environment:

```env
# API Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://seu-dominio.netlify.app

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
OPENAI_MODEL=gpt-5-mini

# Database (Supabase)
DATABASE_URL=postgresql://postgres.UUID:PASSWORD@db.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres.UUID:PASSWORD@db.supabase.co:5432/postgres

# Optional: Monitoring
LOG_LEVEL=info
```

**⚠️ IMPORTANTE**: Usar Netlify Dashboard para adicionar secrets, NUNCA commits `.env.production`

## 3. Otimizações Next.js para Netlify

Seu `next.config.js` está correto:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

module.exports = nextConfig;
```

## 4. GitHub Actions para Deploy (Opcional)

Criar `.github/workflows/netlify-deploy.yml`:

```yaml
name: Deploy to Netlify

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Build
        run: npm run build

      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2.0
        with:
          publish-dir: ".next/static"
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub: ${{ github.event.head_commit.message }}"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 5. Monitor de Performance no Netlify

1. **Netlify Analytics**: Site settings → Analytics
2. **Logs**: Netlify UI → Functions → Logs
3. **Observability**:
   - 504 errors: Indica timeout (resolvido com nossas mudanças)
   - 500 errors: Indica erro de código
   - Tempo médio: Destinar para <5s para melhor UX

## 6. Checklist Pré-Deploy

- [ ] Todas as variáveis de ambiente configuradas no Netlify
- [ ] `npm run build` executa sem erros localmente
- [ ] `npm run lint` sem warnings críticos
- [ ] `OPENAI_API_KEY` válida e com quota disponível
- [ ] `DATABASE_URL` alcançável (testar conexão Prisma)
- [ ] TypeScript sem erros: `npm run type-check`

## 7. Troubleshooting

### Erro: "Function execution aborted"

- Aumentar plan para 60s (Netlify Pro)
- Verificar logs: Procurar por `[ChatGPT] TIMEOUT`
- Verificar `OPENAI_API_KEY` válida

### Erro: "Build failed"

- Verificar `npm run build` localmente
- Verificar environment variables estão todas definidas
- Limpar cache do Netlify: Site settings → Deploys → Clear cache

### Erro: "502 Bad Gateway"

- Erro temporário de infraestrutura
- Redeployar manualmente

### Erro: "503 Service Unavailable"

- OpenAI API indisponível
- Aguardar ou verificar https://status.openai.com

## Deployment Process

```bash
# 1. Commitar mudanças
git add .
git commit -m "fix: add timeout handling for Netlify 504 errors"
git push origin main

# 2. Netlify auto-deploya via webhook
# Acompanhar em: Netlify Dashboard → Deploys

# 3. Verificar logs após deploy
# Netlify UI → Functions → Logs
# Procurar por sucessos: "ChatGPT responded with X tokens"
```

## Performance Targets

| Métrica      | Target | Ação se falhar        |
| ------------ | ------ | --------------------- |
| p99 latência | < 25s  | Verificar CPU/memória |
| Taxa 504     | < 1%   | Aumentar plan timeout |
| Taxa 500     | < 0.5% | Debug via logs        |
| Success rate | > 99%  | Monitorar fluxos      |
