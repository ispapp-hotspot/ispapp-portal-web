'use client'

import { useState } from 'react'
import type { CaptivePortal } from '@/types'
import type { PortalCtx } from './shared'
import { PortalWrapper, PortalCard, PortalInput, PortalButton, PortalSuccess, PortalGenderSelect, formatCpf, formatPhone, validateEmail } from './shared'
import { submitLead } from '@/lib/api'

type Step = 'register' | 'plans' | 'payment' | 'done'

const MOCK_PLANS = [
  { id: '1', name: '1 Hora',         price: 2,  durationMin: 60,   bandwidthDown: 10240, bandwidthUp: 5120 },
  { id: '2', name: '24 Horas',       price: 10, durationMin: 1440, bandwidthDown: 20480, bandwidthUp: 10240 },
  { id: '3', name: '7 Dias',         price: 30, durationMin: 10080,bandwidthDown: 20480, bandwidthUp: 10240 },
]

function fmtDuration(min: number) {
  if (min < 60)   return `${min} min`
  if (min < 1440) return `${min / 60} hora${min / 60 > 1 ? 's' : ''}`
  if (min < 10080)return `${min / 1440} dia${min / 1440 > 1 ? 's' : ''}`
  return `${min / 10080} semana${min / 10080 > 1 ? 's' : ''}`
}

function fmtSpeed(kbps: number) {
  return kbps >= 1024 ? `${kbps / 1024}M` : `${kbps}K`
}

