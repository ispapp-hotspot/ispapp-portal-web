'use client'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#0C1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1rem',
      }}
    >
      <div
        style={{
          pointerEvents: 'none',
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(ellipse 55% 40% at 50% 35%, rgba(16,185,129,0.08) 0%, transparent 70%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1.5rem',
          width: '100%',
          maxWidth: '24rem',
          borderRadius: '1rem',
          padding: '2rem',
          backgroundColor: '#141920',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.15)',
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="0.5" fill="#ef4444" />
            <line x1="3" y1="3" x2="21" y2="21" stroke="rgba(239,68,68,0.35)" strokeWidth="1.25" />
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <p
            style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.2)',
              margin: 0,
            }}
          >
            Erro 404
          </p>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            Portal não encontrado
          </h1>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Este link de acesso não existe ou foi desativado pelo provedor.
          </p>
        </div>

        <div
          style={{
            width: '100%',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            fontSize: '0.75rem',
            lineHeight: 1.6,
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          Verifique o endereço ou entre em contato com seu provedor de internet.
        </div>
      </div>
    </div>
  )
}
