'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useTeacherRoom, useControlRoom } from '@/hooks/usePusher'
import StudentAnswers from '@/components/teacher/StudentAnswers'
import ExplanationPanel from '@/components/teacher/ExplanationPanel'
import RoomControls from '@/components/teacher/RoomControls'
import { questions as allQuestions } from '@/data/questions'
import type {
  RoomState,
  Question,
  AnswerSubmittedEvent,
  ParticipantJoinedEvent,
} from '@/types'

// ─────────────────────────────────────────────
// Pusher 接続ステータスバッジ
// ─────────────────────────────────────────────
function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
        }`}
      />
      {connected ? 'リアルタイム接続中' : '接続中...'}
    </span>
  )
}

// ─────────────────────────────────────────────
// 学年・カテゴリ絞り込みフィルター
// ─────────────────────────────────────────────
interface FilterState {
  grade: 0 | 1 | 2 | 3   // 0 = 全学年
  category: string         // '' = 全カテゴリ
}

function QuestionFilter({
  filter,
  onChange,
  filteredCount,
}: {
  filter: FilterState
  onChange: (f: FilterState) => void
  filteredCount: number
}) {
  const categories = useMemo(() => {
    const gradeQ = filter.grade === 0 ? allQuestions : allQuestions.filter((q) => q.grade === filter.grade)
    return [...new Set(gradeQ.map((q) => q.category))]
  }, [filter.grade])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-800 text-sm">問題フィルター</h2>
        <span className="text-xs text-slate-500">{filteredCount}問</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {/* 学年 */}
        {([0, 1, 2, 3] as const).map((g) => (
          <button
            key={g}
            onClick={() => onChange({ grade: g, category: '' })}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter.grade === g
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {g === 0 ? '全学年' : `中${g}`}
          </button>
        ))}
        <span className="text-slate-300">|</span>
        {/* カテゴリ */}
        <button
          onClick={() => onChange({ ...filter, category: '' })}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter.category === ''
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          全カテゴリ
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onChange({ ...filter, category: cat })}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter.category === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 現在の問題表示カード
// ─────────────────────────────────────────────
function CurrentQuestionCard({
  question,
  mode,
}: {
  question: Question | null
  mode: string
}) {
  if (!question) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <p className="text-4xl mb-3">📚</p>
        <p className="text-slate-500 text-sm">問題を選択して授業を開始しましょう</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
          中{question.grade}
        </span>
        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs">
          {question.category}
        </span>
        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold ml-auto">
          {mode === 'choice' ? '選択' : mode === 'typing' ? 'タイピング' : '並べ替え'}
        </span>
        <span className="text-slate-400 text-xs">#{question.id}</span>
      </div>
      <div className="px-5 py-6">
        <p className="text-xl font-bold text-slate-800 leading-relaxed">
          {question.questionText}
        </p>
        {mode === 'choice' && question.choices && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {question.choices.map((c) => (
              <div
                key={c.id}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700"
              >
                <span className="font-bold text-slate-400 mr-2">{c.id.toUpperCase()}.</span>
                {c.text}
              </div>
            ))}
          </div>
        )}
        {mode === 'sorting' && question.sortWords && (
          <div className="mt-4 flex flex-wrap gap-2">
            {question.sortWords.map((w, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700"
              >
                {w}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// メイン: 講師パネル
// ─────────────────────────────────────────────
export default function TeacherRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const roomId = params.id as string
  const adminKey = searchParams.get('key')

  // ── ルーム状態 ────────────────────────────────
  const [room, setRoom] = useState<RoomState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pusherConnected, setPusherConnected] = useState(false)

  // ── 問題フィルター ────────────────────────────
  const [filter, setFilter] = useState<FilterState>({ grade: 0, category: '' })
  const [questionIndex, setQuestionIndex] = useState(0)

  // ── リアルタイムイベント蓄積 ──────────────────
  const [realtimeAnswers, setRealtimeAnswers] = useState<AnswerSubmittedEvent[]>([])
  const [participants, setParticipants] = useState<ParticipantJoinedEvent[]>([])
  const [notification, setNotification] = useState<string | null>(null)

  // ── フィルタ済み問題リスト ─────────────────────
  const filteredQuestions = useMemo(() => {
    let q = allQuestions
    if (filter.grade !== 0) q = q.filter((x) => x.grade === filter.grade)
    if (filter.category) q = q.filter((x) => x.category === filter.category)
    return q
  }, [filter])

  const currentQuestion: Question | null =
    filteredQuestions[questionIndex] ?? null

  // ── 問題インデックス補正 ──────────────────────
  useEffect(() => {
    setQuestionIndex(0)
    setRealtimeAnswers([])
  }, [filter])

  // ── ルーム情報初期取得 ────────────────────────
  useEffect(() => {
    if (!roomId || !adminKey) return

    fetch(`/api/rooms/${roomId}/state`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setLoadError(data.error)
        else setRoom(data)
      })
      .catch(() => setLoadError('ルーム情報の取得に失敗しました'))
  }, [roomId, adminKey])

  // ── Pusher接続状態の監視 ─────────────────────
  useEffect(() => {
    import('@/lib/pusher-client').then(({ getPusherClient }) => {
      const client = getPusherClient()
      client.connection.bind('connected', () => setPusherConnected(true))
      client.connection.bind('disconnected', () => setPusherConnected(false))
      if (client.connection.state === 'connected') setPusherConnected(true)
    })
  }, [])

  // ── Pusher 購読（生徒→講師 イベント受信）────────
  const handleAnswerSubmitted = useCallback((data: AnswerSubmittedEvent) => {
    setRealtimeAnswers((prev) => {
      const filtered = prev.filter(
        (a) => !(a.participantId === data.participantId && a.questionId === data.questionId)
      )
      return [...filtered, data]
    })
    showNotification(`${data.participantName} が回答しました`)
  }, [])

  const handleParticipantJoined = useCallback((data: ParticipantJoinedEvent) => {
    setParticipants((prev) => {
      if (prev.find((p) => p.participantId === data.participantId)) return prev
      return [...prev, data]
    })
    showNotification(`${data.participantName} が入室しました 👋`)
  }, [])

  useTeacherRoom({
    roomId,
    onAnswerSubmitted: handleAnswerSubmitted,
    onParticipantJoined: handleParticipantJoined,
  })

  // ── 操作API ───────────────────────────────────
  const { setQuestion, showAnswer, setMode, finishRoom } = useControlRoom({
    roomId,
    adminKey,
  })

  // ── 問題セット ────────────────────────────────
  const handleSetQuestion = useCallback(
    async (question: Question) => {
      if (!question) return
      setIsLoading(true)
      try {
        await setQuestion(question.id, room?.mode)
        setRoom((prev) => prev ? { ...prev, currentQuestionId: question.id, showAnswer: false, showExplanation: false } : prev)
        setRealtimeAnswers([])  // 問題切替で回答リセット
      } catch (e) {
        alert(e instanceof Error ? e.message : 'エラーが発生しました')
      } finally {
        setIsLoading(false)
      }
    },
    [setQuestion, room?.mode]
  )

  const handlePrev = useCallback(async () => {
    const newIndex = Math.max(0, questionIndex - 1)
    setQuestionIndex(newIndex)
    const q = filteredQuestions[newIndex]
    if (q) await handleSetQuestion(q)
  }, [questionIndex, filteredQuestions, handleSetQuestion])

  const handleNext = useCallback(async () => {
    const newIndex = Math.min(filteredQuestions.length - 1, questionIndex + 1)
    setQuestionIndex(newIndex)
    const q = filteredQuestions[newIndex]
    if (q) await handleSetQuestion(q)
  }, [questionIndex, filteredQuestions, handleSetQuestion])

  const handleRandom = useCallback(async () => {
    if (filteredQuestions.length === 0) return
    const newIndex = Math.floor(Math.random() * filteredQuestions.length)
    setQuestionIndex(newIndex)
    await handleSetQuestion(filteredQuestions[newIndex])
  }, [filteredQuestions, handleSetQuestion])

  const handleShowAnswer = useCallback(
    async (show: boolean, showExp: boolean) => {
      setIsLoading(true)
      try {
        await showAnswer(show, showExp)
        setRoom((prev) => prev ? { ...prev, showAnswer: show, showExplanation: showExp } : prev)
      } catch (e) {
        alert(e instanceof Error ? e.message : 'エラー')
      } finally {
        setIsLoading(false)
      }
    },
    [showAnswer]
  )

  const handleSetMode = useCallback(
    async (mode: 'choice' | 'typing' | 'sorting') => {
      setIsLoading(true)
      try {
        await setMode(mode)
        setRoom((prev) => prev ? { ...prev, mode } : prev)
      } catch (e) {
        alert(e instanceof Error ? e.message : 'エラー')
      } finally {
        setIsLoading(false)
      }
    },
    [setMode]
  )

  const handleFinish = useCallback(async () => {
    if (!confirm('授業を終了しますか？')) return
    setIsLoading(true)
    try {
      await finishRoom()
      router.push('/?finished=1')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラー')
      setIsLoading(false)
    }
  }, [finishRoom, router])

  // ── 通知トースト ──────────────────────────────
  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  // ── アクセス制御 ──────────────────────────────
  if (!adminKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow text-center max-w-sm">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-xl font-bold text-slate-800 mb-2">アクセスできません</h1>
          <p className="text-slate-500 text-sm">講師URLからアクセスしてください。</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow text-center max-w-sm">
          <p className="text-4xl mb-4">⚠️</p>
          <h1 className="text-xl font-bold text-slate-800 mb-2">エラー</h1>
          <p className="text-slate-500 text-sm">{loadError}</p>
        </div>
      </div>
    )
  }

  const totalParticipants = participants.length || room?.participants.length || 0
  const currentAnswersForQuestion = realtimeAnswers.filter(
    (a) => a.questionId === (room?.currentQuestionId ?? currentQuestion?.id)
  )

  return (
    <div className="min-h-screen bg-slate-100">
      {/* トースト通知 */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-lg text-sm font-medium animate-fade-in">
          {notification}
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <h1 className="font-bold text-slate-800">🎓 講師パネル</h1>
            {room && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold tracking-widest">
                CODE: {room.code}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              👥 {totalParticipants}名
            </span>
            <ConnectionBadge connected={pusherConnected} />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左カラム: 問題選択 */}
          <div className="lg:col-span-2 space-y-4">
            {/* フィルター */}
            <QuestionFilter
              filter={filter}
              onChange={setFilter}
              filteredCount={filteredQuestions.length}
            />

            {/* 現在の問題 */}
            <CurrentQuestionCard question={currentQuestion} mode={room?.mode ?? 'choice'} />

            {/* 問題一覧（簡易） */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 text-sm">問題一覧</h2>
                <span className="text-xs text-slate-500">
                  {questionIndex + 1} / {filteredQuestions.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {filteredQuestions.slice(0, 50).map((q, i) => (
                  <button
                    key={q.id}
                    onClick={async () => {
                      setQuestionIndex(i)
                      await handleSetQuestion(q)
                    }}
                    disabled={isLoading}
                    className={`w-full text-left px-5 py-3 text-sm hover:bg-slate-50 transition-colors ${
                      i === questionIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-slate-400 text-xs mr-2">#{q.id}</span>
                    <span className="font-medium text-slate-700">{q.questionText}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右カラム: コントロール + 回答 */}
          <div className="space-y-4">
            <RoomControls
              currentQuestion={currentQuestion}
              mode={room?.mode ?? 'choice'}
              showAnswer={room?.showAnswer ?? false}
              showExplanation={room?.showExplanation ?? false}
              onPrev={handlePrev}
              onNext={handleNext}
              onRandom={handleRandom}
              onShowAnswer={handleShowAnswer}
              onSetMode={handleSetMode}
              onFinish={handleFinish}
              loading={isLoading}
            />
            <ExplanationPanel
              question={currentQuestion}
              showAnswer={room?.showAnswer ?? false}
              showExplanation={room?.showExplanation ?? false}
            />
            <StudentAnswers
              answers={currentAnswersForQuestion}
              totalParticipants={totalParticipants}
              showCorrect={room?.showAnswer ?? false}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
