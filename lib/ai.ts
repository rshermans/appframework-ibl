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
  userMessage: string,
  temperature: number = 0.7
): Promise<{ content: string; tokens: number }> {
  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    console.log(`🤖 [ChatGPT] Calling model: ${model}`)
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content || ''
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
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content || ''
    if (content) {
      onChunk(content)
    }

    return response.usage?.total_tokens || 0
  } catch (error) {
    console.error('ChatGPT Stream Error:', error)
    throw error
  }
}
