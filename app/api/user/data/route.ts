import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SESSION_COOKIE_NAME } from '@/lib/sessionClient'

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    const body = await req.json().catch(() => ({}))
    const projectId = typeof body?.projectId === 'string' ? body.projectId : ''
    const mode = body?.mode === 'all' ? 'all' : 'project'
    const confirmationText = typeof body?.confirmationText === 'string' ? body.confirmationText : ''

    if (userId) {
      if (mode === 'all') {
        if (confirmationText !== 'DELETE_ALL_MY_PROJECTS') {
          return NextResponse.json(
            { ok: false, error: 'Explicit confirmation is required for deleting all projects' },
            { status: 400 }
          )
        }

        const deletedProjects = await prisma.project.deleteMany({ where: { userId } })
        return NextResponse.json({ ok: true, scope: 'user', deletedProjects: deletedProjects.count })
      }

      if (!projectId) {
        return NextResponse.json(
          { ok: false, error: 'projectId is required for project delete' },
          { status: 400 }
        )
      }

      const deletedProject = await prisma.project.deleteMany({ where: { id: projectId, userId } })
      if (deletedProject.count === 0) {
        return NextResponse.json(
          { ok: false, error: 'Project ownership could not be verified' },
          { status: 403 }
        )
      }

      return NextResponse.json({ ok: true, scope: 'project', deletedProjects: deletedProject.count })
    }

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: 'projectId is required for anonymous delete' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const cookieProjectId = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!cookieProjectId || cookieProjectId !== projectId) {
      return NextResponse.json(
        { ok: false, error: 'Project ownership could not be verified' },
        { status: 403 }
      )
    }

    await prisma.project.delete({ where: { id: projectId } })
    return NextResponse.json({ ok: true, scope: 'project', deletedProjects: 1 })
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: 'Failed to delete data', details }, { status: 500 })
  }
}
