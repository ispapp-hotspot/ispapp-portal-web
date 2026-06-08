export interface PortalConfig {
  welcomeText:     string
  subtitle?:       string
  buttonText?:     string
  termsText?:      string
  primaryColor:    string
  backgroundColor: string
  buttonColor:     string
  textColor:       string
  logoUrl?:        string
  showCpf?:        boolean
  showEmail?:      boolean
  showPhone?:      boolean
  paymentMock?:    boolean
  showSuspendedInvoice?: boolean
  [key: string]:   unknown
}

export interface CaptivePortal {
  id:        string
  companyId: string
  name:      string
  type:      'LEAD_CAPTURE' | 'LOGIN_CPF' | 'PAID_ACCESS' | 'FREE_ACCESS' | 'VOUCHER' | 'ISP_LOGIN'
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
  name:       string
  cpf?:       string
  email?:     string
  phone?:     string
  gender?:    string
  macAddress?: string
  ipAddress?:  string
}
