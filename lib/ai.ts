import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error('❌ OPENAI_API_KEY not found in environment')
}

const openai = new OpenAI({
  apiKey,
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
  userMessage: string
): Promise<{ content: string; tokens: number }> {
  try {
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini'
    console.log(`🤖 [ChatGPT] Calling model: ${model}`)

    const instructions = buildJsonInstructions(systemPrompt)
    const input = buildJsonInput(userMessage)

    const primaryResponse = await openai.responses.create({
      model,
      instructions,
      input,
      max_output_tokens: 4000,
      text: {
        format: {
          type: 'json_object',
        },
      },
    })

    let content = extractResponseText(primaryResponse)
    let tokens = primaryResponse.usage?.total_tokens || 0

    // Fallback 1: some model+SDK combinations can return empty output when
    // json_object format is enforced. Retry once without format constraint.
    if (!content) {
      const fallbackResponse = await openai.responses.create({
        model,
        instructions,
        input,
        max_output_tokens: 4000,
      })

      content = extractResponseText(fallbackResponse)
      tokens = fallbackResponse.usage?.total_tokens || tokens
    }

    // Fallback 2: try structured role messages for models that behave better
    // with explicit system/user input items.
    if (!content) {
      const structuredResponse = await openai.responses.create({
        model,
        input: [
          { role: 'system', content: instructions },
          { role: 'user', content: input },
        ],
        max_output_tokens: 3000,
      })

      content = extractResponseText(structuredResponse)
      tokens = structuredResponse.usage?.total_tokens || tokens
    }

    if (!content) {
      throw new Error('AI returned an empty response payload.')
    }

    return { content, tokens }
  } catch (error) {
    console.error('ChatGPT Error:', error)
    throw error
  }
}

export async function streamChatGPT(
  systemPrompt: string,
  userMessage: string,
  onChunk: (chunk: string) => void
): Promise<number> {
  try {
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini'
    const instructions = buildJsonInstructions(systemPrompt)
    const input = buildJsonInput(userMessage)

    const primaryResponse = await openai.responses.create({
      model,
      instructions,
      input,
      max_output_tokens: 2000,
      text: {
        format: {
          type: 'json_object',
        },
      },
    })

    let content = extractResponseText(primaryResponse)
    let tokens = primaryResponse.usage?.total_tokens || 0

    if (!content) {
      const fallbackResponse = await openai.responses.create({
        model,
        instructions,
        input,
        max_output_tokens: 3000,
      })
      content = extractResponseText(fallbackResponse)
      tokens = fallbackResponse.usage?.total_tokens || tokens
    }

    if (!content) {
      const structuredResponse = await openai.responses.create({
        model,
        input: [
          { role: 'system', content: instructions },
          { role: 'user', content: input },
        ],
        max_output_tokens: 3000,
      })
      content = extractResponseText(structuredResponse)
      tokens = structuredResponse.usage?.total_tokens || tokens
    }

    if (!content) {
      throw new Error('AI returned an empty response payload.')
    }

    onChunk(content)

    return tokens
  } catch (error) {
    console.error('ChatGPT Stream Error:', error)
    throw error
  }
}
