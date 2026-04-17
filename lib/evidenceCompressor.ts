/**
 * Evidence Compressor
 * 
 * Compress evidence records into concise, structured key points suitable
 * for token-limited prompts (target: <2000 tokens per artifact export).
 * 
 * Techniques:
 * - Summarize claims to 1-2 sentences max
 * - Extract only most relevant evidence (by topic overlap)
 * - Remove redundancy (dedup similar claims)
 * - Structured output (easy for LLM to consume)
 */

import type { EvidenceRecord } from '@/types/research-workflow'

export interface CompressedEvidencePoint {
  claim: string
  source: string // Article title or author
  relevance: number // 0-1 score
  confidence: number // 0-1 score
}

export interface CompressedEvidence {
  keyPoints: CompressedEvidencePoint[]
  tokenEstimate: number
  summary: string
  topics: string[]
}

/**
 * Estimate token count for text (rough: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Extract key points from evidence records, prioritizing:
 * 1. Novelty (unique claims not repeated)
 * 2. Relevance (high confidence, clear methodology)
 * 3. Diversity (cover different aspects of topic)
 */
export function compressEvidence(
  evidenceRecords: EvidenceRecord[],
  researchQuestion: string,
  targetTokens: number = 2000,
  locale: 'pt-PT' | 'en' = 'pt-PT'
): CompressedEvidence {
  if (!evidenceRecords || evidenceRecords.length === 0) {
    return {
      keyPoints: [],
      tokenEstimate: 0,
      summary: locale === 'pt-PT' ? 'Sem evidência' : 'No evidence',
      topics: [],
    }
  }

  // Step 1: Normalize & extract core claims
  const normalized = evidenceRecords
    .filter((e) => typeof e.claim === 'string' && e.claim.trim().length > 0)
    .flatMap((e) => {
      const source = e.sourceArticleTitle || e.title || e.citation || 'Unknown source'
      const claim = e.claim
      const relevanceFromRecord = e.relevanceScore > 1 ? e.relevanceScore / 100 : e.relevanceScore

      return [{
        claim: normalizeClaim(claim, locale),
        source,
        originalClaim: claim,
        methodology: e.methodology,
        confidence: estimateConfidence(e.methodology),
        relevance: Math.max(0, Math.min(1, relevanceFromRecord || calculateRelevance(claim, researchQuestion))),
      }]
    })

  // Step 2: Dedup similar claims (remove near-duplicates)
  const dedupedClaims = deduplicateClaims(normalized, 0.8)

  // Step 3: Sort by relevance + confidence
  const ranked = dedupedClaims.sort((a, b) => {
    const scoreA = a.relevance * a.confidence
    const scoreB = b.relevance * b.confidence
    return scoreB - scoreA
  })

  // Step 4: Select top N until token budget exhausted
  const selectedPoints: CompressedEvidencePoint[] = []
  let currentTokens = 0

  for (const point of ranked) {
    const pointTokens = estimateTokens(point.claim) + estimateTokens(point.source) + 10 // padding
    if (currentTokens + pointTokens > targetTokens && selectedPoints.length > 3) {
      break
    }
    selectedPoints.push({
      claim: point.claim,
      source: point.source,
      relevance: point.relevance,
      confidence: point.confidence,
    })
    currentTokens += pointTokens
  }

  // Step 5: Extract topics mentioned in claims
  const topics = extractTopics(selectedPoints.map((p) => p.claim))

  // Step 6: Build summary
  const summary = buildSummary(selectedPoints, locale)

  return {
    keyPoints: selectedPoints,
    tokenEstimate: currentTokens,
    summary,
    topics,
  }
}

/**
 * Normalize a claim: trim, remove redundant punctuation, ensure proper case
 */
function normalizeClaim(claim: string, _locale: 'pt-PT' | 'en'): string {
  // Remove extra whitespace
  let normalized = claim.trim().replace(/\s+/g, ' ')

  // Ensure proper ending (period)
  if (!normalized.endsWith('.')) {
    normalized += '.'
  }

  // If too long (>250 chars), truncate intelligently
  if (normalized.length > 250) {
    const sentences = normalized.split('. ')
    if (sentences.length > 1) {
      normalized = sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ')
    } else {
      normalized = normalized.substring(0, 240) + '...'
    }
  }

  return normalized
}

