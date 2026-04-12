# Guia de Contribuição

Obrigado por considerar contribuir para o **AppFramework IBL**! Este documento fornece guidelines e instruções para contribuir com código, documentação ou reports de bugs.

## 📋 Código de Conduta

- Ser respeitoso e inclusivo com todos os participantes
- Alertar comportamentos inapropriados aos maintainers
- Focar em colaboração e melhoria contínua

## 🚀 Começar a Contribuir

### 1. Fork o Repositório

```bash
# Crie sua cópia do repo
git clone https://github.com/seu-usuario/appframework-ibl.git
cd appframework-ibl
```

### 2. Configurar Ambiente

```bash
# Instale dependências
npm install

# Configure variables de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### 3. Crie uma Branch

```bash
# Para features
git checkout -b feature/descricao-feature

# Para bug fixes
git checkout -b fix/descricao-bug

# Para documentation
git checkout -b docs/descricao-docs
```

## ✅ Padrões de Código

### TypeScript

- ✅ Use `camelCase` para variáveis e funções
- ✅ Use `PascalCase` para componentes e classes
- ✅ Evite `any` - sempre use tipos específicos
- ✅ Add docstrings em funções complexas

```typescript
// ✅ Bom
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

function formatUserName(profile: UserProfile): string {
  return `${profile.name} (${profile.email})`;
}

// ❌ Ruim
function formatUserName(user: any): any {
  return `${user.name} (${user.email})`;
}
```

### React Components

- ✅ Componentes funcionais com hooks
- ✅ Props tipadas corretamente
- ✅ Nomeie componentes com PascalCase
- ✅ Mantenha componentes pequenos e reutilizáveis

```typescript
// ✅ Bom
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function CustomButton({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// ❌ Ruim
export function CustomButton(props: any) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### Commits

Siga o padrão **Conventional Commits**:

```
type(scope): subject

type:
  - feat: nova feature
  - fix: correção de bug
  - docs: documentação
  - style: formatação
  - refactor: refatorização
  - perf: performance
  - test: testes

Exemplos:
- feat(wizard): adicionar novo step de configuração
- fix(api): corrigir erro na busca semântica
- docs(readme): atualizar instruções instalação
- refactor(components): simplificar lógica comum
```

## 🧪 Testes

Antes de submeter, execute:

```bash
# Lint check
npm run lint

# Build check
npm run build

# Prisma check
npm run prisma:generate
```

## 📤 Submeter Pull Request

1. **Push sua branch:**

   ```bash
   git push origin feature/sua-feature
   ```

2. **Abra Pull Request** no GitHub com:
   - Título descritivo
   - Descrição clara das mudanças
   - Link para issues relacionadas (se houver)
   - Screenshots (se UI changes)

3. **Template de PR:**

   ```markdown
   ## Descrição

   Descrição clara do que foi mudado e por quê.

   ## Tipo de Mudança

   - [ ] Bug fix (correção de bug)
   - [ ] Nova feature
   - [ ] Breaking change
   - [ ] Documentação

   ## Como Testar

   Instruções para testar as mudanças.

   ## Issues Relacionadas

   Closes #123

   ## Checklist

   - [ ] Meu código segue os padrões do projeto
   - [ ] Executei `npm run lint`
   - [ ] Executei testes locais
   - [ ] Atualizei documentação se necessário
   ```

## 🐛 Reportar Bugs

Use o template de Issue no GitHub:

1. **Título:** Descrição concisa do bug
2. **Descrição:** Detalhes completos
3. **Passos para Reproduzir:**
   ```
   1. Vá para...
   2. Clique em...
   3. Observe o erro...
   ```
4. **Comportamento Esperado:** O que deveria acontecer
5. **Screenshots:** Se relevante
6. **Ambiente:**
   - OS: (Windows/Mac/Linux)
   - Node version: (npm --version)
   - Browser: (se web)

## 📚 Documentação

- Mantenha docs sincronizada com código
- Use Markdown com formatação clara
- Add exemplos de código quando apropriado
- Incluir screenshots/diagrams para features UI

## 🔄 Processo de Review

1. Maintainers reviram sua PR
2. Pode haver comentários/pedidos de mudanças
3. Quando aprovado, será merged para `main`
4. Sua contribuição aparecerá no CHANGELOG

## ❓ Dúvidas?

- 💬 Crie uma Discussion no GitHub
- 📧 Contacte os maintainers
- 📖 Leia a documentação em [docs/](docs/)

---

Obrigado por contribuir para melhorar o AppFramework IBL! 🎉
