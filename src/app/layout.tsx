import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EcoMetrics - Sustainability Dashboard',
  description: 'Track environmental performance, energy consumption, water usage, and carbon footprint for ISO 14001 compliance.',
  keywords: 'sustainability, environmental, ISO 14001, carbon footprint, energy, water, EHS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background-primary text-white">
        {children}
      </body>
    </html>
  )
}
