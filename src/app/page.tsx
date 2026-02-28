'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TopPage() {
  const router = useRouter()
  const [studentCode, setStudentCode] = useState('')
  const [createdRoom, setCreatedRoom] = useState<{
    teacherUrl: string
    studentCode: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleCreateRoom = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) return setError(data.error)
      setCreatedRoom({
        teacherUrl: data.teacherUrl || `/teacher/room/${data.roomId}?key=${data.adminKey}`,
        studentCode: data.studentCode,
      })
    } catch {
      setError('ルームの作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleStudentEnter = () => {
    const code = studentCode.trim().toUpperCase()
    if (code.length !== 6) return setError('6桁のコードを入力してください')
    router.push(`/room/${code}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* タイトル */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-emerald-400">🇬🇧 英文法 総復習</h1>
          <p className="text-slate-400 mt-3">
            リアルタイム英文法演習アプリ
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 講師カード */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-1">👩‍🏫 講師の方へ</h2>
            <p className="text-slate-400 text-sm mb-5">ルームを作成して授業を始めましょう</p>

            {!createdRoom ? (
              <>
                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-lg transition"
                >
                  {loading ? '作成中...' : 'ルームを作成する'}
                </button>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-700 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">📋 講師URL（自分用・コピーして保存）</p>
                  <p className="font-mono text-xs text-white break-all leading-relaxed">
                    {window.location.origin}{createdRoom.teacherUrl}
                  </p>
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}${createdRoom.teacherUrl}`, 'teacher')}
                    className="mt-2 text-xs bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded transition"
                  >
                    {copied === 'teacher' ? '✅ コピーしました' : 'コピー'}
                  </button>
                </div>

                <div className="bg-emerald-900/40 border border-emerald-600 rounded-xl p-4 text-center">
                  <p className="text-xs text-emerald-400 mb-1">👥 生徒の入室コード</p>
                  <p className="text-4xl font-mono font-bold tracking-widest text-emerald-300">
                    {createdRoom.studentCode}
                  </p>
                  <button
                    onClick={() => copyToClipboard(createdRoom.studentCode, 'code')}
                    className="mt-2 text-xs bg-emerald-700 hover:bg-emerald-600 px-3 py-1 rounded transition"
                  >
                    {copied === 'code' ? '✅ コピーしました' : 'コードをコピー'}
                  </button>
                </div>

                <a
                  href={createdRoom.teacherUrl}
                  className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-center transition"
                >
                  🎓 講師パネルへ
                </a>

                <button
                  onClick={() => setCreatedRoom(null)}
                  className="w-full text-slate-400 text-sm hover:text-white transition"
                >
                  別のルームを作る
                </button>
              </div>
            )}
          </div>

          {/* 生徒カード */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-1">👨‍🎓 生徒の方へ</h2>
            <p className="text-slate-400 text-sm mb-5">講師からもらったコードで入室</p>

            <div className="space-y-3">
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleStudentEnter()}
                maxLength={6}
                placeholder="XXXXXX"
                className="w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest uppercase focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleStudentEnter}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg transition"
              >
                入室する
              </button>
            </div>
          </div>
        </div>

        {/* フッター説明 */}
        <div className="mt-10 text-center text-slate-500 text-sm space-y-1">
          <p>🔒 ログイン不要 · DBなし · Pusherリアルタイム通信</p>
          <p>中1〜中3 全300問対応</p>
        </div>
      </div>
    </div>
  )
}
