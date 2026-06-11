'use client'

import { useState } from 'react'
import type { CaptivePortal, CampaignData, HotspotPlan } from '@/types'
import CampaignStories from './CampaignStories'
import LeadCapturePortal from './portals/LeadCapturePortal'
import LoginCpfPortal    from './portals/LoginCpfPortal'
import PaidAccessPortal  from './portals/PaidAccessPortal'
import FreeAccessPortal  from './portals/FreeAccessPortal'
import IspLoginPortal    from './portals/IspLoginPortal'
import type { PortalCtx } from './portals/shared'

interface Props {
  portal:      CaptivePortal
  campaign:    CampaignData | null
  companyName: string
  companyId:   string
  portalId:    string
  mac:         string
  ip:          string
  link?:       string
  isPreview:   boolean
  pageBg:      string
  plans?:      HotspotPlan[]
}

export default function PortalWithCampaign({
  portal, campaign, companyName, companyId, portalId, mac, ip, link, isPreview, pageBg, plans = [],
}: Props) {
  const [showPortal, setShowPortal] = useState(!campaign || campaign.media.length === 0)

  const ctx: PortalCtx = { mac, ip, companyId, portalId, isPreview, companyName, link }

  if (!showPortal && campaign && campaign.media.length > 0) {
    return (
      <>
        {isPreview && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            backgroundColor: '#f59e0b', color: '#78350f',
            fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '6px',
          }}>
            Modo Preview — não visível para usuários reais
          </div>
        )}
        <CampaignStories
          campaign={campaign}
          portalId={portalId}
          companyId={companyId}
          mac={mac}
          ip={ip}
          onFinish={() => setShowPortal(true)}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: pageBg }}>
      {isPreview && (
        <div style={{
          width: '100%', backgroundColor: '#f59e0b', color: '#78350f',
          fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '6px 0',
        }}>
          Modo Preview — não visível para usuários reais
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px 32px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {portal.type === 'LEAD_CAPTURE' && <LeadCapturePortal portal={portal} ctx={ctx} />}
          {portal.type === 'LOGIN_CPF'    && <LoginCpfPortal    portal={portal} ctx={ctx} />}
          {portal.type === 'PAID_ACCESS'  && <PaidAccessPortal  portal={portal} ctx={ctx} />}
          {portal.type === 'FREE_ACCESS'  && <FreeAccessPortal  portal={portal} ctx={ctx} />}
          {portal.type === 'ISP_LOGIN'    && <IspLoginPortal    portal={portal} ctx={ctx} plans={plans} />}
          {!['LEAD_CAPTURE','LOGIN_CPF','PAID_ACCESS','FREE_ACCESS','ISP_LOGIN'].includes(portal.type) && (
            <FreeAccessPortal portal={portal} ctx={ctx} />
          )}
        </div>
      </div>
    </div>
  )
}
