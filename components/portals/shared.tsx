'use client'

import type { CaptivePortal } from '@/types'

// ── Formatters ────────────────────────────────────────────────────────────────
export function formatCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

export function formatCpfCnpj(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) {
    // CPF: 000.000.000-00
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  }
  // CNPJ: 00.000.000/0000-00
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  if (d.length <= 13) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`
}

export function validateEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

export function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

export interface PortalCtx {
  mac:         string
  ip:          string
  companyId:   string
  portalId:    string
  isPreview:   boolean
  companyName: string
  link?:       string
}

/** Cabeçalho — fica sobre o fundo colorido (primaryColor), então texto sempre branco */
export function PortalHeader({ portal }: { portal: CaptivePortal }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', paddingBottom: 8 }}>
      {portal.config.logoUrl ? (
        <img
          src={portal.config.logoUrl as string}
          alt="Logo"
          className="h-12 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <WifiIcon color="#fff" />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold leading-tight text-white">
          {portal.config.welcomeText ?? 'WiFi Grátis'}
        </h1>
        {portal.config.subtitle && (
          <p className="text-sm mt-1 text-white/80">
            {portal.config.subtitle as string}
          </p>
        )}
      </div>
    </div>
  )
}

/** Card branco com sombra — claramente visível sobre o fundo colorido */
export function PortalCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}
    >
      {children}
    </div>
  )
}

export function PortalInput({
  label, placeholder, type = 'text', inputMode, value, onChange, required, icon,
}: {
  label: string; placeholder: string; type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  value: string; onChange: (v: string) => void
  required?: boolean; icon?: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative flex items-center">
        {icon && <span className="absolute left-3 text-gray-400">{icon}</span>}
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 outline-none text-gray-800 text-sm transition-all bg-gray-50"
          style={{ paddingLeft: icon ? '2.5rem' : '0.875rem', paddingRight: '0.875rem' }}
        />
      </div>
    </div>
  )
}

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'other',  label: 'Outro' },
  { value: 'prefer_not', label: 'Prefiro não informar' },
]

export function PortalGenderSelect({
  value, onChange,
}: {
  value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>Sexo</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {GENDER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value === value ? '' : opt.value)}
            style={{
              height: 40, borderRadius: 10, fontSize: 13, fontWeight: 500,
              border: `1.5px solid ${value === opt.value ? '#10b981' : '#e5e7eb'}`,
              backgroundColor: value === opt.value ? '#ecfdf5' : '#f9fafb',
              color: value === opt.value ? '#065f46' : '#374151',
              cursor: 'pointer', transition: 'all 0.12s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function PortalButton({
  children, onClick, color, disabled = false, type = 'button',
}: {
  children: React.ReactNode; onClick?: () => void
  color: string; disabled?: boolean; type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full h-14 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
      style={{ backgroundColor: disabled ? '#9ca3af' : color }}
    >
      {children}
    </button>
  )
}

/** Tela de sucesso pós-conexão — mantém PortalWrapper (termos visíveis) */
export function PortalSuccess({
  portal, ctx, title = 'Conectado!', subtitle = 'Você já pode navegar na internet.',
}: {
  portal: CaptivePortal; ctx: PortalCtx; title?: string; subtitle?: string
}) {
  const pri = portal.config.primaryColor ?? '#10b981'
  return (
    <PortalWrapper portal={portal} ctx={ctx}>
      <PortalCard>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '16px 0', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: pri + '20' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={pri} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>{title}</h2>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{subtitle}</p>
        </div>
      </PortalCard>
    </PortalWrapper>
  )
}

function DeviceInfo({ mac, ip }: { mac: string; ip: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(0,0,0,0.25)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '8px 12px',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Dispositivo identificado
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {mac} · {ip}
        </p>
      </div>
      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
    </div>
  )
}

/** Wrapper principal — header sobre fundo colorido + card logo abaixo */
export function PortalWrapper({ children, portal, ctx }: {
  children: React.ReactNode; portal: CaptivePortal; ctx: PortalCtx
}) {
  const legalUrl = `/${ctx.companyId}/legal`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <PortalHeader portal={portal} />
      {children}
      <DeviceInfo mac={ctx.mac} ip={ctx.ip} />
      <p style={{ fontSize: 11, textAlign: 'center', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, padding: '0 8px' }}>
        Ao conectar você concorda com os{' '}
        <a href={legalUrl} target="_blank" rel="noopener noreferrer"
          style={{ color: '#fff', fontWeight: 600, textDecoration: 'underline' }}>
          Termos de Uso e Política de Privacidade
        </a>.
        {' '}Seu MAC e IP são registrados para fins de segurança.
      </p>
    </div>
  )
}

function WifiIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  )
}
