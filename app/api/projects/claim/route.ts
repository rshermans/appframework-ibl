import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const projectId = typeof body?.projectId === 'string' ? body.projectId : ''

    if (!projectId) {
      return NextResponse.json({ ok: false, error: 'projectId is required' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    })

    if (!project) {
      return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 })
    }

    if (project.userId && project.userId !== userId) {
      return NextResponse.json({ ok: false, error: 'Project already claimed by another user' }, { status: 403 })
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { userId },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: 'Failed to claim project', details }, { status: 500 })
  }
}
