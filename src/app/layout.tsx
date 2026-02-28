import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '中学英文法 総復習アプリ',
  description: 'オンラインレッスン向けリアルタイム英文法問題演習',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
