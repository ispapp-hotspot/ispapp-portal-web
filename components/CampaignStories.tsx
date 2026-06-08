'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CampaignData, CampaignMediaItem } from '@/types'
import { recordCampaignView } from '@/lib/api'

interface Props {
  campaign:  CampaignData
  portalId:  string
  companyId: string
  mac:       string
  ip:        string
  onFinish:  () => void
}

export default function CampaignStories({ campaign, portalId, companyId, mac, ip, onFinish }: Props) {
  const [current, setCurrent]   = useState(0)
  const [progress, setProgress] = useState(0)   // 0–100 para a barra atual
  const [paused, setPaused]     = useState(false)
  const startRef   = useRef<number>(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const media  = campaign.media
  const item   = media[current] as CampaignMediaItem | undefined
  const total  = media.length
  const FPS    = 20
  const TICK   = 1000 / FPS

  // ── Registra visualização quando troca de slide ───────────────────────────
  useEffect(() => {
    if (!item) return
    recordCampaignView({
      campaignId: campaign.id, mediaId: item.id,
      portalId, companyId, macAddress: mac, ipAddress: ip,
      action: 'viewed', durationWatchedSec: 0,
    })
    startRef.current = Date.now()
  }, [current])

  // ── Progress bar ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!item) return
    setProgress(0)
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      if (paused) return
      const elapsed = Date.now() - startRef.current
      const pct     = Math.min((elapsed / (item.durationSec * 1000)) * 100, 100)
      setProgress(pct)
      if (pct >= 100) advance()
    }, TICK)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [current, paused, item])

  const advance = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const watched = Math.round((Date.now() - startRef.current) / 1000)
    if (item) {
      recordCampaignView({
        campaignId: campaign.id, mediaId: item.id,
        portalId, companyId, macAddress: mac, ipAddress: ip,
        action: current === total - 1 ? 'completed' : 'viewed',
        durationWatchedSec: watched,
      })
    }
    if (current < total - 1) {
      setCurrent(c => c + 1)
    } else {
      onFinish()
    }
  }, [current, total, item])

  function skip() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const watched = Math.round((Date.now() - startRef.current) / 1000)
    if (item) {
      recordCampaignView({
        campaignId: campaign.id, mediaId: item.id,
        portalId, companyId, macAddress: mac, ipAddress: ip,
        action: 'skipped', durationWatchedSec: watched,
      })
    }
    onFinish()
  }

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const rect  = e.currentTarget.getBoundingClientRect()
    const tapX  = e.clientX - rect.left
    const third = rect.width / 3
    if (tapX < third) {
      // Tap esquerdo → slide anterior
      if (current > 0) { setCurrent(c => c - 1); setProgress(0) }
    } else if (tapX > third * 2) {
      // Tap direito → próximo
      advance()
    }
    // Tap centro → toggle pause
    else setPaused(p => !p)
  }

  if (!item) { onFinish(); return null }

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col select-none"
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onClick={handleTap}
    >
      {/* ── Progress bars ── */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          display: 'flex', gap: 4, padding: '12px 12px 0',
        }}
      >
        {media.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.3)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 2,
                backgroundColor: '#fff',
                width: i < current ? '100%' : i === current ? `${progress}%` : '0%',
                transition: i === current ? 'none' : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* ── Skip button ── */}
      <button
        onClick={e => { e.stopPropagation(); skip() }}
        style={{
          position: 'absolute', top: 28, right: 16, zIndex: 20,
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 20, padding: '4px 14px',
          color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Pular →
      </button>

      {/* ── Media ── */}
      {item.type === 'video' ? (
        <video
          key={item.id}
          src={item.url}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onEnded={advance}
        />
      ) : (
        <img
          key={item.id}
          src={item.url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          draggable={false}
        />
      )}

      {/* ── Pause indicator ── */}
      {paused && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 20 }}>⏸</span>
          </div>
        </div>
      )}

      {/* ── Counter ── */}
      <div style={{
        position: 'absolute', bottom: 20, left: 0, right: 0,
        textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 11,
        pointerEvents: 'none',
      }}>
        {current + 1} / {total}
      </div>
    </div>
  )
}
