'use client'

import { useParams, useSearchParams } from 'next/navigation'

export default function TeacherRoomPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const adminKey = searchParams.get('key')

  return (
    <main className="min-h-screen flex items-center justify-center bg-indigo-50 p-6">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-lg w-full text-center">
        <div className="text-4xl mb-4">🏫</div>
        <h1 className="text-2xl font-bold text-indigo-700 mb-2">講師パネル</h1>
        <p className="text-gray-500 mb-4">Phase 5 で実装予定</p>
        <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-600 space-y-1">
          <p><span className="font-medium">ルームID:</span> {id}</p>
          <p><span className="font-medium">AdminKey:</span> {adminKey ? `${adminKey.slice(0, 8)}...` : '未設定'}</p>
        </div>
        <a href="/" className="mt-6 inline-block text-sm text-indigo-500 hover:underline">
          ← トップに戻る
        </a>
      </div>
    </main>
  )
}
