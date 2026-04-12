import type { PromptId, PromptMode } from '@/lib/prompts'

export type WorkflowStageId =
  | 'question_design'
  | 'research_preparation'
  | 'knowledge_building'
  | 'communication'
  | 'reflection'

export type WorkflowStepId =
  | 'step0_generate'
  | 'step1_select'
  | 'step1a_compare'
  | 'step1b_synthesize'
  | 'step2_search_design'
  | 'step3_evidence_extraction'
  | 'step4_knowledge_structure'
  | 'step5_explanation'
  | 'step6_multimodal'
  | 'step7_reflection'

export type WorkflowFieldType =
  | 'string'
  | 'string[]'
  | 'number'
  | 'boolean'
  | 'object'
  | 'object[]'

export type EpistemicType =
  | 'empirical'
  | 'causal'
  | 'comparative'
  | 'mechanistic'
  | 'normative'
  | 'unknown'

export interface CandidateResearchQuestion {
  id: string
  question: string
  epistemicType: EpistemicType | string
  rationale: string
  databases: string[]
  iblScore: number
  challenges?: string
}

export interface QuestionComparisonEntry {
  questionId?: string
  question: string
  epistemicType?: string
  strengths: string[]
  weaknesses: string[]
  risks?: string[]
  score: number
}

export interface ComparisonResult {
  mode: PromptMode
  comparisons: QuestionComparisonEntry[]
  recommendedQuestion: string
  recommendationReason: string
}

export interface FinalResearchQuestion {
  question: string
  justification: string
  derivedFromQuestions: string[]
  approvedByUser: boolean
}

export interface SearchStringSet {
  database: string
  query: string
}

export interface SearchArticle {
  id: string
  provider: 'semantic_scholar' | 'crossref' | 'openaire' | 'rcaap' | 'core'
  title: string
  abstract: string
  year?: number
  authors: string[]
  doi?: string
  url?: string
}

export interface SearchPagination {
  page: number
  pageSize: number
  totalResults?: number
  hasNextPage: boolean
}

export interface SearchDesign {
  keywords: string[]
  synonyms: string[]
  booleanQuery: string
  searchStrings: SearchStringSet[]
  recommendedDatabases: string[]
  filters: string[]
}

export interface EvidenceRecord {
  id: string
  title: string
  sourceType: 'paper' | 'report' | 'website' | 'book' | 'unknown'
  sourceArticleId?: string
  sourceProvider?: SearchArticle['provider']
  sourceArticleTitle?: string
  claim: string
  methodology: string
  findings: string[]
  limitations: string[]
  relevanceScore: number
  citation: string
}

export interface KnowledgeStructure {
  topics: string[]
  subtopics: string[]
  conceptMapNodes: string[]
  conceptMapEdges: Array<{ from: string; to: string; relation: string }>
  mindMapMarkdown?: string
  glossary?: Array<{ term: string; definition: string }>
}

export interface ExplanationDraft {
  outline: string[]
  argumentCore: string
  evidenceReferences: string[]
  bibliography: string[]
  openIssues: string[]
}

export interface MultimodalPlan {
  format: 'poster' | 'podcast' | 'video' | 'other'
  audience: string
  sections: string[]
  assetsNeeded: string[]
}

export interface ReflectionRecord {
  strengths: string[]
  weaknesses: string[]
  nextImprovements: string[]
}

export interface ProjectWorkflowState {
  topic: string
  currentStep: WorkflowStepId
  candidateQuestions: CandidateResearchQuestion[]
  selectedQuestions: string[]
  comparisonResult: ComparisonResult | null
  finalResearchQuestion: FinalResearchQuestion | null
  searchDesign: SearchDesign | null
  searchArticles: SearchArticle[]
  selectedSearchArticleIds: string[]
  evidenceRecords: EvidenceRecord[]
  knowledgeStructure: KnowledgeStructure | null
  explanationDraft: ExplanationDraft | null
  multimodalPlan: MultimodalPlan | null
  reflection: ReflectionRecord | null
}

export interface WorkflowFieldSchema {
  key: string
  type: WorkflowFieldType
  required: boolean
  source: 'user' | 'store' | 'ai' | 'system'
  description: string
}

export interface WorkflowStepContract {
  id: WorkflowStepId
  label: string
  stage: WorkflowStageId
  promptId?: PromptId
  description: string
  inputSchema: WorkflowFieldSchema[]
  outputSchema: WorkflowFieldSchema[]
  storeWrites: Array<keyof ProjectWorkflowState>
  nextSteps: WorkflowStepId[]
  humanDecisionRequired: boolean
  defaultMode?: PromptMode
}
