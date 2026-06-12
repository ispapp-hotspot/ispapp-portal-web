'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CampaignData, CampaignMediaItem } from '@/types'

interface Props {
  campaign:  CampaignData
  onFinish:  () => void
  onView?:   (itemId: string) => void
}

export default function CampaignStories({ campaign, onFinish, onView }: Props) {
  const items   = campaign.media.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  const total   = items.length

  const [idx, setIdx]         = useState(0)
  const [paused, setPaused]   = useState(false)
  const [progress, setProgress] = useState(0)

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef  = useRef<number>(0)
  const elapsedRef = useRef<number>(0)

  const current: CampaignMediaItem = items[idx]

  const goNext = useCallback(() => {
    if (idx + 1 >= total) {
      onFinish()
    } else {
      onView?.(current.id)
      setIdx(i => i + 1)
      setProgress(0)
      elapsedRef.current = 0
    }
  }, [idx, total, current, onFinish, onView])

  // tick
  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    const duration = current.durationSec * 1000
    startRef.current = Date.now() - elapsedRef.current

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      elapsedRef.current = elapsed
      const pct = Math.min(elapsed / duration, 1)
      setProgress(pct)
      if (pct >= 1) {
        clearInterval(timerRef.current!)
        goNext()
      }
    }, 50)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [idx, paused, current, goNext])

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    setPaused(true)
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.preventDefault()
    setPaused(false)
  }

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const x = e.clientX
    const w = (e.currentTarget as HTMLDivElement).offsetWidth
    if (x < w * 0.33) {
      // prev
      if (idx > 0) {
        setIdx(i => i - 1)
        setProgress(0)
        elapsedRef.current = 0
      } else {
        setProgress(0)
        elapsedRef.current = 0
      }
    } else if (x > w * 0.67) {
      // next
      goNext()
    }
    // center: pause already handled by pointer events
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        zIndex: 9999,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleTap}
    >
      {/* Progress bars */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          gap: 4,
          zIndex: 2,
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            style={{
              flex: 1,
              height: 3,
              backgroundColor: 'rgba(255,255,255,0.4)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: '#fff',
                borderRadius: 2,
                width:
                  i < idx
                    ? '100%'
                    : i === idx
                    ? `${progress * 100}%`
                    : '0%',
                transition: i === idx && !paused ? 'none' : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Skip button */}
      <button
        onClick={e => { e.stopPropagation(); onFinish() }}
        style={{
          position: 'absolute',
          top: 28,
          right: 16,
          zIndex: 3,
          background: 'rgba(0,0,0,0.4)',
          border: 'none',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          padding: '4px 12px',
          borderRadius: 20,
          cursor: 'pointer',
        }}
      >
        Pular
      </button>

      {/* Media */}
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {current.type === 'video' ? (
          <video
            key={current.id}
            src={current.url}
            autoPlay
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={current.url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            draggable={false}
          />
        )}
      </div>
    </div>
  )
}
