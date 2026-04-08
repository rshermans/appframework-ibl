import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import jsPDF from 'jspdf'

export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const { projectId } = params

    // Get all interactions
    const interactions = await prisma.projectInteraction.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    })

    if (!interactions.length) {
      return NextResponse.json(
        { error: 'No interactions found' },
        { status: 404 }
      )
    }

    // Generate PDF
    const pdf = new jsPDF()
    let yPosition = 10

    // Title
    pdf.setFontSize(18)
    pdf.text('Research Wizard Export', 10, yPosition)
    yPosition += 10

    // Metadata
    pdf.setFontSize(10)
    pdf.text(`Project ID: ${projectId}`, 10, yPosition)
    yPosition += 5
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, yPosition)
    yPosition += 10

    // Interactions
    pdf.setFontSize(12)

    interactions.forEach((interaction, idx) => {
      if (yPosition > 250) {
        pdf.addPage()
        yPosition = 10
      }

      // Section title
      pdf.setTextColor(0, 102, 204)
      pdf.text(`Interaction ${idx + 1}: ${interaction.stepLabel}`, 10, yPosition)
      yPosition += 5

      // Input
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(9)
      pdf.text('Input:', 10, yPosition)
      yPosition += 2

      const inputLines = pdf.splitTextToSize(interaction.userInput, 190)
      pdf.text(inputLines, 10, yPosition)
      yPosition += inputLines.length * 3 + 2

      // Output
      pdf.text('Output:', 10, yPosition)
      yPosition += 2

      const outputLines = pdf.splitTextToSize(interaction.aiOutput, 190)
      pdf.text(outputLines, 10, yPosition)
      yPosition += outputLines.length * 3 + 3

      // Separator
      pdf.setDrawColor(200, 200, 200)
      pdf.line(10, yPosition, 200, yPosition)
      yPosition += 3
    })

    // Return PDF
    const pdfData = pdf.output('arraybuffer')
    return new NextResponse(pdfData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="research-${projectId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF Export Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
