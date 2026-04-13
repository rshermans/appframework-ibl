import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error('❌ OPENAI_API_KEY not found in environment')
}

const openai = new OpenAI({
  apiKey,
})

export async function callChatGPT(
  systemPrompt: string,
  userMessage: string
): Promise<{ content: string; tokens: number }> {
  try {
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini'
    console.log(`🤖 [ChatGPT] Calling model: ${model}`)
    
    const response = await openai.responses.create({
      model,
      instructions: systemPrompt,
      input: userMessage,
      max_output_tokens: 2000,
    })

    const content = response.output_text || ''
    const tokens = response.usage?.total_tokens || 0

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
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      instructions: systemPrompt,
      input: userMessage,
      max_output_tokens: 2000,
    })

    const content = response.output_text || ''
    if (content) {
      onChunk(content)
    }

    return response.usage?.total_tokens || 0
  } catch (error) {
    console.error('ChatGPT Stream Error:', error)
    throw error
  }
}
