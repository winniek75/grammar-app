'use client'

import { useState, useRef } from 'react'

interface Props {
  words: string[]
  correct: string | null   // null = not revealed
  submitted: boolean
  isCorrect: boolean | null
  onSubmit: (answer: string) => void
}

export default function SortingQuestion({
  words,
  correct,
  submitted,
  isCorrect,
  onSubmit,
}: Props) {
  const [arranged, setArranged] = useState<string[]>([])
  const [remaining, setRemaining] = useState<string[]>([...words])
  const dragItem = useRef<{ word: string; from: 'arranged' | 'remaining'; index: number } | null>(null)

  function addWord(word: string, index: number) {
    if (submitted) return
    setRemaining(r => r.filter((_, i) => i !== index))
    setArranged(a => [...a, word])
  }

  function removeWord(word: string, index: number) {
    if (submitted) return
    setArranged(a => a.filter((_, i) => i !== index))
    setRemaining(r => [...r, word])
  }

  function handleDragStart(word: string, from: 'arranged' | 'remaining', index: number) {
    dragItem.current = { word, from, index }
  }

  function handleDropOnArranged(targetIndex: number) {
    if (!dragItem.current || submitted) return
    const { word, from, index } = dragItem.current

    if (from === 'remaining') {
      const newRemaining = remaining.filter((_, i) => i !== index)
      const newArranged = [...arranged]
      newArranged.splice(targetIndex, 0, word)
      setRemaining(newRemaining)
      setArranged(newArranged)
    } else {
      // reorder within arranged
      const newArranged = [...arranged]
      newArranged.splice(index, 1)
      newArranged.splice(targetIndex, 0, word)
      setArranged(newArranged)
    }
    dragItem.current = null
  }

  function handleDropOnRemaining() {
    if (!dragItem.current || submitted) return
    const { word, from, index } = dragItem.current
    if (from === 'arranged') {
      setArranged(a => a.filter((_, i) => i !== index))
      setRemaining(r => [...r, word])
    }
    dragItem.current = null
  }

  function handleSubmit() {
    if (arranged.length === 0 || submitted) return
    onSubmit(arranged.join(' '))
  }

  return (
    <div className="space-y-4">
      {/* Arranged area */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={() => handleDropOnArranged(arranged.length)}
        className="min-h-14 bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-xl p-3 flex flex-wrap gap-2"
      >
        {arranged.length === 0 && (
          <p className="text-gray-400 text-sm self-center w-full text-center">
            単語をここに並べてください
          </p>
        )}
        {arranged.map((word, i) => {
          let style = 'bg-indigo-500 text-white cursor-grab active:cursor-grabbing'
          if (submitted && correct !== null) {
            const correctWords = correct.split(' ')
            style =
              correctWords[i] === word
                ? 'bg-green-500 text-white cursor-default'
                : 'bg-red-400 text-white cursor-default'
          }
          return (
            <span
              key={i}
              draggable={!submitted}
              onDragStart={() => handleDragStart(word, 'arranged', i)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.stopPropagation(); handleDropOnArranged(i) }}
              onClick={() => removeWord(word, i)}
              className={`${style} rounded-lg px-3 py-1.5 text-sm font-medium select-none transition`}
            >
              {word}
            </span>
          )
        })}
      </div>

      {/* Remaining words */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDropOnRemaining}
        className="flex flex-wrap gap-2 min-h-10"
      >
        {remaining.map((word, i) => (
          <span
            key={i}
            draggable={!submitted}
            onDragStart={() => handleDragStart(word, 'remaining', i)}
            onClick={() => addWord(word, i)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium select-none transition"
          >
            {word}
          </span>
        ))}
      </div>

      {/* Submit */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={arranged.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition"
        >
          回答する
        </button>
      )}

      {submitted && isCorrect !== null && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {isCorrect ? '✅ 正解！' : '❌ 不正解'}
        </div>
      )}

      {correct !== null && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 text-sm text-yellow-800">
          正答: <span className="font-bold">{correct}</span>
        </div>
      )}
    </div>
  )
}
