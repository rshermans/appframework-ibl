# IBL Vibe Code — Backend Flow & Robustness

Este documento define as diretrizes para garantir que o backend do IBL Research Framework seja resiliente a falhas e mantenha a integridade da experiência do utilizador.

## 1. Gestão de Timeouts (Resiliência)
- **Limite Netlify**: Respeitar o limite de 26 segundos das funções serverless.
- **Failover em Cascata**: Se o modelo primário demorar mais de 15s sem resposta, transitar para um modelo de fallback mais rápido (ex: 4o-mini).
- **Silent Retry**: O cliente (frontend) deve implementar retroalimentação automática em caso de erros 504 ou 429.

## 2. Estrutura de Respostas e Erros
- **Esquema JSON Consistente**: Todas as rotas de API devem retornar `{ ok: boolean, data?: any, error?: string, details?: any }`.
- **Status Codes Semânticos**:
    - `400`: Inputs em falta ou inválidos.
    - `429`: Limite de quota da IA atingido.
    - `504`: Timeout de processamento (Gateway Timeout).
    - `500`: Erro inesperado de lógica.

## 3. Integridade de Dados
- **Fire-and-Forget Logging**: Guardar interações na base de dados (Prisma) de forma assíncrona para não atrasar a resposta ao utilizador.
- **Consistência de Estado**: Validar se o `projectId` e o `stage` são consistentes antes de processar pedidos de IA.

## 4. Flow de Falhas de IA
- **Fallback de Contexto**: Se a extração de evidência falhar, oferecer prompts alternativos baseados no conhecimento já armazenado.
- **Human-in-the-loop**: Sempre que a IA falhar ou der uma resposta vazia, o sistema deve permitir que o utilizador edite manualmente a secção correspondente.

---
*Vibe Code Version 1.0 — PhD4Moz Integration*
