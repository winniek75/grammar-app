'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { pusherClient, getRoomChannel } from '@/lib/pusher-client'
import { questions } from '@/app/data/questions'
import type { RoomState, Question, Answer, Participant } from '@/lib/types'
import QuestionSelector from '@/app/components/teacher/QuestionSelector'
import StudentAnswers from '@/app/components/teacher/StudentAnswers'
import ExplanationPanel from '@/app/components/teacher/ExplanationPanel'

export default function TeacherRoomPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.id as string
  const adminKey = searchParams.get('key')

  const [room, setRoom] = useState<RoomState | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<1 | 2 | 3 | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // ルーム状態を取得
  useEffect(() => {
    async function fetchRoom() {
      try {
        const res = await fetch(`/api/rooms/${roomId}/state`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('ルームが見つかりません')
          } else {
            setError('エラーが発生しました')
          }
          return
        }
        const data: RoomState = await res.json()
        setRoom(data)

        // 現在の問題を設定
        if (data.currentQuestionId) {
          const q = questions.find(q => q.id === data.currentQuestionId)
          setCurrentQuestion(q || null)
        }
      } catch {
        setError('ルームの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    fetchRoom()
  }, [roomId])

  // Pusher接続
  useEffect(() => {
    if (!room) return

    const channel = pusherClient.subscribe(getRoomChannel(roomId))

    // 生徒が入室
    channel.bind('participant-joined', (data: { participant: Participant }) => {
      setRoom(prev => prev ? {
        ...prev,
        participants: [...prev.participants, data.participant]
      } : null)
    })

    // 生徒が回答
    channel.bind('answer-submitted', (data: { answer: Answer }) => {
      setRoom(prev => {
        if (!prev) return null
        const filtered = prev.answers.filter(
          a => !(a.participantId === data.answer.participantId &&
                 a.questionId === data.answer.questionId)
        )
        return {
          ...prev,
          answers: [...filtered, data.answer]
        }
      })
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
    }
  }, [room, roomId])

  // 問題を変更
  async function handleQuestionChange(questionId: string) {
    try {
      const res = await fetch(`/api/rooms/${roomId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey,
          action: 'changeQuestion',
          questionId,
          mode: 'choice'
        })
      })

      if (!res.ok) {
        if (res.status === 403) alert('権限がありません')
        else alert('エラーが発生しました')
        return
      }

      const updatedRoom: RoomState = await res.json()
      setRoom(updatedRoom)
      const q = questions.find(q => q.id === questionId)
      setCurrentQuestion(q || null)
    } catch {
      alert('問題の変更に失敗しました')
    }
  }

  // 正答・解説の表示切り替え
  async function handleToggleAnswer(showAnswer: boolean, showExplanation: boolean) {
    try {
      const res = await fetch(`/api/rooms/${roomId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey,
          action: 'toggleAnswer',
          showAnswer,
          showExplanation
        })
      })

      if (!res.ok) {
        alert('エラーが発生しました')
        return
      }

      const updatedRoom: RoomState = await res.json()
      setRoom(updatedRoom)
    } catch {
      alert('表示の切り替えに失敗しました')
    }
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
                ルームコード: <span className="font-mono font-bold">{room.code}</span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">参加者</p>
                <p className="text-2xl font-bold">{room.participants.length}名</p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="btn-secondary"
              >
                終了
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