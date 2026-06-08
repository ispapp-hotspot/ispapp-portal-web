'use client'

import { useState } from 'react'
import type { CaptivePortal } from '@/types'
import type { PortalCtx } from './shared'
import { PortalWrapper, PortalCard, PortalButton, PortalSuccess } from './shared'

export default function FreeAccessPortal({ portal, ctx }: { portal: CaptivePortal; ctx: PortalCtx }) {
  const [done, setDone] = useState(false)
  const pri = portal.config.primaryColor ?? '#10b981'
  const btn = portal.config.buttonColor ?? '#10b981'

  if (done) return <PortalSuccess portal={portal} ctx={ctx} subtitle="Aproveite a internet." />

  return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <PortalCard>
        <div className="text-center space-y-2 py-2">
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: pri + '18' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={pri} strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
          </div>
          <p className="text-sm text-gray-500">Acesso gratuito disponível</p>
        </div>
        <PortalButton color={btn} onClick={() => setDone(true)}>
          {portal.config.buttonText as string || 'Conectar à Internet'}
        </PortalButton>
      </PortalCard>
    </PortalWrapper>
  )
}
