'use client'

import { useEffect, useState } from 'react'

interface StudentAnswer {
  participantId: string
  participantName: string
  answerText: string
  isCorrect: boolean
  answeredAt: string
}

interface Participant {
  id: string
  name: string
}

interface StudentAnswersProps {
  participants: Participant[]
  answers: StudentAnswer[]
  currentQuestionId: string | null
  showAnswer: boolean
}

export default function StudentAnswers({
  participants,
  answers,
  currentQuestionId,
  showAnswer,
}: StudentAnswersProps) {
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set())

  // 現在の問題に対する回答のみ
  const currentAnswers = answers.filter(
    (a) => currentQuestionId // answersは既にフィルタ済みを想定
  )

  // 回答済みの参加者ID
  const answeredIds = new Set(currentAnswers.map((a) => a.participantId))

  // 正答数
  const correctCount = currentAnswers.filter((a) => a.isCorrect).length
  const totalAnswered = currentAnswers.length
  const totalParticipants = participants.length
  const correctRate =
    totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0

  // 新しい回答のアニメーション
  useEffect(() => {
    const newIds = new Set(currentAnswers.map((a) => a.participantId))
    newIds.forEach((id) => {
      if (!animatedIds.has(id)) {
        setAnimatedIds((prev) => new Set([...prev, id]))
        // アニメーション後にリセット
        setTimeout(() => {
          setAnimatedIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }, 600)
      }
    })
  }, [currentAnswers.length])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-cyan-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div>
            <span className="font-semibold text-slate-800 text-sm">
              生徒の回答状況
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">
                参加者 {totalParticipants}人
              </span>
              {currentQuestionId && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-400">
                    回答 {totalAnswered}人
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 正答率バッジ */}
        {showAnswer && totalAnswered > 0 && (
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              correctRate >= 80
                ? 'bg-emerald-100 text-emerald-700'
                : correctRate >= 50
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            正答率 {correctRate}%
          </div>
        )}
      </div>

      {/* 回答プログレスバー */}
      {currentQuestionId && totalParticipants > 0 && (
        <div className="px-5 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              回答進捗
            </span>
            <span className="text-xs font-bold text-slate-500">
              {totalAnswered} / {totalParticipants}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${
                  totalParticipants > 0
                    ? (totalAnswered / totalParticipants) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          {showAnswer && totalAnswered > 0 && (
            <div className="flex gap-1 mt-1.5">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-400">
                  正解 {correctCount}
                </span>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[10px] text-slate-400">
                  不正解 {totalAnswered - correctCount}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 参加者リスト */}
      <div className="px-5 py-3">
        {participants.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <p className="text-xs text-slate-400">
              生徒の入室を待っています…
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {participants.map((p) => {
              const answer = currentAnswers.find(
                (a) => a.participantId === p.id
              )
              const isNew = animatedIds.has(p.id)
              const hasAnswered = answeredIds.has(p.id)

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                    isNew
                      ? 'bg-cyan-50 scale-[1.02]'
                      : hasAnswered
                      ? 'bg-slate-50'
                      : 'bg-white'
                  }`}
                >
                  {/* アバター */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      hasAnswered
                        ? showAnswer && answer?.isCorrect
                          ? 'bg-emerald-100 text-emerald-700'
                          : showAnswer && answer && !answer.isCorrect
                          ? 'bg-red-100 text-red-700'
                          : 'bg-cyan-100 text-cyan-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>

                  {/* 名前 */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-700 truncate block">
                      {p.name}
                    </span>
                  </div>

                  {/* 回答状態 */}
                  {!currentQuestionId ? (
                    <span className="text-[10px] text-slate-300 font-medium">
                      待機中
                    </span>
                  ) : !hasAnswered ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[10px] text-amber-500 font-medium">
                        回答中
                      </span>
                    </span>
                  ) : showAnswer ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 max-w-[100px] truncate">
                        {answer?.answerText}
                      </span>
                      {answer?.isCorrect ? (
                        <span className="flex items-center gap-0.5 text-emerald-500">
                          <svg
                            className="w-4 h-4"
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
                          <span className="text-[10px] font-bold">
                            正解
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-red-500">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          <span className="text-[10px] font-bold">
                            不正解
                          </span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4 text-cyan-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-[10px] text-cyan-600 font-medium">
                        回答済み
                      </span>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
