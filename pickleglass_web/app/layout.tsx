import './globals.css'
import { Inter } from 'next/font/google'
import ClientLayout from '@/components/ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'RANI - Research Assistant for Novel Inquiry',
  description: 'AI-powered research copilot for learning, annotating, exploring, and experimenting with new ideas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
} 