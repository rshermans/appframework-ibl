import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function main() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      _count: { select: { interactions: true } },
    },
  })

  console.log('\n=== Últimos Projetos ===')
  if (projects.length === 0) {
    console.log('(nenhum projeto encontrado)')
  } else {
    projects.forEach(p => {
      console.log(`• [${p.createdAt.toISOString()}] "${p.topic}" | stage=${p.stage} step=${p.step} | interações=${p._count.interactions} | userId=${p.userId ?? 'anónimo'}`)
    })
  }

  const interactions = await prisma.projectInteraction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      projectId: true,
      stage: true,
      stepId: true,
      stepLabel: true,
      tokens: true,
      createdAt: true,
    },
  })

  console.log('\n=== Últimas Interações ===')
  if (interactions.length === 0) {
    console.log('(nenhuma interação encontrada)')
  } else {
    interactions.forEach(i => {
      console.log(`• [${i.createdAt.toISOString()}] stage=${i.stage} ${i.stepId} — "${i.stepLabel}" | tokens=${i.tokens} | projeto=${i.projectId}`)
    })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, email: true, createdAt: true },
  })

  console.log('\n=== Utilizadores registados ===')
  if (users.length === 0) {
    console.log('(nenhum utilizador registado)')
  } else {
    users.forEach(u => {
      console.log(`• [${u.createdAt.toISOString()}] ${u.name ?? '(sem nome)'} <${u.email}>`)
    })
  }
}

main()
  .catch(e => console.error('Erro:', e.message))
  .finally(() => prisma.$disconnect())