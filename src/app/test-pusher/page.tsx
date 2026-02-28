'use client'

/**
 * Phase 4 テストページ
 * /test-pusher でアクセスして Pusher の動作確認ができる
 *
 * テスト手順:
 * 1. トップページでルームを作成
 * 2. 講師URLと生徒コードを取得
 * 3. このページに roomId と adminKey を入力
 * 4. 別タブで生徒画面(/room/[code])を開く
 * 5. 「問題を出す」ボタンを押して生徒画面が更新されるか確認
 */

import { useState } from 'react'
import { usePusher } from '@/hooks/usePusher'
import type {
  QuestionChangeEvent,
  ShowAnswerEvent,
  AnswerSubmittedEvent,
  ParticipantJoinedEvent,
  RoomFinishedEvent,
} from '@/types'

type LogEntry = {
  id: number
  time: string
  direction: '→ 送信' | '← 受信'
  event: string
  data: unknown
}

let logId = 0

export default function PusherTestPage() {
  const [roomId, setRoomId] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [connected, setConnected] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = (direction: LogEntry['direction'], event: string, data: unknown) => {
    const now = new Date().toLocaleTimeString('ja-JP', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    setLogs((prev) => [{ id: ++logId, time: now, direction, event, data }, ...prev].slice(0, 30))
  }

  // Pusher 購読（全イベント）
  usePusher({
    roomId: connected ? roomId : null,

    // 講師→生徒 の確認（自分のトリガーが届いているか）
    onQuestionChange: (data: QuestionChangeEvent) => {
      addLog('← 受信', 'question-change', data)
    },
    onShowAnswer: (data: ShowAnswerEvent) => {
      addLog('← 受信', 'show-answer', data)
    },
    onRoomFinished: (data: RoomFinishedEvent) => {
      addLog('← 受信', 'room-finished', data)
    },

    // 生徒→講師
    onAnswerSubmitted: (data: AnswerSubmittedEvent) => {
      addLog('← 受信', 'answer-submitted', data)
    },
    onParticipantJoined: (data: ParticipantJoinedEvent) => {
      addLog('← 受信', 'participant-joined', data)
    },
  })

  // API 呼び出しヘルパー
  const callControl = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/rooms/${roomId}/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    addLog('→ 送信', body.action as string, { status: res.status, ...data })
    if (!res.ok) alert(`エラー: ${data.error}`)
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            🧪 Phase 4: Pusher 通信テスト
          </h1>
          <p className="text-slate-500 text-sm">
            講師→生徒のリアルタイム通信を確認します
          </p>
        </div>

        {/* 接続設定 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-700">① 接続設定</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Room ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="例: abc123..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Admin Key</label>
              <input
                type="text"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="例: uuid-v4..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <button
            onClick={() => setConnected((v) => !v)}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              connected
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {connected ? '🔴 切断する' : '🟢 Pusher チャンネルに接続する'}
          </button>
          {connected && (
            <p className="text-emerald-600 text-sm font-medium text-center">
              ✅ room-{roomId} チャンネルを購読中
            </p>
          )}
        </div>

        {/* テスト操作 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-700">② イベント送信テスト（講師→生徒）</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                callControl({ action: 'set-question', questionId: 'q001', mode: 'choice' })
              }
              disabled={!connected}
              className="py-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 disabled:opacity-40 transition-colors"
            >
              📤 question-change<br />
              <span className="text-xs font-normal">(q001 / choice)</span>
            </button>
            <button
              onClick={() =>
                callControl({ action: 'set-question', questionId: 'q001', mode: 'typing' })
              }
              disabled={!connected}
              className="py-3 bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-100 disabled:opacity-40 transition-colors"
            >
              📤 question-change<br />
              <span className="text-xs font-normal">(q001 / typing)</span>
            </button>
            <button
              onClick={() =>
                callControl({ action: 'show-answer', showAnswer: true, showExplanation: false })
              }
              disabled={!connected}
              className="py-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 disabled:opacity-40 transition-colors"
            >
              📤 show-answer<br />
              <span className="text-xs font-normal">(正答のみ)</span>
            </button>
            <button
              onClick={() =>
                callControl({ action: 'show-answer', showAnswer: true, showExplanation: true })
              }
              disabled={!connected}
              className="py-3 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 disabled:opacity-40 transition-colors"
            >
              📤 show-answer<br />
              <span className="text-xs font-normal">(正答+解説)</span>
            </button>
            <button
              onClick={() => callControl({ action: 'finish-room' })}
              disabled={!connected}
              className="py-3 bg-red-50 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-40 transition-colors col-span-2"
            >
              📤 room-finished（授業終了）
            </button>
          </div>
        </div>

        {/* ログ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-700">③ イベントログ</h2>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              クリア
            </button>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-center text-slate-400 py-8">
                接続してイベントを送信すると、ここにログが表示されます
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`px-3 py-2 rounded-lg border ${
                    log.direction === '→ 送信'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-400">{log.time}</span>
                    <span
                      className={`font-bold ${
                        log.direction === '→ 送信' ? 'text-blue-600' : 'text-emerald-600'
                      }`}
                    >
                      {log.direction}
                    </span>
                    <span className="font-bold text-slate-700">{log.event}</span>
                  </div>
                  <pre className="text-slate-500 text-xs overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>

        {/* テスト手順 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="font-bold text-amber-800 mb-3">📋 テスト手順</h2>
          <ol className="text-sm text-amber-700 space-y-2 list-decimal list-inside">
            <li>トップ画面（/）でルームを作成する</li>
            <li>発行された <b>Room ID</b> と <b>Admin Key</b> を上のフォームに入力</li>
            <li>「Pusher チャンネルに接続する」ボタンを押す</li>
            <li>別タブで生徒画面 <code className="bg-amber-100 px-1 rounded">/room/[code]</code> を開いて入室する</li>
            <li>「question-change」「show-answer」ボタンを押す</li>
            <li>生徒画面がリアルタイムで更新されることを確認 ✅</li>
            <li>生徒が回答すると「← 受信 answer-submitted」がログに出ることを確認 ✅</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
