'use client'

export async function grantAndRedirect(
  companyId: string,
  mac: string,
  link: string | undefined,
  portalId?: string,
  preComputedCredentials?: { username: string; password: string },
  redirectUrl?: string,
): Promise<void> {
  let username: string
  let password: string

  if (preComputedCredentials) {
    username = preComputedCredentials.username
    password = preComputedCredentials.password
  } else {
    const res = await fetch('/api/hotspot-grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, mac, portalId }),
    })
    if (!res.ok) throw new Error(`grant failed: ${res.status}`)
    if (!link) return
    const data = await res.json()
    username = data.username
    password = data.password
  }

  if (!link) return
  const loginUrl = new URL(link)
  loginUrl.searchParams.set('username', username)
  loginUrl.searchParams.set('password', password)
  if (redirectUrl) loginUrl.searchParams.set('dst', redirectUrl)
  window.location.href = loginUrl.toString()
}
