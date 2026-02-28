'use client'

import type { Question } from '@/types'

interface ExplanationPanelProps {
  question: Question | null
  showAnswer: boolean
  showExplanation: boolean
}

export default function ExplanationPanel({
  question,
  showAnswer,
  showExplanation,
}: ExplanationPanelProps) {
  if (!question) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-bold text-slate-800 text-sm">解説パネル</h2>
      </div>

      <div className="p-5 space-y-4">
        {/* 正答 */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">正答</p>
          {showAnswer ? (
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="font-bold text-emerald-700 text-base">{question.correctAnswer}</span>
            </div>
          ) : (
            <div className="px-4 py-2 bg-slate-100 rounded-xl text-slate-400 text-sm">
              （正答表示OFFです）
            </div>
          )}
        </div>

        {/* ポイント解説 */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">ポイント</p>
          <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm leading-relaxed">
            {question.explanationShort}
          </div>
        </div>

        {/* 詳細解説 */}
        {showExplanation && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">詳細解説</p>
            <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-900 text-sm leading-relaxed">
              {question.explanation}
            </div>
          </div>
        )}

        {/* ヒント */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">ヒント</p>
          <div className="text-slate-500 text-sm italic">{question.hint}</div>
        </div>
      </div>
    </div>
  )
}
