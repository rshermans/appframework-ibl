'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Sparkles, HelpCircle, BookOpen, Copy, Check } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { useWizardStore } from '@/store/wizardStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Quick suggestions per step — keyed by WorkflowStepId
const STEP_SUGGESTIONS: Record<string, Array<{ label: string; icon: React.ReactNode }>> = {
  default: [
    { label: 'Como funciona o IBL?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'Qual é o próximo passo?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'Dicas de ética na IA', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step0_generate: [
    { label: 'Como gerar boas perguntas?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'O que é um tipo epistemológico?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'Dica ética para o Step 0', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step1_select: [
    { label: 'Como selecionar a melhor RQ?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'Que critérios usar na seleção?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'Dica ética para o Step 1', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step1a_compare: [
    { label: 'O que é o Step 1A?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'Como sintetizar a pergunta final?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'As 8 dimensões de avaliação', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step1b_synthesize: [
    { label: 'O que é análise epistemológica?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'A minha pergunta está bem formulada?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'Dica ética para o Step 1B', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step2_search_design: [
    { label: 'Como construir uma string booleana?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'Quais bases de dados usar?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'A string retornou poucos resultados', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step3_evidence_extraction: [
    { label: 'Como extrair evidências?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'O que são "findings"?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'Dica ética para extração', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step5_source_selection: [
    { label: 'O que é o teste CRAAP?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'Pontuação mínima para incluir fonte?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'Dica ética — seleção de fontes', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step4_knowledge_structure: [
    { label: 'Como organizar os tópicos?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'O que posso inserir no meu mapa mental para representar o meu artigo?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'Como ancorar cada subtópico a uma fonte?', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step8_glossary: [
    { label: 'Que termos incluir no glossário?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'Como definir um conceito científico?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'Dica ética para o glossário', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step9_explanation: [
    { label: 'Como estruturar a explicação científica?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'Como ancorar a evidência?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'Dica ética — Stage 2', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step6_multimodal: [
    { label: 'Que formatos multimodais existem?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'Como fazer um bom poster científico?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'Dica ética — outputs multimodais', icon: <Sparkles className="w-3 h-3" /> },
  ],
  step7_reflection: [
    { label: 'O que é a reflexão metacognitiva?', icon: <BookOpen className="w-3 h-3" /> },
    { label: 'Como fazer peer review?', icon: <HelpCircle className="w-3 h-3" /> },
    { label: 'Dica ética — Stage 3', icon: <Sparkles className="w-3 h-3" /> },
  ],
}

// Minimal Markdown renderer: bold, bullets, line breaks
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  lines.forEach((line, idx) => {
    const isBullet = /^[-*•]\s/.test(line)
    const trimmed = isBullet ? line.replace(/^[-*•]\s/, '') : line

    // Replace **bold**
    const parts = trimmed.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900">{part}</strong> : part
    )

    if (isBullet) {
      elements.push(
        <div key={idx} className="flex gap-1.5 items-start">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
          <span>{parts}</span>
        </div>
      )
    } else if (trimmed.trim() === '') {
      elements.push(<div key={idx} className="h-2" />)
    } else {
      elements.push(<p key={idx}>{parts}</p>)
    }
  })

  return <div className="space-y-1 text-sm leading-relaxed">{elements}</div>
}

export default function ChatAssistant() {
  const { locale } = useI18n()
  const { workflowStep, stage } = useWizardStore()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Derive step label for the header
  const stepKey = workflowStep ?? 'default'
  const quickSuggestions = STEP_SUGGESTIONS[stepKey] ?? STEP_SUGGESTIONS.default

  const stepDisplayName = workflowStep
    ? workflowStep.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSendMessage = useCallback(async (text: string = input) => {
    if (!text.trim() || isLoading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          locale,
          currentStep: workflowStep,
          currentStage: stage,
        }),
      })

      const data = await response.json()
      if (data.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro ao processar a sua pergunta. Tente novamente.',
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Erro de conexão com o assistente. Verifique a sua ligação à internet.',
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, locale, workflowStep, stage])

  const handleCopyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-body">
      {/* Chat window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[360px] sm:w-[420px] h-[540px] glass-panel rounded-2xl overflow-hidden flex flex-col border border-white/20 shadow-2xl"
          style={{ animation: 'slideUp 0.25s ease-out' }}
        >
          {/* Header */}
          <div className="primary-gradient p-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="bg-white/20 p-1.5 rounded-lg border border-white/10">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-white leading-tight">
                  Copiloto IBL-AI
                </h3>
                {stepDisplayName ? (
                  <span className="text-[10px] text-white/70 font-label tracking-wider">
                    {stepDisplayName}
                  </span>
                ) : (
                  <span className="text-[10px] text-white/70 uppercase font-label tracking-wider">
                    Assistente Metodológico
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Fechar assistente"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
            style={{ background: 'rgba(248,250,255,0.85)' }}
          >
            {messages.length === 0 && (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto border border-blue-200">
                  <MessageCircle className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-sm text-slate-600 px-4 leading-relaxed">
                  Olá! Sou o teu Copiloto IBL-AI. Tenho o manual completo do framework carregado.
                  {stepDisplayName && (
                    <> Vejo que estás em <strong className="text-blue-600">{stepDisplayName}</strong>.</>
                  )}
                  {' '}Como posso ajudar?
                </p>
                <div className="grid gap-2 px-4">
                  {quickSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(s.label)}
                      className="text-xs text-left p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center gap-2 text-slate-700 shadow-sm"
                    >
                      <span className="text-blue-500">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`
                  relative max-w-[88%] p-3 rounded-2xl shadow-sm
                  ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm'}
                `}>
                  {msg.role === 'assistant' ? (
                    renderMarkdown(msg.content)
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}

                  {/* Copy button for assistant messages */}
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopyMessage(msg.content, idx)}
                      className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:border-blue-300"
                      title="Copiar resposta"
                    >
                      {copiedIdx === idx
                        ? <Check className="w-3 h-3 text-green-500" />
                        : <Copy className="w-3 h-3 text-slate-400" />
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-sm flex gap-1 items-center shadow-sm">
                  {[0, 150, 300].map(delay => (
                    <div
                      key={delay}
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Suggestions bar — always visible when chat is open */}
          {messages.length > 0 && !isLoading && (
            <div className="px-3 py-2 flex gap-2 overflow-x-auto border-t border-slate-100 bg-white/60 flex-shrink-0">
              {quickSuggestions.slice(0, 2).map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(s.label)}
                  className="text-[11px] whitespace-nowrap px-2.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors flex-shrink-0"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunta sobre o IBL-AI..."
              className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-2 bg-blue-600 text-white rounded-xl disabled:opacity-40 hover:bg-blue-700 transition-colors shadow-md active:scale-90"
              aria-label="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`
          flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 active:scale-90
          ${isOpen
            ? 'bg-slate-700 hover:bg-slate-600'
            : 'primary-gradient hover:scale-110'}
        `}
        aria-label={isOpen ? 'Fechar Copiloto IBL' : 'Abrir Copiloto IBL'}
      >
        {isOpen
          ? <X className="text-white w-6 h-6" />
          : <MessageCircle className="text-white w-6 h-6" />
        }
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
