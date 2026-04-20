export default function TermosPage() {
  return (
    <div style={{ maxWidth:800, margin:"0 auto", padding:"40px 24px 80px", fontFamily:"'Nunito','Segoe UI',sans-serif", color:"#1a1a1a", lineHeight:1.8 }}>
      <div style={{ textAlign:"center", marginBottom:48 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>💸</div>
        <h1 style={{ fontSize:28, fontWeight:900, color:"#1a3a1a", margin:0 }}>Termos de Uso</h1>
        <p style={{ color:"#666", marginTop:8 }}>Última atualização: Abril de 2026</p>
      </div>

      <div style={{ background:"#fff8e1", border:"1px solid #ffe082", borderRadius:12, padding:20, marginBottom:32 }}>
        <p style={{ margin:0, fontSize:14, color:"#5d4037" }}>
          ⚠️ <strong>Importante:</strong> A iMoney é um app de organização financeira pessoal. Não somos instituição financeira, não oferecemos crédito nem captamos depósitos. Nossas sugestões são educativas e não constituem consultoria financeira profissional.
        </p>
      </div>

      <S t="1. Aceitação">
        <p>Ao criar uma conta, você concorda com estes Termos e nossa <a href="/privacidade" style={{ color:"#00C853" }}>Política de Privacidade</a>.</p>
      </S>

      <S t="2. O que é a iMoney">
        <ul>
          <li>Categorização automática de gastos via Open Finance</li>
          <li>Assessor financeiro por IA (powered by Claude/Anthropic)</li>
          <li>Metas financeiras inteligentes</li>
          <li>Visão consolidada das finanças</li>
        </ul>
      </S>

      <S t="3. Elegibilidade">
        <ul>
          <li>Mínimo 18 anos</li>
          <li>Residente no Brasil</li>
          <li>Informações verdadeiras no cadastro</li>
        </ul>
      </S>

      <S t="4. Open Finance">
        <ul>
          <li>Sempre opcional e requer autorização explícita</li>
          <li>Realizado pela Pluggy, certificada pelo Banco Central</li>
          <li>Modo somente leitura — nunca movimentamos dinheiro</li>
          <li>Pode ser revogado a qualquer momento</li>
        </ul>
      </S>

      <S t="5. Assessor IA — limitações">
        <ul>
          <li>Sugestões são educativas, não consultoria financeira profissional</li>
          <li>Não somos responsáveis por decisões tomadas com base na IA</li>
          <li>Não oferecemos recomendações de investimentos regulados pela CVM</li>
        </ul>
      </S>

      <S t="6. Uso aceitável">
        <p>É proibido: atividades ilegais, acesso a dados de outros usuários, engenharia reversa, uso de bots ou sobrecarga dos servidores.</p>
      </S>

      <S t="7. Gratuidade e mudanças">
        <p>A iMoney é gratuita. Caso introduzamos planos pagos, você será notificado com 30 dias de antecedência por email.</p>
      </S>

      <S t="8. Cancelamento">
        <p>Cancele a qualquer momento pelo app (Perfil → Configurações → Excluir conta) ou por email: <a href="mailto:imoneyappcontato@gmail.com" style={{ color:"#00C853" }}>imoneyappcontato@gmail.com</a></p>
        <p>Seus dados serão removidos em até 30 dias, exceto onde a lei exigir retenção.</p>
      </S>

      <S t="9. Legislação">
        <p>Regido pelas leis brasileiras: LGPD (13.709/2018), CDC (8.078/1990) e Marco Civil da Internet (12.965/2014).</p>
      </S>

      <S t="10. Contato">
        <p><a href="mailto:imoneyappcontato@gmail.com" style={{ color:"#00C853" }}>imoneyappcontato@gmail.com</a> — Rua Macedo Sobrinho, 46, Brasil</p>
      </S>

      <div style={{ marginTop:48, padding:24, background:"#f0faf4", borderRadius:12, border:"1px solid #c8e6c9", textAlign:"center" }}>
        <p style={{ margin:0, color:"#1a3a1a", fontSize:14 }}>💚 Transparência e respeito são valores inegociáveis para nós.</p>
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
