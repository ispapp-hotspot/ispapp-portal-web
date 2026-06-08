import type { CaptivePortal, CampaignData, LeadPayload } from '@/types'

const API = process.env.HOTSPOT_API_URL ?? process.env.NEXT_PUBLIC_HOTSPOT_API_URL ?? 'http://localhost:8080'

export async function getPortal(portalId: string): Promise<CaptivePortal | null> {
  try {
    const res = await fetch(`${API}/api/v1/public/portal/${portalId}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getCompany(companyId: string): Promise<{ id: string; name: string } | null> {
  try {
    const res = await fetch(`${API}/api/v1/public/company/${companyId}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getCampaign(portalId: string): Promise<CampaignData | null> {
  const apiUrl = process.env.HOTSPOT_API_URL ?? process.env.NEXT_PUBLIC_HOTSPOT_API_URL ?? 'http://localhost:8080'
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/portal/${portalId}/campaign`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function recordCampaignView(payload: {
  campaignId: string; mediaId?: string; portalId?: string; companyId?: string
  macAddress?: string; ipAddress?: string; action: string; durationWatchedSec?: number
}): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_HOTSPOT_API_URL ?? 'http://localhost:8080'
  try {
    await fetch(`${apiUrl}/api/v1/public/campaign-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch { /* silently fail — metrics are best-effort */ }
}

export interface IspInvoice {
  pixQr?:         string
  valor?:         number
  vencimento?:    string
  linhaDigitavel?: string
}

export interface IspLoginResult {
  granted:    boolean
  message?:   string
  error?:     string
  suspended?: boolean
  invoice?:   IspInvoice
}

export async function ispLogin(portalId: string, payload: {
  cpf: string; macAddress?: string; ipAddress?: string
}): Promise<IspLoginResult> {
  const apiUrl = process.env.NEXT_PUBLIC_HOTSPOT_API_URL ?? 'http://localhost:8080'
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/portal/${portalId}/isp-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (res.ok) return { granted: true, message: data.message }
    return {
      granted:    false,
      suspended:  data.suspended === true,
      invoice:    data.invoice,
      error:      data.error ?? 'Acesso negado.',
    }
  } catch {
    return { granted: false, error: 'Erro de conexão. Tente novamente.' }
  }
}

export async function useFreePlan(portalId: string, payload: {
  planId: string; macAddress?: string; ipAddress?: string
}): Promise<{ granted: boolean; error?: string; cooldown?: boolean; availableAt?: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_HOTSPOT_API_URL ?? 'http://localhost:8080'
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/portal/${portalId}/use-free-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (res.ok) return { granted: true }
    return { granted: false, error: data.error, cooldown: data.cooldown, availableAt: data.availableAt }
  } catch {
    return { granted: false, error: 'Erro de conexão.' }
  }
}

export async function getPlans(companyId: string): Promise<import('@/types').HotspotPlan[]> {
  try {
    const res = await fetch(`${API}/api/v1/public/company/${companyId}/plans`, { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function redeemVoucher(portalId: string, payload: {
  code: string; macAddress?: string; ipAddress?: string
}): Promise<{ granted: boolean; error?: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_HOTSPOT_API_URL ?? 'http://localhost:8080'
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/portal/${portalId}/redeem-voucher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (res.ok) return { granted: true }
    return { granted: false, error: data.error ?? 'Voucher inválido.' }
  } catch {
    return { granted: false, error: 'Erro de conexão.' }
  }
}

export interface InitiatePaymentResult {
  transactionId: string
  pixCopyPaste:  string
  pixQrCodeBase64?: string
  amount:        number
  expiresAt?:    string
  error?:        string
}

export async function initiatePayment(portalId: string, payload: {
  planId: string
  paymentMethod: 'pix'
  macAddress?: string
  ipAddress?:  string
  leadName?:   string
  leadCpf?:    string
  leadEmail?:  string
  leadPhone?:  string
}): Promise<InitiatePaymentResult> {
  const apiUrl = process.env.NEXT_PUBLIC_HOTSPOT_API_URL ?? 'http://localhost:8080'
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/portal/${portalId}/initiate-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (res.ok) return data
    return { transactionId: '', pixCopyPaste: '', amount: 0, error: data.error ?? 'Erro ao processar pagamento.' }
  } catch {
    return { transactionId: '', pixCopyPaste: '', amount: 0, error: 'Erro de conexão.' }
  }
}

export async function checkPaymentStatus(transactionId: string): Promise<{ status: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_HOTSPOT_API_URL ?? 'http://localhost:8080'
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/transaction/${transactionId}/status`)
    if (!res.ok) return { status: 'unknown' }
    return res.json()
  } catch {
    return { status: 'unknown' }
  }
}

export async function submitLead(portalId: string, payload: LeadPayload): Promise<boolean> {
  const apiUrl = process.env.NEXT_PUBLIC_HOTSPOT_API_URL ?? 'http://localhost:8080'
  try {
    const res = await fetch(`${apiUrl}/api/v1/portal/${portalId}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch {
    return false
  }
}
