# 🤖 Plano de Implementação: Guia Inteligente & Chatbot Assistente (RAG)

Este documento detalha a visão estratégica e técnica para adicionar um assistente inteligente à plataforma **IBL-AI**, focado em orientar a pessoa utilizadora sobre as ações e metodologias da aplicação.

---

## 1. Visão Geral
O objetivo é criar um "Copiloto Metodológico" que resolva dúvidas em tempo real, limitado estritamente ao funcionamento da aplicação e ao framework **Inquiry Based Learning (IBL)**.

### Pilares do Sistema:
1.  **Manual Estático**: Um guia textual estruturado (Markdown).
2.  **Chatbot Dinâmico**: Interface de conversa fluida.
3.  **RAG Core**: Motor que pesquisa no manual para gerar respostas ancoradas em factos.
4.  **Guardlines**: Regras rígidas para evitar alucinações ou respostas fora de contexto.

---

## 2. Arquitetura Proposta

### Camada de Conhecimento (Contexto)
Diferente dos sistemas RAG genéricos, este será alimentado por:
*   **Documentação do Workflow**: Detalhes técnicos da Etapa 0 à Etapa 9 (ver `docs/MANUAL_IBL_FRAMEWORK.md`).
*   **Dicas Éticas**: O repositório de orientações já existente no `lib/iblFramework.ts`.
*   **Mapping Metodológico**: Explicações sobre CRAAP, Epistemologia, etc.

### Stack Técnica
| Componente | Decisão | Justificação |
|------------|-------------------|--------------|
| **Modelo LLM** | **gpt-4o-mini** | Alta velocidade, baixo custo e excelente compreensão de contexto para suporte. |
| **Vetor DB** | Supabase Vector (pgvector) | Já integrado na stack, custo zero adicional. |
| **Embeddings** | OpenAI `text-embedding-3-small` | Alta eficiência e baixo custo. |
| **Interface** | Floating Action Button (FAB) | Não polui a UI principal da investigação. |

---

## 3. Grau de Dificuldade & Estimativa

*   **Esforço Técnico**: 3/5 (Médio)
*   **Tempo Estimado**: 1 a 2 semanas para um MVP funcional.

### Desafios Identificados:
*   **Context Awareness**: O bot precisa de saber em que Etapa o utilizador está.
*   **Latency**: Otimizar a recuperação RAG para respostas quase instantâneas.

---

## 4. Guardlines (Linhas Vermelhas)

1.  **Foco em Ações**: Responde apenas sobre a aplicação ou o IBL.
2.  **Recusa de Conteúdo Externo**: Não escreve ensaios ou responde sobre temas alheios ao IBL.
3.  **Ancoragem em Fontes**: Se não estiver no manual, o bot informa que não sabe.
4.  **Neutralidade Ética**: Não substitui o julgamento humano, apenas explica ferramentas.

---
*Atualizado com a decisão do modelo GPT-4o-Mini.*
