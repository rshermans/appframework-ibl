'use client'

import { useState } from 'react'
import { useWizardStore } from '@/store/wizardStore'
import { useI18n } from '@/components/I18nProvider'
import Drawer from '@/components/ui/Drawer'
import { useStage3Ai } from '@/components/reflection/useStage3Ai'
import {
  buildReferenceSection,
  nextResearchPrompts,
  parseAbstractSimulation,
  referenceSectionText,
  simulationNotice,
  thesisPrompts,
  type AbstractSimulation,
  type ThinkingPrompt,
} from '@/lib/explorationActivities'
import type { ReflectionEntry } from '@/types/research-workflow'

type Panel = 'abstract' | 'references' | 'thesis' | 'issues' | 'next'

function SimulationBanner({ pt }: { pt: boolean }) {
  return (
    <p role="note" className="rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
      <span aria-hidden>🎓 </span>
      {simulationNotice(pt)}
    </p>
  )
}

function CopyButton({ text, pt }: { text: string; pt: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button type="button" onClick={copy} className="text-xs font-semibold text-[var(--primary)] hover:underline">
      {copied ? (pt ? '✓ Copiado' : '✓ Copied') : (pt ? 'Copiar' : 'Copy')}
    </button>
  )
}

/** Questions to think about; answers can be kept in the reflective journal (never sent anywhere). */
function ThinkingList({ prompts, pt }: { prompts: ThinkingPrompt[]; pt: boolean }) {
  const { addReflectionEntry } = useWizardStore()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  const save = (item: ThinkingPrompt) => {
    const response = answers[item.id]?.trim()
    if (!response) return
    const entry: ReflectionEntry = {
      id: Math.random().toString(36).slice(2),
      prompt: item.text,
      response,
      createdAt: new Date().toISOString(),
    }
    addReflectionEntry(entry)
    setSaved((prev) => ({ ...prev, [item.id]: true }))
  }

  return (
    <ul className="space-y-4">
      {prompts.map((item) => (
        <li key={item.id} className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] p-3">
          <p className="text-sm font-medium text-[var(--on_surface)]">{item.text}</p>
          <textarea
            rows={3}
            aria-label={item.text}
            value={answers[item.id] ?? ''}
            onChange={(event) => {
              setSaved((prev) => ({ ...prev, [item.id]: false }))
              setAnswers((prev) => ({ ...prev, [item.id]: event.target.value }))
            }}
            placeholder={pt ? 'Escreva o que pensa…' : 'Write what you think…'}
            className="mt-2 w-full rounded-[var(--radius-sm)] border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={!answers[item.id]?.trim()}
              onClick={() => save(item)}
              className="rounded-[var(--radius-sm)] bg-[var(--secondary_container)] px-3 py-1.5 text-xs font-medium text-[var(--on_secondary_container)] disabled:opacity-50"
            >
              {pt ? 'Guardar no diário reflexivo' : 'Save to reflective journal'}
            </button>
            {saved[item.id] && <span role="status" className="text-xs text-green-700">{pt ? '✓ Guardado' : '✓ Saved'}</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * End of Stage 1: pop-ups that make the learner look at their own work (abstract and reference
 * list simulations, the central thesis, open issues, where to take the research next).
 */
export default function ExplorationActions() {
  const { locale } = useI18n()
  const pt = locale === 'pt-PT'
  const { explanationDraft, evidenceRecords, searchArticles, setStage, audience } = useWizardStore()
  const { call, friendly } = useStage3Ai()
  const [panel, setPanel] = useState<Panel | null>(null)
  const [abstracts, setAbstracts] = useState<{ pt: AbstractSimulation; en: AbstractSimulation } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!explanationDraft) return null

  const references = buildReferenceSection(evidenceRecords, searchArticles)
  const openIssues = explanationDraft.openIssues ?? []
  const close = () => setPanel(null)

  const generateAbstracts = async () => {
    setLoading(true)
    setError('')
    try {
      const context = [
        `Outline: ${(explanationDraft.outline ?? []).join('; ')}`,
        `Open issues: ${openIssues.join('; ')}`,
      ].join('\n')
      const run = async (language: 'pt-PT' | 'en') =>
        parseAbstractSimulation(
          await call('abstract_simulation', {
            stage: 1,
            stepId: 'step6_multimodal',
            locale: language,
            audience,
            explanationDraft,
            context,
          })
        )
      const [ptResult, enResult] = await Promise.all([run('pt-PT'), run('en')])
      setAbstracts({ pt: ptResult, en: enResult })
    } catch (e) {
      setError(friendly(e))
    } finally {
      setLoading(false)
    }
  }

  const cards: Array<{ id: Panel; emoji: string; label: string; hint: string }> = [
    { id: 'abstract', emoji: '📝', label: pt ? 'Simular abstract (PT e EN)' : 'Simulate abstract (PT and EN)', hint: pt ? 'Veja como poderia ser o resumo do seu artigo' : 'See what the abstract of your article could look like' },
    { id: 'references', emoji: '📚', label: pt ? 'Simular secção de referências' : 'Simulate reference section', hint: pt ? 'A lista final de fontes, como num artigo' : 'The final source list, as in a paper' },
    { id: 'thesis', emoji: '🎯', label: pt ? 'Pôr a tese à prova' : 'Put the thesis to the test', hint: pt ? 'Três perguntas sobre a sua tese central' : 'Three questions about your central thesis' },
    { id: 'issues', emoji: '🧩', label: pt ? 'Questões em aberto' : 'Open issues', hint: pt ? 'O que ficou por responder e o que vem a seguir' : 'What is still unanswered and what comes next' },
    { id: 'next', emoji: '🔭', label: pt ? 'E agora? Possibilidades de pesquisa' : 'What now? Research possibilities', hint: pt ? 'Para onde levar esta investigação' : 'Where to take this inquiry' },
  ]

  return (
    <section aria-labelledby="explore-title" className="space-y-3 rounded-[var(--radius-md)] border border-[var(--outline_variant)] bg-[var(--surface_container_lowest)] p-4">
      <div>
        <h3 id="explore-title" className="text-sm font-semibold text-[var(--on_surface)]">
          {pt ? 'Explorar o seu trabalho' : 'Explore your work'}
        </h3>
        <p className="mt-1 text-xs text-[var(--on_surface_variant)]">
          {pt
            ? 'Janelas para pensar sobre o que construiu e ver o que poderia vir a seguir. Nada aqui altera o seu trabalho.'
            : 'Pop-ups to think about what you built and see what could come next. Nothing here changes your work.'}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setPanel(card.id)}
            className="flex min-h-[64px] items-start gap-3 rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-3 text-left transition hover:bg-[var(--surface_container)]"
          >
            <span aria-hidden className="text-xl">{card.emoji}</span>
            <span>
              <span className="block text-sm font-semibold text-[var(--on_surface)]">{card.label}</span>
              <span className="block text-xs text-[var(--on_surface_variant)]">{card.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <Drawer open={panel === 'abstract'} onClose={close} title={pt ? 'Abstract simulado (PT e EN)' : 'Simulated abstract (PT and EN)'} size="lg" closeLabel={pt ? 'Fechar' : 'Close'}>
        <div className="space-y-4">
          <SimulationBanner pt={pt} />
          <p className="text-sm text-[var(--on_surface_variant)]">
            {pt
              ? 'Gerado a partir da sua pergunta, da tese central e das evidências que reuniu, sem inventar dados.'
              : 'Generated from your question, central thesis and the evidence you gathered, without inventing data.'}
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={generateAbstracts}
            className="rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on_primary)] disabled:opacity-50"
          >
            {loading ? (pt ? 'A escrever…' : 'Writing…') : abstracts ? (pt ? 'Gerar outra versão' : 'Generate another version') : (pt ? 'Gerar abstract simulado' : 'Generate simulated abstract')}
          </button>
          {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
          {abstracts &&
            ([['pt-PT', abstracts.pt], ['en', abstracts.en]] as const).map(([language, item]) => (
              <article key={language} lang={language === 'en' ? 'en' : 'pt-PT'} className="space-y-2 rounded-[var(--radius-md)] border border-[var(--outline_variant)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--on_surface_variant)]">{language === 'en' ? 'English' : 'Português (PT)'}</h4>
                  <CopyButton pt={pt} text={`${item.title}\n\n${item.abstract}\n\n${item.keywords.join(', ')}`} />
                </div>
                {item.title && <p className="font-semibold text-[var(--on_surface)]">{item.title}</p>}
                <p className="text-sm leading-6 text-[var(--on_surface)]">{item.abstract}</p>
                {item.keywords.length > 0 && (
                  <p className="text-xs text-[var(--on_surface_variant)]">
                    <strong>{language === 'en' ? 'Keywords' : 'Palavras-chave'}:</strong> {item.keywords.join(', ')}
                  </p>
                )}
                {item.teachingNote && <p className="rounded bg-[var(--surface_container_low)] p-2 text-xs italic text-[var(--on_surface)]">💡 {item.teachingNote}</p>}
              </article>
            ))}
        </div>
      </Drawer>

      <Drawer open={panel === 'references'} onClose={close} title={pt ? 'Secção de referências simulada' : 'Simulated reference section'} size="lg" closeLabel={pt ? 'Fechar' : 'Close'}>
        <div className="space-y-4">
          <SimulationBanner pt={pt} />
          {references.length === 0 ? (
            <p className="text-sm text-[var(--on_surface_variant)]">{pt ? 'Ainda não há evidências para listar.' : 'There is no evidence to list yet.'}</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--on_surface)]">{pt ? 'Referências' : 'References'}</h4>
                <CopyButton pt={pt} text={referenceSectionText(references, pt)} />
              </div>
              <ol className="space-y-3">
                {references.map((reference) => (
                  <li key={reference.key} className="pl-6 text-sm leading-6 text-[var(--on_surface)] [text-indent:-1.5rem]">
                    {reference.citation}
                    {(reference.doiUrl || reference.articleUrl) && (
                      <>
                        {' '}
                        <a href={reference.doiUrl || reference.articleUrl} target="_blank" rel="noreferrer" className="break-all text-[var(--primary)] underline">
                          {reference.doiUrl || reference.articleUrl}
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-[var(--on_surface_variant)]">
                {pt
                  ? 'Lista alfabética a partir das fontes que analisou. Confirme sempre autores, ano e DOI na fonte original antes de citar.'
                  : 'Alphabetical list built from the sources you analysed. Always check authors, year and DOI in the original source before citing.'}
              </p>
            </>
          )}
        </div>
      </Drawer>

      <Drawer open={panel === 'thesis'} onClose={close} title={pt ? 'Pôr a tese central à prova' : 'Put the central thesis to the test'} size="lg" closeLabel={pt ? 'Fechar' : 'Close'}>
        <div className="space-y-4">
          <div className="rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--on_surface_variant)]">{pt ? 'A tese central' : 'The central thesis'}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--on_surface)]">{explanationDraft.argumentCore}</p>
          </div>
          <ThinkingList prompts={thesisPrompts(pt)} pt={pt} />
        </div>
      </Drawer>

      <Drawer open={panel === 'issues'} onClose={close} title={pt ? 'Questões em aberto' : 'Open issues'} size="lg" closeLabel={pt ? 'Fechar' : 'Close'}>
        <div className="space-y-4">
          {openIssues.length === 0 ? (
            <p className="text-sm text-[var(--on_surface_variant)]">{pt ? 'A explicação não deixou questões em aberto registadas.' : 'The explanation did not record any open issues.'}</p>
          ) : (
            <ul className="space-y-2">
              {openIssues.map((issue) => (
                <li key={issue} className="rounded-[var(--radius-md)] bg-[var(--surface_container_low)] px-3 py-2 text-sm text-[var(--on_surface)]">{issue}</li>
              ))}
            </ul>
          )}
          <div className="rounded-[var(--radius-md)] border border-[var(--outline_variant)] p-4">
            <p className="text-sm font-semibold text-[var(--on_surface)]">{pt ? 'Estratégias para as resolver: no Estágio 3' : 'Strategies to resolve them: in Stage 3'}</p>
            <p className="mt-1 text-sm text-[var(--on_surface_variant)]">
              {pt
                ? 'No Estágio 3 vamos transformar estas questões em caminhos concretos: o Planeador de Extensão propõe novas pesquisas, bases de dados e métodos. Antes de lá chegar, pense qual destas questões mais lhe interessa.'
                : 'In Stage 3 we turn these issues into concrete paths: the Extension Planner suggests new searches, databases and methods. Before getting there, think about which one interests you most.'}
            </p>
            <button
              type="button"
              onClick={() => {
                close()
                setStage(3)
              }}
              className="mt-3 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on_primary)]"
            >
              {pt ? 'Ir para o Estágio 3 →' : 'Go to Stage 3 →'}
            </button>
          </div>
        </div>
      </Drawer>

      <Drawer open={panel === 'next'} onClose={close} title={pt ? 'E agora? Possibilidades de pesquisa' : 'What now? Research possibilities'} size="lg" closeLabel={pt ? 'Fechar' : 'Close'}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--on_surface_variant)]">
            {pt
              ? 'Uma boa investigação abre novas perguntas. Responda por palavras suas; pode guardar as respostas no diário reflexivo.'
              : 'Good research opens new questions. Answer in your own words; you can keep the answers in the reflective journal.'}
          </p>
          <ThinkingList prompts={nextResearchPrompts(pt)} pt={pt} />
        </div>
      </Drawer>
    </section>
  )
}
