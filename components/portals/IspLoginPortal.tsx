'use client'

import { useState, useEffect, useRef } from 'react'
import type { CaptivePortal, HotspotPlan } from '@/types'
import type { PortalCtx } from './shared'
import {
  PortalWrapper, PortalCard, PortalInput, PortalButton, PortalSuccess,
  PortalGenderSelect, formatCpf, formatCpfCnpj, formatPhone, validateEmail,
} from './shared'
import { ispLogin, submitLead, redeemVoucher, useFreePlan, initiatePayment, checkPaymentStatus, type IspInvoice, type InitiatePaymentResult } from '@/lib/api'
import { grantAndRedirect } from '@/lib/hotspot'

type Step = 'choose' | 'client' | 'lead' | 'plans' | 'payment' | 'voucher'


function fmtDuration(min: number) {
  if (min < 60)    return `${min} min`
  if (min < 1440)  return `${min / 60} hora${min / 60 > 1 ? 's' : ''}`
  if (min < 10080) return `${min / 1440} dia${min / 1440 > 1 ? 's' : ''}`
  return `${min / 10080} semana${min / 10080 > 1 ? 's' : ''}`
}

function fmtSpeed(kbps: number) {
  return kbps >= 1024 ? `${kbps / 1024}M` : `${kbps}K`
}

