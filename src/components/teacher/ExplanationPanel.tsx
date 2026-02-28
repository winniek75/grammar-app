'use client'

import { Question } from '@/types'

interface ExplanationPanelProps {
  question: Question | null
  showAnswer: boolean
  showExplanation: boolean
  mode: 'choice' | 'typing' | 'sorting'
}

export default function ExplanationPanel({
  question,
  showAnswer,
  showExplanation,
  mode,
}: ExplanationPanelProps) {
  if (!question || !showAnswer) return null

  // 正答テキスト
  const correctText = (() => {
    if (mode === 'choice' && question.choices) {
      const c = question.choices.find((c) => c.id === question.correctAnswer)
      return c ? `${c.id.toUpperCase()}. ${c.text}` : question.correctAnswer
    }
    if (mode === 'sorting' && question.sortWords) {
      return question.sortWords.join(' ')
    }
    return question.correctAnswer
  })()

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* 正答 */}
      <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">
              正答
            </span>
            <p className="text-base font-bold text-emerald-800">
              {correctText}
            </p>
          </div>
        </div>
      </div>

      {/* 解説 */}
      {showExplanation && (
        <div className="px-5 py-4">
          <div className="mb-3">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
              ポイント
            </span>
            <p className="text-sm font-bold text-slate-800 mt-1">
              {question.explanationShort}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              詳細解説
            </span>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              {question.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
