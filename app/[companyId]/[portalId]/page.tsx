import { notFound } from 'next/navigation'
import { getPortal, getCompany, getCampaign, getPlans } from '@/lib/api'
import PortalWithCampaign from '@/components/PortalWithCampaign'

interface Props {
  params:       Promise<{ companyId: string; portalId: string }>
  searchParams: Promise<{ mac?: string; ip?: string; preview?: string; link?: string }>
}

export default async function PortalPage({ params, searchParams }: Props) {
  const { companyId, portalId } = await params
  const { mac = 'AA:BB:CC:DD:EE:FF', ip = '192.168.1.100', preview, link } = await searchParams

  const [portal, company, campaign] = await Promise.all([
    getPortal(portalId),
    getCompany(companyId),
    getCampaign(portalId),
  ])

  const plans = portal?.type === 'ISP_LOGIN' || portal?.type === 'VOUCHER'
    ? await getPlans(companyId)
    : []

  if (!portal) notFound()

  const isPreview = preview === '1'
  const pageBg    = portal.config.primaryColor ?? '#10b981'

  return (
    <PortalWithCampaign
      portal={portal}
      campaign={campaign}
      companyName={company?.name ?? ''}
      companyId={companyId}
      portalId={portalId}
      mac={mac}
      ip={ip}
      link={link}
      isPreview={isPreview}
      pageBg={pageBg}
      plans={plans}
    />
  )
}
