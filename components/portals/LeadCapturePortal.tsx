'use client'

import { useState } from 'react'
import { grantAndRedirect } from '@/lib/hotspot'
import { submitLead } from '@/lib/api'
import { portalField } from '@/types'
import {
  usePortal,
  PortalPage,
  PortalInput,
  PortalButton,
  PortalGenderSelect,
  PortalSuccess,
  ErrorBox,
  formatCpf,
  formatPhone,
  validateEmail,
} from './shared'

export default function LeadCapturePortal() {
  const { portal, companyId, mac, link, ip } = usePortal()
  const cfg = portal.config

  const showCpf    = portalField(cfg, 'cpf')
  const showEmail  = portalField(cfg, 'email')
  const showPhone  = portalField(cfg, 'phone')
  const showGender = portalField(cfg, 'gender')

  const [name, setName]         = useState('')
  const [cpfDigits, setCpf]     = useState('')
  const [email, setEmail]       = useState('')
  const [phoneDigits, setPhone] = useState('')
  const [gender, setGender]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  function validate(): string | null {
    if (!name.trim()) return 'Nome é obrigatório.'
    if (showCpf && cpfDigits.length > 0 && cpfDigits.length < 11) return 'CPF inválido.'
    if (showEmail && email && !validateEmail(email)) return 'E-mail inválido.'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    try {
      await submitLead(portal.id, {
        name: name.trim(),
        cpf:    cpfDigits   || undefined,
        email:  email       || undefined,
        phone:  phoneDigits || undefined,
        gender: gender      || undefined,
        macAddress: mac     || undefined,
        ipAddress:  ip,
      })
      setDone(true)
      await grantAndRedirect(companyId, mac, link, portal.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar. Tente novamente.')
      setLoading(false)
    }
  }

  const pageProps = {
    primaryColor: cfg.primaryColor,
    backgroundColor: cfg.backgroundColor,
    logoUrl: cfg.logoUrl,
    title: cfg.welcomeText,
    subtitle: cfg.subtitle,
    companyId,
    termsText: cfg.termsText,
    mac,
    ip,
  }

  if (done) {
    return (
      <PortalPage {...pageProps}>
        <PortalSuccess title="Conectado!" subtitle="Aproveite a internet." color={cfg.primaryColor} />
      </PortalPage>
    )
  }

  return (
    <PortalPage {...pageProps}>
      {error && <ErrorBox message={error} />}
      <PortalInput label="Nome *" value={name} onChange={setName} placeholder="Seu nome" disabled={loading} />
      {showCpf && (
        <PortalInput
          label="CPF"
          value={formatCpf(cpfDigits)}
          onChange={v => setCpf(v.replace(/\D/g, '').slice(0, 11))}
          placeholder="000.000.000-00"
          inputMode="numeric"
          disabled={loading}
        />
      )}
      {showEmail && (
        <PortalInput label="Email" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" disabled={loading} />
      )}
      {showPhone && (
        <PortalInput
          label="Telefone"
          value={formatPhone(phoneDigits)}
          onChange={v => setPhone(v.replace(/\D/g, '').slice(0, 11))}
          placeholder="(00) 00000-0000"
          inputMode="tel"
          disabled={loading}
        />
      )}
      {showGender && (
        <PortalGenderSelect value={gender} onChange={setGender} disabled={loading} />
      )}
      <PortalButton color={cfg.buttonColor} onClick={handleSubmit} loading={loading} disabled={!name.trim()}>
        {cfg.buttonText ?? 'Conectar à Internet'}
      </PortalButton>
    </PortalPage>
  )
}
