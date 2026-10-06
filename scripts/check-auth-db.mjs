// Verifica se as tabelas necessárias ao login (e ao resto da app) existem na base de dados.
// Uso: DATABASE_URL="postgresql://..." node scripts/check-auth-db.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const REQUIRED = ['Project', 'ProjectInteraction', 'User', 'Account', 'Session', 'VerificationToken']

try {
  const rows = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  const existing = new Set(rows.map((row) => row.table_name))
  let missing = 0
  for (const table of REQUIRED) {
    const ok = existing.has(table)
    if (!ok) missing += 1
    console.log(`${ok ? 'OK     ' : 'FALTA  '} ${table}`)
  }
  console.log(
    missing === 0
      ? '\nTudo certo: o schema suporta o login.'
      : `\n${missing} tabela(s) em falta. Execute prisma/supabase-auth-tables.sql no Supabase (SQL Editor).`
  )
  process.exitCode = missing === 0 ? 0 : 1
} catch (error) {
  console.error('Não foi possível ligar à base de dados:', error instanceof Error ? error.message : error)
  console.error('Verifique DATABASE_URL e se o projeto Supabase não está pausado.')
  process.exitCode = 2
} finally {
  await prisma.$disconnect()
}
