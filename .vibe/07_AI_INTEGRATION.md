# AI Integration

## Strategy

AI is modular, not central.

## Layers

1. Prompt Builder
2. API Route
3. Response Formatter

## Rule

Never call AI directly from UI

Always:
UI → API → AI → Response → UI
