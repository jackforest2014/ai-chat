import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthBar } from '@/components/auth/AuthBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Chat Assistant',
  description: 'Modern AI-powered chat application',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AuthBar />
          <div className="pt-14">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
