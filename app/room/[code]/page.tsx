'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { pusherClient, getRoomChannel } from '@/lib/pusher-client'
import { questions } from '@/app/data/questions'
import ChoiceQuestion from '@/app/components/questions/ChoiceQuestion'
import TypingQuestion from '@/app/components/questions/TypingQuestion'
import SortingQuestion from '@/app/components/questions/SortingQuestion'
import {
  playCorrectSound,
  playWrongSound,
  speakEnglish,
  recordWrongAnswer,
  removeWrongAnswer,
  getWrongAnswers,
  clearWrongAnswers,
  type WrongAnswerRecord,
} from '@/lib/sounds'
import type { RoomState, Question, Participant } from '@/lib/types'

declare global { interface Window { WiseXP?: any; } }

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
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const ttsEnabledRef = useRef(ttsEnabled)
  const [showWrongAnswerReview, setShowWrongAnswerReview] = useState(false)
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerRecord[]>([])

  // Initialize WiseXP SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && window.WiseXP) {
      window.WiseXP.init('grammar-app');
    }
  }, []);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const savedSound = localStorage.getItem('grammar-app-sound-enabled')
      if (savedSound !== null) setSoundEnabled(JSON.parse(savedSound))
      const savedTts = localStorage.getItem('grammar-app-tts-enabled')
      if (savedTts !== null) setTtsEnabled(JSON.parse(savedTts))
    } catch {
      // ignore
    }
  }, [])

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem('grammar-app-sound-enabled', JSON.stringify(soundEnabled))
    } catch { /* ignore */ }
  }, [soundEnabled])

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled
    try {
      localStorage.setItem('grammar-app-tts-enabled', JSON.stringify(ttsEnabled))
    } catch { /* ignore */ }
  }, [ttsEnabled])

  // Refresh wrong answers list
  const refreshWrongAnswers = useCallback(() => {
    setWrongAnswers(getWrongAnswers())
  }, [])

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

      // TTS: read the correct answer in English when answer is revealed
      if (data.showAnswer && ttsEnabledRef.current) {
        setCurrentQuestion(prev => {
          if (prev) {
            // Build TTS text from correct answer
            let ttsText = prev.correctAnswer
            if (prev.questionType === 'choice' && prev.choices) {
              const choice = prev.choices.find(c => c.id === prev.correctAnswer)
              if (choice) ttsText = choice.text
            }
            speakEnglish(ttsText)
          }
          return prev
        })
      }
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

  // Restore answer state from localStorage when question changes
  useEffect(() => {
    if (!currentQuestion) return
    try {
      const savedAnswers = JSON.parse(localStorage.getItem(`grammar-app-answers-${roomCode}`) || '{}')
      const savedAnswer = savedAnswers[currentQuestion.id]
      if (savedAnswer) {
        setHasAnswered(true)
        setMyAnswer(savedAnswer.answer)
        setIsCorrect(savedAnswer.isCorrect)
      }
    } catch {
      // ignore
    }
  }, [currentQuestion, roomCode])

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

      // Play sound effect
      if (soundEnabled) {
        if (data.isCorrect) {
          playCorrectSound()
        } else {
          playWrongSound()
        }
      }

      // Track wrong answers in localStorage
      if (!data.isCorrect && currentQuestion) {
        recordWrongAnswer({
          questionId: currentQuestion.id,
          questionText: currentQuestion.questionText,
          category: currentQuestion.category,
          grade: currentQuestion.grade,
          correctAnswer: currentQuestion.correctAnswer,
          userAnswer: answer,
        })
        // Report wrong answer to WiseXP
        if (window.WiseXP) {
          window.WiseXP.reportWrong({
            question: currentQuestion.questionText,
            correct: currentQuestion.correctAnswer,
            playerAnswer: answer,
          });
        }
      } else if (data.isCorrect && currentQuestion) {
        // If they got it right, remove from wrong answer list
        removeWrongAnswer(currentQuestion.id)
      }

      // Report answer to WiseXP
      if (window.WiseXP) {
        window.WiseXP.reportGame({
          score: data.isCorrect ? 1 : 0,
          correct: data.isCorrect ? 1 : 0,
          total: 1,
          maxCombo: 0,
          grade: currentQuestion?.grade ?? 0,
        });
      }

      // Persist answer to localStorage for page reload recovery
      if (currentQuestion) {
        try {
          const savedAnswers = JSON.parse(localStorage.getItem(`grammar-app-answers-${roomCode}`) || '{}')
          savedAnswers[currentQuestion.id] = {
            answer,
            isCorrect: data.isCorrect,
            timestamp: new Date().toISOString(),
          }
          localStorage.setItem(`grammar-app-answers-${roomCode}`, JSON.stringify(savedAnswers))
        } catch { /* ignore */ }
      }
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
            <div className="flex items-center gap-3">
              {room.status === 'waiting' && (
                <span className="text-sm text-gray-500">待機中...</span>
              )}
              {/* Sound toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`text-lg px-2 py-1 rounded transition-colors ${
                  soundEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                }`}
                title={soundEnabled ? '効果音 ON' : '効果音 OFF'}
              >
                {soundEnabled ? '\u{1F50A}' : '\u{1F507}'}
              </button>
              {/* TTS toggle */}
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`text-lg px-2 py-1 rounded transition-colors ${
                  ttsEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}
                title={ttsEnabled ? '読み上げ ON' : '読み上げ OFF'}
              >
                {ttsEnabled ? '\u{1F5E3}' : '\u{1F910}'}
              </button>
              {/* Wrong answers review */}
              <button
                onClick={() => { refreshWrongAnswers(); setShowWrongAnswerReview(!showWrongAnswerReview) }}
                className="text-sm px-3 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                title="間違えた問題を復習"
              >
                復習 ({getWrongAnswers().length})
              </button>
            </div>
          </div>
        </header>

        {/* Wrong answers review panel */}
        {showWrongAnswerReview && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-orange-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-orange-800">間違えた問題リスト</h3>
              <div className="flex gap-2">
                {wrongAnswers.length > 0 && (
                  <button
                    onClick={() => { clearWrongAnswers(); refreshWrongAnswers() }}
                    className="text-xs px-3 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  >
                    全て削除
                  </button>
                )}
                <button
                  onClick={() => setShowWrongAnswerReview(false)}
                  className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
            {wrongAnswers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                間違えた問題はまだありません。
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {wrongAnswers.map((wa) => (
                  <div key={wa.questionId} className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-orange-600 font-medium">
                        {wa.category} - 中{wa.grade}
                        {wa.count > 1 && (
                          <span className="ml-2 bg-red-200 text-red-700 px-1.5 py-0.5 rounded-full text-[10px]">
                            {wa.count}回間違い
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => speakEnglish(wa.correctAnswer)}
                        className="text-xs text-blue-500 hover:text-blue-700"
                        title="正答を読み上げ"
                      >
                        {'\u{1F50A}'}
                      </button>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-1">{wa.questionText}</p>
                    <div className="flex gap-4 text-xs">
                      <span className="text-red-600">あなたの回答: {wa.userAnswer}</span>
                      <span className="text-green-600 font-bold">正答: {wa.correctAnswer}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                value={hasAnswered ? myAnswer : ''}
                correct={room.showAnswer ? currentQuestion.correctAnswer : null}
                submitted={hasAnswered}
                isCorrect={isCorrect}
                onChange={(v) => !hasAnswered && setMyAnswer(v)}
                onSubmit={() => !hasAnswered && handleSubmitAnswer(myAnswer)}
              />
            )}

            {room.mode === 'sorting' && currentQuestion.sortWords && (
              <SortingQuestion
                words={currentQuestion.sortWords}
                correct={room.showAnswer ? currentQuestion.correctAnswer : null}
                submitted={hasAnswered}
                isCorrect={isCorrect}
                onSubmit={(answer) => !hasAnswered && handleSubmitAnswer(answer)}
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
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-700">
                          正答: {currentQuestion.correctAnswer}
                        </p>
                        <button
                          onClick={() => {
                            let ttsText = currentQuestion.correctAnswer
                            if (currentQuestion.questionType === 'choice' && currentQuestion.choices) {
                              const choice = currentQuestion.choices.find(c => c.id === currentQuestion.correctAnswer)
                              if (choice) ttsText = choice.text
                            }
                            speakEnglish(ttsText)
                          }}
                          className="text-xs text-blue-500 hover:text-blue-700"
                          title="正答を読み上げ"
                        >
                          {'\u{1F50A}'}
                        </button>
                      </div>
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