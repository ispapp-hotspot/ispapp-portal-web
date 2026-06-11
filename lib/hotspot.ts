const API_URL = process.env.NEXT_PUBLIC_HOTSPOT_API_URL ?? ''

/**
 * Registers the client MAC in RADIUS and redirects the browser to the
 * MikroTik hotspot login URL, completing actual authentication.
 *
 * In preview mode (no link) it skips the redirect.
 */
export async function grantAndRedirect(
  companyId: string,
  mac: string,
  link: string | undefined,
  portalId?: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/hotspot-grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, mac, portalId }),
  })

  if (!res.ok) throw new Error(`grant failed: ${res.status}`)

  if (!link) return

  const { username, password } = await res.json()
  const loginUrl = new URL(link)
  loginUrl.searchParams.set('username', username)
  loginUrl.searchParams.set('password', password)
  window.location.href = loginUrl.toString()
}
