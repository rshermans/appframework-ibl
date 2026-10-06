# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste ficheiro.

O formato está baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto segue [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Não lançado]

### Corrigido
- Login Google: provider só registado com credenciais, sessão JWT, erros visíveis (ver `docs/AUTH_GOOGLE_SETUP.md`).
- Mind map (Markmap) e mapa conceptual desenhado como grafo; filtros e acesso da telemetria.

### Alterado
- Layout: aplicação com uma só zona de scroll (barra superior fixa, passos em coluna lateral no desktop e faixa fixa no telemóvel, barra de ações Anterior/Seguinte sempre visível, `100dvh`).
- Mind map, perfil, progresso e diálogos abrem sobrepostos (componente `Drawer`: Esc, foco, bloqueio de scroll) em vez de empurrar a página; o progresso flutuante passou para a barra superior.
- Barra de nove botões substituída por um menu "Mais" (exportar, privacidade, ações destrutivas separadas).
- Código: `Step3Evidence`, `Step2Search`, `Step4Structure`, `Step5Explanation` e `app/page.tsx` divididos em módulos/hooks/componentes; 112 testes (Vitest) e CI a bloquear em lint, tipos e testes.
- Stage 1: stepper com progresso, próximo passo recomendado e navegação Anterior/Seguinte.
- O progresso passa a ser guardado em `localStorage` neste dispositivo (migra sessões antigas); política de privacidade atualizada.
- Stage 2: audiência única (geral / escola / académico) aplicada a todos os formatos e às exportações NotebookLM, com regras de integridade científica nos prompts.

## [1.0.0] - 2026-04-12

### 🎉 Lançamento Inicial

#### ✨ Adicionado

- Framework IBL completo com wizard interativo (5 etapas)
- Integração OpenAI para geração de conteúdo e análise
- Busca semântica avançada com embedding
- Geração automática de questões de pesquisa
- Síntese de evidências baseada em IA
- Estruturação automática de resultados
- Exportação de projetos (JSON, Markdown)
- Base de dados PostgreSQL com Prisma ORM
- Suporte multilíngue (i18n) - PT, EN
- Dashboard responsivo com Tailwind CSS
- Gestão de estado com Zustand
- Autenticação e autorização (base)
- Documentação técnica completa
- GitHub Actions para CI/CD (base)

#### 🔧 Configuração

- Setup Next.js 14 com App Router
- TypeScript para type safety
- Prisma com Supabase
- Tailwind CSS para styling
- PostCSS para processamento CSS
- ESLint para code quality
- Batch start script (Windows)

#### 📚 Documentação

- README com guia completo
- System Architecture doc
- Contributing guidelines
- LICENSE (MIT)
- Inline code comments

#### 🐛 Corrigido

- Configuração inicial do ambiente
- Sincronização de dados da BD

#### 🚀 Performance

- Otimização de bundles Next.js
- Lazy loading de componentes
- Caching inteligente API

---

## Roadmap Futuro

### v1.1.0 (Próximo)

- [ ] Autenticação com GitHub/Google
- [ ] Melhorias UI/UX
- [ ] Testes automatizados
- [ ] Dashboard analytics

### v1.2.0

- [ ] Suporte Claude API
- [ ] Suporte Google Gemini
- [ ] Colaboração em tempo real (WebSocket)

### v2.0.0

- [ ] Mobile app nativa (React Native)
- [ ] Sistema de templates
- [ ] API pública documentada
- [ ] Plugin system

---

## Como Reportar Problemas

Se encontrar bugs ou tiver sugestões, abra uma [Issue](https://github.com/rshermans/appframework-ibl/issues) no GitHub.

## Como Contribuir

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para guidelines de contribuição.

---

**Última atualização:** 12 de Abril, 2026