/**
 * Estimate confidence based on methodology description
 * Heuristic: mentions of randomized, blinded, large N suggest higher confidence
 */
function estimateConfidence(methodology?: string): number {
  if (!methodology) return 0.6

  const text = methodology.toLowerCase()
  let score = 0.5

  if (text.includes('randomized') || text.includes('rct')) score += 0.15
  if (text.includes('blinded') || text.includes('masked')) score += 0.1
  if (text.includes('large') || text.includes('n=') || text.includes('participants')) score += 0.1
  if (text.includes('meta-analysis') || text.includes('systematic')) score += 0.15
  if (text.includes('pilot') || text.includes('preliminary')) score -= 0.15

  return Math.min(0.99, Math.max(0.3, score))
}

/**
 * Calculate relevance: how directly does this claim relate to the RQ?
 * Simple heuristic: word overlap between claim and RQ
 */
function calculateRelevance(claim: string, researchQuestion: string): number {
  const rqWords = researchQuestion
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)

  const claimWords = claim
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)

  const overlap = claimWords.filter((w) => rqWords.includes(w)).length
  const maxPossible = Math.min(rqWords.length, claimWords.length)

  return maxPossible > 0 ? overlap / maxPossible : 0.5
}

/**
 * Dedup similar claims using simple string similarity (Jaccard)
 */
function deduplicateClaims(
  claims: Array<any>,
  similarityThreshold: number = 0.8
): Array<any> {
  const unique: Array<any> = []

  for (const claim of claims) {
    const isDuplicate = unique.some((u) => {
      const similarity = jaroWinklerSimilarity(claim.claim.toLowerCase(), u.claim.toLowerCase())
      return similarity > similarityThreshold
    })

    if (!isDuplicate) {
      unique.push(claim)
    }
  }

  return unique
}

/**
 * Simple Jaro-Winkler similarity (0-1)
 */
function jaroWinklerSimilarity(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0 && len2 === 0) return 1
  if (len1 === 0 || len2 === 0) return 0

  const matchDistance = Math.max(len1, len2) / 2 - 1
  const matched1 = new Array(len1).fill(false)
  const matched2 = new Array(len2).fill(false)

  let matches = 0
  let transpositions = 0

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, len2)

    for (let j = start; j < end; j++) {
      if (matched2[j] || str1[i] !== str2[j]) continue
      matched1[i] = matched2[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!matched1[i]) continue
    while (!matched2[k]) k++
    if (str1[i] !== str2[k]) transpositions++
    k++
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3

  // Jaro-Winkler: boost for common prefix
  let prefix = 0
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (str1[i] === str2[i]) prefix++
    else break
  }

  return jaro + prefix * 0.1 * (1 - jaro)
}

/**
 * Extract main topics from claims (simple keyword extraction)
 */
function extractTopics(claims: string[]): string[] {
  const topicMap = new Map<string, number>()

  // Extract nouns (naive: words after adjectives or alone)
  const commonWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'is',
    'was',
    'are',
    'be',
    'been',
    'have',
    'has',
    'do',
    'does',
    'did',
    'that',
    'this',
    'these',
    'those',
  ])

  for (const claim of claims) {
    const words = claim
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4 && !commonWords.has(w))

    for (const word of words) {
      topicMap.set(word, (topicMap.get(word) || 0) + 1)
    }
  }

  // Return top 5 topics
  return Array.from(topicMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic)
}

/**
 * Build human-readable summary of compressed evidence
 */
function buildSummary(points: CompressedEvidencePoint[], locale: 'pt-PT' | 'en'): string {
  if (points.length === 0) {
    return locale === 'pt-PT' ? 'Sem pontos-chave' : 'No key points'
  }

  if (points.length === 1) {
    return locale === 'pt-PT'
      ? `1 ponto-chave: ${points[0].claim}`
      : `1 key point: ${points[0].claim}`
  }

  return locale === 'pt-PT'
    ? `${points.length} pontos-chave principais extraídos da investigação.`
    : `${points.length} key points extracted from the research.`
}
