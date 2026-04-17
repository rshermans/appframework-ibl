import type {
  GameScenario,
  OralPresentation,
  PodcastScript,
  PosterDraft,
  VideostoryBoard,
} from '@/types/research-workflow'

export type MultimodalArtifactKind = 'poster' | 'podcast' | 'video' | 'game' | 'oral'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function hasNumericFidelity(value: unknown): boolean {
  return typeof value === 'object' && value !== null && typeof (value as { fidelityScore?: unknown }).fidelityScore === 'number'
}

function isPosterDraft(value: unknown): value is PosterDraft {
  if (!hasNumericFidelity(value)) return false
  const candidate = value as PosterDraft
  return (
    isNonEmptyString(candidate.title)
    && Array.isArray(candidate.sections)
    && candidate.sections.length > 0
    && candidate.sections.every((section) => isNonEmptyString(section.label) && isNonEmptyString(section.content) && Array.isArray(section.anchors))
  )
}

function isPodcastScript(value: unknown): value is PodcastScript {
  if (!hasNumericFidelity(value)) return false
  const candidate = value as PodcastScript
  return (
    isNonEmptyString(candidate.title)
    && Array.isArray(candidate.segments)
    && candidate.segments.length > 0
    && candidate.segments.every((segment) => isNonEmptyString(segment.timestamp) && isNonEmptyString(segment.speaker) && isNonEmptyString(segment.text) && Array.isArray(segment.anchors))
  )
}

function isVideostoryBoard(value: unknown): value is VideostoryBoard {
  if (!hasNumericFidelity(value)) return false
  const candidate = value as VideostoryBoard
  return (
    isNonEmptyString(candidate.title)
    && Array.isArray(candidate.scenes)
    && candidate.scenes.length > 0
    && candidate.scenes.every((scene) => Number.isFinite(scene.sceneNumber) && isNonEmptyString(scene.description) && isNonEmptyString(scene.visualNote) && Array.isArray(scene.anchors))
  )
}

function isGameScenario(value: unknown): value is GameScenario {
  if (!hasNumericFidelity(value)) return false
  const candidate = value as GameScenario
  return (
    isNonEmptyString(candidate.title)
    && isNonEmptyString(candidate.objective)
    && Array.isArray(candidate.branches)
    && candidate.branches.length > 0
    && candidate.branches.every((branch) => isNonEmptyString(branch.id) && isNonEmptyString(branch.prompt) && Array.isArray(branch.choices) && branch.choices.length > 0)
  )
}

function isOralPresentation(value: unknown): value is OralPresentation {
  if (!hasNumericFidelity(value)) return false
  const candidate = value as OralPresentation
  return (
    isNonEmptyString(candidate.title)
    && Array.isArray(candidate.slides)
    && candidate.slides.length > 0
    && candidate.slides.every((slide) => Number.isFinite(slide.slideNumber) && isNonEmptyString(slide.heading) && Array.isArray(slide.bulletPoints) && slide.bulletPoints.length > 0 && isNonEmptyString(slide.speakerNotes) && Array.isArray(slide.anchors))
  )
}

export function isValidMultimodalArtifact(kind: MultimodalArtifactKind, value: unknown): boolean {
  if (kind === 'poster') return isPosterDraft(value)
  if (kind === 'podcast') return isPodcastScript(value)
  if (kind === 'video') return isVideostoryBoard(value)
  if (kind === 'game') return isGameScenario(value)
  return isOralPresentation(value)
}