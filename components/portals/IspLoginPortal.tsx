'use client'

import { useState, useEffect, useRef } from 'react'
import { grantAndRedirect } from '@/lib/hotspot'
import {
  ispLogin,
  getPlansClient,
  initiatePayment,
  checkPaymentStatus,
  useFreePlan,
  redeemVoucher,
  submitLead,
  lookupLeadByCpf,
  type IspLoginResult,
  type InitiatePaymentResult,
} from '@/lib/api'
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
  BackButton,
  formatCpf,
  formatCpfCnpj,
  formatPhone,
  validateEmail,
  validateCpf,
  fmtDuration,
  fmtSpeed,
} from './shared'

type Step = 'cpf' | 'suspended' | 'lead' | 'plans' | 'pix' | 'voucher' | 'done'

export default function IspLoginPortal() {
  const { portal, companyId, mac, link, ip } = usePortal()
  const cfg = portal.config

  const [step, setStep]           = useState<Step>('cpf')
  const [cpfCnpjDigits, setCpfCnpj] = useState('')
  const [ispResult, setIspResult] = useState<IspLoginResult | null>(null)
  const [name, setName]           = useState('')
  const [leadCpfDigits, setLeadCpf] = useState('')
  const [email, setEmail]         = useState('')
  const [phoneDigits, setPhone]   = useState('')
  const [gender, setGender]       = useState('')
  const [plans, setPlans]         = useState<HotspotPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<HotspotPlan | null>(null)
  const [payment, setPayment]     = useState<InitiatePaymentResult | null>(null)
  const [polling, setPolling]     = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [voucherCode, setVoucherCode] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

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

  async function handleClientLogin() {
    const raw = cpfCnpjDigits.replace(/\D/g, '')
    if (raw.length < 11) { setError('CPF ou CNPJ inválido.'); return }
    if (raw.length === 11 && !validateCpf(raw)) { setError('CPF inválido. Verifique os dígitos.'); return }
    setLoading(true)
    setError('')
    const result = await ispLogin(portal.id, raw, mac, ip)
    setIspResult(result)
    if (result.suspended) { setLoading(false); setStep('suspended'); return }
    if (result.granted) {
      try {
        const creds = result.username ? { username: result.username, password: result.password! } : undefined
        await grantAndRedirect(companyId, mac, link, portal.id, creds)
        setStep('done')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Acesso autorizado mas não foi possível conectar. Tente novamente.')
      }
      setLoading(false)
      return
    }
    // ERP não encontrou — busca lead interno pelo CPF (somente para CPF de 11 dígitos)
    if (raw.length === 11) {
      const lookup = await lookupLeadByCpf(portal.id, raw)
      if (lookup.found) {
        if (lookup.name)   setName(lookup.name)
        if (lookup.email)  setEmail(lookup.email)
        if (lookup.phone)  setPhone(lookup.phone)
        if (lookup.gender) setGender(lookup.gender)
        setLeadCpf(raw)
        const fetched = await getPlansClient(companyId)
        setPlans(fetched.filter(p => p.active))
        setLoading(false)
        setStep('plans')
        return
      }
    }
    setLeadCpf(raw.length === 11 ? raw : '')
    setLoading(false)
    setStep('lead')
  }

  async function handleLeadSubmit() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    if (email && !validateEmail(email)) { setError('E-mail inválido.'); return }
    setLoading(true)
    setError('')
    try {
      await submitLead(portal.id, {
        name: name.trim(),
        cpf: leadCpfDigits || undefined,
        email: email || undefined,
        phone: phoneDigits || undefined,
        gender: gender || undefined,
        macAddress: mac || undefined,
        ipAddress: ip,
      })
    } catch { /* proceed */ }
    const fetched = await getPlansClient(companyId)
    setPlans(fetched.filter(p => p.active))
    setLoading(false)
    setStep('plans')
  }

  async function handleSelectPlan(plan: HotspotPlan) {
    setSelectedPlan(plan)
    setError('')
    if (plan.isFree) {
      setLoading(true)
      const result = await useFreePlan(portal.id, plan.id, mac, ip)
      setLoading(false)
      if (!result.granted) {
        setError(result.cooldown
          ? `Plano gratuito disponível novamente em ${result.availableAt ?? 'breve'}.`
          : result.error ?? 'Erro ao ativar plano.')
        return
      }
      setStep('done')
      await grantAndRedirect(companyId, mac, link, portal.id).catch(() => {})
      return
    }
    setLoading(true)
    const result = await initiatePayment(portal.id, plan.id, mac, ip,
      name || undefined, leadCpfDigits || undefined, email || undefined, phoneDigits || undefined)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setPayment(result)
    setStep('pix')
    startPolling(result.transactionId)
  }

  function startPolling(txId: string) {
    setPolling(true)
    pollRef.current = setInterval(async () => {
      const { status } = await checkPaymentStatus(txId)
      if (status === 'approved' || status === 'paid') {
        clearInterval(pollRef.current!)
        setPolling(false)
        setStep('done')
        await grantAndRedirect(companyId, mac, link, portal.id).catch(() => {})
      }
    }, 3000)
  }

  if (step === 'done') {
    return (
      <PortalPage {...pageProps}>
        <PortalSuccess title="Acesso liberado!" subtitle="Aproveite a internet." color={cfg.primaryColor} />
      </PortalPage>
    )
  }

  if (step === 'pix' && payment) {
    return (
      <PortalPage {...pageProps} title="Pagamento PIX">
        <p style={{ textAlign: 'center', color: '#6b7280', margin: '0 0 14px', fontSize: 18, fontWeight: 700 }}>
          R$ {Number(payment.amount).toFixed(2)}
        </p>
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
        <PortalButton color={cfg.buttonColor} onClick={async () => { await navigator.clipboard.writeText(payment.pixCopyPaste).catch(() => {}) }}>
          Copiar código PIX
        </PortalButton>
        {polling && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#6b7280', fontSize: 12, marginTop: 10 }}>
            <Spinner color="#9ca3af" size={14} />Aguardando pagamento…
          </div>
        )}
      </PortalPage>
    )
  }

  if (step === 'suspended') {
    const inv = ispResult?.invoice
    return (
      <PortalPage {...pageProps} title="Conta suspensa">
        <p style={{ textAlign: 'center', color: '#6b7280', margin: '0 0 14px', fontSize: 13 }}>
          Fatura em aberto. Pague para reativar o acesso.
        </p>
        {inv?.pixQr && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={inv.pixQr} alt="QR PIX fatura" style={{ maxWidth: 150, borderRadius: 8 }} />
          </div>
        )}
        {inv?.valor && (
          <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 20, color: '#dc2626', margin: '0 0 10px' }}>
            R$ {inv.valor.toFixed(2)}
          </p>
        )}
        {inv?.linhaDigitavel && (
          <div style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all', marginBottom: 12 }}>
            {inv.linhaDigitavel}
          </div>
        )}
        {!inv && (
          <p style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
            {ispResult?.error ?? 'Entre em contato com o provedor.'}
          </p>
        )}
        <BackButton onClick={() => { setStep('cpf'); setCpfCnpj(''); setIspResult(null) }} />
      </PortalPage>
    )
  }

  if (step === 'plans') {
    return (
      <PortalPage {...pageProps} title="Escolha um plano">
        {error && <ErrorBox message={error} />}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Spinner color="#9ca3af" size={26} />
          </div>
        )}
        {!loading && plans.map(plan => (
          <button key={plan.id} onClick={() => handleSelectPlan(plan)}
            style={{
              width: '100%', padding: '12px 14px', marginBottom: 10,
              border: `1.5px solid ${selectedPlan?.id === plan.id ? cfg.buttonColor : '#e5e7eb'}`,
              borderRadius: 10, backgroundColor: '#fff', cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>{plan.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  {fmtDuration(plan.durationMin)} · ↑{fmtSpeed(plan.bandwidthUp)} ↓{fmtSpeed(plan.bandwidthDown)}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: plan.isFree ? '#22c55e' : '#111' }}>
                {plan.isFree ? 'Grátis' : `R$ ${Number(plan.price).toFixed(2)}`}
              </div>
            </div>
          </button>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <BackButton onClick={() => setStep('cpf')} />
          <button onClick={() => setStep('voucher')}
            style={{ flex: 1, background: 'none', border: 'none', color: cfg.primaryColor, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '4px 0' }}>
            Tenho um voucher
          </button>
        </div>
      </PortalPage>
    )
  }

  if (step === 'voucher') {
    return (
      <PortalPage {...pageProps} title="Resgatar Voucher">
        {error && <ErrorBox message={error} />}
        <PortalInput label="Código do voucher" value={voucherCode} onChange={setVoucherCode} placeholder="XXXX-XXXX" disabled={loading} />
        <PortalButton color={cfg.buttonColor} onClick={async () => {
          if (!voucherCode.trim()) { setError('Digite o código do voucher.'); return }
          setLoading(true)
          setError('')
          const result = await redeemVoucher(portal.id, voucherCode.trim(), mac, ip)
          setLoading(false)
          if (!result.granted) { setError(result.error ?? 'Voucher inválido.'); return }
          setStep('done')
          await grantAndRedirect(companyId, mac, link, portal.id).catch(() => {})
        }} loading={loading} disabled={!voucherCode.trim()}>
          Resgatar
        </PortalButton>
        <BackButton onClick={() => setStep('plans')} />
      </PortalPage>
    )
  }

  if (step === 'lead') {
    return (
      <PortalPage {...pageProps} subtitle="Preencha seus dados para acessar">
        {error && <ErrorBox message={error} />}
        <PortalInput label="Nome *" value={name} onChange={setName} placeholder="Seu nome" disabled={loading} />
        <PortalInput label="CPF" value={formatCpf(leadCpfDigits)} onChange={v => setLeadCpf(v.replace(/\D/g, '').slice(0, 11))} placeholder="000.000.000-00" inputMode="numeric" disabled={loading} />
        <PortalInput label="Email" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" disabled={loading} />
        <PortalInput label="Telefone" value={formatPhone(phoneDigits)} onChange={v => setPhone(v.replace(/\D/g, '').slice(0, 11))} placeholder="(00) 00000-0000" inputMode="tel" disabled={loading} />
        <PortalGenderSelect value={gender} onChange={setGender} disabled={loading} />
        <PortalButton color={cfg.buttonColor} onClick={handleLeadSubmit} loading={loading} disabled={!name.trim()}>
          Escolher um plano
        </PortalButton>
        <BackButton onClick={() => { setCpfCnpj(''); setError(''); setStep('cpf') }} />
      </PortalPage>
    )
  }

  // step === 'cpf' — tela inicial, CPF-first
  return (
    <PortalPage {...pageProps} subtitle={cfg.subtitle ?? 'Digite seu CPF para continuar'}>
      {error && <ErrorBox message={error} />}
      <PortalInput
        label="CPF / CNPJ"
        value={formatCpfCnpj(cpfCnpjDigits)}
        onChange={v => { setCpfCnpj(v.replace(/\D/g, '').slice(0, 14)); setError('') }}
        placeholder="000.000.000-00"
        inputMode="numeric"
        disabled={loading}
      />
      <PortalButton
        color={cfg.buttonColor}
        onClick={handleClientLogin}
        loading={loading}
        disabled={cpfCnpjDigits.replace(/\D/g, '').length < 11}
      >
        {cfg.buttonText ?? 'Continuar'}
      </PortalButton>
    </PortalPage>
  )
}
