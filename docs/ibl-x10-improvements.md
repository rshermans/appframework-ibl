# IBL Research Framework — X10 Strategic Improvements

Este documento lista as 10 melhorias prioritárias para elevar a robustez e a experiência do utilizador (UX) do IBL Research Framework.

1. **Resiliência Backend Multi-Model**: Implementar um sistema de failover que mude automaticamente entre modelos (ex: GPT-4o para Claude ou Gemini) quando ocorrem timeouts na Netlify (limite de 26s).
2. **UX de Tooltips de Alto Contraste**: Reposicionar tooltips para o topo dos componentes e utilizar um esquema de cores de alto contraste (fundo escuro/on-surface) para garantir legibilidade em qualquer contexto.
3. **Tipografia Académica Justificada**: Implementar justificação de texto com hifenização inteligente em todos os blocos de conteúdo e explicações científicas, melhorando a mancha gráfica.
4. **Sistema de "Silent Retries" no Frontend**: Se uma chamada de API falhar por timeout, o frontend deve tentar novamente de forma silenciosa e transparente antes de mostrar um erro ao utilizador.
5. **Indicadores de "Fidelidade de Evidência"**: Adicionar visualizadores de contraste que mostrem se o texto gerado pela IA mantém a fidelidade às fontes citadas no Stage 1.
6. **Controlo UX no Designer (Tailwind Tokens)**: Centralizar todos os tokens de design (cores, sombras, raios) para garantir que qualquer alteração no "vibe" seja refletida instantaneamente em toda a aplicação.
7. **Tratamento de Erros Falante**: Em vez de mensagens genéricas, o sistema deve explicar por que falhou (ex: "A IA está a demorar mais do que o esperado") e oferecer soluções imediatas.
8. **Micro-animações de Feedback**: Adicionar transições suaves e estados de "loading" mais ricos (Skeleton screens) para reduzir a perceção de tempo de espera em processamento pesado.
9. **Componente 'Ethical Tip' de Alto Impacto**: Implementar as dicas éticas como elementos premium (glassmorphism) que chamam a atenção sem interromper o fluxo de trabalho.
10. **Exportação Multimodal (Stage 2 Prep)**: Preparar a estrutura de dados para suportar Posters, Podcasts e Vídeos, garantindo que o backend consiga processar estes pedidos de longa duração.

---
*Vibe Code Version 1.0 — PhD4Moz Integration*
