'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStudentPusher } from '@/hooks/usePusher'
import { questions } from '@/data/questions'
import type {
  Question,
  QuestionChangeEvent,
  ShowAnswerEvent,
} from '@/types'

// ─────────────────────────────────────────────
// 型
// ─────────────────────────────────────────────

type AppState =
  | { phase: 'lookup' }                         // コード入力
  | { phase: 'join'; roomId: string }            // 名前入力
  | { phase: 'waiting'; roomId: string; participantId: string; name: string }
  | { phase: 'question'; roomId: string; participantId: string; name: string; question: Question; mode: 'choice' | 'typing' | 'sorting'; showAnswer: boolean; showExplanation: boolean; myAnswer: string | null; isCorrect: boolean | null }
  | { phase: 'finished' }

// ─────────────────────────────────────────────
// 問題コンポーネント
// ─────────────────────────────────────────────

function ChoiceQuestion({
  question,
  onAnswer,
  myAnswer,
  showAnswer,
}: {
  question: Question
  onAnswer: (id: string) => void
  myAnswer: string | null
  showAnswer: boolean
}) {
  return (
    <div className="space-y-3">
      {question.choices?.map((c) => {
        const isSelected = myAnswer === c.id
        const isCorrect = c.id === question.correctAnswer
        let cls = 'w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition '
        if (myAnswer !== null) {
          if (showAnswer) {
            cls += isCorrect
              ? 'border-emerald-500 bg-emerald-900/40 text-emerald-200'
              : isSelected
              ? 'border-red-500 bg-red-900/40 text-red-200'
              : 'border-slate-600 text-slate-400'
          } else {
            cls += isSelected
              ? 'border-blue-500 bg-blue-900/40 text-blue-200'
              : 'border-slate-600 text-slate-400'
          }
        } else {
          cls += 'border-slate-600 bg-slate-700 text-white hover:border-blue-500 hover:bg-slate-600'
        }

        return (
          <button key={c.id} onClick={() => myAnswer === null && onAnswer(c.id)} className={cls}>
            <span className="font-bold text-emerald-400 mr-3">({c.id})</span>
            {c.text}
            {showAnswer && isCorrect && <span className="ml-2">✅</span>}
          </button>
        )
      })}
    </div>
  )
}

function TypingQuestion({
  question,
  onAnswer,
  myAnswer,
  showAnswer,
}: {
  question: Question
  onAnswer: (text: string) => void
  myAnswer: string | null
  showAnswer: boolean
}) {
  const [input, setInput] = useState('')

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && input.trim() && myAnswer === null && onAnswer(input.trim())}
        disabled={myAnswer !== null}
        placeholder="回答を入力してEnter..."
        className="w-full bg-slate-700 border-2 border-slate-600 text-white rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-blue-500 disabled:opacity-60"
      />
      {myAnswer === null && (
        <button
          onClick={() => input.trim() && onAnswer(input.trim())}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition"
        >
          回答する
        </button>
      )}
      {myAnswer !== null && showAnswer && (
        <div className="bg-slate-700 rounded-xl px-5 py-4">
          <p className="text-xs text-emerald-400 mb-1">正答</p>
          <p className="text-lg font-bold text-emerald-300">{question.correctAnswer}</p>
        </div>
      )}
    </div>
  )
}

