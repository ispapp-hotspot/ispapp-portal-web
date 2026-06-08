import { getCompany } from '@/lib/api'

interface Props {
  params: Promise<{ companyId: string }>
}

export default async function LegalPage({ params }: Props) {
  const { companyId } = await params
  const company = await getCompany(companyId)
  const name = company?.name ?? 'Esta empresa'
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '0 0 60px' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#10b981', padding: '32px 24px 24px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>{name}</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 }}>
          Termos de Uso e Política de Privacidade
        </p>
      </div>

      {/* Tabs nav */}
      <nav style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        {[['#termos', 'Termos de Uso'], ['#privacidade', 'Política de Privacidade']].map(([href, label]) => (
          <a
            key={href}
            href={href}
            style={{
              flex: 1, textAlign: 'center', padding: '14px 8px',
              fontSize: 13, fontWeight: 600, color: '#374151',
              textDecoration: 'none', borderBottom: '2px solid transparent',
            }}
          >
            {label}
          </a>
        ))}
      </nav>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px' }}>

        {/* ── Termos de Uso ── */}
        <section id="termos" style={{ paddingTop: 32 }}>
          <SectionTitle>Termos de Uso da Rede Wi-Fi</SectionTitle>
          <Card>
            <p><strong>Última atualização:</strong> {date}</p>
            <p>
              Ao utilizar a rede Wi-Fi disponibilizada por <strong>{name}</strong>, o usuário concorda
              com os termos e condições descritos abaixo. A utilização da rede implica aceitação
              integral destes termos.
            </p>

            <Heading>1. Uso Permitido</Heading>
            <p>A rede Wi-Fi é disponibilizada exclusivamente para uso pessoal e não comercial. É permitido:</p>
            <ul>
              <li>Navegar em sites e serviços de uso comum</li>
              <li>Utilizar aplicativos de comunicação (mensagens, e-mail)</li>
              <li>Acessar serviços de streaming de mídia</li>
            </ul>

            <Heading>2. Uso Proibido</Heading>
            <p>É expressamente proibido utilizar a rede para:</p>
            <ul>
              <li>Acessar, distribuir ou armazenar conteúdo ilegal</li>
              <li>Realizar atividades que violem direitos autorais</li>
              <li>Enviar spam ou conteúdo malicioso</li>
              <li>Tentar acessar sistemas ou redes de terceiros sem autorização</li>
              <li>Praticar qualquer ato contrário à legislação brasileira</li>
            </ul>

            <Heading>3. Responsabilidades</Heading>
            <p>
              <strong>{name}</strong> não se responsabiliza pelo uso indevido da rede pelo usuário,
              por indisponibilidades temporárias do serviço, por perdas de dados durante a conexão,
              nem pelo conteúdo de sites acessados pelo usuário.
            </p>

            <Heading>4. Monitoramento</Heading>
            <p>
              O tráfego de rede pode ser monitorado para fins de segurança e conformidade legal,
              conforme permitido pela legislação brasileira (Lei nº 12.965/2014 — Marco Civil da Internet).
            </p>

            <Heading>5. Alterações</Heading>
            <p>
              Estes termos podem ser alterados a qualquer momento. O uso continuado da rede após
              as alterações implica aceitação dos novos termos.
            </p>
          </Card>
        </section>

        {/* ── Política de Privacidade ── */}
        <section id="privacidade" style={{ paddingTop: 32 }}>
          <SectionTitle>Política de Privacidade</SectionTitle>
          <Card>
            <p><strong>Última atualização:</strong> {date}</p>
            <p>
              Esta Política de Privacidade descreve como <strong>{name}</strong> coleta, utiliza
              e protege os dados pessoais dos usuários da rede Wi-Fi, em conformidade com a
              Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>

            <Heading>1. Dados Coletados</Heading>
            <p>Para acesso à rede, podemos coletar:</p>
            <ul>
              <li><strong>Dados de identificação:</strong> nome, CPF, e-mail e telefone (quando solicitados no formulário)</li>
              <li><strong>Dados de rede:</strong> endereço MAC do dispositivo e endereço IP</li>
              <li><strong>Dados de conexão:</strong> data/hora de acesso e duração da sessão</li>
            </ul>

            <Heading>2. Finalidade do Tratamento</Heading>
            <p>Os dados são utilizados para:</p>
            <ul>
              <li>Autenticação e controle de acesso à rede Wi-Fi</li>
              <li>Cumprimento de obrigações legais (Marco Civil da Internet)</li>
              <li>Melhoria do serviço oferecido</li>
              <li>Comunicações relevantes ao serviço (quando autorizado)</li>
            </ul>

            <Heading>3. Base Legal</Heading>
            <p>
              O tratamento de dados ocorre com base no consentimento do titular (Art. 7º, I da LGPD),
              no legítimo interesse (Art. 7º, IX) e no cumprimento de obrigação legal (Art. 7º, II).
            </p>

            <Heading>4. Compartilhamento</Heading>
            <p>
              Seus dados não são vendidos ou compartilhados com terceiros para fins comerciais.
              Podem ser compartilhados com autoridades competentes quando exigido por lei.
            </p>

            <Heading>5. Seus Direitos (LGPD)</Heading>
            <p>Você tem direito a:</p>
            <ul>
              <li>Confirmar a existência de tratamento dos seus dados</li>
              <li>Acessar os dados que possuímos sobre você</li>
              <li>Solicitar correção de dados incompletos ou incorretos</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
            </ul>

            <Heading>6. Retenção</Heading>
            <p>
              Os dados de conexão são mantidos pelo prazo mínimo de 12 meses,
              conforme exigido pelo Art. 13 do Marco Civil da Internet.
            </p>

            <Heading>7. Segurança</Heading>
            <p>
              Adotamos medidas técnicas e administrativas adequadas para proteger seus dados
              contra acesso não autorizado, perda ou destruição.
            </p>

            <Heading>8. Contato</Heading>
            <p>
              Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato
              diretamente com <strong>{name}</strong> no local onde o serviço é prestado.
            </p>
          </Card>
        </section>

      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
      {children}
    </h2>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: 16, padding: 24,
      boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
      display: 'flex', flexDirection: 'column', gap: 14,
      fontSize: 14, color: '#374151', lineHeight: 1.7,
    }}>
      {children}
    </div>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '4px 0 0' }}>
      {children}
    </h3>
  )
}
