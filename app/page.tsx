'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CreateRoomResponse } from '@/types'

export default function HomePage() {
  const router = useRouter()

  // ── ルーム作成 ──
  const [creating, setCreating] = useState(false)
  const [createdRoom, setCreatedRoom] = useState<CreateRoomResponse | null>(null)
  const [createError, setCreateError] = useState('')

  async function handleCreateRoom() {
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/rooms', { method: 'POST' })
      if (!res.ok) throw new Error('ルームの作成に失敗しました')
      const data: CreateRoomResponse = await res.json()
      setCreatedRoom(data)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setCreating(false)
    }
  }

  function handleGoTeacher() {
    if (!createdRoom) return
    router.push(`/teacher/room/${createdRoom.roomId}?key=${createdRoom.adminKey}`)
  }

  // ── 生徒入室 ──
  const [code, setCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 6) {
      setJoinError('6桁のコードを入力してください')
      return
    }
    setJoining(true)
    setJoinError('')
    try {
      // コードでルームを検索
      const res = await fetch(`/api/rooms/code/${trimmed}`)
      if (!res.ok) {
        setJoinError('ルームが見つかりません。コードを確認してください')
        return
      }
      router.push(`/room/${trimmed}`)
    } catch {
      setJoinError('エラーが発生しました。もう一度お試しください')
    } finally {
      setJoining(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">

        {/* タイトル */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">🇬🇧 英文法 総復習</h1>
          <p className="mt-2 text-gray-500">中学英語 オンラインレッスン</p>
        </div>

        {/* 講師：ルーム作成 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 講師の方</h2>

          {!createdRoom ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                ルームを作成して講師URLと生徒の入室コードを発行します。
              </p>
              <button
                onClick={handleCreateRoom}
                disabled={creating}
                className="btn-primary w-full"
              >
                {creating ? '作成中...' : 'ルームを作成する'}
              </button>
              {createError && (
                <p className="mt-2 text-sm text-red-500">{createError}</p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 mb-1">✅ ルームを作成しました</p>
              </div>

              {/* 生徒入室コード */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  生徒の入室コード
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold tracking-widest text-blue-600 font-mono">
                    {createdRoom.studentCode}
                  </span>
                  <CopyButton text={createdRoom.studentCode} />
                </div>
              </div>

              {/* 講師URL */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  講師URL（このURLを保管してください）
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-100 rounded px-2 py-1 break-all">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}${createdRoom.teacherUrl}`
                      : createdRoom.teacherUrl}
                  </code>
                  <CopyButton
                    text={
                      typeof window !== 'undefined'
                        ? `${window.location.origin}${createdRoom.teacherUrl}`
                        : createdRoom.teacherUrl
                    }
                  />
                </div>
              </div>

              <button onClick={handleGoTeacher} className="btn-primary w-full">
                授業を始める →
              </button>
            </div>
          )}
        </div>

        {/* 生徒：入室コード入力 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🎒 生徒の方</h2>
          <form onSubmit={handleJoinRoom} className="space-y-3">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                入室コード（6桁）
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="例：ABC123"
                maxLength={6}
                className="input-field font-mono text-lg tracking-widest uppercase text-center"
              />
            </div>
            {joinError && <p className="text-sm text-red-500">{joinError}</p>}
            <button
              type="submit"
              disabled={joining || code.trim().length === 0}
              className="btn-primary w-full"
            >
              {joining ? '確認中...' : '入室する'}
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}

// ── コピーボタン ──────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
    >
      {copied ? '✅ コピー済' : 'コピー'}
    </button>
  )
}