export default function IspLoginPortal({ portal, ctx, plans = [] }: { portal: CaptivePortal; ctx: PortalCtx; plans?: HotspotPlan[] }) {
  const [step,          setStep]          = useState<Step>('choose')
  const [leadName,      setLeadName]      = useState('')
  const [leadEmail,     setLeadEmail]     = useState('')
  const [leadCpf,       setLeadCpf]       = useState('')
  const [leadPhone,     setLeadPhone]     = useState('')
  const [plan,          setPlan]          = useState<HotspotPlan | null>(null)
  const [method,        setMethod]        = useState<'pix' | null>(null)
  const [pixCopied,     setPixCopied]     = useState(false)
  const [done,          setDone]          = useState(false)
  const [planError,     setPlanError]     = useState('')
  const [planLoading,   setPlanLoading]   = useState(false)
  const [paymentResult, setPaymentResult] = useState<InitiatePaymentResult | null>(null)
  const [paymentLoading,setPaymentLoading]= useState(false)
  const [paymentError,  setPaymentError]  = useState('')
  const [pollingCount,  setPollingCount]  = useState(0)
  const [secondsLeft,   setSecondsLeft]   = useState<number | null>(null)

  const pri = portal.config.primaryColor ?? '#10b981'
  const btn = portal.config.buttonColor  ?? '#10b981'

  function handleCopyPix() {
    const code = paymentResult?.pixCopyPaste ?? ''
    if (!code) return
    navigator.clipboard.writeText(code)
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 2000)
  }

  // Expiration countdown
  useEffect(() => {
    if (!paymentResult?.expiresAt || done) return
    const expiry = new Date(paymentResult.expiresAt).getTime()
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000))
      setSecondsLeft(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [paymentResult?.expiresAt, done])

  // Poll payment status
  useEffect(() => {
    if (!paymentResult?.transactionId || done || ctx.isPreview) return
    if (pollingCount >= 60) return // 5 min max
    const timer = setTimeout(async () => {
      const { status } = await checkPaymentStatus(paymentResult.transactionId)
      if (status === 'approved' || status === 'manual_approved') {
        try { await grantAndRedirect(ctx.companyId, ctx.mac, ctx.link, ctx.portalId) } catch { /* ignore redirect error, payment confirmed */ }
        setDone(true)
      } else {
        setPollingCount(c => c + 1)
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [paymentResult, pollingCount, done, ctx.isPreview])

  if (done) return <PortalSuccess portal={portal} ctx={ctx} title="Acesso liberado!" subtitle="Seu pagamento foi confirmado. Aproveite a internet!" />

  // ── Plans step ──────────────────────────────────────────────────────────────
  if (step === 'plans') {
    const sortedPlans = [...plans].sort((a, b) => {
      if (a.isFree && !b.isFree) return -1
      if (!a.isFree && b.isFree) return 1
      return Number(a.price) - Number(b.price)
    })

    return (
      <PortalWrapper portal={portal} ctx={ctx}>
        <div style={{ textAlign: 'center' }}>
          {leadName && <p style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)', margin: '0 0 2px' }}>👋 Olá, {leadName.split(' ')[0]}</p>}
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Escolha seu Plano</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Selecione o melhor plano para navegar</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          {sortedPlans.length === 0 && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Nenhum plano disponível no momento.</p>
          )}
          {planError && (
            <div style={{ padding: '10px 14px', borderRadius: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{planError}</p>
            </div>
          )}
          {sortedPlans.map(p => (
            <button key={p.id} disabled={planLoading} onClick={async () => {
              setPlan(p)
              setPlanError('')
              if (!p.isFree) { setStep('payment'); return }
              if (ctx.isPreview) { setDone(true); return }
              setPlanLoading(true)
              const result = await useFreePlan(ctx.portalId, { planId: p.id, macAddress: ctx.mac, ipAddress: ctx.ip })
              setPlanLoading(false)
              if (result.granted) {
                await grantAndRedirect(ctx.companyId, ctx.mac, ctx.link, ctx.portalId)
                setDone(true)
              } else { setPlanError(result.error ?? 'Não foi possível liberar o acesso.') }
            }}
              style={{ width: '100%', backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 16, textAlign: 'left', border: `2px solid ${p.isFree ? '#10b981' : 'transparent'}`, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <p style={{ fontWeight: 700, color: '#1f2937', fontSize: 17, margin: 0 }}>{p.name}</p>
                    {p.isFree && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', backgroundColor: '#10b981', padding: '1px 7px', borderRadius: 99 }}>GRÁTIS</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 8px' }}>{fmtDuration(p.durationMin)} de acesso</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 11, backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: 99 }}>↓ {fmtSpeed(p.bandwidthDown)}</span>
                    <span style={{ fontSize: 11, backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: 99 }}>↑ {fmtSpeed(p.bandwidthUp)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                  {p.isFree ? (
                    <p style={{ fontSize: 20, fontWeight: 700, color: '#10b981', margin: '0 0 8px' }}>Grátis</p>
                  ) : (
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: '0 0 8px' }}>
                      <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>R$</span>{' '}{Number(p.price).toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  <div style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#fff', backgroundColor: btn, display: 'inline-block' }}>Escolher</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Voucher option */}
        <button
          onClick={() => setStep('voucher')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1.5px dashed rgba(255,255,255,0.2)',
            background: 'none',
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
              <path d="M13 5v2m0 10v2M13 11v2"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Tenho um voucher</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Insira o código e conecte sem pagar</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </PortalWrapper>
    )
  }

  // ── Payment step ────────────────────────────────────────────────────────────
  if (step === 'payment' && plan) {
    // Show PIX payment details after initiation
    if (method === 'pix' && paymentResult && !paymentResult.error) return (
      <PortalWrapper portal={portal} ctx={ctx}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Finalizar Acesso</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{plan.name} | R$ {Number(plan.price).toFixed(2).replace('.', ',')}</p>
        </div>
        <PortalCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Pagamento via PIX</p>
            <button onClick={() => { setMethod(null); setPaymentResult(null); setPaymentError('') }} style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Alterar</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {paymentResult.pixQrCodeBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/png;base64,${paymentResult.pixQrCodeBase64}`} alt="QR PIX" width={160} height={160} style={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
            ) : paymentResult.pixCopyPaste ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(paymentResult.pixCopyPaste)}`} alt="QR PIX" width={160} height={160} style={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
            ) : null}
          </div>
          <button onClick={handleCopyPix}
            style={{ width: '100%', height: 48, borderRadius: 12, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fff', backgroundColor: '#1a1a1a', border: 'none', cursor: 'pointer' }}>
            {pixCopied ? '✓ Copiado!' : '📋 Copiar código PIX'}
          </button>
          <p style={{ fontSize: 12, textAlign: 'center', color: '#9ca3af', margin: 0 }}>Copie e cole no app do seu banco para pagar.</p>

          {/* Expiration timer */}
          {secondsLeft !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 10,
              backgroundColor: secondsLeft < 120 ? '#fef2f2' : '#fafafa',
              border: `1px solid ${secondsLeft < 120 ? '#fecaca' : '#e5e7eb'}`,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={secondsLeft < 120 ? '#ef4444' : '#6b7280'} strokeWidth="2.5" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <p style={{ fontSize: 11, color: secondsLeft < 120 ? '#dc2626' : '#6b7280', margin: 0 }}>
                {secondsLeft === 0
                  ? 'PIX expirado — gere um novo'
                  : `Expira em ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <p style={{ fontSize: 11, color: '#15803d', margin: 0 }}>Verificando pagamento automaticamente…</p>
          </div>
          <button onClick={() => setDone(true)} style={{ width: '100%', fontSize: 12, textAlign: 'center', color: '#9ca3af', textDecoration: 'underline', padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
            Já paguei →
          </button>
        </PortalCard>
      </PortalWrapper>
    )

    // Method selector
    return (
      <PortalWrapper portal={portal} ctx={ctx}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Finalizar Acesso</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{plan.name} | R$ {Number(plan.price).toFixed(2).replace('.', ',')}</p>
        </div>
        <PortalCard>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', margin: 0 }}>Escolha como pagar</p>

          {paymentError && (
            <div style={{ padding: '10px 14px', borderRadius: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{paymentError}</p>
            </div>
          )}

          <button
            onClick={async () => {
              if (ctx.isPreview) { setMethod('pix'); setPaymentResult({ transactionId: 'preview', pixCopyPaste: '00020126580014br.gov.bcb.pix', amount: Number(plan.price) }); return }
              setPaymentLoading(true)
              setPaymentError('')
              const result = await initiatePayment(ctx.portalId, {
                planId: plan.id,
                paymentMethod: 'pix',
                macAddress: ctx.mac,
                ipAddress: ctx.ip,
                leadName: leadName || undefined,
                leadEmail: leadEmail || undefined,
                leadCpf: leadCpf || undefined,
                leadPhone: leadPhone || undefined,
              })
              setPaymentLoading(false)
              if (result.error) {
                setPaymentError(result.error)
              } else {
                setMethod('pix')
                setPaymentResult(result)
                setPollingCount(0)
              }
            }}
            disabled={paymentLoading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', backgroundColor: '#fff', cursor: paymentLoading ? 'wait' : 'pointer', textAlign: 'left', opacity: paymentLoading ? 0.7 : 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
              {paymentLoading ? '⏳' : '⚡'}
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#1f2937', fontSize: 14, margin: '0 0 2px' }}>{paymentLoading ? 'Gerando PIX...' : 'Pagar via PIX'}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Aprovação instantânea</p>
            </div>
          </button>

          <button disabled
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', backgroundColor: '#fff', cursor: 'not-allowed', textAlign: 'left', opacity: 0.5 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>💳</div>
            <div>
              <p style={{ fontWeight: 600, color: '#1f2937', fontSize: 14, margin: '0 0 2px' }}>Cartão de Crédito</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Em breve</p>
            </div>
          </button>
          <button onClick={() => setStep('plans')} style={{ width: '100%', fontSize: 12, textAlign: 'center', color: '#9ca3af', textDecoration: 'underline', paddingTop: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Voltar para planos
          </button>
        </PortalCard>
      </PortalWrapper>
    )
  }

  // ── Voucher step ────────────────────────────────────────────────────────────
  if (step === 'voucher') return (
    <VoucherStep
      portal={portal}
      ctx={ctx}
      onBack={() => setStep('plans')}
      onGranted={() => setDone(true)}
    />
  )

  return (
    <>
      {step === 'choose'  && <ChooseStep portal={portal} ctx={ctx} onChoose={setStep} />}
      {step === 'client'  && <ClientStep portal={portal} ctx={ctx} onBack={() => setStep('choose')} />}
      {step === 'lead'    && <LeadStep   portal={portal} ctx={ctx} onBack={() => setStep('choose')} onDone={(name, email, phone, cpf) => { setLeadName(name); setLeadEmail(email ?? ''); setLeadPhone(phone ?? ''); setLeadCpf(cpf ?? ''); setStep('plans') }} />}
    </>
  )
}

// ── Step 1: Sou cliente / Não sou cliente ────────────────────────────────────

function ChooseStep({
  portal, ctx, onChoose,
}: { portal: CaptivePortal; ctx: PortalCtx; onChoose: (s: Step) => void }) {
  const pri = portal.config.primaryColor ?? '#10b981'
  const btn = portal.config.buttonColor  ?? '#10b981'

  return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <PortalCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Bem-vindo!
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            Você já é cliente do provedor?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => onChoose('client')}
            style={{
              width: '100%', height: 52, borderRadius: 14,
              backgroundColor: btn, color: '#fff',
              fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: `0 4px 16px ${btn}40`,
            }}
          >
            <UserCheckIcon color="#fff" />
            Sim, sou cliente
          </button>

          <button
            onClick={() => onChoose('lead')}
            style={{
              width: '100%', height: 52, borderRadius: 14,
              backgroundColor: 'transparent', color: '#374151',
              fontWeight: 600, fontSize: 15,
              border: '1.5px solid #e5e7eb', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <UserPlusIcon color="#9ca3af" />
            Não, quero me cadastrar
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
          Clientes com contrato ativo têm acesso imediato à internet.
        </p>
      </PortalCard>
    </PortalWrapper>
  )
}

// ── Step 2a: Cliente — login por CPF/CNPJ ────────────────────────────────────

function ClientStep({
  portal, ctx, onBack,
}: { portal: CaptivePortal; ctx: PortalCtx; onBack: () => void }) {
  const [cpf,       setCpf]       = useState('')
  const [digits,    setDigits]    = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [invoice,   setInvoice]   = useState<IspInvoice | null>(null)
  const [suspended, setSuspended] = useState(false)

  const btn = portal.config.buttonColor ?? '#10b981'

  async function handleSubmit() {
    const d = cpf.replace(/\D/g, '')
    if (d.length !== 11 && d.length !== 14) {
      setError('CPF ou CNPJ inválido.')
      return
    }
    setError('')
    setLoading(true)

    if (ctx.isPreview) {
      await new Promise(r => setTimeout(r, 900))
      setLoading(false)
      setDone(true)
      return
    }

    const result = await ispLogin(ctx.portalId, { cpf: d, macAddress: ctx.mac, ipAddress: ctx.ip })
    setLoading(false)

    if (result.granted) {
      try {
        await grantAndRedirect(ctx.companyId, ctx.mac, ctx.link, ctx.portalId)
      } catch {
        setError('Contrato ativo, mas não foi possível liberar o acesso. Tente novamente.')
        return
      }
      setDone(true)
    } else if (result.suspended) {
      setDigits(d)
      setSuspended(true)
      setInvoice(result.invoice ?? null)
      setError(result.error ?? 'Contrato suspenso.')
    } else {
      setError(result.error ?? 'Nenhum contrato ativo encontrado. Verifique o CPF ou entre em contato com o provedor.')
    }
  }

  if (done) {
    return (
      <PortalSuccess
        portal={portal}
        ctx={ctx}
        title="Acesso liberado!"
        subtitle="Contrato verificado. Aproveite a internet."
      />
    )
  }

  if (suspended) {
    return (
      <SuspendedInvoiceStep
        portal={portal}
        ctx={ctx}
        invoice={invoice}
        cpf={digits}
        onGranted={() => setDone(true)}
        onBack={() => { setSuspended(false); setError(''); setCpf(''); setDigits('') }}
      />
    )
  }

  return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <PortalCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}
          >
            <BackIcon />
          </button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 }}>Área do Cliente</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Digite o CPF ou CNPJ do titular</p>
          </div>
        </div>

        <PortalInput
          label="CPF / CNPJ"
          placeholder="000.000.000-00 ou 00.000.000/0000-00"
          inputMode="numeric"
          value={cpf}
          onChange={v => setCpf(formatCpfCnpj(v))}
          icon={<ContractIcon />}
        />

        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '10px 12px', borderRadius: 10,
            backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <p style={{ fontSize: 12, color: '#dc2626', margin: 0, lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        <PortalButton color={btn} onClick={handleSubmit} disabled={loading}>
          {loading ? <Spin /> : null}
          {loading ? 'Verificando contrato...' : 'Verificar e Conectar'}
        </PortalButton>
      </PortalCard>
    </PortalWrapper>
  )
}

// ── Step 2c: Contrato suspenso — fatura para pagamento ───────────────────────

const POLL_INTERVAL = 15

function SuspendedInvoiceStep({
  portal, ctx, invoice, cpf, onGranted, onBack,
}: {
  portal: CaptivePortal; ctx: PortalCtx; invoice: IspInvoice | null
  cpf: string; onGranted: () => void; onBack: () => void
}) {
  const [copied,    setCopied]    = useState(false)
  const [countdown, setCountdown] = useState(POLL_INTERVAL)
  const pri = portal.config.primaryColor ?? '#10b981'

  const countdownRef = useRef(POLL_INTERVAL)
  const onGrantedRef = useRef(onGranted)
  onGrantedRef.current = onGranted

  useEffect(() => {
    if (ctx.isPreview || !cpf) return

    const tick = setInterval(() => {
      countdownRef.current -= 1
      setCountdown(countdownRef.current)

      if (countdownRef.current <= 0) {
        countdownRef.current = POLL_INTERVAL
        setCountdown(POLL_INTERVAL)
        ispLogin(ctx.portalId, { cpf, macAddress: ctx.mac, ipAddress: ctx.ip }).then(async result => {
          if (result.granted) {
            try { await grantAndRedirect(ctx.companyId, ctx.mac, ctx.link, ctx.portalId) } catch { /* ignore */ }
            onGrantedRef.current()
          }
        })
      }
    }, 1000)

    return () => clearInterval(tick)
  }, [cpf, ctx.isPreview, ctx.portalId, ctx.mac, ctx.ip])

  function copyPix() {
    const code = invoice?.pixQr ?? invoice?.linhaDigitavel ?? ''
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const formatCurrency = (v?: number) =>
    v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null

  const formatDate = (s?: string) => {
    if (!s) return null
    const d = new Date(s.includes('T') ? s : s + 'T00:00:00')
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR')
  }

  const pixCode = invoice?.pixQr ?? invoice?.linhaDigitavel

  return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <PortalCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}
          >
            <BackIcon />
          </button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 }}>Fatura em aberto</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Pague para reconectar à internet</p>
          </div>
        </div>

        {/* Warning banner */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 14px', borderRadius: 12,
          backgroundColor: '#fff7ed', border: '1px solid #fed7aa',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#c2410c', margin: '0 0 2px' }}>
              Contrato suspenso por inadimplência
            </p>
            {(invoice?.valor || invoice?.vencimento) && (
              <p style={{ fontSize: 11, color: '#ea580c', margin: 0 }}>
                {formatCurrency(invoice?.valor)}
                {invoice?.vencimento ? ` · Venc. ${formatDate(invoice?.vencimento)}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* QR Code */}
        {invoice?.pixQr && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Escaneie o QR code para pagar via PIX</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(invoice.pixQr)}`}
              alt="QR Code PIX"
              width={160}
              height={160}
              style={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
          </div>
        )}

        {/* Copy button */}
        {pixCode && (
          <button
            onClick={copyPix}
            style={{
              width: '100%', height: 44, borderRadius: 12,
              backgroundColor: copied ? '#ecfdf5' : '#f3f4f6',
              border: `1.5px solid ${copied ? '#6ee7b7' : '#e5e7eb'}`,
              color: copied ? '#065f46' : '#374151',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Copiado!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copiar código PIX
              </>
            )}
          </button>
        )}

        {/* No invoice available */}
        {!pixCode && !invoice?.pixQr && (
          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 }}>
            Entre em contato com seu provedor para regularizar o contrato.
          </p>
        )}

        {/* Polling indicator */}
        {!ctx.isPreview && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 10,
            backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <p style={{ fontSize: 11, color: '#15803d', margin: 0 }}>
              Verificando pagamento em <strong>{countdown}s</strong>…
            </p>
          </div>
        )}
      </PortalCard>
    </PortalWrapper>
  )
}

// ── Step 2b: Não cliente — cadastro de lead ───────────────────────────────────

function LeadStep({
  portal, ctx, onBack, onDone,
}: { portal: CaptivePortal; ctx: PortalCtx; onBack: () => void; onDone: (name: string, email?: string, phone?: string, cpf?: string) => void }) {
  const [name,   setName]   = useState('')
  const [cpf,    setCpf]    = useState('')
  const [email,  setEmail]  = useState('')
  const [phone,  setPhone]  = useState('')
  const [gender, setGender] = useState('')
  const [error,  setError]  = useState('')
  const [loading, setLoading] = useState(false)

  const btn = portal.config.buttonColor ?? '#10b981'

  async function handleSubmit() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    if (email.trim() && !validateEmail(email)) { setError('E-mail inválido.'); return }
    if (!email.trim() && !phone.trim()) { setError('Informe pelo menos e-mail ou telefone.'); return }
    setError('')
    setLoading(true)

    await submitLead(ctx.portalId, {
      name:       name.trim(),
      cpf:        cpf.trim() || undefined,
      email:      email.trim() || undefined,
      phone:      phone.trim() || undefined,
      gender:     gender || undefined,
      macAddress: ctx.mac,
      ipAddress:  ctx.ip,
    })
    setLoading(false)
    onDone(name.trim(), email.trim() || undefined, phone.trim() || undefined, cpf.trim() || undefined)
  }

  return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <PortalCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}
          >
            <BackIcon />
          </button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 }}>Cadastro Rápido</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Preencha para ganhar acesso gratuito</p>
          </div>
        </div>

        <PortalInput
          label="Nome completo"
          placeholder="Seu nome"
          value={name}
          onChange={setName}
          required
          icon={<UserIcon />}
        />
        <PortalInput
          label="CPF"
          placeholder="000.000.000-00"
          inputMode="numeric"
          value={cpf}
          onChange={v => setCpf(formatCpf(v))}
          icon={<IdIcon />}
        />
        <PortalInput
          label="E-mail"
          placeholder="seu@email.com"
          type="email"
          value={email}
          onChange={setEmail}
          icon={<MailIcon />}
        />
        <PortalInput
          label="Telefone"
          placeholder="(00) 00000-0000"
          inputMode="tel"
          value={phone}
          onChange={v => setPhone(formatPhone(v))}
          icon={<PhoneIcon />}
        />
        <PortalGenderSelect value={gender} onChange={setGender} />

        {error && (
          <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', margin: 0 }}>{error}</p>
        )}

        <PortalButton color={btn} onClick={handleSubmit} disabled={loading}>
          {loading ? <Spin /> : null}
          {loading ? 'Enviando...' : 'Escolher um plano'}
        </PortalButton>
      </PortalCard>
    </PortalWrapper>
  )
}

// ── Step: Resgatar Voucher ───────────────────────────────────────────────────

function VoucherStep({
  portal, ctx, onBack, onGranted,
}: { portal: CaptivePortal; ctx: PortalCtx; onBack: () => void; onGranted: () => void }) {
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const btn = portal.config.buttonColor ?? '#10b981'

  async function handleSubmit() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { setError('Digite o código do voucher.'); return }
    setError('')
    setLoading(true)

    if (ctx.isPreview) {
      await new Promise(r => setTimeout(r, 800))
      setLoading(false)
      onGranted()
      return
    }

    const result = await redeemVoucher(ctx.portalId, {
      code: trimmed,
      macAddress: ctx.mac,
      ipAddress:  ctx.ip,
    })
    setLoading(false)

    if (result.granted) {
      await grantAndRedirect(ctx.companyId, ctx.mac, ctx.link, ctx.portalId)
      onGranted()
    } else {
      setError(result.error ?? 'Voucher inválido ou já utilizado.')
    }
  }

  return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <PortalCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}
          >
            <BackIcon />
          </button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 }}>Resgatar Voucher</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Digite o código para liberar o acesso</p>
          </div>
        </div>

        <PortalInput
          label="Código do voucher"
          placeholder="Ex: ABC12345"
          value={code}
          onChange={v => setCode(v.toUpperCase())}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          }
        />

        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '10px 12px', borderRadius: 10,
            backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <p style={{ fontSize: 12, color: '#dc2626', margin: 0, lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        <PortalButton color={btn} onClick={handleSubmit} disabled={loading}>
          {loading ? <Spin /> : null}
          {loading ? 'Verificando...' : 'Resgatar acesso'}
        </PortalButton>
      </PortalCard>
    </PortalWrapper>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

function UserCheckIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <polyline points="16 11 18 13 22 9"/>
    </svg>
  )
}

function UserPlusIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="22" y1="11" x2="16" y2="11"/>
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

function ContractIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function IdIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2m-2 4h2M6 10h6m-6 4h3"/></svg>
}

function UserIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}

function MailIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
}

function PhoneIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-.85a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
}

function Spin() {
  return (
    <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}
