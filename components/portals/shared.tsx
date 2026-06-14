'use client'

import { createContext, useContext, type ReactNode, type CSSProperties } from 'react'
import type { CaptivePortal } from '@/types'

// ── Context ──────────────────────────────────────────────────────────────────

export interface PortalCtxValue {
  portal:    CaptivePortal
  companyId: string
  mac:       string
  link:      string | undefined
  ip?:       string
}

const PortalCtx = createContext<PortalCtxValue | null>(null)

export function usePortal(): PortalCtxValue {
  const ctx = useContext(PortalCtx)
  if (!ctx) throw new Error('usePortal must be used inside PortalProvider')
  return ctx
}

export function PortalProvider({
  value,
  children,
}: {
  value: PortalCtxValue
  children: ReactNode
}) {
  return <PortalCtx.Provider value={value}>{children}</PortalCtx.Provider>
}

// ── Formatters ───────────────────────────────────────────────────────────────

export function formatCpf(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function formatCpfCnpj(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) return formatCpf(d)
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 13) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 16)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function validateEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export function validateCpf(digits: string): boolean {
  const d = digits.replace(/\D/g, '')
  if (d.length !== 11) return false
  if (/^(.)\1+$/.test(d)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== parseInt(d[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i)
  r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === parseInt(d[10])
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

export function fmtSpeed(kbps: number): string {
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(0)} Mbps`
  return `${kbps} Kbps`
}

// ── Icons ─────────────────────────────────────────────────────────────────────

export function WifiIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill={color} stroke="none" />
    </svg>
  )
}

export function CheckIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function AlertIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

export function Spinner({ color = '#fff', size = 20 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      style={{ animation: 'spin 0.75s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

// ── PortalPage ────────────────────────────────────────────────────────────────
// Layout matches dashboard preview exactly:
//   - Full-height page, primaryColor background
//   - Header: circle icon + title (white text) centered on colored background
//   - Floating white card (rounded all sides, shadow) containing children
//   - Terms text below card, still on colored background

interface PortalPageProps {
  primaryColor:    string
  backgroundColor: string
  logoUrl?:        string
  title:           string
  subtitle?:       string
  companyId:       string
  termsText?:      string
  mac?:            string
  ip?:             string
  children:        ReactNode
}

export function PortalPage({
  primaryColor,
  backgroundColor,
  logoUrl,
  title,
  subtitle,
  companyId,
  termsText,
  mac,
  ip,
  children,
}: PortalPageProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: primaryColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 16px 32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header — wifi icon circle + title on colored background */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24, textAlign: 'center', width: '100%', maxWidth: 400 }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" style={{ maxHeight: 64, maxWidth: 160, objectFit: 'contain' }} />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WifiIcon size={22} color="#fff" />
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Floating white card */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: backgroundColor,
          borderRadius: 16,
          padding: '20px 16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>

      {/* MAC / IP — chips destacados */}
      {(mac || ip) && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
          {mac && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20,
              padding: '4px 10px',
            }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <path d="M8 10h8M8 14h4" />
              </svg>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                MAC
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', fontWeight: 600 }}>
                {mac.toUpperCase()}
              </span>
            </div>
          )}
          {ip && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20,
              padding: '4px 10px',
            }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
              </svg>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                IP
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', fontWeight: 600 }}>
                {ip}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Terms + Privacy links */}
      <div style={{ textAlign: 'center', marginTop: 10, maxWidth: 360 }}>
        {termsText ? (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>
            {termsText}
          </p>
        ) : (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
            Ao conectar você concorda com os{' '}
            <a
              href={`/${companyId}/legal`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#fff', textDecoration: 'underline', fontWeight: 600 }}
            >
              Termos de Uso
            </a>
            {' e a '}
            <a
              href={`/${companyId}/legal`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#fff', textDecoration: 'underline', fontWeight: 600 }}
            >
              Política de Privacidade
            </a>
          </p>
        )}
      </div>
    </div>
  )
}

// ── PortalInput ───────────────────────────────────────────────────────────────

export function PortalInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  disabled,
}: {
  label:        string
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  type?:        string
  inputMode?:   'text' | 'tel' | 'email' | 'numeric' | 'decimal'
  disabled?:    boolean
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>
        {label}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '9px 12px',
          fontSize: 14,
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          outline: 'none',
          boxSizing: 'border-box',
          backgroundColor: disabled ? '#f9fafb' : '#fff',
          color: '#111',
        }}
        onFocus={e => (e.target.style.borderColor = '#9ca3af')}
        onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
      />
    </div>
  )
}

// ── PortalButton ──────────────────────────────────────────────────────────────

export function PortalButton({
  children,
  onClick,
  color = '#10b981',
  disabled,
  loading,
  style,
}: {
  children:  ReactNode
  onClick?:  () => void
  color?:    string
  disabled?: boolean
  loading?:  boolean
  style?:    CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%',
        padding: '11px 16px',
        fontSize: 14,
        fontWeight: 600,
        color: '#fff',
        backgroundColor: disabled || loading ? '#9ca3af' : color,
        border: 'none',
        borderRadius: 8,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'opacity 0.15s',
        marginTop: 8,
        ...style,
      }}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  )
}

// ── PortalSuccess ─────────────────────────────────────────────────────────────

export function PortalSuccess({
  title,
  subtitle,
  color = '#22c55e',
}: {
  title:     string
  subtitle?: string
  color?:    string
}) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          color: '#fff',
        }}
      >
        <CheckIcon size={28} />
      </div>
      <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>{title}</h2>
      {subtitle && <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>{subtitle}</p>}
    </div>
  )
}

// ── PortalGenderSelect ────────────────────────────────────────────────────────

export function PortalGenderSelect({
  value,
  onChange,
  disabled,
}: {
  value:     string
  onChange:  (v: string) => void
  disabled?: boolean
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>
        Gênero
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '9px 12px',
          fontSize: 14,
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          outline: 'none',
          backgroundColor: disabled ? '#f9fafb' : '#fff',
          color: value ? '#111' : '#9ca3af',
          boxSizing: 'border-box',
        }}
      >
        <option value="">Selecione (opcional)</option>
        <option value="M">Masculino</option>
        <option value="F">Feminino</option>
        <option value="NB">Não-binário</option>
        <option value="O">Outro</option>
        <option value="NA">Prefiro não dizer</option>
      </select>
    </div>
  )
}

// ── ErrorBox ──────────────────────────────────────────────────────────────────

export function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fca5a5',
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        color: '#dc2626',
        fontSize: 13,
      }}
    >
      <AlertIcon size={15} />
      <span>{message}</span>
    </div>
  )
}

// ── SectionTitle ──────────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#111', textAlign: 'center' }}>
      {children}
    </h2>
  )
}

// ── BackButton ────────────────────────────────────────────────────────────────

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: '#9ca3af',
        cursor: 'pointer',
        width: '100%',
        marginTop: 8,
        fontSize: 13,
        padding: '4px 0',
      }}
    >
      ← Voltar
    </button>
  )
}