function SortingQuestion({
  question,
  onAnswer,
  myAnswer,
}: {
  question: Question
  onAnswer: (text: string) => void
  myAnswer: string | null
}) {
  const [arranged, setArranged] = useState<string[]>([])
  const [remaining, setRemaining] = useState<string[]>([...(question.sortWords ?? [])])

  const addWord = (word: string, idx: number) => {
    if (myAnswer !== null) return
    setArranged((prev) => [...prev, word])
    setRemaining((prev) => prev.filter((_, i) => i !== idx))
  }

  const removeWord = (idx: number) => {
    if (myAnswer !== null) return
    const word = arranged[idx]
    setArranged((prev) => prev.filter((_, i) => i !== idx))
    setRemaining((prev) => [...prev, word])
  }

  const handleSubmit = () => {
    if (arranged.length === 0) return
    onAnswer(arranged.join(' '))
  }

  return (
    <div className="space-y-4">
      {/* 並べた単語 */}
      <div className="min-h-14 bg-slate-700 border-2 border-slate-600 rounded-xl p-3 flex flex-wrap gap-2">
        {arranged.length === 0 && (
          <span className="text-slate-500 text-sm self-center">下の単語をタップして並べてください</span>
        )}
        {arranged.map((w, i) => (
          <button
            key={i}
            onClick={() => removeWord(i)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition"
          >
            {w}
          </button>
        ))}
      </div>

      {/* 残り単語 */}
      <div className="flex flex-wrap gap-2">
        {remaining.map((w, i) => (
          <button
            key={i}
            onClick={() => addWord(w, i)}
            className="bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-slate-500 transition"
          >
            {w}
          </button>
        ))}
      </div>

      {myAnswer === null && arranged.length > 0 && (
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition"
        >
          回答する
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────

export default function StudentRoomPage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const [state, setState] = useState<AppState>({ phase: 'lookup' })
  const [nameInput, setNameInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // URL のコードを初期値に
  useEffect(() => {
    if (params.code && params.code !== 'enter') {
      setState({ phase: 'join', roomId: '' })
      // コードからルームを検索
      setLoading(true)
      fetch(`/api/rooms/code/${params.code}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            setError(data.error)
            setState({ phase: 'lookup' })
          } else {
            setState({ phase: 'join', roomId: data.roomId })
          }
        })
        .catch(() => setError('ルームの検索に失敗しました'))
        .finally(() => setLoading(false))
    }
  }, [params.code])

  // 通知表示
  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  // ── Pusher: 講師→生徒イベント受信 ──────────
  const roomId = state.phase !== 'lookup' && state.phase !== 'finished'
    ? (state as { roomId: string }).roomId
    : null

  useStudentPusher({
    roomId,
    onQuestionChange: useCallback((data: QuestionChangeEvent) => {
      setState((prev) => {
        if (prev.phase === 'lookup' || prev.phase === 'finished') return prev
        const question = questions.find((q) => q.id === data.questionId)
        if (!question) return prev
        const base = prev as { roomId: string; participantId: string; name: string }
        return {
          phase: 'question',
          roomId: base.roomId,
          participantId: base.participantId,
          name: base.name,
          question,
          mode: data.mode,
          showAnswer: data.showAnswer,
          showExplanation: data.showExplanation,
          myAnswer: null,
          isCorrect: null,
        }
      })
      showNotification('📝 新しい問題が届きました！')
    }, []),

    onShowAnswer: useCallback((data: ShowAnswerEvent) => {
      setState((prev) => {
        if (prev.phase !== 'question') return prev
        return { ...prev, showAnswer: data.showAnswer, showExplanation: data.showExplanation }
      })
      if (data.showAnswer) showNotification('✅ 正答が発表されました！')
    }, []),

    onRoomFinished: useCallback(() => {
      setState({ phase: 'finished' })
    }, []),
  })

  // ── 名前入力 → 入室 ──────────────────────────
  const handleJoin = async () => {
    if (state.phase !== 'join') return
    const name = nameInput.trim()
    if (!name) return setError('名前を入力してください')

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/rooms/${state.roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error)
      setState({
        phase: 'waiting',
        roomId: state.roomId,
        participantId: data.participantId,
        name,
      })
    } catch {
      setError('入室に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // ── 回答送信 ──────────────────────────────────
  const handleAnswer = async (answerText: string) => {
    if (state.phase !== 'question') return
    const { roomId, participantId, name, question } = state

    try {
      const res = await fetch(`/api/rooms/${roomId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          participantName: name,
          questionId: question.id,
          answerText,
        }),
      })
      const data = await res.json()
      if (!res.ok) return showNotification('回答の送信に失敗しました')
      setState((prev) =>
        prev.phase === 'question'
          ? { ...prev, myAnswer: answerText, isCorrect: data.isCorrect }
          : prev
      )
    } catch {
      showNotification('回答の送信に失敗しました')
    }
  }

  // ── レンダリング ────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* 通知バナー */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium animate-bounce">
          {notification}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* ── コード入力 / 名前入力 ── */}
        {(state.phase === 'lookup' || state.phase === 'join') && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-emerald-400">🇬🇧 英文法レッスン</h1>
              <p className="text-slate-400 mt-2">講師からコードをもらって入室してください</p>
            </div>

            {state.phase === 'lookup' ? (
              <div className="space-y-4">
                <p className="text-slate-300">入室コードを入力してください</p>
                <input
                  type="text"
                  maxLength={6}
                  className="w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-5 py-4 text-center text-2xl font-mono tracking-widest uppercase focus:outline-none focus:border-emerald-500"
                  placeholder="XXXXXX"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val.length === 6) {
                        router.push(`/room/${val}`)
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
                <p className="text-slate-300">あなたの名前を入力してください</p>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="例: 田中花子"
                  maxLength={20}
                  className="w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-emerald-500"
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-4 rounded-xl text-lg font-bold transition"
                >
                  {loading ? '入室中...' : '入室する'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 待機中 ── */}
        {state.phase === 'waiting' && (
          <div className="text-center space-y-6 py-16">
            <div className="text-6xl">⏳</div>
            <div>
              <p className="text-2xl font-bold text-white">{state.name}さん、入室しました！</p>
              <p className="text-slate-400 mt-2">講師が問題を送るまでお待ちください...</p>
            </div>
            <div className="flex justify-center gap-2">
              {[0, 0.2, 0.4].map((d, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 問題表示 ── */}
        {state.phase === 'question' && (
          <div className="space-y-5">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">
                  中{state.question.grade} / {state.question.category}
                </span>
                <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">
                  {state.mode === 'choice' ? '選択' : state.mode === 'typing' ? 'タイピング' : '並べ替え'}
                </span>
              </div>
              <span className="text-sm text-slate-400">{state.name}</span>
            </div>

            {/* 問題文 */}
            <div className="bg-slate-800 rounded-2xl p-6">
              <p className="text-xl font-medium leading-relaxed">{state.question.questionText}</p>
            </div>

            {/* 回答フォーム */}
            {state.mode === 'choice' && (
              <ChoiceQuestion
                question={state.question}
                onAnswer={handleAnswer}
                myAnswer={state.myAnswer}
                showAnswer={state.showAnswer}
              />
            )}
            {state.mode === 'typing' && (
              <TypingQuestion
                question={state.question}
                onAnswer={handleAnswer}
                myAnswer={state.myAnswer}
                showAnswer={state.showAnswer}
              />
            )}
            {state.mode === 'sorting' && (
              <SortingQuestion
                question={state.question}
                onAnswer={handleAnswer}
                myAnswer={state.myAnswer}
              />
            )}

            {/* 回答後フィードバック */}
            {state.myAnswer !== null && (
              <div
                className={`rounded-2xl p-5 text-center border-2 ${
                  state.isCorrect
                    ? 'bg-emerald-900/40 border-emerald-600'
                    : 'bg-red-900/40 border-red-600'
                }`}
              >
                <p className="text-4xl mb-2">{state.isCorrect ? '🎉' : '😢'}</p>
                <p className="text-xl font-bold">
                  {state.isCorrect ? '正解！' : '不正解...'}
                </p>
                {!state.showAnswer && (
                  <p className="text-sm text-slate-400 mt-1">正答発表をお待ちください</p>
                )}
              </div>
            )}

            {/* 正答・解説（showAnswer時） */}
            {state.showAnswer && state.myAnswer !== null && (
              <div className="bg-slate-800 rounded-2xl p-5 space-y-3">
                <div>
                  <p className="text-xs text-emerald-400 font-semibold mb-1">✅ 正答</p>
                  <p className="text-lg font-bold text-emerald-300">
                    {state.question.correctAnswer}
                  </p>
                </div>
                {state.showExplanation && (
                  <div>
                    <p className="text-xs text-blue-400 font-semibold mb-1">📖 解説</p>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {state.question.explanation}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      💡 {state.question.explanationShort}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 終了 ── */}
        {state.phase === 'finished' && (
          <div className="text-center space-y-6 py-16">
            <div className="text-6xl">🏁</div>
            <div>
              <p className="text-2xl font-bold">授業終了！</p>
              <p className="text-slate-400 mt-2">お疲れ様でした。また次回もがんばりましょう！</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-medium transition"
            >
              トップに戻る
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
