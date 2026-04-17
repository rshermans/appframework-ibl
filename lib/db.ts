import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function saveInteraction(
  projectId: string,
  stage: number,
  stepId: string,
  stepLabel: string,
  userInput: string,
  aiOutput: string,
  topic?: string,
  mode?: string,
  tokens: number = 0,
  userId?: string
) {
  // Ensure the parent project exists before writing interaction rows.
  await prisma.project.upsert({
    where: { id: projectId },
    update: {
      topic: topic || 'Untitled project',
      stage,
      step: stepId,
      ...(userId ? { userId } : {}),
    },
    create: {
      id: projectId,
      topic: topic || 'Untitled project',
      stage,
      step: stepId,
      ...(userId ? { userId } : {}),
    },
  })

  return prisma.projectInteraction.create({
    data: {
      projectId,
      stage,
      stepId,
      stepLabel,
      userInput,
      aiOutput,
      mode,
      tokens,
    },
  })
}

export async function getProjectInteractions(projectId: string) {
  return prisma.projectInteraction.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  })
}
