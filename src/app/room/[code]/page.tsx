'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { usePusher } from '@/hooks/usePusher'
import ChoiceQuestion from '@/components/questions/ChoiceQuestion'
import TypingQuestion from '@/components/questions/TypingQuestion'
import SortingQuestion from '@/components/questions/SortingQuestion'
import { Question, QuestionType } from '@/types'
import { questions as allQuestions } from '@/src/data/questions'

type Phase = 'enter-name' | 'waiting' | 'question' | 'finished'

export default function StudentRoomPage() {
  const { code } = useParams<{ code: string }>()

  const [phase, setPhase] = useState<Phase>('enter-name')
  const [nameInput, setNameInput] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  const [roomId, setRoomId] = useState<string | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)

  const [mode, setMode] = useState<QuestionType>('choice')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)
  const [explanation, setExplanation] = useState('')
  const [explanationShort, setExplanationShort] = useState('')

  // Answer state
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [typingValue, setTypingValue] = useState('')
  const [answerSubmitted, setAnswerSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  // Hint
  const [showHint, setShowHint] = useState(false)

  // Join room
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const name = nameInput.trim()
    if (!name) {
      setError('名前を入力してください')
      return
    }
    setJoining(true)
    setError('')

    try {
      // Find room by code
      const roomRes = await fetch(`/api/rooms/code/${code.toUpperCase()}`)
      if (!roomRes.ok) {
        setError('ルームが見つかりません。コードを確認してください。')
        setJoining(false)
        return
      }
      const roomData = await roomRes.json()

      // Join
      const joinRes = await fetch(`/api/rooms/${roomData.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!joinRes.ok) {
        setError('入室に失敗しました。')
        setJoining(false)
        return
      }
      const joinData = await joinRes.json()

      setRoomId(roomData.id)
      setParticipantId(joinData.participantId)
      setMode(joinData.mode)

      if (joinData.status === 'finished') {
        setPhase('finished')
        return
      }

      if (joinData.currentQuestionId) {
        const q = allQuestions.find(q => q.id === joinData.currentQuestionId)
        if (q) {
          setCurrentQuestion(q)
          setPhase('question')
        } else {
          setPhase('waiting')
        }
      } else {
        setPhase('waiting')
      }
    } catch {
      setError('ネットワークエラーが発生しました。')
    } finally {
      setJoining(false)
    }
  }

  // Reset answer state when question changes
  function resetAnswer() {
    setSelectedChoice(null)
    setTypingValue('')
    setAnswerSubmitted(false)
    setIsCorrect(null)
    setShowHint(false)
    setShowAnswer(false)
    setShowExplanation(false)
    setCorrectAnswer(null)
    setExplanation('')
    setExplanationShort('')
  }

  // Pusher events
  const handleQuestionChange = useCallback((data: unknown) => {
    const payload = data as { questionId: string; mode: QuestionType }
    const q = allQuestions.find(q => q.id === payload.questionId)
    if (q) {
      resetAnswer()
      setCurrentQuestion(q)
      setMode(payload.mode)
      setPhase('question')
    }
  }, [])

  const handleShowAnswer = useCallback((data: unknown) => {
    const payload = data as {
      showAnswer: boolean
      showExplanation: boolean
      correctAnswer: string
      explanation: string
      explanationShort: string
    }
    setShowAnswer(payload.showAnswer)
    setShowExplanation(payload.showExplanation)
    if (payload.showAnswer) {
      setCorrectAnswer(payload.correctAnswer)
      setExplanation(payload.explanation)
      setExplanationShort(payload.explanationShort)
    }
  }, [])

  const handleRoomFinished = useCallback(() => {
    setPhase('finished')
  }, [])

  usePusher(roomId ? `room-${roomId}` : null, {
    'question-change': handleQuestionChange,
    'show-answer': handleShowAnswer,
    'room-finished': handleRoomFinished,
  })

  // Submit answer
  async function submitAnswer(answerText: string) {
    if (!roomId || !participantId || !currentQuestion || answerSubmitted) return
    setAnswerSubmitted(true)

    try {
      const res = await fetch(`/api/rooms/${roomId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          questionId: currentQuestion.id,
          answerText,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setIsCorrect(data.isCorrect)
      }
    } catch {
      setAnswerSubmitted(false)
    }
  }

  function handleChoiceSelect(id: string) {
    if (answerSubmitted) return
    setSelectedChoice(id)
    submitAnswer(id)
  }

  function handleTypingSubmit() {
    if (!typingValue.trim() || answerSubmitted) return
    submitAnswer(typingValue.trim())
  }

  function handleSortingSubmit(answer: string) {
    submitAnswer(answer)
  }

  // ── Render ──

  if (phase === 'enter-name') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-teal-100">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center text-teal-700 mb-1">入室</h1>
          <p className="text-center text-gray-500 text-sm mb-6">
            ルームコード: <span className="font-bold text-gray-700">{code?.toUpperCase()}</span>
          </p>
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="あなたの名前を入力"
              maxLength={20}
              className="w-full border-2 border-gray-200 focus:border-teal-400 rounded-xl px-4 py-3 text-center text-lg outline-none transition"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={joining}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-semibold py-3 rounded-xl transition"
            >
              {joining ? '接続中...' : '入室する'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  if (phase === 'waiting') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-teal-100">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-4 animate-bounce">⏳</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">講師を待っています...</h2>
          <p className="text-gray-500 text-sm">問題が出たら自動的に表示されます</p>
          <p className="text-teal-600 font-medium mt-4">{nameInput} さんとして入室済み</p>
        </div>
      </main>
    )
  }

  if (phase === 'finished') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-teal-100">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">授業終了</h2>
          <p className="text-gray-500">お疲れ様でした！</p>
        </div>
      </main>
    )
  }

  // Phase: question
  if (!currentQuestion) return null

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-teal-700 font-medium">
            {nameInput} さん
          </div>
          <div className="flex gap-2 text-xs">
            <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
              {currentQuestion.category}
            </span>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              中{currentQuestion.grade}
            </span>
            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full capitalize">
              {mode === 'choice' ? '選択' : mode === 'typing' ? '記述' : '並べ替え'}
            </span>
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <p className="text-xl font-bold text-gray-800 mb-6 leading-relaxed">
            {currentQuestion.questionText}
          </p>

          {/* Answer UI */}
          {mode === 'choice' && currentQuestion.choices && (
            <ChoiceQuestion
              choices={currentQuestion.choices}
              selected={selectedChoice}
              correct={showAnswer ? correctAnswer : null}
              disabled={answerSubmitted}
              onSelect={handleChoiceSelect}
            />
          )}

          {mode === 'typing' && (
            <TypingQuestion
              value={typingValue}
              correct={showAnswer ? correctAnswer : null}
              submitted={answerSubmitted}
              isCorrect={isCorrect}
              onChange={setTypingValue}
              onSubmit={handleTypingSubmit}
            />
          )}

          {mode === 'sorting' && currentQuestion.sortWords && (
            <SortingQuestion
              words={currentQuestion.sortWords}
              correct={showAnswer ? correctAnswer : null}
              submitted={answerSubmitted}
              isCorrect={isCorrect}
              onSubmit={handleSortingSubmit}
            />
          )}

          {/* Result feedback (after answer submitted, before answer shown) */}
          {answerSubmitted && isCorrect !== null && !showAnswer && mode === 'choice' && (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
                isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {isCorrect ? '✅ 正解！ 正答発表を待ちましょう' : '❌ 不正解 正答発表を待ちましょう'}
            </div>
          )}

          {/* Waiting for other students */}
          {answerSubmitted && !showAnswer && (
            <p className="mt-4 text-center text-sm text-gray-400 animate-pulse">
              他の生徒の回答を待っています...
            </p>
          )}

          {/* Explanation (when shown by teacher) */}
          {showAnswer && showExplanation && explanation && (
            <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 mb-1">📖 解説</p>
              <p className="text-sm text-blue-900 mb-2">{explanation}</p>
              {explanationShort && (
                <p className="text-xs text-blue-600 bg-blue-100 rounded px-2 py-1">
                  💡 {explanationShort}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Hint */}
        <div className="text-center">
          {!showHint ? (
            <button
              onClick={() => setShowHint(true)}
              className="text-sm text-gray-400 hover:text-teal-600 underline transition"
            >
              ヒントを見る
            </button>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
              💡 {currentQuestion.hint}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
