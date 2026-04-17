import type { Metadata } from 'next'
import { Inter, Manrope, Public_Sans } from 'next/font/google'
import './globals.css'
import { I18nProvider } from '@/components/I18nProvider'
import ProgressDashboard from '@/components/ProgressDashboard'
import AuthSessionProvider from '@/components/AuthSessionProvider'
import NextTopLoader from 'nextjs-toploader'

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' })
const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-label' })

export const metadata: Metadata = {
  title: 'IBL-AI',
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
        <NextTopLoader
          color="#2563eb"
          initialPosition={0.12}
          crawlSpeed={180}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={220}
          shadow="0 0 10px #2563eb,0 0 5px #2563eb"
        />
        <AuthSessionProvider>
          <I18nProvider>
            {children}
            <ProgressDashboard />
          </I18nProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
