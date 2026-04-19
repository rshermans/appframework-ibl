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

import { useWizardStore } from '@/store/wizardStore'

export async function persistInteractionEvent(
  payload: PersistInteractionPayload
): Promise<void> {
  const sessionId = payload.sessionId || useWizardStore.getState().sessionId

  const enrichedPayload = {
    ...payload,
    sessionId,
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