'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { CaptivePortal, CampaignData } from '@/types'
import { PortalProvider } from './portals/shared'
import { recordCampaignView } from '@/lib/api'

const CampaignStories   = dynamic(() => import('./CampaignStories'))
const FreeAccessPortal  = dynamic(() => import('./portals/FreeAccessPortal'))
const LoginCpfPortal    = dynamic(() => import('./portals/LoginCpfPortal'))
const LeadCapturePortal = dynamic(() => import('./portals/LeadCapturePortal'))
const PaidAccessPortal  = dynamic(() => import('./portals/PaidAccessPortal'))
const IspLoginPortal    = dynamic(() => import('./portals/IspLoginPortal'))

interface Props {
  portal:       CaptivePortal
  companyId:    string
  mac:          string
  link?:        string
  ip?:          string
  campaign:     CampaignData | null
  companyName?: string
}

export default function PortalWithCampaign({
  portal, companyId, mac, link, ip, campaign,
}: Props) {
  const hasCampaign = campaign && campaign.media.length > 0
  const [showCampaign, setShowCampaign] = useState(hasCampaign)

  function handleCampaignFinish() {
    setShowCampaign(false)
  }

  function handleCampaignView(mediaId: string) {
    if (!campaign) return
    recordCampaignView(companyId, campaign.id, portal.id, mac, ip)
    void mediaId
  }

  const ctxValue = { portal, companyId, mac, link, ip }

  if (showCampaign && campaign) {
    return (
      <CampaignStories
        campaign={campaign}
        onFinish={handleCampaignFinish}
        onView={handleCampaignView}
      />
    )
  }

  const PortalComponent = resolvePortal(portal.type)

  return (
    <PortalProvider value={ctxValue}>
      <PortalComponent />
    </PortalProvider>
  )
}

function resolvePortal(type: CaptivePortal['type']) {
  switch (type) {
    case 'FREE_ACCESS':   return FreeAccessPortal
    case 'LOGIN_CPF':     return LoginCpfPortal
    case 'LEAD_CAPTURE':  return LeadCapturePortal
    case 'PAID_ACCESS':   return PaidAccessPortal
    case 'ISP_LOGIN':     return IspLoginPortal
    case 'VOUCHER':       return IspLoginPortal
    default:              return FreeAccessPortal
  }
}
