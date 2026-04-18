// Using native fetch
async function testAssistant() {
  console.log('--- Testing Assistant API ---');
  try {
    const response = await fetch('http://localhost:3011/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'O que devo fazer na Etapa 0?' }],
        locale: 'pt-PT'
      })
    });

    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('AI Response:', data.content);
    if (data.ok && data.content.includes('Preparação') || data.content.includes('Team Setup')) {
      console.log('✅ TEST PASSED: Response contains manual context.');
    } else {
      console.log('❌ TEST FAILED: Response might be missing context.');
    }
  } catch (err) {
    console.error('❌ TEST ERROR:', err.message);
  }
}

testAssistant();
