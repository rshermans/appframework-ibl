import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import jsPDF from 'jspdf'

export const runtime = 'nodejs'

// Layout constants
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 16
const CONTENT_W = PAGE_W - MARGIN * 2
const LINE_SM = 4.5
const LINE_MD = 6
const LINE_LG = 8

// IBL-AI brand colors (RGB)
const COLOR_PRIMARY = [30, 64, 175] as const    // blue-800
const COLOR_ACCENT  = [22, 163, 74] as const    // green-600
const COLOR_TEXT    = [30, 30, 40] as const     // near-black
const COLOR_MUTED   = [100, 116, 139] as const  // slate-500
const COLOR_RULE    = [226, 232, 240] as const  // slate-200
const COLOR_BG_PILL = [239, 246, 255] as const  // blue-50

type RGB = readonly [number, number, number]

function setColor(pdf: jsPDF, rgb: RGB) {
  pdf.setTextColor(rgb[0], rgb[1], rgb[2])
}

function setFill(pdf: jsPDF, rgb: RGB) {
  pdf.setFillColor(rgb[0], rgb[1], rgb[2])
}

function addRule(pdf: jsPDF, y: number, w = CONTENT_W) {
  pdf.setDrawColor(COLOR_RULE[0], COLOR_RULE[1], COLOR_RULE[2])
  pdf.setLineWidth(0.3)
  pdf.line(MARGIN, y, MARGIN + w, y)
}

// ── Header ──────────────────────────────────────────────────────────────────
function addPageHeader(pdf: jsPDF): number {
  let y = 14

  // Blue gradient pill bar
  setFill(pdf, COLOR_PRIMARY)
  pdf.roundedRect(MARGIN, y - 5, CONTENT_W, 16, 3, 3, 'F')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor(255, 255, 255)
  pdf.text('IBL-AI Research Platform', MARGIN + 4, y + 5)

  // Subtitle right-aligned
  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Universidade do Minho · Inquiry-Based Learning', PAGE_W - MARGIN - 2, y + 5, { align: 'right' })

  y += 18
  return y
}

// ── Section heading ──────────────────────────────────────────────────────────
function addSection(pdf: jsPDF, title: string, y: number): number {
  if (y > PAGE_H - 25) {
    pdf.addPage()
    y = addPageHeader(pdf) + 4
  }

  // Accent left bar
  pdf.setFillColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2])
  pdf.rect(MARGIN, y - 1, 2, 6, 'F')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  setColor(pdf, COLOR_PRIMARY)
  pdf.text(title, MARGIN + 5, y + 4)
  y += 9
  addRule(pdf, y)
  y += 4
  return y
}

// ── Wrapped text block ────────────────────────────────────────────────────────
function addBlock(pdf: jsPDF, label: string, value: string, y: number, pageBreakThreshold = 30): number {
  if (!value || value === '-') return y
  if (y > PAGE_H - pageBreakThreshold) {
    pdf.addPage()
    y = addPageHeader(pdf) + 4
  }

  if (label) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    setColor(pdf, COLOR_MUTED)
    pdf.text(label.toUpperCase(), MARGIN, y)
    y += LINE_SM
  }

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  setColor(pdf, COLOR_TEXT)
  const lines = pdf.splitTextToSize(value, CONTENT_W)
  lines.forEach((line: string) => {
    if (y > PAGE_H - 18) {
      pdf.addPage()
      y = addPageHeader(pdf) + 4
    }
    pdf.text(line, MARGIN, y)
    y += LINE_SM
  })
  return y + 2
}

// ── Interaction card ─────────────────────────────────────────────────────────
function addInteractionCard(
  pdf: jsPDF,
  idx: number,
  stepLabel: string,
  userInput: string,
  aiOutput: string,
  y: number
): number {
  if (y > PAGE_H - 35) {
    pdf.addPage()
    y = addPageHeader(pdf) + 4
  }

  // Card background
  setFill(pdf, COLOR_BG_PILL)
  const cardHeight = 10
  pdf.roundedRect(MARGIN, y - 1, CONTENT_W, cardHeight, 2, 2, 'F')

  // Step number badge
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  setColor(pdf, COLOR_PRIMARY)
  pdf.text(`#${idx + 1}  ${stepLabel}`, MARGIN + 3, y + 5.5)
  y += cardHeight + 4

  y = addBlock(pdf, 'Entrada do utilizador', userInput, y, 25)
  y = addBlock(pdf, 'Resposta da IA', aiOutput.slice(0, 600) + (aiOutput.length > 600 ? '…' : ''), y, 25)

  addRule(pdf, y)
  y += 5
  return y
}

export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const { projectId } = await params
    const session = await auth()
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.userId && project.userId !== sessionUserId) {
      return NextResponse.json({ error: 'Not authorized for this export' }, { status: 403 })
    }

    const interactions = await prisma.projectInteraction.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    })

    if (!interactions.length) {
      return NextResponse.json({ error: 'No interactions found' }, { status: 404 })
    }

    // ── Generate PDF ──────────────────────────────────────────────────────
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
    pdf.setFont('helvetica', 'normal')

    // Cover page
    let y = addPageHeader(pdf)
    y += 6

    // Project metadata block
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    setColor(pdf, COLOR_MUTED)
    pdf.text('RELATÓRIO DE SESSÃO DE INVESTIGAÇÃO', MARGIN, y)
    y += LINE_MD

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    setColor(pdf, COLOR_TEXT)
    pdf.text(`Projeto: ${projectId}`, MARGIN, y)
    y += LINE_LG + 2

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    setColor(pdf, COLOR_MUTED)
    pdf.text(`Gerado em: ${new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}`, MARGIN, y)
    y += LINE_SM
    pdf.text(`Total de interações: ${interactions.length}`, MARGIN, y)
    y += LINE_MD + 6

    addRule(pdf, y)
    y += 8

    // ── Steps summary table ───────────────────────────────────────────────
    y = addSection(pdf, 'Etapas Realizadas', y)

    const stepSummary = interactions.reduce<Record<string, number>>((acc, i) => {
      const label = i.stepLabel || i.stepId || 'Unknown'
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {})

    Object.entries(stepSummary).forEach(([label, count]) => {
      if (y > PAGE_H - 18) { pdf.addPage(); y = addPageHeader(pdf) + 4 }
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.5)
      setColor(pdf, COLOR_TEXT)
      pdf.text(`• ${label}`, MARGIN + 3, y)
      setColor(pdf, COLOR_MUTED)
      pdf.text(`(${count}×)`, MARGIN + 3 + 100, y)
      setColor(pdf, COLOR_TEXT)
      y += LINE_SM
    })

    y += 6

    // ── Interactions ─────────────────────────────────────────────────────
    y = addSection(pdf, 'Histórico de Interações', y)

    interactions.forEach((interaction, idx) => {
      y = addInteractionCard(
        pdf,
        idx,
        interaction.stepLabel || interaction.stepId || 'Step',
        interaction.userInput || '-',
        interaction.aiOutput || '-',
        y
      )
    })

    // Footer on all pages
    const totalPages = (pdf as unknown as { getNumberOfPages(): number }).getNumberOfPages?.() ?? 1
    for (let pg = 1; pg <= totalPages; pg++) {
      pdf.setPage(pg)
      pdf.setFontSize(7)
      setColor(pdf, COLOR_MUTED)
      pdf.text(`IBL-AI Research Platform · ${projectId}`, MARGIN, PAGE_H - 6)
      pdf.text(`Página ${pg} de ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' })
    }

    const pdfData = pdf.output('arraybuffer')
    return new NextResponse(pdfData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ibl-research-${projectId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[PDF Export]', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
