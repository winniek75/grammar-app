'use client'

import { useState } from 'react'

interface RoomHeaderProps {
  roomCode: string
  roomId: string
  status: 'waiting' | 'active' | 'finished'
  participantCount: number
  isConnected: boolean
}

export default function RoomHeader({
  roomCode,
  roomId,
  status,
  participantCount,
  isConnected,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusConfig = {
    waiting: {
      label: '入室待ち',
      color: 'bg-amber-100 text-amber-700',
      dot: 'bg-amber-400',
    },
    active: {
      label: '授業中',
      color: 'bg-emerald-100 text-emerald-700',
      dot: 'bg-emerald-400 animate-pulse',
    },
    finished: {
      label: '終了',
      color: 'bg-slate-100 text-slate-500',
      dot: 'bg-slate-400',
    },
  }

  const st = statusConfig[status]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        {/* 左：ルーム情報 */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-200">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">
              講師パネル
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </span>
              <span className="text-[10px] text-slate-400">
                {participantCount}人参加
              </span>
            </div>
          </div>
        </div>

        {/* 中央：入室コード */}
        <button
          onClick={copyCode}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all group"
        >
          <span className="text-[10px] text-slate-400 font-medium">
            入室コード
          </span>
          <span className="text-base font-black tracking-[0.2em] text-slate-800 font-mono">
            {roomCode}
          </span>
          {copied ? (
            <svg
              className="w-4 h-4 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-slate-400 group-hover:text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
        </button>

        {/* 右：接続状態 */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-red-400'
            }`}
          />
          <span className="text-[10px] font-medium text-slate-400">
            {isConnected ? 'Pusher接続中' : '切断中'}
          </span>
        </div>
      </div>
    </div>
  )
}
