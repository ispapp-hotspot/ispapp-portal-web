'use client'

import { useState } from 'react'
import { grantAndRedirect } from '@/lib/hotspot'
import { usePortal, PortalPage, PortalInput, PortalButton, ErrorBox, formatCpf } from './shared'

export default function LoginCpfPortal() {
  const { portal, companyId, mac, link, ip } = usePortal()
  const cfg = portal.config

  const [digits, setDigits]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const display = formatCpf(digits)

  async function handleSubmit() {
    if (digits.length < 11) { setError('CPF inválido. Digite 11 dígitos.'); return }
    setLoading(true)
    setError('')
    try {
      await grantAndRedirect(companyId, mac, link, portal.id, undefined, cfg.redirectUrl || undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao conectar. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <PortalPage
      primaryColor={cfg.primaryColor}
      backgroundColor={cfg.backgroundColor}
      logoUrl={cfg.logoUrl}
      title={cfg.welcomeText}
      subtitle={cfg.subtitle}
      companyId={companyId}
      termsText={cfg.termsText}
      mac={mac}
      ip={ip}
    >
      {error && <ErrorBox message={error} />}
      <PortalInput
        label="Seu CPF"
        value={display}
        onChange={v => setDigits(v.replace(/\D/g, '').slice(0, 11))}
        placeholder="Apenas números"
        inputMode="numeric"
        disabled={loading}
      />
      <PortalButton color={cfg.buttonColor} onClick={handleSubmit} loading={loading} disabled={digits.length < 11}>
        {cfg.buttonText ?? 'Conectar à Internet'}
      </PortalButton>
    </PortalPage>
  )
}
