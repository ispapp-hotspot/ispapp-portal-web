'use client'

import { useState } from 'react'
import { grantAndRedirect } from '@/lib/hotspot'
import { usePortal, PortalPage, PortalButton, WifiIcon, ErrorBox } from './shared'

export default function FreeAccessPortal() {
  const { portal, companyId, mac, link, ip } = usePortal()
  const cfg = portal.config

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleConnect() {
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
      <PortalButton color={cfg.buttonColor} onClick={handleConnect} loading={loading}>
        <WifiIcon size={16} color="#fff" />
        {cfg.buttonText ?? 'Conectar'}
      </PortalButton>
    </PortalPage>
  )
}
