import { NextRequest, NextResponse } from 'next/server'

const API =
  process.env.HOTSPOT_API_URL ??
  process.env.NEXT_PUBLIC_HOTSPOT_API_URL ??
  'http://localhost:8080'

export async function POST(req: NextRequest) {
  const body = await req.arrayBuffer()
  const upstream = await fetch(`${API}/api/hotspot-grant`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: Buffer.from(body),
  })
  const data = await upstream.arrayBuffer()
  return new NextResponse(data, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}
