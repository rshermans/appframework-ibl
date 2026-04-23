import OpenAI from 'openai'
import { withTimeout, TimeoutError, isAbortedError } from '@/lib/timeoutHelper'
import { API_CONFIG, getTimeRemaining, canContinueProcessing } from '@/lib/apiTimeout'
import { chooseModel, getNextFallbackModel, modelLogTag, type ModelSelection } from '@/lib/modelSelector'

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error('❌ OPENAI_API_KEY not found in environment')
}

const openai = new OpenAI({
  apiKey,
  timeout: API_CONFIG.OPENAI_TIMEOUT_MS,
  maxRetries: 1, // Let our code handle retries
})

function extractResponseText(response: any): string {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim()
  }

  const output = Array.isArray(response?.output) ? response.output : []
  const chunks: string[] = []

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : []
    for (const part of content) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        chunks.push(part.text.trim())
      }
    }
  }

  return chunks.join('\n').trim()
}

function buildJsonInstructions(systemPrompt: string): string {
  return systemPrompt.toLowerCase().includes('json')
    ? systemPrompt
    : systemPrompt + '\n\nRespond with valid JSON only.'
}

function buildJsonInput(userMessage: string): string {
  return userMessage.toLowerCase().includes('json')
    ? userMessage
    : userMessage + '\n\nReturn JSON.'
}

export async function callChatGPT(
  systemPrompt: string,
  userMessage: string,
  stepId: string = 'generic_guidance'
): Promise<{ content: string; tokens: number; model: string }> {
  const startTime = Date.now()
  const failedModels = new Set<string>()

  const instructions = buildJsonInstructions(systemPrompt)
  const input = buildJsonInput(userMessage)

  // Pick the primary model based on step complexity
  let selection = chooseModel(stepId)
  console.log(`🤖 [ChatGPT] Step: ${stepId} → Model: ${modelLogTag(selection)}`)

  while (true) {
    const { model } = selection

    try {
      // Attempt with current model + JSON format
      console.log(`[ChatGPT] Attempting ${modelLogTag(selection)} with JSON format...`)
      const response = await withTimeout(
        openai.responses.create({
          model,
          instructions,
          input,
          max_output_tokens: selection.complexity === 'heavy' ? 3000 : selection.complexity === 'fast' ? 1500 : 2000,
          text: { format: { type: 'json_object' } },
        }),
        { timeoutMs: selection.complexity === 'fast' ? 10000 : 15000 }
      )

      let content = extractResponseText(response)
      const tokens = response.usage?.total_tokens || 0

      // If empty with JSON format, retry same model without format constraint
      if (!content && canContinueProcessing(startTime, 5000)) {
        console.log(`[ChatGPT] Empty response from ${model}, retrying without JSON format...`)
        const retryResponse = await withTimeout(
          openai.responses.create({
            model,
            instructions,
            input,
            max_output_tokens: 3000,
          }),
          { timeoutMs: 12000 }
        )
        content = extractResponseText(retryResponse)
      }

      if (content) {
        console.log(`[ChatGPT] ✅ Success with ${modelLogTag(selection)} — ${content.length} chars, ${tokens} tokens, ${Date.now() - startTime}ms`)
        return { content, tokens, model }
      }

      // Content still empty → treat as failure for this model
      console.warn(`[ChatGPT] ${model} returned empty content`)
      failedModels.add(model)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.warn(`[ChatGPT] ${model} failed: ${errMsg}`)
      failedModels.add(model)
    }

    // ── Try next model in fallback chain ──
    if (!canContinueProcessing(startTime, 4000)) {
      console.error(`[ChatGPT] Timeout budget exhausted after ${Date.now() - startTime}ms. Tried: ${[...failedModels].join(', ')}`)
      break
    }

    const next = getNextFallbackModel(stepId, failedModels)
    if (!next) {
      console.error(`[ChatGPT] All models exhausted: ${[...failedModels].join(', ')}`)
      break
    }

    selection = next
    console.log(`[ChatGPT] 🔄 Switching to fallback: ${modelLogTag(selection)}`)
  }

  // All models failed
  const totalTime = Date.now() - startTime
  const failedList = Array.from(failedModels).join(', ')
  console.error(`[ChatGPT] ❌ ALL MODELS EXHAUSTED after ${totalTime}ms. Tried: [${failedList}]`)
  
  throw new Error(
    `ChatGPT call failed: all models reached timeout or error (${failedList}). ` +
    `Step: ${stepId}, total_elapsed: ${totalTime}ms`
  )
}

/**
 * Prose variant: does NOT force JSON format or inject JSON instructions.
 * Use for conversational assistant responses where natural text is expected.
 */
