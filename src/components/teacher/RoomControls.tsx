'use client'

import { MODE_LABELS } from '@/lib/question-categories'

interface RoomControlsProps {
  mode: 'choice' | 'typing' | 'sorting'
  showAnswer: boolean
  showExplanation: boolean
  hasQuestion: boolean
  hasPrev: boolean
  hasNext: boolean
  isFinished: boolean
  onPrev: () => void
  onNext: () => void
  onRandom: () => void
  onToggleAnswer: () => void
  onToggleExplanation: () => void
  onModeChange: (mode: 'choice' | 'typing' | 'sorting') => void
  onFinish: () => void
}

export default function RoomControls({
  mode,
  showAnswer,
  showExplanation,
  hasQuestion,
  hasPrev,
  hasNext,
  isFinished,
  onPrev,
  onNext,
  onRandom,
  onToggleAnswer,
  onToggleExplanation,
  onModeChange,
  onFinish,
}: RoomControlsProps) {
  const modes: Array<'choice' | 'typing' | 'sorting'> = [
    'choice',
    'typing',
    'sorting',
  ]

  const modeStyles = {
    choice: {
      active: 'bg-indigo-500 text-white shadow-sm shadow-indigo-200',
      inactive: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    typing: {
      active: 'bg-teal-500 text-white shadow-sm shadow-teal-200',
      inactive: 'bg-teal-50 text-teal-600 hover:bg-teal-100',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    sorting: {
      active: 'bg-amber-500 text-white shadow-sm shadow-amber-200',
      inactive: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      ),
    },
  }

  return (
    <div className="space-y-3">
      {/* 出題モード切り替え */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            出題モード
          </span>
        </div>
        <div className="flex gap-1.5">
          {modes.map((m) => {
            const style = modeStyles[m]
            const isActive = mode === m
            return (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-1 justify-center ${
                  isActive ? style.active : style.inactive
                }`}
              >
                {style.icon}
                {MODE_LABELS[m]}
              </button>
            )
          })}
        </div>
      </div>

      {/* 問題ナビゲーション */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            問題操作
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onPrev}
            disabled={!hasPrev || isFinished}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            前の問題
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext || isFinished}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shadow-violet-200"
          >
            次の問題
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={onRandom}
            disabled={isFinished}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-pink-50 text-pink-600 hover:bg-pink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            ランダム
          </button>
        </div>
      </div>

      {/* 正答・解説コントロール */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            表示切り替え
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onToggleAnswer}
            disabled={!hasQuestion || isFinished}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              showAnswer
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {showAnswer ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              )}
            </svg>
            {showAnswer ? '正答を隠す' : '正答を表示'}
          </button>
          <button
            onClick={onToggleExplanation}
            disabled={!hasQuestion || !showAnswer || isFinished}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              showExplanation
                ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showExplanation ? '解説を隠す' : '解説を表示'}
          </button>
        </div>
      </div>

      {/* 授業終了 */}
      <button
        onClick={onFinish}
        disabled={isFinished}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
          isFinished
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200'
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        {isFinished ? '授業は終了しました' : '授業を終了する'}
      </button>
    </div>
  )
}
