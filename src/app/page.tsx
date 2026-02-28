'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [createdRoom, setCreatedRoom] = useState<{
    code: string
    teacherUrl: string
  } | null>(null)
  const [studentCode, setStudentCode] = useState('')
  const [error, setError] = useState('')

  async function handleCreateRoom() {
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/rooms', { method: 'POST' })
      const data = await res.json()
      setCreatedRoom({ code: data.code, teacherUrl: data.teacherUrl })
    } catch {
      setError('ルームの作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  function handleStudentJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = studentCode.trim().toUpperCase()
    if (code.length < 4) {
      setError('ルームコードを入力してください')
      return
    }
    router.push(`/room/${code}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <h1 className="text-3xl font-bold text-indigo-800 mb-2">中学英文法 総復習</h1>
      <p className="text-gray-500 mb-10">オンラインレッスン用リアルタイム問題演習</p>

      <div className="w-full max-w-md space-y-6">
        {/* 講師エリア */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">📚 講師の方</h2>
          {!createdRoom ? (
            <button
              onClick={handleCreateRoom}
              disabled={creating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 px-6 rounded-xl transition"
            >
              {creating ? '作成中...' : 'ルームを作成する'}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">ルームが作成されました！</p>
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">生徒の入室コード</p>
                <p className="text-3xl font-bold text-indigo-700 tracking-widest">{createdRoom.code}</p>
              </div>
              <a
                href={createdRoom.teacherUrl}
                className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition"
              >
                講師画面へ進む →
              </a>
              <button
                onClick={() => { setCreatedRoom(null); setError('') }}
                className="w-full text-sm text-gray-400 hover:text-gray-600"
              >
                別のルームを作成
              </button>
            </div>
          )}
        </div>

        {/* 生徒エリア */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">🎓 生徒の方</h2>
          <form onSubmit={handleStudentJoin} className="space-y-3">
            <input
              type="text"
              value={studentCode}
              onChange={e => setStudentCode(e.target.value.toUpperCase())}
              placeholder="ルームコードを入力（例: ABC123）"
              maxLength={6}
              className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest uppercase outline-none transition"
            />
            <button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition"
            >
              入室する
            </button>
          </form>
        </div>

        {error && (
          <p className="text-center text-red-500 text-sm">{error}</p>
        )}
      </div>
    </main>
  )
}
