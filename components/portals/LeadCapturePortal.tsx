'use client'

import { useState } from 'react'
import type { CaptivePortal } from '@/types'
import type { PortalCtx } from './shared'
import { PortalWrapper, PortalCard, PortalInput, PortalButton, PortalSuccess, PortalGenderSelect, formatCpf, formatPhone, validateEmail } from './shared'
import { submitLead } from '@/lib/api'

export default function LeadCapturePortal({ portal, ctx }: { portal: CaptivePortal; ctx: PortalCtx }) {
  const [name,   setName]   = useState('')
  const [cpf,    setCpf]    = useState('')
  const [email,  setEmail]  = useState('')
  const [phone,  setPhone]  = useState('')
  const [gender, setGender] = useState('')
  const [error,  setError]  = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const btnColor = portal.config.buttonColor ?? '#10b981'
  const showCpf   = portal.config.showCpf   !== false
  const showEmail = portal.config.showEmail  !== false
  const showPhone = portal.config.showPhone  !== false

  async function handleSubmit() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    if (showEmail && email.trim() && !validateEmail(email)) {
      setError('E-mail inválido.'); return
    }
    if (showEmail && showPhone && !email.trim() && !phone.trim()) {
      setError('Informe pelo menos e-mail ou telefone.'); return
    }
    setError(''); setLoading(true)
    const ok = await submitLead(ctx.portalId, {
      name: name.trim(), cpf: cpf.trim() || undefined,
      email: email.trim() || undefined, phone: phone.trim() || undefined,
      gender: gender || undefined,
      macAddress: ctx.mac, ipAddress: ctx.ip,
    })
    setLoading(false)
    if (ok || ctx.isPreview) setDone(true)
    else setError('Erro ao conectar. Tente novamente.')
  }

  if (done) return <PortalSuccess portal={portal} ctx={ctx} />

  return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <PortalCard>
        <PortalInput label="Nome" placeholder="Seu nome completo" value={name} onChange={setName} required icon={<UserIcon />} />
        {showCpf   && <PortalInput label="CPF"      placeholder="000.000.000-00"  value={cpf}   onChange={v => setCpf(formatCpf(v))}     inputMode="numeric" icon={<IdIcon />} />}
        {showEmail && <PortalInput label="Email"     placeholder="seu@email.com"   value={email} onChange={setEmail}                           type="email"        icon={<MailIcon />} />}
        {showPhone && <PortalInput label="Telefone"  placeholder="(00) 00000-0000" value={phone} onChange={v => setPhone(formatPhone(v))}   inputMode="tel"     icon={<PhoneIcon />} />}
        <PortalGenderSelect value={gender} onChange={setGender} />
        {(showEmail || showPhone) && (
          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>Informe pelo menos telefone ou email</p>
        )}
        {error && <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{error}</p>}
        <PortalButton color={btnColor} onClick={handleSubmit} disabled={loading} type="button">
          {loading ? <Spinner /> : null}
          {loading ? 'Conectando...' : (portal.config.buttonText as string || 'Conectar à Internet')}
        </PortalButton>
      </PortalCard>
    </PortalWrapper>
  )
}


// ── Mini icons ────────────────────────────────────────────────────────────────
function UserIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IdIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2m-2 4h2M6 10h6m-6 4h3"/></svg> }
function MailIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function PhoneIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-.85a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> }
function Spinner() { return <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> }
