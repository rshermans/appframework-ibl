interface PersistInteractionPayload {
  projectId: string
  stage: number
  stepId: string
  stepLabel: string
  userInput: string
  aiOutput: string
  topic?: string
  mode?: string
  locale?: string
}

export async function persistInteractionEvent(payload: PersistInteractionPayload): Promise<void> {
  await fetch('/api/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}