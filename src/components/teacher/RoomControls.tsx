'use client'

import type { Question } from '@/types'

interface RoomControlsProps {
  currentQuestion: Question | null
  mode: 'choice' | 'typing' | 'sorting'
  showAnswer: boolean
  showExplanation: boolean
  onPrev: () => void
  onNext: () => void
  onRandom: () => void
  onShowAnswer: (show: boolean, showExp: boolean) => void
  onSetMode: (mode: 'choice' | 'typing' | 'sorting') => void
  onFinish: () => void
  loading: boolean
}

const MODE_LABELS: Record<string, string> = {
  choice: '選択',
  typing: 'タイピング',
  sorting: '並べ替え',
}

export default function RoomControls({
  currentQuestion,
  mode,
  showAnswer,
  showExplanation,
  onPrev,
  onNext,
  onRandom,
  onShowAnswer,
  onSetMode,
  onFinish,
  loading,
}: RoomControlsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-bold text-slate-800 text-sm">授業コントロール</h2>
      </div>

      <div className="p-5 space-y-5">
        {/* 出題モード */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">出題モード</p>
          <div className="flex gap-2">
            {(['choice', 'typing', 'sorting'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onSetMode(m)}
                disabled={loading}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                  mode === m
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* 問題ナビ */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">問題を進める</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onPrev}
              disabled={loading}
              className="py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              ← 前
            </button>
            <button
              onClick={onRandom}
              disabled={loading}
              className="py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors"
            >
              ランダム
            </button>
            <button
              onClick={onNext}
              disabled={loading}
              className="py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              次 →
            </button>
          </div>
        </div>

        {/* 正答表示 */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">正答・解説</p>
          <div className="space-y-2">
            <button
              onClick={() => onShowAnswer(!showAnswer, showExplanation)}
              disabled={loading || !currentQuestion}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                showAnswer
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              } disabled:opacity-40`}
            >
              {showAnswer ? '✅ 正答表示中 — タップで隠す' : '正答を表示'}
            </button>
            <button
              onClick={() => onShowAnswer(showAnswer, !showExplanation)}
              disabled={loading || !currentQuestion}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                showExplanation
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              } disabled:opacity-40`}
            >
              {showExplanation ? '📖 解説表示中 — タップで隠す' : '解説を表示'}
            </button>
          </div>
        </div>

        {/* 授業終了 */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={onFinish}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 disabled:opacity-40 transition-colors"
          >
            授業を終了する
          </button>
        </div>
      </div>
    </div>
  )
}
