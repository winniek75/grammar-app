'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { pusherClient, getRoomChannel } from '@/lib/pusher-client'
import { questions } from '@/app/data/questions'
import type { TeacherRoomView, Question } from '@/lib/types'
import QuestionSelector from '@/app/components/teacher/QuestionSelector'
import StudentAnswers from '@/app/components/teacher/StudentAnswers'
import ExplanationPanel from '@/app/components/teacher/ExplanationPanel'

export default function TeacherRoomPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.id as string
  const adminKey = searchParams.get('key')

  const [room, setRoom] = useState<TeacherRoomView | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<1 | 2 | 3 | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const [busy, setBusy] = useState(false)

  // ルーム状態を取得（講師の管理キーが必要）
  const fetchRoom = useCallback(async (initial: boolean) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/state`, {
        headers: { 'x-admin-key': adminKey ?? '' },
        cache: 'no-store',
      })
      if (!res.ok) {
        if (!initial) return
        if (res.status === 404) {
          setError('ルームが見つかりません')
        } else if (res.status === 403) {
          setError('講師URLが正しくありません（URLの ?key= 以降までコピーされているか確認してください）')
        } else {
          setError('エラーが発生しました')
        }
        return
      }
      const data: TeacherRoomView = await res.json()
      setRoom(data)
      setCurrentQuestion(
        data.currentQuestionId
          ? questions.find(q => q.id === data.currentQuestionId) || null
          : null
      )
    } catch {
      if (initial) setError('ルームの取得に失敗しました')
    } finally {
      if (initial) setLoading(false)
    }
  }, [roomId, adminKey])

  useEffect(() => {
    fetchRoom(true)
  }, [fetchRoom])

  // 通知が届かなかった場合に備えて、数秒ごとに最新の状態を取り直す
  const hasRoom = room !== null
  useEffect(() => {
    if (!hasRoom) return
    const timer = setInterval(() => fetchRoom(false), 4000)
    return () => clearInterval(timer)
  }, [hasRoom, fetchRoom])

  // Pusher接続（入室・回答の通知を受けたら、すぐに最新の状態を取り直す）
  useEffect(() => {
    if (!hasRoom || !pusherClient) return

    const channel = pusherClient.subscribe(getRoomChannel(roomId))
    const refresh = () => { fetchRoom(false) }
    channel.bind('participant-joined', refresh)
    channel.bind('answer-submitted', refresh)

    return () => {
      channel.unbind('participant-joined', refresh)
      channel.unbind('answer-submitted', refresh)
      pusherClient?.unsubscribe(getRoomChannel(roomId))
    }
  }, [hasRoom, roomId, fetchRoom])

  async function postControl(payload: Record<string, unknown>) {
    return fetch(`/api/rooms/${roomId}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey ?? '' },
      body: JSON.stringify(payload),
    })
  }

  // 問題を変更
  async function handleQuestionChange(questionId: string) {
    try {
      const res = await postControl({ action: 'set-question', questionId })

      if (!res.ok) {
        if (res.status === 403) alert('権限がありません')
        else alert('エラーが発生しました')
        return
      }

      const data = await res.json()
      if (data.room) {
        setRoom(data.room)
        const q = questions.find(q => q.id === questionId)
        setCurrentQuestion(q || null)
      }
    } catch {
      alert('問題の変更に失敗しました')
    }
  }

  // 正答・解説の表示切り替え
  async function handleToggleAnswer(showAnswer: boolean, showExplanation: boolean) {
    setBusy(true)
    try {
      const res = await postControl({ action: 'show-answer', showAnswer, showExplanation })

      if (!res.ok) {
        alert('エラーが発生しました')
        return
      }

      const data = await res.json()
      if (data.room) {
        setRoom(data.room)
      }
    } catch {
      alert('表示の切り替えに失敗しました')
    } finally {
      setBusy(false)
    }
  }

  // 授業を終了（生徒の画面も終了する）
  async function handleFinish() {
    if (!confirm('授業を終了しますか？\n生徒の画面も終了し、このルームは使えなくなります。')) return
    try {
      await postControl({ action: 'finish-room' })
    } catch {
      // 終了の通知に失敗してもトップへ戻る
    }
    router.push('/')
  }

  // フィルタリングされた問題
  const filteredQuestions = questions.filter(q => {
    if (selectedGrade && q.grade !== selectedGrade) return false
    if (selectedCategory && q.category !== selectedCategory) return false
    return true
  })

  // カテゴリ一覧を取得
  const categories = Array.from(new Set(questions.map(q => q.category)))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'ルームが見つかりません'}</p>
          <button
            onClick={() => router.push('/')}
            className="btn-secondary"
          >
            トップページに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <header className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">講師画面</h1>
              <p className="text-sm text-gray-600 mt-1">
                生徒の入室コード: <span className="font-mono font-bold text-lg tracking-widest text-blue-600">{room.code}</span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">参加者</p>
                <p className="text-2xl font-bold">{room.participants.length}名</p>
              </div>
              <button
                onClick={handleFinish}
                className="btn-secondary"
              >
                授業を終了
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：問題選択 */}
          <div className="lg:col-span-1">
            <QuestionSelector
              questions={filteredQuestions}
              currentQuestionId={room.currentQuestionId}
              onQuestionChange={handleQuestionChange}
              selectedGrade={selectedGrade}
              setSelectedGrade={setSelectedGrade}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categories={categories}
            />
          </div>

          {/* 中央：現在の問題と解答状況 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 現在の問題 */}
            {currentQuestion ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {currentQuestion.category} - 中{currentQuestion.grade}
                  </span>
                </div>

                <h2 className="text-xl font-bold mb-4">{currentQuestion.questionText}</h2>

                {currentQuestion.questionType === 'choice' && currentQuestion.choices && (
                  <div className="space-y-2 mb-6">
                    {currentQuestion.choices.map(choice => (
                      <div
                        key={choice.id}
                        className={`p-3 rounded-lg border ${
                          room.showAnswer && choice.id === currentQuestion.correctAnswer
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200'
                        }`}
                      >
                        {choice.id}. {choice.text}
                      </div>
                    ))}
                  </div>
                )}

                <ProgressPanel
                  participants={room.participants}
                  answeredIds={room.answers
                    .filter(a => a.questionId === currentQuestion.id)
                    .map(a => a.participantId)}
                  showAnswer={room.showAnswer}
                  showExplanation={room.showExplanation}
                  busy={busy}
                  onToggle={handleToggleAnswer}
                />

                <ExplanationPanel
                  question={currentQuestion}
                  showAnswer={room.showAnswer}
                  showExplanation={room.showExplanation}
                  mode={room.mode}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
                問題を選択してください
              </div>
            )}

            {/* 生徒の回答状況 */}
            {currentQuestion && (
              <StudentAnswers
                participants={room.participants}
                answers={room.answers.filter(a => a.questionId === currentQuestion.id)}
                showAnswer={room.showAnswer}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

// ── 進行パネル：回答待ち／未回答者／全員回答済み と、正答・解説の表示ボタン ──
function ProgressPanel({
  participants,
  answeredIds,
  showAnswer,
  showExplanation,
  busy,
  onToggle,
}: {
  participants: TeacherRoomView['participants']
  answeredIds: string[]
  showAnswer: boolean
  showExplanation: boolean
  busy: boolean
  onToggle: (showAnswer: boolean, showExplanation: boolean) => void
}) {
  const answered = new Set(answeredIds)
  const waiting = participants.filter(p => !answered.has(p.id))
  const total = participants.length
  const allAnswered = total > 0 && waiting.length === 0

  let tone = 'bg-slate-50 border-slate-200 text-slate-700'
  let title = '生徒の入室を待っています'
  let detail = '入室コードを生徒に伝えてください。'
  if (total > 0 && allAnswered) {
    tone = 'bg-emerald-50 border-emerald-200 text-emerald-900'
    title = `✅ 全員回答済み（${total}人）`
    detail = showAnswer ? '正答を表示中です。' : '正答・解説を表示できます。'
  } else if (total > 0) {
    tone = 'bg-amber-50 border-amber-200 text-amber-900'
    title = `⏳ 回答待ち：あと${waiting.length}人（${total - waiting.length} / ${total}人が回答済み）`
    detail = `未回答者：${waiting.map(p => p.name).join('、')}`
  }

  return (
    <div className={`mb-6 rounded-xl border p-4 ${tone}`} data-testid="progress-panel">
      <p className="font-bold">{title}</p>
      <p className="text-sm mt-1 break-words">{detail}</p>

      <div className="flex flex-wrap gap-2 mt-3">
        {!showAnswer && (
          <>
            <button
              onClick={() => onToggle(true, true)}
              disabled={busy}
              className="btn-primary"
            >
              正答と解説を表示
            </button>
            <button
              onClick={() => onToggle(true, false)}
              disabled={busy}
              className="btn-secondary"
            >
              正答だけ表示
            </button>
          </>
        )}
        {showAnswer && !showExplanation && (
          <button
            onClick={() => onToggle(true, true)}
            disabled={busy}
            className="btn-primary"
          >
            解説を表示
          </button>
        )}
        {showAnswer && showExplanation && (
          <button
            onClick={() => onToggle(true, false)}
            disabled={busy}
            className="btn-secondary"
          >
            解説をかくす
          </button>
        )}
      </div>
      {!showAnswer && total > 0 && !allAnswered && (
        <p className="text-xs mt-2 opacity-80">
          正答を表示すると、この問題の回答受付は終わります（未回答の人は未回答のまま）。
        </p>
      )}
      {showAnswer && (
        <p className="text-xs mt-2 opacity-80">
          生徒の画面にも表示中です。次の問題をえらぶと自動で閉じます。
        </p>
      )}
    </div>
  )
}
