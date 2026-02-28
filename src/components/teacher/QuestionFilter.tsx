'use client'

import { useState } from 'react'
import { GRADE_CATEGORIES, GRADE_LABELS } from '@/lib/question-categories'

interface QuestionFilterProps {
  selectedGrades: number[]
  selectedCategories: string[]
  onGradesChange: (grades: number[]) => void
  onCategoriesChange: (categories: string[]) => void
  filteredCount: number
  totalCount: number
}

export default function QuestionFilter({
  selectedGrades,
  selectedCategories,
  onGradesChange,
  onCategoriesChange,
  filteredCount,
  totalCount,
}: QuestionFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleGrade = (grade: number) => {
    if (selectedGrades.includes(grade)) {
      const newGrades = selectedGrades.filter((g) => g !== grade)
      onGradesChange(newGrades)
      // その学年のカテゴリも除去
      const gradeCategories = GRADE_CATEGORIES[grade] || []
      onCategoriesChange(
        selectedCategories.filter((c) => !gradeCategories.includes(c))
      )
    } else {
      onGradesChange([...selectedGrades, grade])
    }
  }

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== category))
    } else {
      onCategoriesChange([...selectedCategories, category])
    }
  }

  const selectAllInGrade = (grade: number) => {
    const gradeCategories = GRADE_CATEGORIES[grade] || []
    const allSelected = gradeCategories.every((c) =>
      selectedCategories.includes(c)
    )
    if (allSelected) {
      // 全解除
      onCategoriesChange(
        selectedCategories.filter((c) => !gradeCategories.includes(c))
      )
    } else {
      // 全選択
      const newCategories = [
        ...new Set([...selectedCategories, ...gradeCategories]),
      ]
      onCategoriesChange(newCategories)
    }
  }

  const resetFilters = () => {
    onGradesChange([])
    onCategoriesChange([])
  }

  const hasFilters = selectedGrades.length > 0 || selectedCategories.length > 0

  // 表示対象の学年（選択されている or 全学年）
  const visibleGrades =
    selectedGrades.length > 0 ? selectedGrades : [1, 2, 3]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-violet-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </div>
          <span className="font-semibold text-slate-800 text-sm">
            問題の絞り込み
          </span>
          {hasFilters && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
              {filteredCount} / {totalCount} 問
            </span>
          )}
          {!hasFilters && (
            <span className="text-xs text-slate-400">
              全 {totalCount} 問
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* フィルター本体 */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-slate-100">
          {/* 学年タブ */}
          <div className="flex items-center gap-2 mt-4 mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              学年
            </span>
            <div className="flex gap-1.5 ml-2">
              {[1, 2, 3].map((grade) => {
                const isActive = selectedGrades.includes(grade)
                const colors = {
                  1: isActive
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                  2: isActive
                    ? 'bg-blue-500 text-white shadow-sm shadow-blue-200'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
                  3: isActive
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
                }
                return (
                  <button
                    key={grade}
                    onClick={() => toggleGrade(grade)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${colors[grade as 1 | 2 | 3]}`}
                  >
                    {GRADE_LABELS[grade]}
                  </button>
                )
              })}
            </div>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                リセット
              </button>
            )}
          </div>

          {/* カテゴリ一覧 */}
          <div className="space-y-3">
            {visibleGrades.sort().map((grade) => {
              const categories = GRADE_CATEGORIES[grade] || []
              const gradeColors = {
                1: {
                  badge: 'bg-emerald-100 text-emerald-700',
                  active:
                    'bg-emerald-500 text-white shadow-sm',
                  inactive:
                    'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200',
                },
                2: {
                  badge: 'bg-blue-100 text-blue-700',
                  active:
                    'bg-blue-500 text-white shadow-sm',
                  inactive:
                    'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200',
                },
                3: {
                  badge: 'bg-orange-100 text-orange-700',
                  active:
                    'bg-orange-500 text-white shadow-sm',
                  inactive:
                    'bg-slate-50 text-slate-600 hover:bg-orange-50 hover:text-orange-700 border border-slate-200',
                },
              }
              const colors = gradeColors[grade as 1 | 2 | 3]
              const allSelected = categories.every((c) =>
                selectedCategories.includes(c)
              )

              return (
                <div key={grade}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors.badge}`}
                    >
                      {GRADE_LABELS[grade]}
                    </span>
                    <button
                      onClick={() => selectAllInGrade(grade)}
                      className="text-[10px] text-slate-400 hover:text-violet-600 transition-colors"
                    >
                      {allSelected ? '全解除' : '全選択'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => {
                      const isActive = selectedCategories.includes(cat)
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            isActive ? colors.active : colors.inactive
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
