import type { Metadata } from 'next'
import './globals.css'
import { I18nProvider } from '@/components/I18nProvider'
import ProgressDashboard from '@/components/ProgressDashboard'

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
      <body className="bg-gray-50 text-gray-900">
        <I18nProvider>{children}</I18nProvider>
        <ProgressDashboard />
      </body>
    </html>
  )
}
