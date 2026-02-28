'use client'

import { Choice } from '@/lib/types'

interface Props {
  choices: Choice[]
  selected: string | null
  correct: string | null   // null = answer not shown yet
  disabled: boolean
  onSelect: (id: string) => void
}

export default function ChoiceQuestion({ choices, selected, correct, disabled, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {choices.map(choice => {
        let style =
          'border-2 border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50'

        if (selected === choice.id && correct === null) {
          style = 'border-2 border-indigo-500 bg-indigo-50'
        }
        if (correct !== null) {
          if (choice.id === correct) {
            style = 'border-2 border-green-500 bg-green-50'
          } else if (choice.id === selected && choice.id !== correct) {
            style = 'border-2 border-red-400 bg-red-50'
          } else {
            style = 'border-2 border-gray-200 bg-white opacity-60'
          }
        }

        return (
          <button
            key={choice.id}
            onClick={() => !disabled && onSelect(choice.id)}
            disabled={disabled}
            className={`${style} rounded-xl px-5 py-4 text-left font-medium text-gray-800 transition-all text-lg disabled:cursor-default`}
          >
            <span className="inline-block w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold text-center leading-7 mr-3">
              {choice.id.toUpperCase()}
            </span>
            {choice.text}
          </button>
        )
      })}
    </div>
  )
}
