'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Question } from '@/types'
import { questions as allQuestions } from '@/data/questions'
import { GRADE_CATEGORIES } from '@/lib/question-categories'
import RoomHeader from '@/components/teacher/RoomHeader'
import QuestionFilter from '@/components/teacher/QuestionFilter'
import QuestionDisplay from '@/components/teacher/QuestionDisplay'
import RoomControls from '@/components/teacher/RoomControls'
import StudentAnswers from '@/components/teacher/StudentAnswers'

// ==========================================================
// 型定義
// ==========================================================
interface Participant {
  id: string
  name: string
}

interface StudentAnswer {
  participantId: string
  participantName: string
  answerText: string
  isCorrect: boolean
  answeredAt: string
}

interface RoomState {
  id: string
  code: string
  mode: 'choice' | 'typing' | 'sorting'
  currentQuestionId: string | null
  showAnswer: boolean
  showExplanation: boolean
  status: 'waiting' | 'active' | 'finished'
  participants: Participant[]
  answers: Array<{
    questionId: string
    participantId: string
    answerText: string
    isCorrect: boolean
    answeredAt: string
  }>
}

// ==========================================================
// メインコンポーネント
// ==========================================================
export default function TeacherRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.id as string
  const adminKey = searchParams.get('key') || ''

  // ----- ルーム状態 -----
  const [room, setRoom] = useState<RoomState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ----- フィルター状態 -----
  const [selectedGrades, setSelectedGrades] = useState<number[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // ----- 現在の問題インデックス -----
  const [currentIndex, setCurrentIndex] = useState(-1)

  // ----- ローカル状態 -----
  const [mode, setMode] = useState<'choice' | 'typing' | 'sorting'>('choice')
  const [showAnswer, setShowAnswer] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentAnswers, setCurrentAnswers] = useState<StudentAnswer[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isFinished, setIsFinished] = useState(false)

  // ----- Pusher ref -----
  const pusherRef = useRef<any>(null)
  const channelRef = useRef<any>(null)

  // ==========================================================
  // フィルタリングされた問題リスト
  // ==========================================================
  const filteredQuestions = useMemo(() => {
    let qs = [...allQuestions]

    // 学年フィルター
    if (selectedGrades.length > 0) {
      qs = qs.filter((q) => selectedGrades.includes(q.grade))
    }

    // カテゴリフィルター
    if (selectedCategories.length > 0) {
      qs = qs.filter((q) => selectedCategories.includes(q.category))
    }

    return qs
  }, [selectedGrades, selectedCategories])

  // 現在の問題
  const currentQuestion: Question | null =
    currentIndex >= 0 && currentIndex < filteredQuestions.length
      ? filteredQuestions[currentIndex]
      : null

  // ==========================================================
  // ルーム状態の初回取得
  // ==========================================================
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/state?key=${adminKey}`)
        if (!res.ok) {
          if (res.status === 403) {
            setError('アクセス権がありません。URLが正しいか確認してください。')
          } else if (res.status === 404) {
            setError('ルームが見つかりません。')
          } else {
            setError('ルーム情報の取得に失敗しました。')
          }
          setLoading(false)
          return
        }
        const data = await res.json()
        setRoom(data)
        setMode(data.mode || 'choice')
        setShowAnswer(data.showAnswer || false)
        setShowExplanation(data.showExplanation || false)
        setParticipants(data.participants || [])
        setIsFinished(data.status === 'finished')

        // 現在の問題IDがあればインデックスを設定
        if (data.currentQuestionId) {
          const idx = allQuestions.findIndex(
            (q) => q.id === data.currentQuestionId
          )
          if (idx >= 0) setCurrentIndex(idx)
        }
      } catch (e) {
        setError('接続エラーが発生しました。')
      } finally {
        setLoading(false)
      }
    }

    if (roomId && adminKey) {
      fetchRoom()
    } else {
      setError('ルームIDまたは管理キーが不足しています。')
      setLoading(false)
    }
  }, [roomId, adminKey])

  // ==========================================================
  // Pusher接続
  // ==========================================================
  useEffect(() => {
    if (!roomId || !room) return

    let isMounted = true

    const connectPusher = async () => {
      try {
        const { default: Pusher } = await import('pusher-js')
        const pusher = new Pusher(
          process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '',
          {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap3',
          }
        )

        const channel = pusher.subscribe(`room-${roomId}`)

        channel.bind('pusher:subscription_succeeded', () => {
          if (isMounted) setIsConnected(true)
        })

        // 生徒入室
        channel.bind(
          'participant-joined',
          (data: { participant: Participant }) => {
            if (isMounted) {
              setParticipants((prev) => {
                if (prev.find((p) => p.id === data.participant.id)) return prev
                return [...prev, data.participant]
              })
            }
          }
        )

        // 回答受信
        channel.bind('answer-submitted', (data: StudentAnswer) => {
          if (isMounted) {
            setCurrentAnswers((prev) => {
              // 同じ参加者の同じ問題の回答は上書き
              const filtered = prev.filter(
                (a) => a.participantId !== data.participantId
              )
              return [...filtered, data]
            })
          }
        })

        pusherRef.current = pusher
        channelRef.current = channel
      } catch (e) {
        console.error('Pusher connection error:', e)
      }
    }

    connectPusher()

    return () => {
      isMounted = false
      if (channelRef.current) {
        channelRef.current.unbind_all()
        channelRef.current.unsubscribe()
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect()
      }
    }
  }, [roomId, room])

  // ==========================================================
  // API操作
  // ==========================================================
  const controlRoom = useCallback(
    async (action: string, payload: Record<string, any> = {}) => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminKey, action, ...payload }),
        })
        if (!res.ok) {
          console.error('Control API error:', res.status)
        }
        return res.ok
      } catch (e) {
        console.error('Control API error:', e)
        return false
      }
    },
    [roomId, adminKey]
  )

  // ----- 問題変更 -----
  const changeQuestion = useCallback(
    async (question: Question) => {
      setShowAnswer(false)
      setShowExplanation(false)
      setCurrentAnswers([]) // 回答リセット
      await controlRoom('setQuestion', {
        questionId: question.id,
        mode,
      })
    },
    [controlRoom, mode]
  )

  // ----- 次の問題 -----
  const handleNext = useCallback(() => {
    const nextIdx =
      currentIndex < 0 ? 0 : Math.min(currentIndex + 1, filteredQuestions.length - 1)
    if (nextIdx < filteredQuestions.length) {
      setCurrentIndex(nextIdx)
      changeQuestion(filteredQuestions[nextIdx])
    }
  }, [currentIndex, filteredQuestions, changeQuestion])

  // ----- 前の問題 -----
  const handlePrev = useCallback(() => {
    const prevIdx = Math.max(currentIndex - 1, 0)
    setCurrentIndex(prevIdx)
    changeQuestion(filteredQuestions[prevIdx])
  }, [currentIndex, filteredQuestions, changeQuestion])

  // ----- ランダム -----
  const handleRandom = useCallback(() => {
    if (filteredQuestions.length === 0) return
    const randomIdx = Math.floor(Math.random() * filteredQuestions.length)
    setCurrentIndex(randomIdx)
    changeQuestion(filteredQuestions[randomIdx])
  }, [filteredQuestions, changeQuestion])

  // ----- 正答表示トグル -----
  const handleToggleAnswer = useCallback(async () => {
    const newVal = !showAnswer
    setShowAnswer(newVal)
    if (!newVal) setShowExplanation(false)
    await controlRoom('showAnswer', {
      showAnswer: newVal,
      showExplanation: !newVal ? false : showExplanation,
    })
  }, [showAnswer, showExplanation, controlRoom])

  // ----- 解説表示トグル -----
  const handleToggleExplanation = useCallback(async () => {
    const newVal = !showExplanation
    setShowExplanation(newVal)
    await controlRoom('showAnswer', {
      showAnswer,
      showExplanation: newVal,
    })
  }, [showExplanation, showAnswer, controlRoom])

  // ----- モード変更 -----
  const handleModeChange = useCallback(
    async (newMode: 'choice' | 'typing' | 'sorting') => {
      setMode(newMode)
      // 現在の問題があれば再送信（モード変更を反映）
      if (currentQuestion) {
        setShowAnswer(false)
        setShowExplanation(false)
        setCurrentAnswers([])
        await controlRoom('setQuestion', {
          questionId: currentQuestion.id,
          mode: newMode,
        })
      }
    },
    [currentQuestion, controlRoom]
  )

  // ----- 授業終了 -----
  const handleFinish = useCallback(async () => {
    if (
      window.confirm(
        '授業を終了しますか？\n生徒全員に終了通知が送信されます。'
      )
    ) {
      await controlRoom('finish')
      setIsFinished(true)
    }
  }, [controlRoom])

  // ==========================================================
  // フィルター変更時にインデックスリセット
  // ==========================================================
  useEffect(() => {
    // フィルター変更したら、現在の問題がフィルタに含まれるかチェック
    if (currentQuestion) {
      const newIdx = filteredQuestions.findIndex(
        (q) => q.id === currentQuestion.id
      )
      if (newIdx >= 0) {
        setCurrentIndex(newIdx)
      }
      // フィルタ外になったら現在の問題はそのまま表示（インデックスだけ -1 にする）
    }
  }, [filteredQuestions])

  // ==========================================================
  // ローディング / エラー表示
  // ==========================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-violet-200 border-t-violet-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 mt-4">
            ルーム情報を読み込み中…
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <p className="text-red-700 font-semibold text-lg mb-2">
            エラー
          </p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!room) return null

  // ==========================================================
  // メインレイアウト
  // ==========================================================
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <RoomHeader
            roomCode={room.code}
            roomId={room.id}
            status={isFinished ? 'finished' : currentQuestion ? 'active' : 'waiting'}
            participantCount={participants.length}
            isConnected={isConnected}
          />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ====== 左カラム：問題表示エリア（7/12） ====== */}
          <div className="lg:col-span-7 space-y-4">
            {/* フィルター */}
            <QuestionFilter
              selectedGrades={selectedGrades}
              selectedCategories={selectedCategories}
              onGradesChange={setSelectedGrades}
              onCategoriesChange={setSelectedCategories}
              filteredCount={filteredQuestions.length}
              totalCount={allQuestions.length}
            />

            {/* 問題表示 */}
            <QuestionDisplay
              question={currentQuestion}
              mode={mode}
              showAnswer={showAnswer}
              showExplanation={showExplanation}
              questionIndex={currentIndex}
              totalQuestions={filteredQuestions.length}
            />

            {/* 生徒回答（PC未満で下に表示） */}
            <div className="lg:hidden">
              <StudentAnswers
                participants={participants}
                answers={currentAnswers}
                currentQuestionId={currentQuestion?.id || null}
                showAnswer={showAnswer}
              />
            </div>
          </div>

          {/* ====== 右カラム：操作パネル（5/12） ====== */}
          <div className="lg:col-span-5 space-y-4">
            {/* 操作パネル */}
            <RoomControls
              mode={mode}
              showAnswer={showAnswer}
              showExplanation={showExplanation}
              hasQuestion={!!currentQuestion}
              hasPrev={currentIndex > 0}
              hasNext={currentIndex < filteredQuestions.length - 1}
              isFinished={isFinished}
              onPrev={handlePrev}
              onNext={handleNext}
              onRandom={handleRandom}
              onToggleAnswer={handleToggleAnswer}
              onToggleExplanation={handleToggleExplanation}
              onModeChange={handleModeChange}
              onFinish={handleFinish}
            />

            {/* 生徒回答（PCで右に表示） */}
            <div className="hidden lg:block">
              <StudentAnswers
                participants={participants}
                answers={currentAnswers}
                currentQuestionId={currentQuestion?.id || null}
                showAnswer={showAnswer}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
