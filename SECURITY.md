# 🔒 Security Policy

## Reportar Vulnerabilidades de Segurança

Se descobrir uma vulnerabilidade de segurança, **não abra uma issue pública**. 

Em vez disso, envie um email para: **security@appframework.dev**

Inclua:
- Descrição da vulnerabilidade
- Impacto potencial
- Passos para reproduzir (se possível)
- Sugestão de fix (opcional)

**Fazemos o máximo para responder em 48 horas.**

## 🛡️ Práticas de Segurança

### Variáveis de Ambiente

✅ **Faça:**
- Use `.env.local` para configuração local
- Nunca commita `.env.local`
- Armazene secrets em plataformas seguras (Vercel, Railway, etc)

❌ **Não faça:**
- Hardcode API keys no código
- Commitar secrets
- Partilhar credenciais em Slack/Email

### Autenticação

- Implementar autenticação forte (OAuth, JWT, Sessions)
- Password hashing com bcrypt ou Argon2
-2FA quando possível
- Sessions com timeouts configurados

### Dados Sensíveis

- Nunca registar passwords ou tokens
- Especificar dados PII (Personally Identifiable Information)
- Usar HTTPS em todos os endpoints
- Criptografar dados em repouso e em trânsito

### Database

- Usar prepared statements (Prisma faz por si)
- Implementar Row Level Security (RLS) no Supabase
- Backups regulares
- Audit logs para operações críticas

### API

- Rate limiting para prevenir brute force
- CORS configurado restritivamente
- Validação de input em todos os endpoints
- Sanitizar output para prevenir XSS

### Dependencies

```bash
# Verificar vulnerabilidades
npm audit

# Atualizar packages
npm update

# Auditar periodicamente
npm audit --production
```

### Code Review

- Todas as mudanças requerem revisão antes de merge
- Manter olho em práticas de segurança
- Use tools como:
  - [Dependabot](https://dependabot.com/) - Atualizar dependencies
  - [Snyk](https://snyk.io/) - Análise de vulnerabilidades

## 🔐 Configuração de Produção

### Environment

```bash
NODE_ENV=production
security_headers=true
```

### Headers de Segurança

Configurar no `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    },
  ];
}
```

### HTTPS

- ✅ Forçar HTTPS em produção
- ✅ Usar certificado SSL/TLS válido
- ✅ Renovar certificados automaticamente

### Database Security

```prisma
// Use row-level security no Supabase
model User {
  id       String  @id @default(cuid())
  email    String  @unique
  password String  // Hashed
  role     Role    @default(USER)
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

## 📋 Security Checklist

### Before Production

- [ ] Todas as secrets em variáveis de ambiente
- [ ] HTTPS configurado
- [ ] Database backups testados
- [ ] CORS configurado restritivamente
- [ ] Rate limiting implementado
- [ ] Input validation em todos os forms
- [ ] OWASP Top 10 checklist feito
- [ ] Dependências auditadas (`npm audit`)
- [ ] Testes de segurança executados
- [ ] Security headers configurados

### Regular

- [ ] Atualizar dependencies (`npm update`)
- [ ] Auditar código fonte
- [ ] Monitorar logs de segurança
- [ ] Testar backups
- [ ] Penetration testing (anual)

## 🚨 Resposta a Incidentes

Se uma vulnerabilidade for descoberta após go-live:

1. **Assess** - Avaliar severidade e impacto
2. **Isolate** - Desabilitar funcionalidade afetada se necessário
3. **Fix** - Implementar patch
4. **Verify** - Testar o patch
5. **Deploy** - Fazer deploy em produção
6. **Communicate** - Informar utilizadores se necessário
7. **Post-mortem** - Análise de como evitar no futuro

## 📚 Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Next.js Security](https://nextjs.org/learn/foundations/how-nextjs-works/security-best-practices)
- [Prisma Security](https://www.prisma.io/docs/orm/overview/security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

## 🔄 Versioning e Updates

Seguimos [Semantic Versioning](https://semver.org/):
- **MAJOR** - Breaking changes
- **MINOR** - Novas features
- **PATCH** - Bug fixes

Security patches com versão PATCH devem ser aplicadas ASAP.

---

Obrigado por ajudar a manter o AppFramework IBL seguro! 🙏
