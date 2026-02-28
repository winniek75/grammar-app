'use client'

import type { AnswerSubmittedEvent } from '@/types'

interface StudentAnswersProps {
  answers: AnswerSubmittedEvent[]
  totalParticipants: number
  showCorrect: boolean  // 正答表示フラグがONのとき正誤を見せる
}

export default function StudentAnswers({
  answers,
  totalParticipants,
  showCorrect,
}: StudentAnswersProps) {
  const correctCount = answers.filter((a) => a.isCorrect).length
  const answeredCount = answers.length

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 text-sm">生徒の回答</h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">
            <span className="font-bold text-slate-700">{answeredCount}</span>
            <span className="text-slate-400"> / {totalParticipants}名</span>
          </span>
          {showCorrect && answeredCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
              正解 {correctCount}
            </span>
          )}
        </div>
      </div>

      {/* 進捗バー */}
      {totalParticipants > 0 && (
        <div className="px-5 pt-3">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(answeredCount / totalParticipants) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 回答一覧 */}
      <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
        {answers.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-6">
            まだ回答がありません
          </p>
        ) : (
          answers.map((a) => (
            <AnswerRow key={`${a.participantId}-${a.questionId}`} answer={a} showCorrect={showCorrect} />
          ))
        )}
      </div>
    </div>
  )
}

function AnswerRow({
  answer,
  showCorrect,
}: {
  answer: AnswerSubmittedEvent
  showCorrect: boolean
}) {
  const bgColor = showCorrect
    ? answer.isCorrect
      ? 'bg-emerald-50 border-emerald-200'
      : 'bg-red-50 border-red-200'
    : 'bg-slate-50 border-slate-200'

  const icon = showCorrect ? (answer.isCorrect ? '✅' : '❌') : '💬'

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm ${bgColor} transition-colors`}>
      <span className="text-base leading-none">{icon}</span>
      <span className="font-medium text-slate-700 w-20 truncate shrink-0">
        {answer.participantName}
      </span>
      <span className="text-slate-500 flex-1 truncate">{answer.answerText}</span>
      <span className="text-slate-400 text-xs shrink-0">
        {new Date(answer.answeredAt).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </span>
    </div>
  )
}
