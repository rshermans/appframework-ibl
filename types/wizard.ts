import type {
  CandidateResearchQuestion,
  ComparisonResult,
  EvidenceRecord,
  ExplanationDraft,
  FinalResearchQuestion,
  KnowledgeStructure,
  SearchArticle,
  SearchDesign,
  WorkflowStepId,
} from '@/types/research-workflow'

// Stage & Step definitions
export type Stage = 0 | 1 | 2 | 3

export interface StageInfo {
  label: string
  steps: StepInfo[]
}

export interface StepInfo {
  id: string
  label: string
  stageName?: string
}

export const STAGES: Record<Stage, StageInfo> = {
  0: {
    label: 'Team Setup',
    steps: [
      { id: 's0-form', label: 'Form Team' },
      { id: 's0-roles', label: 'Assign Roles' },
      { id: 's0-tasks', label: 'Task Distribution' },
      { id: 's0-ai', label: 'AI Use Agreement' }
    ]
  },
  1: {
    label: 'Ask & Research',
    steps: [
      { id: 'step0', label: 'Candidate Questions', stageName: 'Generate RQs' },
      { id: 'step1', label: 'Epistemic Analysis', stageName: 'Analyse RQs' },
      { id: 'step2', label: 'Search Strings', stageName: 'Build Search' },
      { id: 'step3', label: 'Search Databases', stageName: 'Execute Search' },
      { id: 'step4', label: 'Extract Evidence', stageName: 'Extract Data' },
      { id: 'step5', label: 'Select Sources', stageName: 'Select Best' },
      { id: 'step6', label: 'Topics & Subtopics', stageName: 'Structure' },
      { id: 'step7', label: 'Mind Map', stageName: 'Visualize' },
      { id: 'step8a', label: 'Glossary Terms', stageName: 'Define Terms' },
      { id: 'step8b', label: 'Glossary App', stageName: 'Build Glossary' }
    ]
  },
  2: {
    label: 'Explain & Create',
    steps: [
      { id: 'step9', label: 'Scientific Explanation', stageName: 'Write' },
      { id: 'step10', label: 'Multimodal Plan', stageName: 'Plan Output' },
      { id: 'step10a', label: 'Visual Output', stageName: 'Create Visual' },
      { id: 'step10b', label: 'Podcast', stageName: 'Record Podcast' },
      { id: 'step10c', label: 'Videocast', stageName: 'Create Video' },
      { id: 'step10d', label: 'Science Game', stageName: 'Build Game' }
    ]
  },
  3: {
    label: 'Reflect & Improve',
    steps: [
      { id: 's3-peer', label: 'Peer Review', stageName: 'Review Others' },
      { id: 's3-self', label: 'Self-Assessment', stageName: 'Assess Self' },
      { id: 's3-reflect', label: 'Reflection', stageName: 'Reflect' },
      { id: 's3-extend', label: 'Extension', stageName: 'Extend Work' }
    ]
  }
}

// Wizard State Types
export interface WizardState {
  // Project
  projectId: string
  topic: string
  
  // Navigation
  stage: Stage
  step: string | number
  workflowStep: WorkflowStepId
  step0OptionalCompleted: boolean
  
  // Current work
  currentInput: string
  currentOutput: string
  currentMode: string
  rqCandidates: string[]
  candidateResearchQuestions: CandidateResearchQuestion[]
  selectedRQs: string[]
  analysis: string
  rqAnalysis: string
  comparisonResult: ComparisonResult | null
  finalResearchQuestion: FinalResearchQuestion | null
  searchDesign: SearchDesign | null
  searchArticles: SearchArticle[]
  selectedSearchArticleIds: string[]
  evidenceRecords: EvidenceRecord[]
  knowledgeStructure: KnowledgeStructure | null
  explanationDraft: ExplanationDraft | null
  
  // History
  interactions: InteractionRecord[]
  
  // Actions
  setProject: (id: string, topic: string) => void
  setStage: (stage: Stage) => void
  setStep: (step: string | number) => void
  setWorkflowStep: (step: WorkflowStepId) => void
  setStep0OptionalCompleted: (value: boolean) => void
  setInput: (input: string) => void
  setOutput: (output: string) => void
  setMode: (mode: string) => void
  setCandidates: (candidates: string[]) => void
  setCandidateResearchQuestions: (candidates: CandidateResearchQuestion[]) => void
  toggleRQ: (rq: string) => void
  setAnalysis: (analysis: string) => void
  setComparisonResult: (result: ComparisonResult | null) => void
  setFinalResearchQuestion: (result: FinalResearchQuestion | null) => void
  setSearchDesign: (result: SearchDesign | null) => void
  setSearchArticles: (articles: SearchArticle[]) => void
  setSelectedSearchArticleIds: (ids: string[]) => void
  toggleSearchArticleSelection: (articleId: string) => void
  clearSearchArticleSelection: () => void
  addEvidenceRecord: (record: EvidenceRecord) => void
  setEvidenceRecords: (records: EvidenceRecord[]) => void
  setKnowledgeStructure: (structure: KnowledgeStructure | null) => void
  setExplanationDraft: (draft: ExplanationDraft | null) => void
  addInteraction: (record: InteractionRecord) => void
}

export interface InteractionRecord {
  stage: Stage
  stepId: string
  stepLabel: string
  userInput: string
  aiOutput: string
  mode?: string
  createdAt: Date
}
