import { Question } from '@/lib/types'

interface QuestionSelectorProps {
  questions: Question[]
  currentQuestionId: string | null
  onQuestionChange: (questionId: string) => void
  selectedGrade: 1 | 2 | 3 | null
  setSelectedGrade: (grade: 1 | 2 | 3 | null) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  categories: string[]
}

export default function QuestionSelector({
  questions,
  currentQuestionId,
  onQuestionChange,
  selectedGrade,
  setSelectedGrade,
  selectedCategory,
  setSelectedCategory,
  categories
}: QuestionSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">問題選択</h2>

      {/* フィルター */}
      <div className="space-y-3 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">学年</label>
          <select
            value={selectedGrade || ''}
            onChange={(e) => setSelectedGrade(e.target.value ? parseInt(e.target.value) as 1 | 2 | 3 : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全学年</option>
            <option value="1">中1</option>
            <option value="2">中2</option>
            <option value="3">中3</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全カテゴリ</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 問題リスト */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {questions.map((q) => (
          <button
            key={q.id}
            onClick={() => onQuestionChange(q.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              currentQuestionId === q.id
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">
              {q.category} - 中{q.grade}
            </div>
            <div className="text-sm font-medium line-clamp-2">
              {q.questionText}
            </div>
          </button>
        ))}
      </div>

      {/* ランダム選択 */}
      <button
        onClick={() => {
          const randomIndex = Math.floor(Math.random() * questions.length)
          onQuestionChange(questions[randomIndex].id)
        }}
        className="mt-4 w-full btn-secondary"
        disabled={questions.length === 0}
      >
        ランダムに選択
      </button>
    </div>
  )
}