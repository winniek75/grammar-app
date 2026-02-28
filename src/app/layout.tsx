import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '英文法 総復習 | リアルタイムレッスン',
  description: '中学英文法のリアルタイム演習アプリ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
