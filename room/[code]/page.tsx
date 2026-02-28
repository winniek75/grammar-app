'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { pusherClient, getRoomChannel } from '@/lib/pusher-client'
import { questions } from '@/src/data/questions'
import ChoiceQuestion from '@/src/components/questions/ChoiceQuestion'
import TypingQuestion from '@/src/components/questions/TypingQuestion'
import SortingQuestion from '@/src/components/questions/SortingQuestion'
import type { RoomState, Question, Participant } from '@/types'

export default function StudentRoomPage() {
  const router = useRouter()
  const params = useParams()
  const roomCode = (params.code as string).toUpperCase()

  const [room, setRoom] = useState<RoomState | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [hasAnswered, setHasAnswered] = useState(false)
  const [myAnswer, setMyAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  // ルーム情報を取得
  useEffect(() => {
    async function fetchRoom() {
      try {
        const res = await fetch(`/api/rooms/code/${roomCode}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('ルームが見つかりません。コードを確認してください。')
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
  }, [roomCode])

  // Pusher接続
  useEffect(() => {
    if (!room || !participant) return

    const channel = pusherClient.subscribe(getRoomChannel(room.id))

    // 問題が変更された
    channel.bind('question-change', (data: {
      questionId: string
      mode: 'choice' | 'typing' | 'sorting'
    }) => {
      const q = questions.find(q => q.id === data.questionId)
      setCurrentQuestion(q || null)
      setHasAnswered(false)
      setMyAnswer('')
      setIsCorrect(null)
      setRoom(prev => prev ? { ...prev, currentQuestionId: data.questionId, mode: data.mode } : null)
    })

    // 正答・解説の表示
    channel.bind('show-answer', (data: {
      showAnswer: boolean
      showExplanation: boolean
    }) => {
      setRoom(prev => prev ? {
        ...prev,
        showAnswer: data.showAnswer,
        showExplanation: data.showExplanation
      } : null)
    })

    // ルーム終了
    channel.bind('room-finished', () => {
      alert('授業が終了しました')
      router.push('/')
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
    }
  }, [room, participant, router])

  // 入室処理
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!studentName.trim() || !room) return

    setJoining(true)
    try {
      const res = await fetch(`/api/rooms/${room.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: studentName.trim() })
      })

      if (!res.ok) {
        alert('入室に失敗しました')
        return
      }

      const data: { participant: Participant } = await res.json()
      setParticipant(data.participant)

      // ローカルストレージに保存
      localStorage.setItem(`room-${roomCode}-participant`, JSON.stringify(data.participant))
    } catch {
      alert('入室に失敗しました')
    } finally {
      setJoining(false)
    }
  }

  // 既存のセッションを復元
  useEffect(() => {
    const saved = localStorage.getItem(`room-${roomCode}-participant`)
    if (saved) {
      try {
        const p: Participant = JSON.parse(saved)
        setParticipant(p)
      } catch {
        // 無視
      }
    }
  }, [roomCode])

  // 回答送信
  async function handleSubmitAnswer(answer: string) {
    if (!room || !participant || !currentQuestion || hasAnswered) return

    try {
      const res = await fetch(`/api/rooms/${room.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          questionId: currentQuestion.id,
          answerText: answer
        })
      })

      if (!res.ok) {
        alert('回答の送信に失敗しました')
        return
      }

      const data: { isCorrect: boolean } = await res.json()
      setHasAnswered(true)
      setMyAnswer(answer)
      setIsCorrect(data.isCorrect)
    } catch {
      alert('回答の送信に失敗しました')
    }
  }

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

  // 名前入力画面
  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">授業に参加</h1>
            <p className="text-gray-600 mb-6">
              ルームコード: <span className="font-mono font-bold">{roomCode}</span>
            </p>

            <form onSubmit={handleJoin}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  あなたの名前
                </label>
                <input
                  id="name"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="例: 田中太郎"
                  className="input-field"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={joining || !studentName.trim()}
                className="btn-primary w-full"
              >
                {joining ? '入室中...' : '入室する'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <header className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">参加者: {participant.name}</p>
              <p className="text-xs text-gray-500">コード: {roomCode}</p>
            </div>
            {room.status === 'waiting' && (
              <span className="text-sm text-gray-500">待機中...</span>
            )}
          </div>
        </header>

        {/* 問題表示エリア */}
        {currentQuestion ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* カテゴリバッジ */}
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                {currentQuestion.category} - 中{currentQuestion.grade}
              </span>
            </div>

            {/* 問題文 */}
            <h2 className="text-xl font-bold mb-6">{currentQuestion.questionText}</h2>

            {/* ヒント */}
            {currentQuestion.hint && !room.showAnswer && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 ヒント: {currentQuestion.hint}
                </p>
              </div>
            )}

            {/* 問題形式に応じたコンポーネント */}
            {room.mode === 'choice' && currentQuestion.choices && (
              <ChoiceQuestion
                choices={currentQuestion.choices}
                selected={myAnswer}
                correct={room.showAnswer ? currentQuestion.correctAnswer : null}
                disabled={hasAnswered}
                onSelect={handleSubmitAnswer}
              />
            )}

            {room.mode === 'typing' && (
              <TypingQuestion
                onAnswer={handleSubmitAnswer}
                disabled={hasAnswered}
                correctAnswer={room.showAnswer ? currentQuestion.correctAnswer : null}
                myAnswer={myAnswer}
              />
            )}

            {room.mode === 'sorting' && currentQuestion.sortWords && (
              <SortingQuestion
                words={currentQuestion.sortWords}
                onAnswer={handleSubmitAnswer}
                disabled={hasAnswered}
                correctAnswer={room.showAnswer ? currentQuestion.correctAnswer : null}
                myAnswer={myAnswer}
              />
            )}

            {/* 回答後のフィードバック */}
            {hasAnswered && !room.showAnswer && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">回答を送信しました。先生の解説を待ってください。</p>
              </div>
            )}

            {/* 正答・解説表示 */}
            {room.showAnswer && (
              <div className="mt-6 space-y-4">
                {/* 正誤表示 */}
                {hasAnswered && (
                  <div className={`p-4 rounded-lg ${
                    isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                      {isCorrect ? '✅ 正解！' : '❌ 不正解'}
                    </p>
                    {!isCorrect && (
                      <p className="text-sm mt-1 text-gray-700">
                        正答: {currentQuestion.correctAnswer}
                      </p>
                    )}
                  </div>
                )}

                {/* 解説 */}
                {room.showExplanation && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-bold text-blue-900 mb-2">📚 解説</p>
                    <p className="text-sm text-gray-800 whitespace-pre-line">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">先生が問題を選択するのを待っています...</p>
          </div>
        )}
      </div>
    </main>
  )
}