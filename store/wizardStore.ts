import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { WizardState, Stage, InteractionRecord } from '@/types/wizard'
import { resolveWorkflowStepId, toLegacyStepId } from '@/lib/workflow'
import { clearSessionProjectCookie, setSessionProjectCookie } from '@/lib/sessionClient'

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
  projectId: '',
  topic: '',
  aiConsentAccepted: false,
  aiConsentAcceptedAt: null,
  stage: 1,
  step: 'step0',
  workflowStep: 'step0_generate',
  step0OptionalCompleted: false,
  currentInput: '',
  currentOutput: '',
  currentMode: 'standard',
  rqCandidates: [],
  candidateResearchQuestions: [],
  selectedRQs: [],
  analysis: '',
  rqAnalysis: '',
  comparisonResult: null,
  finalResearchQuestion: null,
  searchDesign: null,
  searchArticles: [],
  selectedSearchArticleIds: [],
  evidenceRecords: [],
  knowledgeStructure: null,
  explanationDraft: null,
  multimodalOutputs: {},
  evidenceFidelityScore: null,
  peerReviews: [],
  selfAssessment: null,
  reflectionJournal: [],
  extensionPlan: null,
  interactions: [],

  setProject: (id: string, topic: string) =>
    set(() => {
      if (id) {
        setSessionProjectCookie(id)
      }
      return { projectId: id, topic }
    }),

  setAiConsent: (accepted: boolean) =>
    set({
      aiConsentAccepted: accepted,
      aiConsentAcceptedAt: accepted ? new Date().toISOString() : null,
    }),

  setStage: (stage: Stage) =>
    set({ stage }),

  setStep: (step: string | number) =>
    set({ step, workflowStep: resolveWorkflowStepId(step) }),

  setWorkflowStep: (workflowStep) =>
    set({ workflowStep, step: toLegacyStepId(workflowStep) }),

  setStep0OptionalCompleted: (step0OptionalCompleted) =>
    set({ step0OptionalCompleted }),

  setInput: (input: string) =>
    set({ currentInput: input }),

  setOutput: (output: string) =>
    set({ currentOutput: output }),

  setMode: (mode: string) =>
    set({ currentMode: mode }),

  setCandidates: (candidates: string[]) =>
    set({ rqCandidates: candidates }),

  setCandidateResearchQuestions: (candidateResearchQuestions) =>
    set({ candidateResearchQuestions }),

  toggleRQ: (rq: string) =>
    set((state) => {
      const isSelected = state.selectedRQs.includes(rq)
      if (isSelected) {
        return { selectedRQs: state.selectedRQs.filter((item) => item !== rq) }
      }
      if (state.selectedRQs.length >= 3) {
        return state
      }
      return { selectedRQs: [...state.selectedRQs, rq] }
    }),

  setAnalysis: (analysis: string) =>
    set({ analysis, rqAnalysis: analysis }),

  setComparisonResult: (comparisonResult) =>
    set({ comparisonResult }),

  setFinalResearchQuestion: (finalResearchQuestion) =>
    set({ finalResearchQuestion }),

  setSearchDesign: (searchDesign) =>
    set({ searchDesign }),

  setSearchArticles: (searchArticles) =>
    set((state) => ({
      searchArticles,
      selectedSearchArticleIds: state.selectedSearchArticleIds.filter((id) =>
        searchArticles.some((article) => article.id === id)
      ),
    })),

  setSelectedSearchArticleIds: (selectedSearchArticleIds) =>
    set({ selectedSearchArticleIds }),

  toggleSearchArticleSelection: (articleId) =>
    set((state) => {
      const exists = state.selectedSearchArticleIds.includes(articleId)
      if (exists) {
        return {
          selectedSearchArticleIds: state.selectedSearchArticleIds.filter((id) => id !== articleId),
        }
      }
      return {
        selectedSearchArticleIds: [...state.selectedSearchArticleIds, articleId],
      }
    }),

  clearSearchArticleSelection: () =>
    set({ selectedSearchArticleIds: [] }),

  addEvidenceRecord: (record) =>
    set((state) => ({
      evidenceRecords: [...state.evidenceRecords, record],
    })),

  setEvidenceRecords: (evidenceRecords) =>
    set({ evidenceRecords }),

  setKnowledgeStructure: (knowledgeStructure) =>
    set({ knowledgeStructure }),

  setExplanationDraft: (explanationDraft) =>
    set({ explanationDraft }),

  // Stage 2 — Multimodal
  setMultimodalPoster: (poster) =>
    set((state) => ({ multimodalOutputs: { ...state.multimodalOutputs, poster } })),

  setMultimodalPodcast: (podcast) =>
    set((state) => ({ multimodalOutputs: { ...state.multimodalOutputs, podcast } })),

  setMultimodalVideocast: (videocast) =>
    set((state) => ({ multimodalOutputs: { ...state.multimodalOutputs, videocast } })),

  setMultimodalGame: (game) =>
    set((state) => ({ multimodalOutputs: { ...state.multimodalOutputs, game } })),

  setMultimodalOral: (oral) =>
    set((state) => ({ multimodalOutputs: { ...state.multimodalOutputs, oral } })),

  setEvidenceFidelityScore: (evidenceFidelityScore) =>
    set({ evidenceFidelityScore }),

  // Stage 3 — Reflection
  setPeerReviews: (peerReviews) =>
    set({ peerReviews }),

  addPeerReview: (review) =>
    set((state) => ({ peerReviews: [...state.peerReviews, review] })),

  setSelfAssessment: (selfAssessment) =>
    set({ selfAssessment }),

  addReflectionEntry: (entry) =>
    set((state) => ({ reflectionJournal: [...state.reflectionJournal, entry] })),

  setReflectionJournal: (reflectionJournal) =>
    set({ reflectionJournal }),

  setExtensionPlan: (extensionPlan) =>
    set({ extensionPlan }),

  addInteraction: (record: InteractionRecord) =>
    set((state) => ({
      interactions: [...state.interactions, record],
    })),

  resetSession: () =>
    set(() => {
      clearSessionProjectCookie()
      return {
        projectId: '',
        topic: '',
        aiConsentAccepted: false,
        aiConsentAcceptedAt: null,
        stage: 1,
        step: 'step0',
        workflowStep: 'step0_generate',
        step0OptionalCompleted: false,
        currentInput: '',
        currentOutput: '',
        currentMode: 'standard',
        rqCandidates: [],
        candidateResearchQuestions: [],
        selectedRQs: [],
        analysis: '',
        rqAnalysis: '',
        comparisonResult: null,
        finalResearchQuestion: null,
        searchDesign: null,
        searchArticles: [],
        selectedSearchArticleIds: [],
        evidenceRecords: [],
        knowledgeStructure: null,
        explanationDraft: null,
        multimodalOutputs: {},
        evidenceFidelityScore: null,
        peerReviews: [],
        selfAssessment: null,
        reflectionJournal: [],
        extensionPlan: null,
        interactions: [],
      }
    }),
    }),
    {
      name: 'ibl-step0-memory',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        projectId: state.projectId,
        aiConsentAccepted: state.aiConsentAccepted,
        aiConsentAcceptedAt: state.aiConsentAcceptedAt,
        stage: state.stage,
        step: state.step,
        workflowStep: state.workflowStep,
        topic: state.topic,
        rqCandidates: state.rqCandidates,
        candidateResearchQuestions: state.candidateResearchQuestions,
        selectedRQs: state.selectedRQs,
        comparisonResult: state.comparisonResult,
        finalResearchQuestion: state.finalResearchQuestion,
        searchDesign: state.searchDesign,
        searchArticles: state.searchArticles,
        selectedSearchArticleIds: state.selectedSearchArticleIds,
        evidenceRecords: state.evidenceRecords,
        knowledgeStructure: state.knowledgeStructure,
        explanationDraft: state.explanationDraft,
        multimodalOutputs: state.multimodalOutputs,
        evidenceFidelityScore: state.evidenceFidelityScore,
        peerReviews: state.peerReviews,
        selfAssessment: state.selfAssessment,
        reflectionJournal: state.reflectionJournal,
        extensionPlan: state.extensionPlan,
        interactions: state.interactions,
        step0OptionalCompleted: state.step0OptionalCompleted,
      }),
    }
  )
)
