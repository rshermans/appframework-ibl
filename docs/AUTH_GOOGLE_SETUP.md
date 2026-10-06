# Login com Google (NextAuth / Auth.js v5)

A sessao usa um cookie JWT assinado (`session.strategy = 'jwt'`). A base de dados
(Supabase) continua a guardar `User` e `Account`, mas **nao e consultada em cada pedido**.
Nao ha alteracoes de schema nem migracoes associadas a esta configuracao.

## Variaveis de ambiente (Netlify → Site configuration → Environment variables)

| Variavel | Valor |
| --- | --- |
| `AUTH_SECRET` | string aleatoria longa (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | credenciais OAuth da Google |
| `AUTH_URL` | URL publico do site, ex. `https://o-seu-site.netlify.app` |
| `DATABASE_URL` / `DIRECT_URL` | ligacao Supabase (pooler / direta) |
| `TELEMETRY_ADMIN_EMAILS` | (opcional) emails com acesso a `/telemetry` |

Se `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` faltarem, o botao Google e substituido por um aviso.

## Google Cloud Console → APIs & Services → Credentials

1. **Authorized redirect URIs** (tem de coincidir exatamente, sem barra final):
   - `https://o-seu-site.netlify.app/api/auth/callback/google`
   - `http://localhost:3011/api/auth/callback/google`
2. **Authorized JavaScript origins**: `https://o-seu-site.netlify.app` e `http://localhost:3011`.
3. **OAuth consent screen**:
   - Estado *Testing* → so contas listadas em **Test users** conseguem entrar; as restantes veem
     "Acesso bloqueado" / `access_denied`. Adicione as contas ou publique a app (*In production*).
4. A Google **nao aceita wildcards**: os *deploy previews* do Netlify (URLs diferentes) nao funcionam
   a menos que cada URL seja registado. Teste no dominio principal.

## Diagnostico rapido

| Sintoma | Causa provavel |
| --- | --- |
| Pagina da Google: `redirect_uri_mismatch` | Redirect URI nao registado / `AUTH_URL` errado |
| Pagina da Google: "Acesso bloqueado" / `access_denied` | App em *Testing* e conta fora de *Test users* |
| `/?error=Configuration` | Falta `AUTH_SECRET` |
| `/?error=Callback` | Falha ao gravar o utilizador (ver base de dados) |

Os erros aparecem agora na app e nos logs das functions do Netlify (`[auth][error]`).

## Verificar a base de dados (Supabase)

`node scripts/check-db.mjs` (com `DATABASE_URL` definido) lista os ultimos projetos e interacoes.
Projetos gratuitos do Supabase sao **pausados por inatividade** — reative no dashboard se necessario.
