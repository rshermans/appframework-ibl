import type { Metadata } from 'next'
import { Inter, Manrope, Public_Sans } from 'next/font/google'
import './globals.css'
import { I18nProvider } from '@/components/I18nProvider'
import ProgressDashboard from '@/components/ProgressDashboard'

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' })
const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-label' })

export const metadata: Metadata = {
  title: 'Empowering Science Education',
  description: 'Fluxo de investigação orientado por IA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-PT">
      <body className={`${inter.variable} ${manrope.variable} ${publicSans.variable} bg-[var(--surface)] text-[var(--on_surface)]`}>
        <I18nProvider>
          {children}
          <ProgressDashboard />
        </I18nProvider>
      </body>
    </html>
  )
}
