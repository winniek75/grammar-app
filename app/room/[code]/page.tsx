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

declare global { interface Window { WiseXP?: any; WiseGame?: any; } }

// B2 tag mapping: category → tag ID
const CATEGORY_TAG_MAP: Record<string, string> = {
  'be動詞': 'be_verb', '一般動詞': 'general_verb', '三単現': 'third_person_s',
  '複数形': 'plural_s', '代名詞': 'pronoun', '冠詞': 'article',
  '前置詞': 'preposition', '助動詞': 'auxiliary', '比較': 'comparative',
  '命令文': 'imperative', 'There is': 'there_is',
}

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
  const sessionWrongRef = useRef<Array<{q:string;correct:string;chosen:string;tag:string}>>([])
  const sessionStatsRef = useRef({ correct: 0, total: 0 })
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const ttsEnabledRef = useRef(ttsEnabled)
  const [showWrongAnswerReview, setShowWrongAnswerReview] = useState(false)
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerRecord[]>([])

  // Combo milestones, near-miss feedback, adaptive hints
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [comboMilestone, setComboMilestone] = useState<string | null>(null)
  const [recentResults, setRecentResults] = useState<boolean[]>([])
  const [showAdaptiveHint, setShowAdaptiveHint] = useState(false)
  const comboMilestoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const COMBO_MILESTONES: Record<number, string> = { 3: "NICE! \u2728", 5: "GREAT! \uD83D\uDD25", 7: "AMAZING! \u26A1", 10: "UNSTOPPABLE! \uD83D\uDC8E" }

  // Initialize WiseXP SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && window.WiseXP) {
      window.WiseXP.init('grammar-app');
    }
  }, []);

  // B2: Send session wrongAnswers to MoWISE on page leave
  useEffect(() => {
    const sendReport = () => {
      const s = sessionStatsRef.current
      if (s.total === 0) return
      const acc = Math.round((s.correct / s.total) * 100)
      try {
        window.WiseGame?.reportComplete?.({
          score: acc, maxScore: 100, accuracy: acc,
          metadata: { wrongAnswers: sessionWrongRef.current }
        })
      } catch { /* ignore */ }
    }
    window.addEventListener('beforeunload', sendReport)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendReport()
    })
    return () => window.removeEventListener('beforeunload', sendReport)
  }, [])

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
      setSessionTotal(prev => prev + 1)

      // Combo & milestone tracking
      if (data.isCorrect) {
        const newCombo = combo + 1
        setCombo(newCombo)
        setMaxCombo(prev => Math.max(prev, newCombo))
        setSessionCorrect(prev => prev + 1)
        if (COMBO_MILESTONES[newCombo]) {
          setComboMilestone(COMBO_MILESTONES[newCombo])
          if (comboMilestoneTimer.current) clearTimeout(comboMilestoneTimer.current)
          comboMilestoneTimer.current = setTimeout(() => setComboMilestone(null), 1500)
        }
      } else {
        setCombo(0)
      }

      // Adaptive hint: track last 5 results
      setRecentResults(prev => {
        const next = [...prev, data.isCorrect].slice(-5)
        if (next.length >= 5) {
          const wrongCount = next.filter(r => !r).length
          if (wrongCount >= 3) setShowAdaptiveHint(true)
          else if (next.every(r => r)) setShowAdaptiveHint(false)
        }
        return next
      })

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
        // B2: track wrong answer for MoWISE analysis
        const catTag = CATEGORY_TAG_MAP[currentQuestion.category ?? ''] || 'other_grammar'
        sessionWrongRef.current.push({
          q: currentQuestion.questionText, correct: currentQuestion.correctAnswer,
          chosen: answer, tag: catTag,
        })
        if (sessionWrongRef.current.length > 20) sessionWrongRef.current = sessionWrongRef.current.slice(-20)
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

      // Track session stats
      sessionStatsRef.current.total++
      if (data.isCorrect) sessionStatsRef.current.correct++

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
      {/* Combo milestone overlay */}
      {comboMilestone && (
        <div key={combo} className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none" style={{ animation: 'milestoneAnim 1.5s ease forwards' }}>
          <div className="text-5xl font-black text-white drop-shadow-lg" style={{ textShadow: '0 0 40px rgba(59,130,246,.6), 0 4px 20px rgba(0,0,0,.5)', animation: 'milestoneTextPop 1.5s cubic-bezier(.34,1.56,.64,1) forwards' }}>
            {comboMilestone}
          </div>
        </div>
      )}
      <style>{`
        @keyframes milestoneAnim { 0%{opacity:0} 10%{opacity:1} 70%{opacity:1} 100%{opacity:0} }
        @keyframes milestoneTextPop { 0%{transform:scale(0) rotate(-10deg);opacity:0} 30%{transform:scale(1.3) rotate(3deg);opacity:1} 50%{transform:scale(1) rotate(0)} 100%{transform:scale(.8) translateY(-30px);opacity:0} }
      `}</style>
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <header className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">参加者: {participant.name}</p>
              <p className="text-xs text-gray-500">コード: {roomCode}</p>
              {combo >= 2 && (
                <p className="text-xs font-bold mt-1" style={{ color: combo >= 7 ? '#ef4444' : combo >= 5 ? '#f59e0b' : '#3b82f6' }}>
                  {'\uD83D\uDD25'} {combo} combo{combo >= 10 ? ' - MAX!' : ''}
                </p>
              )}
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

            {/* ヒント (show always if adaptive hint is active, or if hint exists and answer not shown) */}
            {currentQuestion.hint && (showAdaptiveHint || !room.showAnswer) && !room.showAnswer && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {showAdaptiveHint ? '\uD83D\uDCA1 \u30D2\u30F3\u30C8\uFF08\u81EA\u52D5\u8868\u793A\uFF09: ' : '\uD83D\uDCA1 \u30D2\u30F3\u30C8: '}{currentQuestion.hint}
                </p>
              </div>
            )}
            {/* Adaptive hint: extra grammar tip when struggling */}
            {showAdaptiveHint && !room.showAnswer && !hasAnswered && (
              <div className="mb-6 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                  {'\uD83C\uDFAF'} {currentQuestion.category}{'\u306E\u30DD\u30A4\u30F3\u30C8\u3092\u601D\u3044\u51FA\u3057\u3066\u304B\u3089\u7B54\u3048\u3066\u307F\u3088\u3046\uFF01'}
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
                    {/* Near-miss / perfect feedback */}
                    {sessionTotal > 0 && (() => {
                      const pct = Math.round((sessionCorrect / sessionTotal) * 100)
                      const wrongN = sessionTotal - sessionCorrect
                      if (pct === 100 && sessionTotal >= 3) return <p className="text-sm font-bold text-yellow-600 mt-1">PERFECT! {'\uD83D\uDC8E'} {sessionCorrect}/{sessionTotal}</p>
                      if (pct >= 80 && pct < 100) return <p className="text-sm text-purple-600 mt-1">{'\u3042\u3068'}{wrongN}{'\u554F\u3067\u30D1\u30FC\u30D5\u30A7\u30AF\u30C8\uFF01'}</p>
                      return null
                    })()}
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