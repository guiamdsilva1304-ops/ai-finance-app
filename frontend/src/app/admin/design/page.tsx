'use client';
import {
  Icon, IconName, Button, Card, GoalCard, FormField,
  PlanUpgradeCard, Toast, Chip, GoalProgress, Money,
} from '@/components/imoney/primitives';
import { C, FONT } from '@/components/imoney/tokens';

const SECTION = (title: string) => (
  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: C.ink3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16, marginTop: 40, borderBottom: `1px solid ${C.divider}`, paddingBottom: 8 }}>
    {title}
  </div>
);

const ICONS: IconName[] = [
  'target', 'piggy-bank', 'wallet', 'trending-up', 'sparkles', 'home',
  'plane', 'car', 'bell', 'user', 'compass', 'chevron-right',
  'chat', 'plus', 'calendar', 'check', 'ring', 'send',
  'arrow-up-right', 'arrow-down-left', 'pie',
];

export default function DesignSystemPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px', fontFamily: FONT }}>
      <div style={{ fontSize: 26, fontWeight: 900, color: C.green900, marginBottom: 4 }}>iMoney Design System</div>
      <div style={{ fontSize: 14, color: C.ink3, marginBottom: 0 }}>Todos os componentes e tokens visuais da iMoney.</div>

      {/* ICONS */}
      {SECTION('Ícones · Lucide 1.75px · iMoney Green')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 12 }}>
        {ICONS.map(name => (
          <div key={name} style={{ background: '#fff', border: `1px solid ${C.divider}`, borderRadius: 12, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Icon name={name} size={24} color={C.green900}/>
            <span style={{ fontSize: 10, color: C.ink3, textAlign: 'center', wordBreak: 'break-word' }}>{name}</span>
          </div>
        ))}
      </div>

      {/* CHIPS */}
      {SECTION('Chips')}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Chip label="Default" variant="default"/>
        <Chip label="Ativo" variant="active"/>
        <Chip label="✓ Concluído" variant="success"/>
        <Chip label="Atenção" variant="warning"/>
        <Chip label="Erro" variant="danger"/>
        <Chip label="Com ícone" variant="active" icon="target"/>
        <Chip label="Calendário" variant="default" icon="calendar"/>
        <Chip label="Reserva" variant="success" icon="piggy-bank"/>
      </div>

      {/* GOAL CARDS */}
      {SECTION('Goal Cards')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        <GoalCard
          title="Reserva de emergência" emoji="🏦"
          current="3.200" target="R$ 6.000"
          pct={53} statusLeft="53% concluído" statusRight="R$ 2.800 faltam"
          tone="white"
        />
        <GoalCard
          title="Viagem para Lisboa" emoji="✈️"
          current="1.850" target="R$ 8.000"
          pct={23} statusLeft="Aporte: R$ 400/mês" statusRight="23% de R$ 8.000"
          tone="dark"
        />
        <GoalCard
          title="Fundo casamento" emoji="💍"
          current="4.500" target="R$ 12.000"
          pct={37} statusLeft="37% guardado" statusRight="R$ 7.500 faltam"
          tone="gold"
        />
      </div>

      {/* FORM FIELDS */}
      {SECTION('Inputs')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 440 }}>
        <FormField label="E-mail" placeholder="seu@email.com" type="email" helper="Use o e-mail que você cadastrou"/>
        <FormField label="Renda mensal" placeholder="0,00" type="currency" prefix="R$"/>
        <FormField label="Campo com erro" value="Gui da iMoney" error="Esse campo é obrigatório"/>
        <FormField label="CPF" value="123.456.789-00" success="CPF válido ✓"/>
      </div>

      {/* BUTTONS */}
      {SECTION('Botões')}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Button variant="primary">Primário</Button>
        <Button variant="dark">Escuro</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="pro">✨ Pro</Button>
        <Button variant="primary" icon="plus">Nova meta</Button>
        <Button variant="dark" icon="send">Enviar</Button>
      </div>

      {/* CARDS */}
      {SECTION('Cards')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {(['white', 'tint', 'dark', 'gold'] as const).map(t => (
          <Card key={t} tone={t}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Card {t}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Texto de exemplo para ver o contraste.</div>
          </Card>
        ))}
      </div>

      {/* PLANS */}
      {SECTION('Plans — Free vs Pro')}
      <PlanUpgradeCard/>

      {/* TOASTS */}
      {SECTION('Toasts')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
        <Toast type="conquista" title="PARABÉNS! Meta atingida" body="Reserva de emergência: R$6.000. Qual o próximo sonho?"/>
        <Toast type="progresso" title="+R$625 guardados este mês" body="Você tá no caminho — faltam só R$1.875."/>
        <Toast type="atencao" title="Marina, seu saldo tá baixo" body="Vamos proteger sua meta? Tem R$280 fora do plano."/>
        <Toast type="gui" title="Gui da iMoney respondeu" body='"Olha, com R$200/mês você já dá um passo enorme..."'/>
      </div>

      {/* MONEY + PROGRESS */}
      {SECTION('Utilitários')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <Money value="1.290" cents="50" size={36}/>
          <Money value="29" cents="90" size={28} color={C.gold}/>
          <Money value="0" cents="00" size={22} color={C.ink3}/>
        </div>
        <div style={{ maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GoalProgress pct={65}/>
          <GoalProgress pct={30}/>
          <GoalProgress pct={100}/>
        </div>
      </div>

      {/* COLORS */}
      {SECTION('Paleta de cores')}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {Object.entries(C).map(([key, value]) => (
          <div key={key} style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: value, border: `1px solid rgba(0,0,0,0.06)`, marginBottom: 6 }}/>
            <div style={{ fontSize: 10, color: C.ink3, fontWeight: 700 }}>{key}</div>
            <div style={{ fontSize: 9, color: C.ink3 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
