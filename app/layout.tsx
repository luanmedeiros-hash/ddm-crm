import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DDM · Daily Direct Meeting',
  description: 'CRM de daily comercial',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  )
}
