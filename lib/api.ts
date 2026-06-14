import type { CaptivePortal, HotspotPlan, CampaignData, LeadPayload } from '@/types'

const SERVER =
  process.env.HOTSPOT_API_URL ??
  process.env.NEXT_PUBLIC_HOTSPOT_API_URL ??
  'http://localhost:8080'

// ── Server-side (direct to API — not restricted by walled garden) ────────────

export async function getPortal(portalId: string): Promise<CaptivePortal | null> {
  try {
    const res = await fetch(`${SERVER}/api/v1/public/portal/${portalId}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getCompany(companyId: string): Promise<{ id: string; name: string } | null> {
  try {
    const res = await fetch(`${SERVER}/api/v1/public/company/${companyId}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getCampaign(portalId: string): Promise<CampaignData | null> {
  try {
    const res = await fetch(`${SERVER}/api/v1/public/portal/${portalId}/campaign`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getPlansServer(companyId: string): Promise<HotspotPlan[]> {
  try {
    const res = await fetch(`${SERVER}/api/v1/public/company/${companyId}/plans`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

// ── Client-side (via proxy — walled garden bypass) ────────────────────────────

export async function submitLead(portalId: string, payload: LeadPayload): Promise<void> {
  const res = await fetch(`/api/v1/portal/${portalId}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`submitLead failed: ${res.status}`)
}

export interface IspInvoice {
  pixQr?:          string
  valor?:          number
  vencimento?:     string
  linhaDigitavel?: string
}

export interface IspLoginResult {
  granted:    boolean
  error?:     string
  suspended?: boolean
  invoice?:   IspInvoice
  username?:  string
  password?:  string
}

export async function ispLogin(
  portalId: string,
  cpf: string,
  mac?: string,
  ip?: string,
): Promise<IspLoginResult> {
  const res = await fetch(`/api/v1/public/portal/${portalId}/isp-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf, macAddress: mac, ipAddress: ip }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { granted: false, error: body.error ?? body.message ?? `error ${res.status}` }
  }
  return res.json()
}

export interface InitiatePaymentResult {
  transactionId:    string
  pixCopyPaste:     string
  pixQrCodeBase64?: string
  ticketUrl?:       string
  amount:           number
  expiresAt?:       string
  error?:           string
}

export async function initiatePayment(
  portalId: string,
  planId: string,
  mac: string,
  ip?: string,
  leadName?: string,
  leadCpf?: string,
  leadEmail?: string,
  leadPhone?: string,
): Promise<InitiatePaymentResult> {
  const res = await fetch(`/api/v1/public/portal/${portalId}/initiate-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planId,
      paymentMethod: 'pix',
      macAddress: mac,
      ipAddress: ip,
      leadName,
      leadCpf,
      leadEmail,
      leadPhone,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return {
      transactionId: '',
      pixCopyPaste: '',
      amount: 0,
      error: body.error ?? body.message ?? `error ${res.status}`,
    }
  }
  return res.json()
}

export async function checkPaymentStatus(transactionId: string): Promise<{ status: string }> {
  const res = await fetch(`/api/v1/public/transaction/${transactionId}/status`)
  if (!res.ok) return { status: 'unknown' }
  return res.json()
}

export async function getPlansClient(companyId: string): Promise<HotspotPlan[]> {
  try {
    const res = await fetch(`/api/v1/public/company/${companyId}/plans`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function recordCampaignView(
  companyId: string,
  campaignId: string,
  portalId: string,
  mac?: string,
  ip?: string,
): Promise<void> {
  await fetch('/api/v1/public/campaign-view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaignId,
      portalId,
      companyId,
      macAddress: mac,
      ipAddress: ip,
      action: 'viewed',
    }),
  }).catch(() => {})
}

export interface UseFreePlanResult {
  granted:      boolean
  error?:       string
  cooldown?:    boolean
  availableAt?: string
}

export async function useFreePlan(
  portalId: string,
  planId: string,
  mac: string,
  ip?: string,
): Promise<UseFreePlanResult> {
  const res = await fetch(`/api/v1/public/portal/${portalId}/use-free-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, macAddress: mac, ipAddress: ip }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 429)
      return { granted: false, cooldown: true, availableAt: body.availableAt }
    return { granted: false, error: body.error ?? body.message ?? `error ${res.status}` }
  }
  return res.json()
}

export interface LookupLeadResult {
  found:   boolean
  name?:   string
  email?:  string
  phone?:  string
  gender?: string
}

export async function lookupLeadByCpf(
  portalId: string,
  cpf: string,
): Promise<LookupLeadResult> {
  try {
    const res = await fetch(`/api/v1/public/portal/${portalId}/lookup-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf }),
    })
    if (!res.ok) return { found: false }
    return res.json()
  } catch {
    return { found: false }
  }
}

export async function redeemVoucher(
  portalId: string,
  code: string,
  mac: string,
  ip?: string,
): Promise<{ granted: boolean; error?: string }> {
  const res = await fetch(`/api/v1/public/portal/${portalId}/redeem-voucher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, macAddress: mac, ipAddress: ip }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { granted: false, error: body.error ?? body.message ?? `error ${res.status}` }
  }
  return res.json()
}
