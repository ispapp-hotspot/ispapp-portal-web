import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFreePlan } from '../api'

const PORTAL_ID = 'portal-abc'
const MAC = 'AA:BB:CC:DD:EE:FF'
const PLAN_ID = 'plan-free-1'

describe('useFreePlan', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna granted=true quando API responde 200', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ granted: true }),
    } as Response)

    const result = await useFreePlan(PORTAL_ID, { planId: PLAN_ID, macAddress: MAC })

    expect(result.granted).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/portal/${PORTAL_ID}/use-free-plan`),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ planId: PLAN_ID, macAddress: MAC }),
      })
    )
  })

  it('retorna granted=false com mensagem de carência quando API responde 429', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'Você já utilizou este plano recentemente. Disponível novamente em 20 horas.',
        cooldown: true,
        availableAt: '2024-06-08T10:00:00Z',
      }),
    } as Response)

    const result = await useFreePlan(PORTAL_ID, { planId: PLAN_ID, macAddress: MAC })

    expect(result.granted).toBe(false)
    expect(result.cooldown).toBe(true)
    expect(result.availableAt).toBe('2024-06-08T10:00:00Z')
    expect(result.error).toContain('Disponível novamente em 20 horas')
  })

  it('retorna granted=false com error quando portal não existe (404)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Portal não encontrado.' }),
    } as Response)

    const result = await useFreePlan(PORTAL_ID, { planId: PLAN_ID, macAddress: MAC })

    expect(result.granted).toBe(false)
    expect(result.error).toBe('Portal não encontrado.')
    expect(result.cooldown).toBeUndefined()
  })

  it('retorna granted=false com error de conexão quando fetch lança exceção', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    const result = await useFreePlan(PORTAL_ID, { planId: PLAN_ID })

    expect(result.granted).toBe(false)
    expect(result.error).toBe('Erro de conexão.')
  })

  it('envia macAddress e ipAddress quando fornecidos', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ granted: true }),
    } as Response)

    await useFreePlan(PORTAL_ID, { planId: PLAN_ID, macAddress: MAC, ipAddress: '192.168.1.50' })

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ planId: PLAN_ID, macAddress: MAC, ipAddress: '192.168.1.50' }),
      })
    )
  })

  it('funciona sem macAddress (acesso sem MAC identificado)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ granted: true }),
    } as Response)

    const result = await useFreePlan(PORTAL_ID, { planId: PLAN_ID })

    expect(result.granted).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ planId: PLAN_ID }),
      })
    )
  })
})
