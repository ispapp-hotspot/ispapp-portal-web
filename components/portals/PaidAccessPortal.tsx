'use client'

import { useState, useEffect, useRef } from 'react'
import type { CaptivePortal } from '@/types'
import type { HotspotPlan } from '@/types'
import type { PortalCtx } from './shared'
import { PortalWrapper, PortalCard, PortalInput, PortalButton, PortalSuccess, PortalGenderSelect, formatCpf, formatPhone, validateEmail } from './shared'
import { submitLead, getPlans, initiatePayment, checkPaymentStatus } from '@/lib/api'
import { grantAndRedirect } from '@/lib/hotspot'

type Step = 'register' | 'plans' | 'payment' | 'done'

function fmtDuration(min: number) {
  if (min < 60)    return `${min} min`
  if (min < 1440)  return `${min / 60} hora${min / 60 > 1 ? 's' : ''}`
  if (min < 10080) return `${min / 1440} dia${min / 1440 > 1 ? 's' : ''}`
  return `${min / 10080} semana${min / 10080 > 1 ? 's' : ''}`
}

function fmtSpeed(kbps: number) {
  return kbps >= 1024 ? `${kbps / 1024}M` : `${kbps}K`
}

export default function PaidAccessPortal({ portal, ctx }: { portal: CaptivePortal; ctx: PortalCtx }) {
  const [step, setStep]         = useState<Step>('register')
  const [name, setName]         = useState('')
  const [cpf, setCpf]           = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [gender, setGender]     = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const [plans, setPlans]       = useState<HotspotPlan[]>([])
  const [plan, setPlan]         = useState<HotspotPlan | null>(null)

  const [txId, setTxId]         = useState('')
  const [pixCode, setPixCode]   = useState('')
  const [pixQr, setPixQr]       = useState('')
  const [amount, setAmount]     = useState(0)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'expired' | 'error'>('pending')
  const [lastPollStatus, setLastPollStatus] = useState<string>('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pri = portal.config.primaryColor ?? '#10b981'
  const btn = portal.config.buttonColor  ?? '#10b981'

  // ── Load plans ─────────────────────────────────────────────────────────────
  useEffect(() => {
    getPlans(ctx.companyId).then(all => setPlans(all.filter(p => !p.isFree && p.active)))
  }, [ctx.companyId])

  // ── Payment polling ─────────────────────────────────────────────────────────
  const companyId  = ctx.companyId
  const mac        = ctx.mac
  const link       = ctx.link
  const portalId   = ctx.portalId
  const isPreview  = ctx.isPreview

  useEffect(() => {
    if (step !== 'payment' || !txId || isPreview) return

    async function checkNow() {
      if (expiresAt && new Date() > expiresAt) {
        setPaymentStatus('expired')
        setLastPollStatus('expired')
        return true
      }
      let status = 'unknown'
      try {
        const res = await checkPaymentStatus(txId)
        status = res.status
      } catch (e) {
        status = 'fetch-error'
      }
      setLastPollStatus(status)
      if (status === 'approved' || status === 'manual_approved') {
        setPaymentStatus('approved')
        try {
          await grantAndRedirect(companyId, mac, link, portalId)
        } catch { /* redirect failed — still show done */ }
        setStep('done')
        return true
      }
      return false
    }

    // Start interval
    pollRef.current = setInterval(async () => {
      const done = await checkNow()
      if (done && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }, 3000)

    // On mobile: when user comes back from bank app, browser tab resumes —
    // fire an immediate check instead of waiting up to 3s for next interval
    function onVisible() {
      if (document.visibilityState === 'visible') {
        checkNow().then(done => {
          if (done && pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        })
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [step, txId, expiresAt, companyId, mac, link, portalId, isPreview])

  // ── Step: Register ──────────────────────────────────────────────────────────
  async function handleRegister() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    if (email.trim() && !validateEmail(email)) { setError('E-mail inválido.'); return }
    setError(''); setLoading(true)
    await submitLead(ctx.portalId, {
      name: name.trim(), cpf: cpf.trim() || undefined,
      email: email.trim() || undefined, phone: phone.trim() || undefined,
      gender: gender || undefined,
      macAddress: ctx.mac, ipAddress: ctx.ip,
    })
    setLoading(false)
    setStep('plans')
  }

  // ── Step: Plans ─────────────────────────────────────────────────────────────
  async function handleSelectPlan(selected: HotspotPlan) {
    setPlan(selected)
    setLoading(true)
    setError('')
    const result = await initiatePayment(ctx.portalId, {
      planId: selected.id,
      paymentMethod: 'pix',
      macAddress: ctx.mac,
      ipAddress: ctx.ip,
      leadName:  name.trim() || undefined,
      leadCpf:   cpf.trim()  || undefined,
      leadEmail: email.trim()|| undefined,
      leadPhone: phone.trim()|| undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setTxId(result.transactionId)
    setPixCode(result.pixCopyPaste)
    setPixQr(result.pixQrCodeBase64 ?? '')
    setAmount(result.amount)
    setExpiresAt(result.expiresAt ? new Date(result.expiresAt) : null)
    setPaymentStatus('pending')
    setStep('payment')
  }

  function handleCopyPix() {
    navigator.clipboard.writeText(pixCode)
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 2000)
  }

  // ── Render: Register ────────────────────────────────────────────────────────
  if (step === 'register') return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <PortalCard>
        <p className="text-sm font-semibold text-gray-700 text-center">Cadastro rápido</p>
        <PortalInput label="Nome completo" placeholder="Seu nome" value={name} onChange={setName} required
          icon={<UserIcon />} />
        <PortalInput label="CPF" placeholder="000.000.000-00" value={cpf} onChange={v => setCpf(formatCpf(v))}
          inputMode="numeric" icon={<IdIcon />} />
        <PortalInput label="E-mail" placeholder="seu@email.com" value={email} onChange={setEmail} type="email"
          icon={<MailIcon />} />
        <PortalInput label="Telefone" placeholder="(00) 00000-0000" value={phone} onChange={v => setPhone(formatPhone(v))}
          inputMode="tel" icon={<PhoneIcon />} />
        <PortalGenderSelect value={gender} onChange={setGender} />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <PortalButton color={btn} onClick={handleRegister} disabled={loading}>
          {loading ? <Spin /> : null}
          {loading ? 'Aguarde...' : 'Continuar para Planos'}
        </PortalButton>
      </PortalCard>
    </PortalWrapper>
  )

  // ── Render: Plans ───────────────────────────────────────────────────────────
  if (step === 'plans') return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          👋 Olá, {name.split(' ')[0]}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '4px 0 2px' }}>Escolha seu Plano</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Selecione o melhor plano para navegar</p>
      </div>
      {error && (
        <div style={{ backgroundColor: '#fee2e2', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
          {error}
        </div>
      )}
      {plans.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
          Nenhum plano disponível no momento.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          {plans.map(p => (
            <button
              key={p.id}
              onClick={() => !loading && handleSelectPlan(p)}
              disabled={loading}
              style={{
                width: '100%', backgroundColor: '#fff', borderRadius: 16,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 16,
                textAlign: 'left', border: `2px solid ${plan?.id === p.id ? pri : 'transparent'}`,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                transition: 'box-shadow 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#1f2937', fontSize: 17, margin: '0 0 2px' }}>
                    {fmtDuration(p.durationMin).toUpperCase()} DE INTERNET
                  </p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 8px' }}>{p.description || fmtDuration(p.durationMin) + ' de acesso'}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 11, backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: 99 }}>↓ {fmtSpeed(p.bandwidthDown)}</span>
                    <span style={{ fontSize: 11, backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: 99 }}>↑ {fmtSpeed(p.bandwidthUp)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: '0 0 8px' }}>
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>R$</span>{' '}
                    {Number(p.price).toFixed(2).replace('.', ',')}
                  </p>
                  <div style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#fff', backgroundColor: loading && plan?.id === p.id ? '#9ca3af' : btn, display: 'inline-block' }}>
                    {loading && plan?.id === p.id ? '...' : 'Escolher'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </PortalWrapper>
  )

  // ── Render: Payment ─────────────────────────────────────────────────────────
  if (step === 'payment' && plan) return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Finalizar Acesso</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          {plan.name}{' '}
          <span style={{ fontWeight: 600, color: '#fff' }}>| R$ {Number(amount).toFixed(2).replace('.', ',')}</span>
        </p>
      </div>
      <PortalCard>
        {paymentStatus === 'expired' ? (
          <>
            <p style={{ fontSize: 14, color: '#dc2626', textAlign: 'center', fontWeight: 600 }}>
              Tempo expirado. Gere um novo PIX.
            </p>
            <PortalButton color={btn} onClick={() => { setStep('plans'); setPlan(null) }}>
              Voltar aos Planos
            </PortalButton>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Pagamento via PIX
              </p>
              <ExpiryCountdown expiresAt={expiresAt} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {pixQr ? (
                <img
                  src={`data:image/png;base64,${pixQr}`}
                  alt="QR Code PIX"
                  style={{ width: 180, height: 180, borderRadius: 12, border: '1px solid #e5e7eb' }}
                />
              ) : (
                <div style={{ width: 180, height: 180, backgroundColor: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb', fontSize: 13, color: '#9ca3af' }}>
                  QR Code indisponível
                </div>
              )}
            </div>

            <button
              onClick={handleCopyPix}
              style={{ width: '100%', height: 48, borderRadius: 12, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fff', backgroundColor: '#1a1a1a', border: 'none', cursor: 'pointer' }}
            >
              {pixCopied ? '✓ Copiado!' : '📋 Copiar código PIX'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
              <Spin small />
              Aguardando confirmação de pagamento...
              {lastPollStatus && lastPollStatus !== 'pending' && (
                <span style={{ fontSize: 10, color: '#9ca3af' }}>({lastPollStatus})</span>
              )}
            </div>

            <button
              onClick={async () => {
                const { status } = await checkPaymentStatus(txId)
                setLastPollStatus(status)
                if (status === 'approved' || status === 'manual_approved') {
                  setPaymentStatus('approved')
                  try { await grantAndRedirect(companyId, mac, link, portalId) } catch {}
                  setStep('done')
                }
              }}
              style={{ width: '100%', height: 40, borderRadius: 10, fontWeight: 600, fontSize: 13, color: '#fff', backgroundColor: btn, border: 'none', cursor: 'pointer' }}
            >
              Já paguei — Verificar agora
            </button>

            <p style={{ fontSize: 11, textAlign: 'center', color: '#9ca3af', margin: 0 }}>
              Copie e cole no app do seu banco. O acesso é liberado automaticamente após o pagamento.
            </p>

            <button
              onClick={() => { setStep('plans'); setPlan(null) }}
              style={{ width: '100%', fontSize: 12, textAlign: 'center', color: '#9ca3af', textDecoration: 'underline', padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← Cancelar e voltar
            </button>
          </>
        )}
      </PortalCard>
    </PortalWrapper>
  )

  // ── Render: Done ────────────────────────────────────────────────────────────
  return (
    <PortalSuccess
      portal={portal}
      ctx={ctx}
      title="Acesso liberado!"
      subtitle="Seu pagamento foi confirmado. Aproveite a internet!"
    />
  )
}

function ExpiryCountdown({ expiresAt }: { expiresAt: Date | null }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      const m = Math.floor(diff / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setRemaining(`${m}:${s}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (!remaining) return null
  return <span style={{ fontSize: 12, color: remaining.startsWith('0') ? '#ef4444' : '#6b7280' }}>⏱ {remaining}</span>
}

function UserIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IdIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2m-2 4h2M6 10h6m-6 4h3"/></svg> }
function MailIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function PhoneIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-.85a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> }
function Spin({ small }: { small?: boolean }) {
  const s = small ? 'w-4 h-4' : 'w-5 h-5 mr-1'
  return <svg className={`animate-spin ${s} text-white`} viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
}
