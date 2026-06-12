export interface PortalConfig {
  welcomeText:     string
  subtitle?:       string
  buttonText?:     string
  termsText?:      string
  primaryColor:    string   // page/header background
  backgroundColor: string   // card background
  buttonColor:     string
  textColor:       string
  logoUrl?:        string
  // Fields can be stored as booleans (dashboard) or array (legacy)
  showCpf?:        boolean
  showEmail?:      boolean
  showPhone?:      boolean
  fields?:         string[]
  [key: string]:   unknown
}

export interface CaptivePortal {
  id:        string
  companyId: string
  name:      string
  type:      'FREE_ACCESS' | 'LOGIN_CPF' | 'LEAD_CAPTURE' | 'PAID_ACCESS' | 'ISP_LOGIN' | 'VOUCHER'
  config:    PortalConfig
  active:    boolean
}

export interface HotspotPlan {
  id:            string
  companyId:     string
  name:          string
  description?:  string
  durationMin:   number
  bandwidthUp:   number
  bandwidthDown: number
  price:         number
  isFree:        boolean
  cooldownDays?: number | null
  active:        boolean
}

export interface CampaignData {
  id:    string
  name:  string
  media: CampaignMediaItem[]
}

export interface CampaignMediaItem {
  id:          string
  type:        'image' | 'video'
  url:         string
  durationSec: number
  sortOrder:   number
}

export interface LeadPayload {
  name:        string
  cpf?:        string
  email?:      string
  phone?:      string
  gender?:     string
  macAddress?: string
  ipAddress?:  string
}

/**
 * Check if a field is enabled in portal config.
 * Supports both boolean flags (showCpf) and fields array (["cpf","email"]).
 */
export function portalField(config: PortalConfig, field: string): boolean {
  // Boolean format (dashboard saves this way)
  const boolKey = `show${field.charAt(0).toUpperCase()}${field.slice(1)}` as keyof PortalConfig
  if (typeof config[boolKey] === 'boolean') return config[boolKey] as boolean
  // Array format (legacy / API-generated)
  if (Array.isArray(config.fields)) return config.fields.includes(field)
  // Default: show all common fields
  return false
}
