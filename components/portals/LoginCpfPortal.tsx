'use client'

import { useState } from 'react'
import type { CaptivePortal } from '@/types'
import type { PortalCtx } from './shared'
import { PortalWrapper, PortalCard, PortalInput, PortalButton, PortalSuccess, formatCpf } from './shared'

export default function LoginCpfPortal({ portal, ctx }: { portal: CaptivePortal; ctx: PortalCtx }) {
  const [cpf,   setCpf]   = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]   = useState(false)

  const btnColor = portal.config.buttonColor ?? '#10b981'

  async function handleSubmit() {
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) { setError('CPF inválido.'); return }
    setError(''); setLoading(true)
    await new Promise(r => setTimeout(r, 800)) // simula validação
    setLoading(false)
    if (ctx.isPreview) { setDone(true); return }
    setDone(true)
  }

  if (done) return <PortalSuccess portal={portal} ctx={ctx} title="Acesso liberado!" />

  return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <PortalCard>
        <PortalInput
          label="Seu CPF"
          placeholder="000.000.000-00"
          inputMode="numeric"
          value={cpf}
          onChange={v => setCpf(formatCpf(v))}
          icon={<IdIcon />}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <PortalButton color={btnColor} onClick={handleSubmit} disabled={loading}>
          {loading
            ? <><Spin /> Verificando...</>
            : <>{portal.config.buttonText as string || 'Acessar Internet'} <Arrow /></>
          }
        </PortalButton>
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Consultaremos seus dados para validar o acesso.
        </p>
      </PortalCard>
    </PortalWrapper>
  )
}

function IdIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2m-2 4h2M6 10h6m-6 4h3"/></svg> }
function Spin()    { return <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> }
function Arrow()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> }
