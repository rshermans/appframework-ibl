import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { callChatGPT } from '@/lib/ai'
import { parseAiJson } from '@/lib/parseAiJson'

export async function enrichInteraction(interactionId: string) {
  try {
    const interaction = await prisma.projectInteraction.findUnique({
      where: { id: interactionId },
    })

    if (!interaction) {
      console.warn(`[Telemetry] Interaction ${interactionId} not found.`)
      return
    }

    const systemPrompt = `
      You are a Learning Analytics Expert. Analyze the following Human-AI interaction within an Inquiry-Based Learning (IBL) framework.
      
      Context:
      - Stage: ${interaction.stage}
      - Step: ${interaction.stepId} (${interaction.stepLabel})
      
      User Input: "${interaction.userInput}"
      AI Output: "${interaction.aiOutput}"
      
      Extract the following analytical layers in JSON format:
      1. Cognitive Layer:
         - bloom_level: (remembering, understanding, applying, analyzing, evaluating, creating)
         - complexity_score: (0.0 to 1.0)
         - argumentation_level: (low, medium, high)
         - autonomy_index: (0.0 to 1.0)
      2. Affective Layer:
         - sentiment: (positive, neutral, negative)
         - confidence: (0.0 to 1.0)
         - frustration_index: (0.0 to 1.0)
         - engagement_signal: (0.0 to 1.0)
      3. Learning Layer:
         - progression_score: (0.0 to 1.0)
         - skill_evolution_trend: (increasing, stable, decreasing)
      
      Respond with valid JSON ONLY.
    `

    const userMessage = `Process interaction ${interactionId}.`

    // Use gpt-4o-mini for cost-effective enrichment
    const { content } = await callChatGPT(systemPrompt, userMessage, 'telemetry_enrichment')
    const raw = parseAiJson(content)
    // Cast to Prisma-compatible JSON value type
    const asJson = (v: unknown) =>
      v != null ? (v as Prisma.InputJsonValue) : Prisma.JsonNull

    await prisma.projectInteraction.update({
      where: { id: interactionId },
      data: {
        cognitiveFeatures: asJson((raw as Record<string, unknown>)?.cognitive),
        affectiveFeatures: asJson((raw as Record<string, unknown>)?.affective),
        learningMetrics: asJson((raw as Record<string, unknown>)?.learning),
        processedAt: new Date(),
      },
    })

    console.log(`[Telemetry] ✅ Interaction ${interactionId} enriched successfully.`)
  } catch (error) {
    console.error(`[Telemetry] ❌ Failed to enrich interaction ${interactionId}:`, error)
  }
}
