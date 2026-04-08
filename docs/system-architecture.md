# System Architecture

## Central Position

RELIA Wizard is not an AI-first product.
It is a workflow-first system where AI is one module inside a cognitive process.

## Layered Model

1. User Interface
- Wizard flow
- Step-by-step decisions
- Progressive disclosure

2. Workflow Orchestrator
- Step contracts
- Transition rules
- Human decision checkpoints

3. State Layer
- Zustand for active session state
- Prisma/DB for persistence

4. AI Engine
- Prompt registry
- API route
- Structured responses

5. External Knowledge Layer
- NotebookLM
- Papers
- Search databases

## Canonical Engineering Files

- `lib/prompts.ts` -> canonical prompt registry
- `types/research-workflow.ts` -> domain model and contracts
- `lib/workflow.ts` -> state machine and transition rules
- `store/wizardStore.ts` -> active session state
- `app/api/ai/route.ts` -> AI orchestration entry point

## Runtime Data Flow

UI -> Store -> API Route -> Prompt Builder -> AI -> Structured Output -> Store -> UI

## Non-Negotiable Rules

- No direct AI calls from UI
- Every step must define input, output, store write, and next step
- Human approval is required before locking final decisions
- Structured output is preferred over free text
