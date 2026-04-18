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
  | 'step5_source_selection'
  | 'step4_knowledge_structure'
  | 'step8_glossary'
  | 'step9_explanation'
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
  provider: 'semantic_scholar' | 'crossref' | 'openaire' | 'arxiv' | 'pubmed' | 'core'
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

// ── Stage 2: Multimodal output drafts ─────────────────────────────────────────

export interface EvidenceAnchor {
  claimText: string
  evidenceRecordId: string
  citationKey: string
  validated: boolean
}

export interface PosterDraft {
  title: string
  sections: Array<{ label: string; content: string; anchors: EvidenceAnchor[] }>
  layoutSuggestion: string
  fidelityScore: number
}

export interface PodcastScript {
  title: string
  segments: Array<{ timestamp: string; speaker: string; text: string; anchors: EvidenceAnchor[] }>
  durationEstimateMinutes: number
  fidelityScore: number
}

export interface VideostoryBoard {
  title: string
  scenes: Array<{ sceneNumber: number; description: string; visualNote: string; anchors: EvidenceAnchor[] }>
  fidelityScore: number
}

export interface GameScenario {
  title: string
  objective: string
  branches: Array<{ id: string; prompt: string; choices: Array<{ id: string; text: string; consequence: string }> }>
  fidelityScore: number
}

export interface OralPresentation {
  title: string
  slides: Array<{ slideNumber: number; heading: string; bulletPoints: string[]; speakerNotes: string; anchors: EvidenceAnchor[] }>
  totalDurationMinutes: number
  fidelityScore: number
}

// ── Stage 3: Reflection & extension types ────────────────────────────────────

export interface PeerReview {
  id: string
  reviewedProjectId: string
  reviewerTeam: string
  rubricDimension: string
  strengths: string
  improvements: string
  anonymous: boolean
  submittedAt: string
}

export interface SelfAssessmentRecord {
  rubricDimensions: Array<{ dimension: string; score: number; justification: string }>
  overallReflection: string
  completedAt: string
}

export interface ReflectionEntry {
  id: string
  prompt: string
  response: string
  createdAt: string
}

export interface ExtensionPath {
  title: string
  description: string
  complexity: 'low' | 'medium' | 'high'
  suggestedDatabases: string[]
  potentialMethodologies: string[]
  gapAddressed: string
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
