import { describe, it, expect, vi, beforeEach } from 'vitest'
import { grantAndRedirect } from '../../lib/hotspot'

const LINK = 'http://192.168.88.1/login'

function mockFetch(data: object) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  } as Response)
}

beforeEach(() => {
  vi.restoreAllMocks()
  // jsdom doesn't implement window.location.href assignment; replace with writable spy
  Object.defineProperty(window, 'location', {
    value: { href: '' },
    writable: true,
    configurable: true,
  })
})

describe('grantAndRedirect — preComputedCredentials path', () => {
  const creds = { username: 'user1', password: 'pass1' }

  it('builds MikroTik URL with username and password', async () => {
    await grantAndRedirect('c1', 'aa:bb', LINK, 'p1', creds)
    const url = new URL(window.location.href)
    expect(url.searchParams.get('username')).toBe('user1')
    expect(url.searchParams.get('password')).toBe('pass1')
  })

  it('does NOT set dst when redirectUrl is omitted', async () => {
    await grantAndRedirect('c1', 'aa:bb', LINK, 'p1', creds)
    const url = new URL(window.location.href)
    expect(url.searchParams.has('dst')).toBe(false)
  })

  it('sets dst param when redirectUrl provided', async () => {
    await grantAndRedirect('c1', 'aa:bb', LINK, 'p1', creds, 'https://instagram.com/mypage')
    const url = new URL(window.location.href)
    expect(url.searchParams.get('dst')).toBe('https://instagram.com/mypage')
  })

  it('preserves other params already in link', async () => {
    const linkWithExtra = LINK + '?mac=aa:bb&ip=1.2.3.4'
    await grantAndRedirect('c1', 'aa:bb', linkWithExtra, 'p1', creds, 'https://instagram.com/mypage')
    const url = new URL(window.location.href)
    expect(url.searchParams.get('mac')).toBe('aa:bb')
    expect(url.searchParams.get('ip')).toBe('1.2.3.4')
    expect(url.searchParams.get('dst')).toBe('https://instagram.com/mypage')
  })

  it('does nothing when link is undefined', async () => {
    window.location.href = 'UNCHANGED'
    await grantAndRedirect('c1', 'aa:bb', undefined, 'p1', creds, 'https://instagram.com/mypage')
    expect(window.location.href).toBe('UNCHANGED')
  })
})

describe('grantAndRedirect — fetch path (no preComputedCredentials)', () => {
  it('calls /api/hotspot-grant and builds redirect URL', async () => {
    mockFetch({ username: 'fetched_user', password: 'fetched_pass' })
    await grantAndRedirect('c1', 'aa:bb', LINK, 'p1')
    const url = new URL(window.location.href)
    expect(url.searchParams.get('username')).toBe('fetched_user')
    expect(url.searchParams.get('password')).toBe('fetched_pass')
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/hotspot-grant',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sets dst from redirectUrl when fetching credentials', async () => {
    mockFetch({ username: 'u', password: 'p' })
    await grantAndRedirect('c1', 'aa:bb', LINK, 'p1', undefined, 'https://instagram.com/x')
    const url = new URL(window.location.href)
    expect(url.searchParams.get('dst')).toBe('https://instagram.com/x')
  })

  it('throws when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response)
    await expect(grantAndRedirect('c1', 'aa:bb', LINK, 'p1')).rejects.toThrow('grant failed: 500')
  })
})
