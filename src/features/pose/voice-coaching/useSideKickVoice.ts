import { useCallback, useEffect, useRef, useState } from 'react'

type VoiceCue = {
  category: string
  event_code: string
  audio_url: string
  message: string
}

export function useSideKickVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cuesRef = useRef<Map<string, VoiceCue>>(new Map())
  const cueCountsRef = useRef<Map<string, number>>(new Map())

  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const audio = new Audio()
    audioRef.current = audio

    async function loadCues() {
      try {
        const response = await fetch('/audio/pose/sidekick/voice_manifest.json')

        if (!response.ok) {
          throw new Error('VOICE_MANIFEST_NOT_FOUND')
        }

        const data: VoiceCue[] = await response.json()

        if (cancelled) return

        const map = new Map<string, VoiceCue>()

        for (const cue of data) {
          if (
            (cue.category === 'STUDY' || cue.category === 'TRACKING') &&
            /^[A-Z_]+$/.test(cue.event_code) &&
            cue.audio_url.startsWith('/audio/pose/sidekick/')
          ) {
            map.set(cue.event_code, cue)
          }
        }

        cuesRef.current = map
        setReady(true)
      } catch (cause) {
        console.error('Voice manifest loading failed:', cause)
        if (!cancelled) {
          setError('음성 안내 목록을 불러오지 못했습니다.')
        }
      }
    }

    void loadCues()

    return () => {
      cancelled = true
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
  }, [])

  // Safari에서 사용자 클릭을 통해 음성 재생을 활성화한다.
  const enableVoice = useCallback(async () => {
    const audio = audioRef.current
    const cue = cuesRef.current.get('READY_POSITION_ADJUST')

    if (!audio || !cue) {
      setError('음성 파일이 아직 준비되지 않았습니다.')
      return
    }

    try {
      audio.pause()
      audio.src = cue.audio_url
      audio.currentTime = 0
      audio.volume = 0.9

      await audio.play()

      setEnabled(true)
      setError(null)
      setMessage('음성 안내가 켜졌습니다.')
    } catch (cause) {
      console.error('Voice playback failed:', cause)
      setEnabled(false)
      setError('브라우저에서 음성 재생이 차단됐습니다.')
    }
  }, [])

  const playCue = useCallback(
    async (eventCode: string) => {
      if (!enabled) return

      const audio = audioRef.current
      const count = cueCountsRef.current.get(eventCode) ?? 0
      const alternateCode = `${eventCode}_ALT`
      const useAlternate = count % 2 === 1 && cuesRef.current.has(alternateCode)
      const cue = cuesRef.current.get(useAlternate ? alternateCode : eventCode)

      if (!audio || !cue) {
        setError(`등록되지 않은 음성 이벤트: ${eventCode}`)
        return
      }

      try {
        // 코칭 음성이 동시에 겹치지 않게 기존 음성을 중단한다.
        audio.pause()
        audio.src = cue.audio_url
        audio.currentTime = 0
        audio.volume = 0.9

        setMessage(cue.message)
        setError(null)

        await audio.play()
        cueCountsRef.current.set(eventCode, count + 1)
      } catch (cause) {
        console.error('Voice playback failed:', cause)
        setError(`음성 재생 실패: ${eventCode}`)
      }
    },
    [enabled],
  )

  const stopVoice = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    audio.currentTime = 0
    setMessage(null)
  }, [])

  return {
    enabled,
    ready,
    message,
    error,
    enableVoice,
    playCue,
    stopVoice,
  }
}
