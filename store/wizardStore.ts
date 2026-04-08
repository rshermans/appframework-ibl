import { create } from 'zustand'
import { WizardState, Stage, InteractionRecord } from '@/types/wizard'
import { resolveWorkflowStepId } from '@/lib/workflow'

export const useWizardStore = create<WizardState>((set) => ({
  projectId: '',
  topic: '',
  stage: 1,
  step: 'step0',
  workflowStep: 'step0_generate',
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
  interactions: [],

  setProject: (id: string, topic: string) =>
    set({ projectId: id, topic }),

  setStage: (stage: Stage) =>
    set({ stage }),

  setStep: (step: string | number) =>
    set({ step, workflowStep: resolveWorkflowStepId(step) }),

  setWorkflowStep: (workflowStep) =>
    set({ workflowStep }),

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

  addInteraction: (record: InteractionRecord) =>
    set((state) => ({
      interactions: [...state.interactions, record],
    })),
}))
