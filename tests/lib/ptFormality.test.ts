import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

/** Informal "tu" markers: possessives, "tu" verb forms and imperatives that address the reader as "tu". */
const TU_WORDS = /\b(teu|tua|teus|tuas|contigo|podes|queres|precisas|precisares|tens|estás|deves|gostarias|sabes|vais|fazes|consegues|tiveres|fores|quiseres)\b|\b(avançares|escolheres|quiseres)\b/i
const TU_IMPERATIVES = /(^|[.!?:'"`]\s*)(Define|Gera|Seleciona|Compara|Escreve|Completa|Volta|Executa|Usa|Cruza|Valida|Inclui|Remove|Ajusta|Partilha|Introduz|Cola|Analisa|Classifica|Testa|Simplifica|Verifica|Clica|Documenta|Fornece|Elimina|Discute|Revê|Considera)\s+(o|a|os|as|um|uma|uns|umas|pelo|cada|sempre|apenas|pelo menos|manualmente|até|isto|esta|este)\b/

describe('pt-PT copy addresses the reader as "você" (never "tu")', () => {
  it('lib/i18n.ts Portuguese block', () => {
    const source = read('lib/i18n.ts')
    const block = source.slice(source.indexOf("'pt-PT': {"), source.indexOf('\n  en: {'))
    const offenders = block.split('\n').filter((line) => TU_WORDS.test(line) || TU_IMPERATIVES.test(line.replace(/^\s*[\w]+:\s*/, '')))
    expect(offenders).toEqual([])
  })

  it('ethical tips, manual and component copy', () => {
    const tips = read('lib/iblFramework.ts')
    const ptTips = tips.slice(tips.indexOf('IBL_ETHICAL_TIPS_PT'))
    const files = [ptTips, read('docs/MANUAL_IBL_FRAMEWORK.md'), read('components/ChatAssistant.tsx'), read('components/Step3Evidence.tsx'), read('components/Step1B.tsx'), read('components/steps/Step0.tsx')]
    files.forEach((text) => {
      const offenders = text.split('\n').filter((line) => TU_WORDS.test(line) || TU_IMPERATIVES.test(line.replace(/^[\s>\-*0-9.]*/, '')))
      expect(offenders).toEqual([])
    })
  })
})
