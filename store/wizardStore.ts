import { create } from 'zustand'
import { WizardState, Stage, InteractionRecord } from '@/types/wizard'

export const useWizardStore = create<WizardState>((set) => ({
  projectId: '',
  topic: '',
  stage: 1,
  step: 'step0',
  currentInput: '',
  currentOutput: '',
  currentMode: 'standard',
  rqCandidates: [],
  selectedRQs: [],
  analysis: '',
  rqAnalysis: '',
  interactions: [],

  setProject: (id: string, topic: string) =>
    set({ projectId: id, topic }),

  setStage: (stage: Stage) =>
    set({ stage }),

  setStep: (step: string | number) =>
    set({ step }),

  setInput: (input: string) =>
    set({ currentInput: input }),

  setOutput: (output: string) =>
    set({ currentOutput: output }),

  setMode: (mode: string) =>
    set({ currentMode: mode }),

  setCandidates: (candidates: string[]) =>
    set({ rqCandidates: candidates }),

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

  addInteraction: (record: InteractionRecord) =>
    set((state) => ({
      interactions: [...state.interactions, record],
    })),
}))
