import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/room-store'
import { pusherServer } from '@/lib/pusher'
import { questions } from '@/src/data/questions'
import { QuestionType } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const room = getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const body = await request.json()
  const { adminKey, action } = body

  if (adminKey !== room.adminKey) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  switch (action) {
    case 'set-question': {
      const { questionId } = body
      const question = questions.find(q => q.id === questionId)
      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 })
      }
      room.currentQuestionId = questionId
      room.showAnswer = false
      room.showExplanation = false
      room.status = 'active'
      setRoom(room)

      await pusherServer.trigger(`room-${room.id}`, 'question-change', {
        questionId,
        mode: room.mode,
      })
      break
    }

    case 'show-answer': {
      const { showAnswer, showExplanation } = body
      room.showAnswer = showAnswer
      room.showExplanation = showExplanation ?? false
      setRoom(room)

      const currentQuestion = questions.find(q => q.id === room.currentQuestionId)
      await pusherServer.trigger(`room-${room.id}`, 'show-answer', {
        showAnswer,
        showExplanation: room.showExplanation,
        correctAnswer: currentQuestion?.correctAnswer ?? '',
        explanation: currentQuestion?.explanation ?? '',
        explanationShort: currentQuestion?.explanationShort ?? '',
      })
      break
    }

    case 'set-mode': {
      const { mode } = body as { mode: QuestionType }
      room.mode = mode
      setRoom(room)

      if (room.currentQuestionId) {
        await pusherServer.trigger(`room-${room.id}`, 'question-change', {
          questionId: room.currentQuestionId,
          mode,
        })
      }
      break
    }

    case 'finish': {
      room.status = 'finished'
      setRoom(room)

      await pusherServer.trigger(`room-${room.id}`, 'room-finished', {})
      break
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { adminKey: _ak, ...safeRoom } = room
  return NextResponse.json(safeRoom)
}
