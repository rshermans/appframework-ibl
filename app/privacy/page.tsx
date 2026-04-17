"use client"

import Link from 'next/link'
import { useI18n } from '@/components/I18nProvider'

export default function PrivacyPage() {
  const { locale } = useI18n()
  const pt = locale === 'pt-PT'

  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      <article className="space-y-6 rounded-[var(--radius-md)] bg-[var(--surface_container_low)] p-6 md:p-8">
        <div className="flex justify-end">
          <Link
            href="/"
            className="rounded-[var(--radius-sm)] bg-[var(--surface_container)] px-3 py-1.5 text-xs font-semibold text-[var(--on_surface)] hover:bg-[var(--surface_container_high)]"
          >
            {pt ? 'Voltar' : 'Back'}
          </Link>
        </div>
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-semibold text-[var(--on_surface)]">
            {pt ? 'Política de Privacidade' : 'Privacy Policy'}
          </h1>
          <p className="text-sm text-[var(--on_surface)] opacity-80">
            {pt ? 'Atualizado em 16 de abril de 2026' : 'Updated on April 16, 2026'}
          </p>
        </header>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{pt ? '1. Que dados tratamos' : '1. What data we process'}</h2>
          <p>
            {pt
              ? 'Tratamos dados inseridos no fluxo de investigação (tema, perguntas, evidências, saídas da IA), identificador de projeto e, se optar por login Google, email/nome/imagem de perfil.'
              : 'We process data entered in the research flow (topic, questions, evidence, AI outputs), project identifier, and if you choose Google login, your profile email/name/image.'}
          </p>
        </section>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{pt ? '2. Finalidade' : '2. Purpose'}</h2>
          <p>
            {pt
              ? 'Os dados são usados para suportar o processo pedagógico de Inquiry-Based Learning, gerar artefactos e permitir continuidade da sessão.'
              : 'Data is used to support the Inquiry-Based Learning pedagogical process, generate artifacts, and enable session continuity.'}
          </p>
        </section>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{pt ? '3. IA e transferência internacional' : '3. AI and international transfer'}</h2>
          <p>
            {pt
              ? 'Quando usa funcionalidades de IA, partes do conteúdo podem ser enviadas para processamento por fornecedor externo de IA. Esta transferência pode ocorrer fora da UE.'
              : 'When using AI features, parts of your content may be sent to an external AI provider for processing. This transfer may occur outside the EU.'}
          </p>
        </section>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{pt ? '4. Base legal e direitos' : '4. Legal basis and rights'}</h2>
          <p>
            {pt
              ? 'O tratamento baseia-se em consentimento para funcionalidades de IA e, quando aplicável, em interesse legítimo pedagógico. Pode pedir acesso, apagamento e portabilidade dos dados.'
              : 'Processing is based on consent for AI features and, when applicable, legitimate pedagogical interest. You may request access, deletion, and data portability.'}
          </p>
        </section>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{pt ? '5. Como apagar os dados' : '5. How to delete data'}</h2>
          <p>
            {pt
              ? 'Pode usar a ação de apagar dados no painel principal. Utilizadores autenticados apagam os dados associados à conta; utilizadores anónimos apagam o projeto da sessão atual.'
              : 'You can use the delete-data action in the main panel. Authenticated users delete account-linked data; anonymous users delete the current session project.'}
          </p>
        </section>

        <section className="space-y-2 text-sm leading-7 text-[var(--on_surface)]">
          <h2 className="text-base font-semibold">{pt ? '6. Contacto de segurança e privacidade' : '6. Security and privacy contact'}</h2>
          <p>
            {pt ? 'Para questões de segurança ou privacidade:' : 'For security or privacy matters:'} relia.informa@gmail.com
          </p>
        </section>
      </article>
    </main>
  )
}
