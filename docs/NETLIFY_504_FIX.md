# 🔧 Solução para Error 504: Inactivity Timeout no Netlify

## Problema Identificado

O erro **"504 Inactivity Timeout: Too much time has passed"** ocorre quando:

1. **Múltiplas requisições sequenciais à OpenAI** - O código fazia até 3 tentativas sem parar, chegando a mais de 30s
2. **Limite de tempo do Netlify** - Funções serverless têm limite de 30s (básico) ou 60s (plano pro)
3. **Sem monitoramento de tempo** - Nenhum controle sobre o tempo decorrido dentro do handler
4. **Retry exponencial infinito** - Cada tentativa falhada replicava delays

## Soluções Implementadas ✅

### 1. **Helpers de Timeout** (`lib/timeoutHelper.ts`)

- `withTimeout()` - Envolve promises para abortar após tempo limite
- `TimeoutError` - Exceção customizada para distinguir timeouts de erros
- `isTimeoutError()` - Detecta se erro foi timeout
- Suporta `AbortSignal` para APIs que o permitem

### 2. **Configuração de API** (`lib/apiTimeout.ts`)

- `API_CONFIG.FUNCTION_TIMEOUT_MS = 25000` - Limite interno de 25s (deixa 5s buffer para Netlify)
- `API_CONFIG.OPENAI_TIMEOUT_MS = 20000` - Timeout específico para OpenAI
- `getTimeRemaining()` - Retorna tempo disponível
- `canContinueProcessing()` - Verifica se há tempo buffer minímo (2s)

### 3. **Servidor OpenAI Melhorado** (`lib/ai.ts`)

#### Antes:

```typescript
// Tentativas sequenciais sem timeout
const response1 = await openai.responses.create(...)
const response2 = await openai.responses.create(...)  // Se falhar
const response3 = await openai.responses.create(...)  // Se falhar
// Total: 30s+
```

#### Depois:

```typescript
// Com timeouts e verificação de tempo
const response = await withTimeout(
  openai.responses.create(...),
  { timeoutMs: 15000 }
)

// Se falhar E houver tempo, tenta fallback com timeout menor
if (!content && canContinueProcessing(startTime, 5000)) {
  const fallback = await withTimeout(
    openai.responses.create(...),
    { timeoutMs: 12000 }
  )
}
```

**Mudanças:**

- ✅ Cada tentativa tem timeout específico (15s → 12s → 10s)
- ✅ Verifica tempo disponível antes de cada fallback
- ✅ Diferencia timeouts de erros de API
- ✅ Logging detalhado com timestamps
- ✅ Reduz retries do OpenAI client de 3 para 1

### 4. **Rota da API Robusta** (`app/api/ai/route.ts`)

**Novos Controles:**

```typescript
const startTime = Date.now()

// Verifica antes de começar
if (!canContinueProcessing(startTime, 5000)) {
  return 504 // Timeout
}

// ... processamento ...

// Verifica antes de chamar ChatGPT
if (!canContinueProcessing(startTime, 5000)) {
  return 504 // Timeout
}

// Chama com timeout
const { content } = await withTimeout(
  callChatGPT(...),
  { timeoutMs: 22000 } // 25s - 3s buffer
)
```

**Benefícios:**

- ✅ Falha rápido se tempo insuficiente
- ✅ Retorna 504 apropriado para timeouts
- ✅ Fire-and-forget para database save (não bloqueia resposta)
- ✅ Logging de tempo em cada etapa
- ✅ Diferencia 504 (timeout) de 500 (erro)

### 5. **Rota Search com Timeout** (`app/api/search/route.ts`)

- ✅ Timeout de 28s para buscas
- ✅ Retorna 504 em caso de timeout
- ✅ Logging de performance (ms)

## Variáveis de Ambiente

Verifique se estas estão configuradas no Netlify:

```env
# .env.production
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-5-mini
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://seu-dominio.netlify.app
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

### Netlify Build Settings:

- **Base directory**: `/` (raiz)
- **Build command**: `npm run build`
- **Functions directory**: `./next/server`
- **Timeout**: 30 segundos (ou 60s se plano pro)

## Checklist de Deploy

- [ ] Confirmar todas as 5 mudanças foram deployadas
- [ ] Verificar logs do Netlify após deploy
- [ ] Testar rota `/api/ai` com payload grande
- [ ] Monitorar metrics: tempo médio de resposta, taxa de 504
- [ ] Se ainda houver 504s, verificar logs: `[ChatGPT] TIMEOUT`

## Análise de Logs

### Sucesso esperado:

```
[API] Received request - Step: step1_topic_selection
[API] Time remaining: 24990ms
[ChatGPT] Primary attempt with JSON format...
[ChatGPT] Primary response successful: 2847 chars, 1234 tokens
[API] Total response time: 8543ms
```

### Timeout (resolvido):

```
[ChatGPT] Primary attempt failed: Request timeout after 15000ms
[ChatGPT] Fallback 1: attempting without JSON format...
[ChatGPT] Fallback 1 successful: 2847 chars
[API] Total response time: 21234ms
```

### Failure rápido:

```
[API] Insufficient time before ChatGPT call
// Retorna 504 imediatamente em vez de tentar e falhar
```

## Performance Esperada

| Etapa             | Antes | Depois   | Melhoria           |
| ----------------- | ----- | -------- | ------------------ |
| Timeout error     | 30s+  | ~20s     | -33%               |
| Sucesso normal    | 8-12s | 8-12s    | ✅ Sem mudança     |
| Memória consumida | N/A   | 📉 Menor | Fire-and-forget DB |

## Próximas Otimizações (Opcional)

1. **Streaming**: Usar `streamChatGPT()` para respostas progressivas
2. **Cache**: Guardar respostas comuns para reduzir latência
3. **Queue**: Implementar fila para requisições simultâneas
4. **CDN Edge Functions**: Usar edge caching no Netlify

## Referências

- [Netlify Function Timeouts](https://docs.netlify.com/functions/overview)
- [OpenAI Node SDK Timeout](https://github.com/openai/node-sdk)
- [Next.js API Routes on Netlify](https://docs.netlify.com/integrations/frameworks)
