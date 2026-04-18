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
  // Telemetry fields
  sessionId?: string
  metadata?: {
    device?: string
    viewport?: string
    appVersion?: string
    [key: string]: unknown
  }
}

function getDeviceMetadata(): PersistInteractionPayload['metadata'] {
  if (typeof window === 'undefined') return {}
  return {
    device: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    appVersion: '2.0',
  }
}

export async function persistInteractionEvent(
  payload: PersistInteractionPayload
): Promise<void> {
  const enrichedPayload = {
    ...payload,
    metadata: {
      ...getDeviceMetadata(),
      ...payload.metadata,
    },
  }

  await fetch('/api/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enrichedPayload),
  })
}