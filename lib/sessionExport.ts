import type { WizardState } from '@/types/wizard'

/** Plain-data snapshot of a project, used for the JSON export and the Google Docs summary. */
export function buildSessionExport(snapshot: WizardState, exportedAt: string = new Date().toISOString()) {
  return {
    exportedAt,
    projectId: snapshot.projectId,
    stage: snapshot.stage,
    workflowStep: snapshot.workflowStep,
    topic: snapshot.topic,
    finalResearchQuestion: snapshot.finalResearchQuestion,
    searchDesign: snapshot.searchDesign,
    selectedArticles: snapshot.selectedSearchArticleIds,
    evidenceRecords: snapshot.evidenceRecords,
    knowledgeStructure: snapshot.knowledgeStructure,
    explanationDraft: snapshot.explanationDraft,
    multimodalOutputs: snapshot.multimodalOutputs,
    reflection: {
      peerReviews: snapshot.peerReviews,
      selfAssessment: snapshot.selfAssessment,
      reflectionJournal: snapshot.reflectionJournal,
      extensionPlan: snapshot.extensionPlan,
    },
    interactions: snapshot.interactions,
  }
}

export type SessionExport = ReturnType<typeof buildSessionExport>

export function buildGoogleDocMarkdown(payload: SessionExport): string {
  return [
    `# IBL Session ${payload.projectId}`,
    `- Topic: ${payload.topic || '-'}`,
    `- Stage: ${payload.stage}`,
    `- Workflow Step: ${payload.workflowStep}`,
    `- Exported At: ${payload.exportedAt}`,
    '',
    '## Final Question',
    payload.finalResearchQuestion?.question || '-',
    '',
    '## Explanation Core',
    payload.explanationDraft?.argumentCore || '-',
    '',
    '## Notes',
    `Interactions recorded: ${payload.interactions.length}`,
  ].join('\n')
}

export function buildShareEmail(args: {
  projectId: string
  topic: string
  stage: number | string
  interactionCount: number
  pt: boolean
}): { subject: string; body: string } {
  const { projectId, topic, stage, interactionCount, pt } = args
  return {
    subject: pt ? `Sessao IBL ${projectId}` : `IBL Session ${projectId}`,
    body: pt
      ? `ID do projeto: ${projectId}\nTopico: ${topic || '-'}\nStage: ${stage}\nInteracoes: ${interactionCount}\n\nUse /api/export/${projectId} para descarregar o registo PDF.`
      : `Project ID: ${projectId}\nTopic: ${topic || '-'}\nStage: ${stage}\nInteractions: ${interactionCount}\n\nUse /api/export/${projectId} to download the PDF record.`,
  }
}
