'use client'

import { useState, useEffect, useRef } from 'react'
import { grantAndRedirect } from '@/lib/hotspot'
import {
  getPlansClient,
  initiatePayment,
  checkPaymentStatus,
  useFreePlan,
  lookupLeadByCpf,
  type InitiatePaymentResult,
} from '@/lib/api'
import { portalField } from '@/types'
import type { HotspotPlan } from '@/types'
import {
  usePortal,
  PortalPage,
  PortalInput,
  PortalButton,
  PortalGenderSelect,
  PortalSuccess,
  ErrorBox,
  Spinner,
  SectionTitle,
  BackButton,
  formatCpf,
  formatPhone,
  validateEmail,
  validateCpf,
  fmtDuration,
  fmtSpeed,
} from './shared'

type Step = 'cpf' | 'register' | 'plans' | 'pix' | 'done'

export default function PaidAccessPortal() {
  const { portal, companyId, mac, link, ip } = usePortal()
  const cfg = portal.config

  // PAID_ACCESS defaults: show all fields unless explicitly disabled
  const showEmail  = cfg.showEmail  !== false
  const showCpf    = cfg.showCpf    !== false
  const showPhone  = cfg.showPhone  !== false
  const showGender = portalField(cfg, 'gender')

  const [step, setStep]         = useState<Step>('cpf')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [cpfDigits, setCpf]     = useState('')
  const [phoneDigits, setPhone] = useState('')
  const [gender, setGender]     = useState('')
  const [plans, setPlans]       = useState<HotspotPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<HotspotPlan | null>(null)
  const [payment, setPayment]   = useState<InitiatePaymentResult | null>(null)
  const [payLoading, setPayLoading] = useState(false)
  const [polling, setPolling]   = useState(false)
  const [error, setError]       = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (pollRef.current)      clearInterval(pollRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }, [])

  const pageProps = {
    primaryColor: cfg.primaryColor,
    backgroundColor: cfg.backgroundColor,
    logoUrl: cfg.logoUrl,
    title: cfg.welcomeText,
    companyId,
    termsText: cfg.termsText,
    mac,
    ip,
  }

  async function handleCpfSubmit() {
    const cpfRaw = cpfDigits.replace(/\D/g, '')
    if (!validateCpf(cpfRaw)) { setError('CPF inválido. Verifique os dígitos.'); return }
    setError('')
    setLoadingPlans(true)
    const lookup = await lookupLeadByCpf(portal.id, cpfRaw)
    if (lookup.found) {
      if (lookup.name)   setName(lookup.name)
      if (lookup.email)  setEmail(lookup.email)
      if (lookup.phone)  setPhone(lookup.phone.replace(/\D/g, ''))
      if (lookup.gender) setGender(lookup.gender)
      const fetched = await getPlansClient(companyId)
      setPlans(fetched.filter(p => p.active))
      setLoadingPlans(false)
      setStep('plans')
      return
    }
    setLoadingPlans(false)
    setStep('register')
  }

  async function handleRegister() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    if (email && !validateEmail(email)) { setError('E-mail inválido.'); return }
    setError('')
    setLoadingPlans(true)
    const fetched = await getPlansClient(companyId)
    setPlans(fetched.filter(p => p.active))
    setLoadingPlans(false)
    setStep('plans')
  }

  async function handleSelectPlan(plan: HotspotPlan) {
    setSelectedPlan(plan)
    setError('')
    if (plan.isFree) {
      setPayLoading(true)
      const result = await useFreePlan(portal.id, plan.id, mac, ip)
      setPayLoading(false)
      if (!result.granted) {
        setError(result.cooldown
          ? `Plano gratuito disponível novamente em ${result.availableAt ?? 'breve'}.`
          : result.error ?? 'Erro ao ativar plano.')
        return
      }
      setStep('done')
      await grantAndRedirect(companyId, mac, link, portal.id, undefined, cfg.redirectUrl || undefined).catch(() => {})
      return
    }
    setPayLoading(true)
    const result = await initiatePayment(
      portal.id, plan.id, mac, ip,
      name || undefined, cpfDigits || undefined, email || undefined, phoneDigits || undefined,
    )
    setPayLoading(false)
    if (result.error) { setError(result.error); return }
    setPayment(result)
    setStep('pix')
    startPolling(result.transactionId)
    if (result.expiresAt) startCountdown(result.expiresAt)
  }

  function copyToClipboard(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
    } else {
      fallbackCopy(text)
    }
  }

  function fallbackCopy(text: string) {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.focus()
    el.select()
    try { document.execCommand('copy') } catch { /* silent */ }
    document.body.removeChild(el)
  }

  function startPolling(txId: string) {
    setPolling(true)
    pollRef.current = setInterval(async () => {
      const { status } = await checkPaymentStatus(txId)
      if (status === 'approved' || status === 'paid') {
        clearInterval(pollRef.current!)
        if (countdownRef.current) clearInterval(countdownRef.current)
        setPolling(false)
        setStep('done')
        await grantAndRedirect(companyId, mac, link, portal.id, undefined, cfg.redirectUrl || undefined).catch(() => {})
      }
    }, 3000)
  }

  function startCountdown(expiresAt: string) {
    const expiryMs = new Date(expiresAt).getTime()
    const nowMs    = Date.now()
    const total    = Math.max(0, Math.round((expiryMs - nowMs) / 1000))
    setTotalSeconds(total)
    setSecondsLeft(total)
    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiryMs - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) clearInterval(countdownRef.current!)
    }, 1000)
  }

  if (step === 'done') {
    return (
      <PortalPage {...pageProps} title="Acesso liberado!">
        <PortalSuccess title="Conectado!" subtitle="Aproveite a internet." color={cfg.primaryColor} />
      </PortalPage>
    )
  }

  if (step === 'pix' && payment) {
    const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
    const secs = String(secondsLeft % 60).padStart(2, '0')
    const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0
    const expired  = secondsLeft <= 0 && totalSeconds > 0
    const barColor = progress > 0.4 ? '#22c55e' : progress > 0.15 ? '#f59e0b' : '#ef4444'

    return (
      <PortalPage {...pageProps} title="Pagamento PIX">
        <p style={{ textAlign: 'center', color: '#6b7280', margin: '0 0 10px', fontSize: 18, fontWeight: 700 }}>
          R$ {Number(payment.amount).toFixed(2)}
        </p>

        {/* countdown + progress bar */}
        {totalSeconds > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                {expired ? 'PIX expirado' : 'Expira em'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: expired ? '#ef4444' : barColor }}>
                {expired ? '00:00' : `${mins}:${secs}`}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 99, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress * 100}%`,
                backgroundColor: barColor,
                borderRadius: 99,
                transition: 'width 1s linear, background-color 0.5s',
              }} />
            </div>
          </div>
        )}

        {error && <ErrorBox message={error} />}
        {payment.pixQrCodeBase64 && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/png;base64,${payment.pixQrCodeBase64}`} alt="QR PIX" style={{ maxWidth: 160, borderRadius: 8 }} />
          </div>
        )}
        <div style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all', marginBottom: 12, color: '#374151' }}>
          {payment.pixCopyPaste}
        </div>
        <PortalButton color={cfg.buttonColor} onClick={() => copyToClipboard(payment.pixCopyPaste)}>
          Copiar código PIX
        </PortalButton>
        {polling && !expired && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#6b7280', fontSize: 12, marginTop: 10 }}>
            <Spinner color="#9ca3af" size={14} />Aguardando pagamento…
          </div>
        )}
        {expired && (
          <p style={{ textAlign: 'center', color: '#ef4444', fontSize: 12, marginTop: 10 }}>
            O código PIX expirou. Volte e tente novamente.
          </p>
        )}
      </PortalPage>
    )
  }

  if (step === 'plans') {
    return (
      <PortalPage {...pageProps} title="Escolha seu Plano">
        {error && <ErrorBox message={error} />}
        {payLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Spinner color="#9ca3af" size={26} />
          </div>
        )}
        {!payLoading && plans.map(plan => (
          <button key={plan.id} onClick={() => handleSelectPlan(plan)}
            style={{
              width: '100%', padding: '12px 14px', marginBottom: 10,
              border: `1.5px solid ${selectedPlan?.id === plan.id ? cfg.buttonColor : '#e5e7eb'}`,
              borderRadius: 10, backgroundColor: '#fff', cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  {fmtDuration(plan.durationMin)}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: plan.isFree ? '#22c55e' : '#111' }}>
                {plan.isFree ? 'Grátis' : `R$ ${Number(plan.price).toFixed(2)}`}
              </div>
            </div>
          </button>
        ))}
        <BackButton onClick={() => setStep('cpf')} />
      </PortalPage>
    )
  }

  if (step === 'register') {
    return (
      <PortalPage {...pageProps}>
        {error && <ErrorBox message={error} />}
        <PortalInput label="Nome *" value={name} onChange={setName} placeholder="Seu nome" disabled={loadingPlans} />
        {showEmail && (
          <PortalInput label="Email" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" disabled={loadingPlans} />
        )}
        <PortalInput label="CPF" value={formatCpf(cpfDigits)} onChange={() => {}} placeholder="000.000.000-00" inputMode="numeric" disabled />
        {showPhone && (
          <PortalInput label="Telefone" value={formatPhone(phoneDigits)} onChange={v => setPhone(v.replace(/\D/g, '').slice(0, 11))} placeholder="(00) 00000-0000" inputMode="tel" disabled={loadingPlans} />
        )}
        {showGender && (
          <PortalGenderSelect value={gender} onChange={setGender} disabled={loadingPlans} />
        )}
        <PortalButton color={cfg.buttonColor} onClick={handleRegister} loading={loadingPlans} disabled={!name.trim()}>
          {cfg.buttonText ?? 'Ver planos'}
        </PortalButton>
        <BackButton onClick={() => { setError(''); setStep('cpf') }} />
      </PortalPage>
    )
  }

  // step === 'cpf' — tela inicial
  return (
    <PortalPage {...pageProps}>
      {error && <ErrorBox message={error} />}
      <PortalInput
        label="CPF"
        value={formatCpf(cpfDigits)}
        onChange={v => { setCpf(v.replace(/\D/g, '').slice(0, 11)); setError('') }}
        placeholder="000.000.000-00"
        inputMode="numeric"
        disabled={loadingPlans}
      />
      <PortalButton
        color={cfg.buttonColor}
        onClick={handleCpfSubmit}
        loading={loadingPlans}
        disabled={cpfDigits.replace(/\D/g, '').length < 11}
      >
        Continuar
      </PortalButton>
    </PortalPage>
  )
}