export async function callChatGPTText(
  systemPrompt: string,
  userMessage: string,
  stepId: string = 'assistant_help',
  maxOutputTokens: number = 250
): Promise<{ content: string; tokens: number; model: string }> {
  const startTime = Date.now()
  const failedModels = new Set<string>()

  let selection = chooseModel(stepId)
  console.log(`🤖 [ChatGPTText] Step: ${stepId} → Model: ${modelLogTag(selection)}`)

  while (true) {
    const { model } = selection
    try {
      const response = await withTimeout(
        openai.responses.create({
          model,
          instructions: systemPrompt,
          input: userMessage,
          max_output_tokens: maxOutputTokens,
          // No json_object format — plain text response
        }),
        { timeoutMs: 12000 }
      )

      const content = extractResponseText(response)
      const tokens = response.usage?.total_tokens || 0

      if (content) {
        console.log(`[ChatGPTText] ✅ ${modelLogTag(selection)} — ${content.length} chars, ${tokens} tokens, ${Date.now() - startTime}ms`)
        return { content, tokens, model }
      }

      console.warn(`[ChatGPTText] ${model} returned empty content`)
      failedModels.add(model)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.warn(`[ChatGPTText] ${model} failed: ${errMsg}`)
      failedModels.add(model)
    }

    if (!canContinueProcessing(startTime, 4000)) break

    const next = getNextFallbackModel(stepId, failedModels)
    if (!next) break

    selection = next
    console.log(`[ChatGPTText] 🔄 Switching to fallback: ${modelLogTag(selection)}`)
  }

  throw new Error(`ChatGPTText failed: all models exhausted. Step: ${stepId}`)
}


export async function streamChatGPT(
  systemPrompt: string,
  userMessage: string,
  onChunk: (chunk: string) => void,
  stepId: string = 'generic_guidance'
): Promise<number> {
  const startTime = Date.now()
  const failedModels = new Set<string>()

  const instructions = buildJsonInstructions(systemPrompt)
  const input = buildJsonInput(userMessage)

  let selection = chooseModel(stepId)
  console.log(`🤖 [StreamChatGPT] Step: ${stepId} → Model: ${modelLogTag(selection)}`)

  while (true) {
    const { model } = selection

    try {
      console.log(`[StreamChatGPT] Attempting ${modelLogTag(selection)} with JSON format...`)
      const response = await withTimeout(
        openai.responses.create({
          model,
          instructions,
          input,
          max_output_tokens: selection.complexity === 'heavy' ? 3000 : selection.complexity === 'fast' ? 1500 : 2000,
          text: { format: { type: 'json_object' } },
        }),
        { timeoutMs: selection.complexity === 'fast' ? 10000 : 15000 }
      )

      let content = extractResponseText(response)
      let tokens = response.usage?.total_tokens || 0

      // If empty with JSON format, retry same model without format constraint
      if (!content && canContinueProcessing(startTime, 5000)) {
        console.log(`[StreamChatGPT] Empty response from ${model}, retrying without JSON format...`)
        const retryResponse = await withTimeout(
          openai.responses.create({
            model,
            instructions,
            input,
            max_output_tokens: 3000,
          }),
          { timeoutMs: 12000 }
        )
        content = extractResponseText(retryResponse)
        tokens = retryResponse.usage?.total_tokens || tokens
      }

      if (content) {
        onChunk(content)
        console.log(`[StreamChatGPT] ✅ Success with ${modelLogTag(selection)} — ${content.length} chars, ${Date.now() - startTime}ms`)
        return tokens
      }

      console.warn(`[StreamChatGPT] ${model} returned empty content`)
      failedModels.add(model)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.warn(`[StreamChatGPT] ${model} failed: ${errMsg}`)
      failedModels.add(model)
    }

    // ── Try next model in fallback chain ──
    if (!canContinueProcessing(startTime, 4000)) {
      console.error(`[StreamChatGPT] Timeout budget exhausted after ${Date.now() - startTime}ms. Tried: ${[...failedModels].join(', ')}`)
      break
    }

    const next = getNextFallbackModel(stepId, failedModels)
    if (!next) {
      console.error(`[StreamChatGPT] All models exhausted: ${[...failedModels].join(', ')}`)
      break
    }

    selection = next
    console.log(`[StreamChatGPT] 🔄 Switching to fallback: ${modelLogTag(selection)}`)
  }

  const totalTime = Date.now() - startTime
  throw new Error(
    `StreamChatGPT failed: all models exhausted (${[...failedModels].join(', ')}). ` +
    `Step: ${stepId}, elapsed: ${totalTime}ms`
  )
}
