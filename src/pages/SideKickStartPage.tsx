import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ExerciseMode } from '../features/yolo-environment-check/types'

/** 정식 운동 목록 UI가 오기 전 Side Kick 통합 흐름만 검증하기 위한 최소 선택 화면이다. */
export default function SideKickStartPage({
  devOnly = false,
}: {
  devOnly?: boolean
}) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<ExerciseMode>('STUDY')
  return (
    <main className="mx-auto max-w-xl space-y-5 p-6">
      <h1 className="text-2xl font-bold">운동 시작</h1>
      <div className="flex gap-2">
        <button
          className={`rounded border px-4 py-2 ${mode === 'STUDY' ? 'bg-brand' : ''}`}
          onClick={() => setMode('STUDY')}
        >
          자세 배우기
        </button>
        <button
          className={`rounded border px-4 py-2 ${mode === 'EXERCISE' ? 'bg-brand' : ''}`}
          onClick={() => setMode('EXERCISE')}
        >
          일반 운동
        </button>
      </div>
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Side Kick</h2>
        <p className="mt-1 text-sm text-gray-600">
          전신 촬영 구도와 운동 대상자 수를 확인한 뒤 시작합니다.
        </p>
        <button
          className="mt-4 rounded bg-brand px-4 py-2"
          onClick={() =>
            navigate(
              `${devOnly ? '/dev/sidekick/check' : '/workouts/sidekick/check'}/${mode === 'STUDY' ? 'study' : 'exercise'}`,
            )
          }
        >
          Side Kick 시작
        </button>
      </section>
    </main>
  )
}
