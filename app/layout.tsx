import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '先生と英文法レッスン（授業用）',
  description: '先生がえらんだ中学英文法の問題に、生徒が同時に答える授業用ツール（先生の進行が必要です）',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Script
          src="https://cdn.jsdelivr.net/gh/winniek75/wise-xp-sdk@main/wise-xp.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  )
}
