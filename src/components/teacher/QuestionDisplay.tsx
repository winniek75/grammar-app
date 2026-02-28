'use client'

import { Question } from '@/types'
import { MODE_LABELS } from '@/lib/question-categories'

interface QuestionDisplayProps {
  question: Question | null
  mode: 'choice' | 'typing' | 'sorting'
  showAnswer: boolean
  showExplanation: boolean
  questionIndex: number
  totalQuestions: number
}

export default function QuestionDisplay({
  question,
  mode,
  showAnswer,
  showExplanation,
  questionIndex,
  totalQuestions,
}: QuestionDisplayProps) {
  if (!question) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">
          問題を選択してください
        </p>
        <p className="text-slate-400 text-sm mt-1">
          「次の問題」ボタンで出題を開始します
        </p>
      </div>
    )
  }

  const gradeColor = {
    1: 'bg-emerald-100 text-emerald-700',
    2: 'bg-blue-100 text-blue-700',
    3: 'bg-orange-100 text-orange-700',
  }

  // 正答テキストを取得
  const getCorrectAnswerText = () => {
    if (mode === 'choice' && question.choices) {
      const correct = question.choices.find(
        (c) => c.id === question.correctAnswer
      )
      return correct ? correct.text : question.correctAnswer
    }
    if (mode === 'sorting' && question.sortWords) {
      return question.sortWords.join(' ')
    }
    return question.correctAnswer
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* 問題ヘッダー */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              gradeColor[question.grade as 1 | 2 | 3]
            }`}
          >
            中{question.grade}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {question.category}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-400">{question.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">
            {questionIndex + 1} / {totalQuestions}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              mode === 'choice'
                ? 'bg-indigo-100 text-indigo-700'
                : mode === 'typing'
                ? 'bg-teal-100 text-teal-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {MODE_LABELS[mode]}
          </span>
        </div>
      </div>

      {/* 問題文 */}
      <div className="px-6 py-6">
        <p className="text-lg font-bold text-slate-800 leading-relaxed">
          {question.questionText}
        </p>

        {/* 選択肢表示（choiceモード時） */}
        {mode === 'choice' && question.choices && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {question.choices.map((choice) => {
              const isCorrect = choice.id === question.correctAnswer
              return (
                <div
                  key={choice.id}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all ${
                    showAnswer && isCorrect
                      ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      showAnswer && isCorrect
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {choice.id.toUpperCase()}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      showAnswer && isCorrect
                        ? 'text-emerald-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {choice.text}
                  </span>
                  {showAnswer && isCorrect && (
                    <svg
                      className="w-4 h-4 text-emerald-500 ml-auto shrink-0"
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
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* タイピングモード表示 */}
        {mode === 'typing' && showAnswer && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-emerald-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-bold text-emerald-700">
                正答: {getCorrectAnswerText()}
              </span>
            </div>
          </div>
        )}

        {/* 並べ替えモード表示 */}
        {mode === 'sorting' && question.sortWords && (
          <div className="mt-4">
            {/* シャッフル済み表示（未回答時） */}
            {!showAnswer && (
              <div className="flex flex-wrap gap-1.5">
                {[...question.sortWords]
                  .sort(() => Math.random() - 0.5)
                  .map((word, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium text-amber-800"
                    >
                      {word}
                    </span>
                  ))}
              </div>
            )}
            {showAnswer && (
              <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-emerald-500 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-bold text-emerald-700">
                    正答: {question.sortWords.join(' ')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 解説パネル */}
      {showExplanation && (
        <div className="px-6 pb-5">
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  className="w-3.5 h-3.5 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-800 mb-1">
                  {question.explanationShort}
                </p>
                <p className="text-xs text-indigo-600 leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ヒント（正答表示前） */}
      {!showAnswer && question.hint && (
        <div className="px-6 pb-5">
          <div className="bg-amber-50 rounded-xl border border-amber-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-amber-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span className="text-xs font-medium text-amber-700">
                💡 ヒント: {question.hint}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
