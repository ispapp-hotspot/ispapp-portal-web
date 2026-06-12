import { NextRequest, NextResponse } from 'next/server'

const API =
  process.env.HOTSPOT_API_URL ??
  process.env.NEXT_PUBLIC_HOTSPOT_API_URL ??
  'http://localhost:8080'

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const targetUrl = `${API}/api/v1/${path.join('/')}${req.nextUrl.search}`

  const headers = new Headers()
  const ct = req.headers.get('content-type')
  if (ct) headers.set('content-type', ct)

  const body =
    req.method !== 'GET' && req.method !== 'HEAD'
      ? Buffer.from(await req.arrayBuffer())
      : undefined

  const upstream = await fetch(targetUrl, { method: req.method, headers, body })

  if (upstream.status === 204 || upstream.status === 304) {
    return new NextResponse(null, { status: upstream.status })
  }

  const data = await upstream.arrayBuffer()
  return new NextResponse(data, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}

export const GET    = proxy
export const POST   = proxy
export const PUT    = proxy
export const PATCH  = proxy
export const DELETE = proxy