export default function PaidAccessPortal({ portal, ctx }: { portal: CaptivePortal; ctx: PortalCtx }) {
  const [step, setStep]       = useState<Step>('register')
  const [name,   setName]      = useState('')
  const [cpf,    setCpf]       = useState('')
  const [email,  setEmail]     = useState('')
  const [phone,  setPhone]     = useState('')
  const [gender, setGender]    = useState('')
  const [error,  setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan]       = useState<typeof MOCK_PLANS[0] | null>(null)
  const [method, setMethod]   = useState<'pix' | 'card' | null>(null)
  const [pixCopied, setPixCopied] = useState(false)

  const pri = portal.config.primaryColor ?? '#10b981'
  const btn = portal.config.buttonColor  ?? '#10b981'
  const MOCK_PIX = '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000'

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

  function handleCopyPix() {
    navigator.clipboard.writeText(MOCK_PIX)
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 2000)
  }

  // ── Step: Register ────────────────────────────────────────────────────────
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

  // ── Step: Plans ───────────────────────────────────────────────────────────
  if (step === 'plans') return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          👋 Olá, {name.split(' ')[0]}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '4px 0 2px' }}>Escolha seu Plano</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Selecione o melhor plano para navegar</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        {MOCK_PLANS.map(p => (
          <button
            key={p.id}
            onClick={() => { setPlan(p); setStep('payment') }}
            style={{
              width: '100%', backgroundColor: '#fff', borderRadius: 16,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 16,
              textAlign: 'left', border: `2px solid ${plan?.id === p.id ? pri : 'transparent'}`,
              cursor: 'pointer', transition: 'box-shadow 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 700, color: '#1f2937', fontSize: 17, margin: '0 0 2px' }}>
                  {fmtDuration(p.durationMin).toUpperCase()} DE INTERNET
                </p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 8px' }}>{fmtDuration(p.durationMin)} de acesso</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: 99 }}>↓ {fmtSpeed(p.bandwidthDown)}</span>
                  <span style={{ fontSize: 11, backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: 99 }}>↑ {fmtSpeed(p.bandwidthUp)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: '0 0 8px' }}>
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>R$</span>{' '}
                  {p.price.toFixed(2).replace('.', ',')}
                </p>
                <div style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#fff', backgroundColor: btn, display: 'inline-block' }}>
                  Escolher
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </PortalWrapper>
  )

  // ── Step: Payment ─────────────────────────────────────────────────────────
  if (step === 'payment' && plan) {
    if (method === 'pix') return (
      <PortalWrapper portal={portal} ctx={ctx}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Finalizar Acesso</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            {plan.name}{' '}
            <span style={{ fontWeight: 600, color: '#fff' }}>| R$ {plan.price.toFixed(2).replace('.', ',')}</span>
          </p>
        </div>
        <PortalCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Pagamento via PIX
            </p>
            <button onClick={() => setMethod(null)} style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
              Alterar
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 160, height: 160, backgroundColor: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}>
              <QrIcon />
            </div>
          </div>
          <button
            onClick={handleCopyPix}
            style={{ width: '100%', height: 48, borderRadius: 12, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fff', backgroundColor: '#1a1a1a', border: 'none', cursor: 'pointer' }}
          >
            {pixCopied ? '✓ Copiado!' : '📋 Copiar código PIX'}
          </button>
          <p style={{ fontSize: 12, textAlign: 'center', color: '#9ca3af', margin: 0 }}>Copie e cole no app do seu banco para pagar.</p>
          <button onClick={() => setStep('done')} style={{ width: '100%', fontSize: 12, textAlign: 'center', color: '#9ca3af', textDecoration: 'underline', padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
            Já paguei →
          </button>
        </PortalCard>
      </PortalWrapper>
    )

    return (
      <PortalWrapper portal={portal} ctx={ctx}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Finalizar Acesso</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            {plan.name} | R$ {plan.price.toFixed(2).replace('.', ',')}
          </p>
        </div>
        <PortalCard>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', margin: 0 }}>
            Escolha como pagar
          </p>
          <button
            onClick={() => setMethod('pix')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', backgroundColor: '#fff', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>⚡</div>
            <div>
              <p style={{ fontWeight: 600, color: '#1f2937', fontSize: 14, margin: '0 0 2px' }}>Pagar via PIX</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Aprovação instantânea</p>
            </div>
          </button>
          <button
            disabled
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', backgroundColor: '#fff', cursor: 'not-allowed', textAlign: 'left', opacity: 0.5 }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>💳</div>
            <div>
              <p style={{ fontWeight: 600, color: '#1f2937', fontSize: 14, margin: '0 0 2px' }}>Cartão de Crédito</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Em breve</p>
            </div>
          </button>
          <button onClick={() => setStep('plans')} style={{ width: '100%', fontSize: 12, textAlign: 'center', color: '#9ca3af', textDecoration: 'underline', paddingTop: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Cancelar e voltar
          </button>
        </PortalCard>
      </PortalWrapper>
    )
  }

  // ── Step: Done ────────────────────────────────────────────────────────────
  return (
    <PortalSuccess
      portal={portal}
      ctx={ctx}
      title="Acesso liberado!"
      subtitle="Seu pagamento foi confirmado. Aproveite a internet!"
    />
  )
}

function UserIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IdIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2m-2 4h2M6 10h6m-6 4h3"/></svg> }
function MailIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function PhoneIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-.85a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> }
function Spin() { return <svg className="animate-spin w-5 h-5 text-white mr-1" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> }
function QrIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
      <rect x="5" y="5" width="35" height="35" rx="3" stroke="#333" strokeWidth="6" fill="none"/>
      <rect x="15" y="15" width="15" height="15" fill="#333"/>
      <rect x="60" y="5" width="35" height="35" rx="3" stroke="#333" strokeWidth="6" fill="none"/>
      <rect x="70" y="15" width="15" height="15" fill="#333"/>
      <rect x="5" y="60" width="35" height="35" rx="3" stroke="#333" strokeWidth="6" fill="none"/>
      <rect x="15" y="70" width="15" height="15" fill="#333"/>
      <rect x="60" y="60" width="8" height="8" fill="#333"/>
      <rect x="72" y="60" width="8" height="8" fill="#333"/>
      <rect x="84" y="60" width="8" height="8" fill="#333"/>
      <rect x="60" y="72" width="8" height="8" fill="#333"/>
      <rect x="84" y="72" width="8" height="8" fill="#333"/>
      <rect x="60" y="84" width="8" height="8" fill="#333"/>
      <rect x="72" y="84" width="8" height="8" fill="#333"/>
      <rect x="84" y="84" width="8" height="8" fill="#333"/>
    </svg>
  )
}
