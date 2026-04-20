export default function PrivacidadePage() {
  return (
    <div style={{ maxWidth:800, margin:"0 auto", padding:"40px 24px 80px", fontFamily:"'Nunito','Segoe UI',sans-serif", color:"#1a1a1a", lineHeight:1.8 }}>
      <div style={{ textAlign:"center", marginBottom:48 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>💸</div>
        <h1 style={{ fontSize:28, fontWeight:900, color:"#1a3a1a", margin:0 }}>Política de Privacidade</h1>
        <p style={{ color:"#666", marginTop:8 }}>Última atualização: Abril de 2026</p>
      </div>

      <S t="1. Quem somos">
        <p>A <strong>iMoney</strong> é um aplicativo de finanças pessoais com IA, operado por pessoa física, com sede na Rua Macedo Sobrinho, 46, Brasil.</p>
        <p>Contato LGPD: <a href="mailto:imoneyappcontato@gmail.com" style={{ color:"#00C853" }}>imoneyappcontato@gmail.com</a></p>
      </S>

      <S t="2. Quais dados coletamos">
        <ul>
          <li><strong>Cadastro:</strong> nome e email</li>
          <li><strong>Financeiros:</strong> renda, gastos e metas que você insere voluntariamente</li>
          <li><strong>Open Finance:</strong> transações bancárias, somente com sua autorização explícita via Pluggy</li>
          <li><strong>Uso:</strong> interações com o Assessor IA para melhorar as respostas</li>
        </ul>
        <p><strong>Não coletamos:</strong> documentos, localização, dados de menores ou informações de saúde.</p>
      </S>

      <S t="3. Para que usamos seus dados">
        <ul>
          <li>Fornecer e personalizar o serviço</li>
          <li>Categorizar gastos automaticamente</li>
          <li>Gerar insights pelo Assessor IA</li>
          <li>Enviar emails transacionais e de onboarding (com seu consentimento)</li>
        </ul>
        <p><strong>Jamais vendemos ou comercializamos seus dados.</strong></p>
      </S>

      <S t="4. Base legal (LGPD)">
        <ul>
          <li><strong>Consentimento</strong> (Art. 7º, I) — emails e Open Finance</li>
          <li><strong>Execução de contrato</strong> (Art. 7º, V) — para fornecer o serviço</li>
          <li><strong>Legítimo interesse</strong> (Art. 7º, IX) — segurança e prevenção de fraudes</li>
        </ul>
      </S>

      <S t="5. Compartilhamento">
        <ul>
          <li><strong>Pluggy</strong> — Open Finance, com sua autorização</li>
          <li><strong>Supabase</strong> — banco de dados com criptografia</li>
          <li><strong>Anthropic</strong> — processamento do Assessor IA, sem armazenamento permanente</li>
          <li><strong>Resend</strong> — envio de emails transacionais</li>
        </ul>
      </S>

      <S t="6. Retenção de dados">
        <ul>
          <li>Dados da conta: enquanto a conta estiver ativa</li>
          <li>Dados financeiros: até 5 anos após exclusão (obrigação legal)</li>
          <li>Open Finance: pelo período de consentimento autorizado</li>
        </ul>
      </S>

      <S t="7. Seus direitos (LGPD)">
        <ul>
          <li>✅ Acesso, correção e exclusão dos seus dados</li>
          <li>✅ Portabilidade em formato estruturado</li>
          <li>✅ Revogação de consentimento a qualquer momento</li>
        </ul>
        <p>Solicitações: <a href="mailto:imoneyappcontato@gmail.com" style={{ color:"#00C853" }}>imoneyappcontato@gmail.com</a> — respondemos em até 15 dias úteis.</p>
      </S>

      <S t="8. Segurança">
        <ul>
          <li>Senhas com hash bcrypt</li>
          <li>Comunicação criptografada HTTPS/TLS</li>
          <li>Banco de dados com criptografia em repouso</li>
        </ul>
      </S>

      <S t="9. Contato">
        <p>DPO: Guilherme — <a href="mailto:imoneyappcontato@gmail.com" style={{ color:"#00C853" }}>imoneyappcontato@gmail.com</a></p>
        <p>ANPD: <a href="https://www.gov.br/anpd" target="_blank" style={{ color:"#00C853" }}>www.gov.br/anpd</a></p>
      </S>

      <div style={{ marginTop:48, padding:24, background:"#f0faf4", borderRadius:12, border:"1px solid #c8e6c9", textAlign:"center" }}>
        <p style={{ margin:0, color:"#1a3a1a", fontSize:14 }}>💚 Seus dados financeiros são seus. Sempre.</p>
      </div>
    </div>
  );
}

function S({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:32 }}>
      <h2 style={{ fontSize:18, fontWeight:800, color:"#1a3a1a", marginBottom:12, paddingBottom:8, borderBottom:"2px solid #00C853" }}>{t}</h2>
      <div style={{ color:"#333", fontSize:15 }}>{children}</div>
    </div>
  );
}
