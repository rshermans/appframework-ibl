/**
 * POST /api/export-notebook
 * 
 * Generate a NotebookLM export: structured prompt + evidence + link to open
 * in NotebookLM (or Google Docs for temporary sharing).
 * 
 * Request body:
 *   - projectId: string
 *   - artifactType: 'poster' | 'podcast' | 'video' | 'game' | 'presentation'
 *   - locale: 'pt-PT' | 'en'
 *   - researchQuestion: string
 *   - topic: string
 *   - evidenceRecords: EvidenceRecord[] (from wizardStore)
 * 
 * Response:
 *   - ok: boolean
 *   - url: string (NotebookLM/Google Docs link)
 *   - promptText: string (full prompt for copy-paste)
 *   - tokenEstimate: number
 *   - evidenceKeyPoints: Array<{ claim, source }>
 */

import { NextResponse } from 'next/server'
import { buildNotebookLmPrompt, type NotebookLmArtifactType } from '@/lib/notebookLmPrompts'
import { compressEvidence } from '@/lib/evidenceCompressor'
import type { EvidenceRecord } from '@/types/research-workflow'

interface ExportRequest {
  projectId: string
  artifactType: string
  locale: string
  researchQuestion: string
  topic: string
  evidenceRecords: EvidenceRecord[]
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as ExportRequest

    // Validation
    if (!body.projectId || !body.artifactType || !body.researchQuestion) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: projectId, artifactType, researchQuestion' },
        { status: 400 }
      )
    }

    const artifactType = body.artifactType as NotebookLmArtifactType
    const locale = (body.locale === 'pt-PT' ? 'pt-PT' : 'en') as 'pt-PT' | 'en'

    // Compress evidence to token-efficient format
    const compressed = compressEvidence(
      body.evidenceRecords || [],
      body.researchQuestion,
      2000, // target 2k tokens for evidence
      locale
    )

    // Build NotebookLM-ready prompt
    const { fullPrompt, userPrompt } = buildNotebookLmPrompt({
      projectId: body.projectId,
      artifactType,
      locale,
      researchQuestion: body.researchQuestion,
      topic: body.topic,
      compressedEvidence: compressed.summary,
      evidenceKeyPoints: compressed.keyPoints.map((kp) => ({
        claim: kp.claim,
        source: kp.source,
      })),
      promptText: '',
      instructions: '', // placeholder, filled by buildNotebookLmPrompt
    })

    // Generate NotebookLM share link (or temp Google Docs link)
    const notebookLmUrl = generateNotebookLmUrl(
      body.projectId,
      artifactType,
      fullPrompt,
      locale
    )

    // Log export event (fire-and-forget)
    void logExportEvent(body.projectId, artifactType, locale).catch(() => null)

    return NextResponse.json({
      ok: true,
      artifactType,
      projectId: body.projectId,
      url: notebookLmUrl,
      promptText: fullPrompt,
      userPrompt: userPrompt,
      tokenEstimate: compressed.tokenEstimate,
      evidenceKeyPoints: compressed.keyPoints,
      topics: compressed.topics,
      exportedAt: new Date().toISOString(),
    })
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    console.error('[export-notebook] Error:', details)
    return NextResponse.json(
      { ok: false, error: 'Failed to generate export', details },
      { status: 500 }
    )
  }
}

/**
 * Generate a URL for opening NotebookLM (or fallback to encoded prompt)
 * 
 * Since NotebookLM doesn't have a public API yet, we use:
 * 1. NotebookLM share link (if available in user's workspace)
 * 2. Fallback: Encoded URL that user can paste into NotebookLM manually
 */
function generateNotebookLmUrl(
  projectId: string,
  artifactType: string,
  _prompt: string,
  _locale: 'pt-PT' | 'en'
): string {
  // Base URL: NotebookLM create/share endpoint (generic, since no official API)
  const baseUrl = 'https://notebooklm.google.com'

  // Generate a reference URL (user can open this to then paste prompt)
  // This is a workaround until NotebookLM has full API integration
  const referenceUrl = `${baseUrl}/?projectId=${projectId}&artifact=${artifactType}`

  // In future: could use Google Docs API to create temp doc with prompt,
  // then share link to that. For now, provide instructions.

  return referenceUrl
}

/**
 * Log export event for analytics
 */
async function logExportEvent(
  projectId: string,
  artifactType: string,
  locale: string
): Promise<void> {
  try {
    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        stage: 2,
        stepId: 'stage2_notebook_export',
        stepLabel: `Export to NotebookLM: ${artifactType}`,
        eventType: 'export_notebook',
        userInput: artifactType,
        aiOutput: '',
        success: true,
        metadata: {
          artifactType,
          locale,
          platform: 'notebooklm',
        },
      }),
    })
  } catch {
    // Fire-and-forget, ignore errors
  }
}
