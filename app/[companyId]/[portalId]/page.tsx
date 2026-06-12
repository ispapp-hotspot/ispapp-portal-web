import { notFound } from 'next/navigation'
import { getPortal, getCompany, getCampaign } from '@/lib/api'
import PortalWithCampaign from '@/components/PortalWithCampaign'

interface Props {
  params:       Promise<{ companyId: string; portalId: string }>
  searchParams: Promise<{ mac?: string; link?: string; ip?: string; preview?: string }>
}

export default async function PortalPage({ params, searchParams }: Props) {
  const { portalId }       = await params
  const { mac = '', link, ip } = await searchParams

  const portal = await getPortal(portalId)
  if (!portal || !portal.active) notFound()

  // company fetch is best-effort (display only)
  const company = await getCompany(portal.companyId)

  const campaign = await getCampaign(portalId)

  return (
    <PortalWithCampaign
      portal={portal}
      companyId={portal.companyId}
      mac={mac}
      link={link}
      ip={ip}
      campaign={campaign}
      companyName={company?.name}
    />
  )
}
