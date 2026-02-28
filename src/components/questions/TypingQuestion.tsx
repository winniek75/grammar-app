'use client'

import { useState } from 'react'

interface Props {
  value: string
  correct: string | null   // null = not revealed yet
  submitted: boolean
  isCorrect: boolean | null
  onChange: (v: string) => void
  onSubmit: () => void
}

export default function TypingQuestion({
  value,
  correct,
  submitted,
  isCorrect,
  onChange,
  onSubmit,
}: Props) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !submitted) onSubmit()
  }

  let inputStyle = 'border-2 border-gray-300 focus:border-indigo-400'
  if (submitted && isCorrect !== null) {
    inputStyle = isCorrect
      ? 'border-2 border-green-500 bg-green-50'
      : 'border-2 border-red-400 bg-red-50'
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          placeholder="ここに英語を入力..."
          className={`${inputStyle} flex-1 rounded-xl px-4 py-3 text-lg outline-none transition disabled:cursor-default`}
        />
        <button
          onClick={onSubmit}
          disabled={submitted || value.trim() === ''}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold px-6 rounded-xl transition"
        >
          送信
        </button>
      </div>

      {submitted && isCorrect !== null && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            isCorrect
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {isCorrect ? '✅ 正解！' : `❌ 不正解 — あなたの回答: ${value}`}
        </div>
      )}

      {correct !== null && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 text-sm text-yellow-800">
          正答: <span className="font-bold">{correct}</span>
        </div>
      )}
    </div>
  )
}
