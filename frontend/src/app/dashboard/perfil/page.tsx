"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { CheckCircle2, User } from "lucide-react";
import TwoFactorSetup from "@/components/TwoFactorSetup";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Icon, type IconName } from "@/components/imoney/primitives";
import { useTheme } from "@/lib/theme";
import { normalizarTelefoneBR, formatarTelefoneBR } from "@/lib/phone";

const ESTADOS: Record<string, string> = {
  AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",
  DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",
  MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",
  PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",
  RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",
  SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins",
};

const CIDADES: Record<string, string[]> = {
  AC:["Rio Branco","Cruzeiro do Sul","Sena Madureira"],
  AL:["Maceió","Arapiraca","Palmeira dos Índios"],
  AP:["Macapá","Santana","Laranjal do Jari"],
  AM:["Manaus","Parintins","Itacoatiara","Manacapuru"],
  BA:["Salvador","Feira de Santana","Vitória da Conquista","Camaçari","Ilhéus"],
  CE:["Fortaleza","Caucaia","Juazeiro do Norte","Sobral","Crato"],
  DF:["Brasília","Ceilândia","Taguatinga","Samambaia"],
  ES:["Vitória","Serra","Vila Velha","Cariacica"],
  GO:["Goiânia","Aparecida de Goiânia","Anápolis","Rio Verde"],
  MA:["São Luís","Imperatriz","São José de Ribamar","Timon"],
  MT:["Cuiabá","Várzea Grande","Rondonópolis","Sinop"],
  MS:["Campo Grande","Dourados","Três Lagoas","Corumbá"],
  MG:["Belo Horizonte","Uberlândia","Contagem","Juiz de Fora","Betim","Montes Claros","Uberaba"],
  PA:["Belém","Ananindeua","Santarém","Marabá","Castanhal"],
  PB:["João Pessoa","Campina Grande","Santa Rita","Patos"],
  PR:["Curitiba","Londrina","Maringá","Ponta Grossa","Cascavel","Foz do Iguaçu"],
  PE:["Recife","Caruaru","Olinda","Petrolina","Jaboatão dos Guararapes"],
  PI:["Teresina","Parnaíba","Picos","Floriano"],
  RJ:["Rio de Janeiro","São Gonçalo","Duque de Caxias","Nova Iguaçu","Niterói","Campos dos Goytacazes"],
  RN:["Natal","Mossoró","Parnamirim","São Gonçalo do Amarante"],
  RS:["Porto Alegre","Caxias do Sul","Pelotas","Canoas","Santa Maria","Gravataí"],
  RO:["Porto Velho","Ji-Paraná","Ariquemes","Vilhena"],
  RR:["Boa Vista","Rorainópolis","Caracaraí"],
  SC:["Florianópolis","Joinville","Blumenau","São José","Chapecó","Criciúma","Itajaí"],
  SP:["São Paulo","Guarulhos","Campinas","São Bernardo do Campo","Santo André","Osasco","Ribeirão Preto","Sorocaba","Santos","São José dos Campos","Bauru","Jundiaí"],
  SE:["Aracaju","Nossa Senhora do Socorro","Lagarto","Itabaiana"],
  TO:["Palmas","Araguaína","Gurupi","Porto Nacional"],
};

const OCUPACOES = [
  "Empregado CLT","Servidor público","Empresário/Sócio",
  "Freelancer/Autônomo","Profissional liberal","Aposentado/Pensionista",
  "Estudante","Desempregado","Outro",
];

const EXPLORAR_LINKS: { href: string; icon: IconName; label: string; desc: string; color: string }[] = [
  { href: "/dashboard/metas",         icon: "target",      label: "Metas",           desc: "Acompanhe seus sonhos",        color: "#1D9E75" },
  { href: "/dashboard/investimentos", icon: "trending-up", label: "Investimentos",   desc: "Sua carteira em um lugar",     color: "#378ADD" },
  { href: "/dashboard/renda",         icon: "pie",         label: "Renda Variável",  desc: "Ações, FIIs e impostos",       color: "#7F77DD" },
  { href: "/dashboard/openfinance",   icon: "compass",     label: "Open Finance",    desc: "Conecte seus bancos",          color: "#EF9F27" },
];

interface Profile {
  estado?: string; cidade?: string; ocupacao?: string;
  idade?: number; filhos?: number;
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("free");

  const [nome, setNome] = useState("");
  const [nomePreferido, setNomePreferido] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [idade, setIdade] = useState("");
  const [filhos, setFilhos] = useState("0");
  const [ocupacao, setOcupacao] = useState(OCUPACOES[0]);
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [telefone, setTelefone] = useState("");
  const [phoneAtual, setPhoneAtual] = useState<string | null>(null);
  const [phoneMsg, setPhoneMsg] = useState("");

  // NPS
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState("");
  const [npsSubmitted, setNpsSubmitted] = useState(false);
  const [npsSaving, setNpsSaving] = useState(false);

  // Modais de ação crítica
  const [showCancelPlan, setShowCancelPlan] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const supabase = createSupabaseBrowser();
  const { isDark, toggle } = useTheme();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("user_profiles")
        .select("*").eq("user_id", user.id).single();
      if (data) {
        setProfile(data);
        setNome(data.nome ?? "");
        setNomePreferido(data.nome_preferido ?? "");
        setDataNascimento(data.data_nascimento ?? "");
        setIdade(data.idade?.toString() ?? "");
        setFilhos(data.filhos?.toString() ?? "0");
        setOcupacao(data.ocupacao ?? OCUPACOES[0]);
        setEstado(data.estado ?? "");
        setCidade(data.cidade ?? "");
        setPhoneAtual(data.phone ?? null);
        setPlan(data.plan ?? "free");
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  useEffect(() => { setCidade(""); }, [estado]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("imoney_nps");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.score !== undefined) setNpsScore(parsed.score);
        if (parsed.comment) setNpsComment(parsed.comment);
        if (parsed.submitted) setNpsSubmitted(true);
      }
    } catch {}
  }, []);

  function submitNPS() {
    if (npsScore === null) return;
    setNpsSaving(true);
    localStorage.setItem("imoney_nps", JSON.stringify({
      score: npsScore,
      comment: npsComment,
      submitted: true,
      date: new Date().toISOString(),
    }));
    setTimeout(() => { setNpsSaving(false); setNpsSubmitted(true); }, 600);
  }

  function npsScoreColor(score: number): string {
    if (score <= 6) return "#ef4444";
    if (score <= 8) return "#f59e0b";
    return "#00C853";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaved(false);
    let idadeCalculada = parseInt(idade);
    if (dataNascimento) {
      const nasc = new Date(dataNascimento);
      const hoje = new Date();
      idadeCalculada = hoje.getFullYear() - nasc.getFullYear() - (hoje < new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate()) ? 1 : 0);
    }
    const idadeN = idadeCalculada;
    if (idade && (isNaN(idadeN) || idadeN < 1 || idadeN > 120)) {
      setError("Idade inválida."); return;
    }
    if (estado && !cidade) { setError("Selecione sua cidade."); return; }
    let phoneNorm: string | null = null;
    if (telefone.trim()) {
      phoneNorm = normalizarTelefoneBR(telefone);
      if (!phoneNorm) {
        setError("Telefone inválido. Use DDD + número, ex: (21) 99999-9999.");
        return;
      }
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const upsertData: Record<string, unknown> = {
      user_id: user!.id,
      filhos: parseInt(filhos) || 0,
      ocupacao,
      nome_preferido: nomePreferido.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (idadeN) upsertData.idade = idadeN;
    if (estado) upsertData.estado = estado;
    if (cidade) upsertData.cidade = cidade;
    if (phoneNorm) upsertData.phone = phoneNorm; // desvincular só pelo botão dedicado

    const { error: err } = await supabase.from("user_profiles").upsert(upsertData, { onConflict: "user_id" });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setProfile({ ...profile, ...upsertData } as Profile);
    if (phoneNorm) {
      setPhoneAtual(phoneNorm);
      setTelefone("");
      setPhoneMsg("✅ WhatsApp vinculado com sucesso!");
      setTimeout(() => setPhoneMsg(""), 4000);
    }
  }

  async function desvincularWhatsApp() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: err } = await supabase.from("user_profiles")
      .update({ phone: null }).eq("user_id", user.id);
    if (err) { setPhoneMsg("⚠ Não foi possível desvincular. Tente de novo."); return; }
    setPhoneAtual(null);
    setTelefone("");
    setPhoneMsg("Número desvinculado.");
    setTimeout(() => setPhoneMsg(""), 4000);
  }

  async function cancelPlan() {
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("user_profiles").update({
      plan: "free",
      plan_expires_at: null,
      is_pro: false,
    }).eq("user_id", user!.id);
    setPlan("free");
    setActionLoading(false);
    setShowCancelPlan(false);
    setActionMsg("Plano cancelado. Você voltou para o plano gratuito.");
    setTimeout(() => setActionMsg(""), 5000);
  }

  async function deleteAccount() {
    if (deleteConfirm !== email) return;
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Apaga dados do usuário
    await supabase.from("transactions").delete().eq("user_id", user.id);
    await supabase.from("metas").delete().eq("user_id", user.id);
    await supabase.from("chat_history").delete().eq("user_id", user.id);
    await supabase.from("user_profiles").delete().eq("user_id", user.id);
    await supabase.auth.signOut();
    window.location.href = "/?conta=excluida";
  }

  const cidades = estado ? (CIDADES[estado] ?? []) : [];

  if (loading) return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto">
      <div className="card h-64 shimmer"/>
    </div>
  );

  return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto">

      {/* Modal cancelar plano */}
      {showCancelPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-2xl mb-3">😢</div>
            <h3 className="font-black text-[#0d2414] text-lg mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>Cancelar plano?</h3>
            <p className="text-sm text-[#6b9e80] mb-5 leading-relaxed">
              Você voltará ao plano gratuito com limite de 3 mensagens/dia no Assessor. Seus dados continuam salvos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelPlan(false)}
                className="flex-1 py-3 rounded-xl border border-[#e4f5e9] text-sm font-bold text-[#6b9e80]">
                Manter plano
              </button>
              <button onClick={cancelPlan} disabled={actionLoading}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: '#ef4444' }}>
                {actionLoading ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal excluir conta */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-2xl mb-3">⚠️</div>
            <h3 className="font-black text-[#0d2414] text-lg mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>Excluir conta permanentemente?</h3>
            <p className="text-sm text-[#6b9e80] mb-4 leading-relaxed">
              Todos os seus dados serão apagados — transações, metas, histórico e perfil. Essa ação <strong>não pode ser desfeita</strong>.
            </p>
            <p className="text-xs font-bold text-[#6b9e80] mb-2">Digite seu email para confirmar:</p>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={email}
              className="input mb-4 text-sm"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteAccount(false); setDeleteConfirm(""); }}
                className="flex-1 py-3 rounded-xl border border-[#e4f5e9] text-sm font-bold text-[#6b9e80]">
                Cancelar
              </button>
              <button onClick={deleteAccount} disabled={deleteConfirm !== email || actionLoading}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: '#ef4444' }}>
                {actionLoading ? "Excluindo..." : "Excluir conta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
          👤 Meu Perfil
        </h1>
        <p className="text-sm text-[#6b9e80] mt-0.5">
          Suas informações ajudam o assessor IA a dar recomendações mais precisas
        </p>
      </div>

      {actionMsg && (
        <div className="mb-5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3 text-sm text-[#15803d] font-medium">
          ✅ {actionMsg}
        </div>
      )}

      {/* Email + plano */}
      <div className="card mb-5 flex items-center justify-between gap-3 animate-fade-up opacity-0 anim-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#16a34a] to-[#22c55e] flex items-center justify-center text-white flex-shrink-0">
            <User size={22}/>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#8db89d] uppercase tracking-wider">Como te chamar</p>
            <p className="font-bold text-[#0d2414] truncate">{nomePreferido || nome || email}</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          {plan === 'free' && (
            <Link href="/dashboard/pro" className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: '#1D9E75' }}>
              ✦ Upgrade
            </Link>
          )}
          {plan === 'pro' && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: '#E1F5EE', color: '#085041' }}>
              ✦ Pro
            </span>
          )}
          {plan === 'premium' && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: '#FEF3C7', color: '#92400E' }}>
              ⭐ Premium
            </span>
          )}
        </div>
      </div>

      {/* Explorar — só mobile */}
      <div className="md:hidden mb-5 animate-fade-up opacity-0 anim-2">
        <p className="text-xs font-bold text-[#8db89d] uppercase tracking-wider mb-3">Explorar</p>
        <div className="grid grid-cols-2 gap-3">
          {EXPLORAR_LINKS.map(({ href, icon, label, desc, color }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-[#e4f5e9] active:scale-95 transition-transform"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18` }}>
                <Icon name={icon} size={18} color={color} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0d2414] leading-tight">{label}</p>
                <p className="text-[10px] text-[#8db89d] leading-tight mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={save} className="card animate-fade-up opacity-0 anim-3">
        <p className="font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>
          😊 Como quer ser chamado?
        </p>
        <div className="mb-5">
          <label className="label">Nome preferido</label>
          <input
            type="text"
            value={nomePreferido}
            onChange={e => setNomePreferido(e.target.value)}
            placeholder={nome ? nome.split(" ")[0] : "Ex: Gui, Rafa, Duda..."}
            maxLength={30}
            className="input"
          />
          <p className="text-xs text-[#8db89d] mt-1">
            É assim que a iMoney vai te chamar em todo o app.
          </p>
        </div>

        <div className="border-t border-[#e4f5e9] pt-5 mb-1">
          <p className="font-bold text-[#0d2414] mb-5" style={{ fontFamily: "Nunito, sans-serif" }}>
            📋 Informações Pessoais
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="label">Idade</label>
            <input type="number" value={idade} onChange={e => setIdade(e.target.value)}
              placeholder="Sua idade" min="1" max="120" className="input"/>
          </div>
          <div>
            <label className="label">Número de filhos</label>
            <input type="number" value={filhos} onChange={e => setFilhos(e.target.value)}
              min="0" max="20" className="input"/>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Ocupação</label>
            <select value={ocupacao} onChange={e => setOcupacao(e.target.value)} className="input">
              {OCUPACOES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-[#e4f5e9] pt-5 mb-5">
          <p className="font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>
            📍 Localização
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} className="input">
                <option value="">— Selecione o estado —</option>
                {Object.entries(ESTADOS).sort((a,b) => a[1].localeCompare(b[1])).map(([uf, nome]) => (
                  <option key={uf} value={uf}>{uf} — {nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cidade</label>
              <select value={cidade} onChange={e => setCidade(e.target.value)}
                disabled={!estado} className="input disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">— Selecione a cidade —</option>
                {cidades.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-[#e4f5e9] pt-5 mb-5">
          <p className="font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>
            📱 WhatsApp
          </p>

          {phoneAtual && (
            <div className="flex items-center justify-between gap-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3 mb-3">
              <div>
                <p className="text-xs font-bold text-[#15803d]">Número vinculado</p>
                <p className="text-sm font-bold text-[#0d2414]">{formatarTelefoneBR(phoneAtual)}</p>
              </div>
              <button type="button" onClick={desvincularWhatsApp}
                className="text-xs font-bold px-3 py-2 rounded-lg border border-red-200 text-red-500 bg-white flex-shrink-0">
                Desvincular
              </button>
            </div>
          )}

          <label className="label">{phoneAtual ? "Trocar número" : "Número com DDD"}</label>
          <input
            type="tel"
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
            placeholder="Ex: (21) 99999-9999"
            maxLength={20}
            className="input"
          />
          <p className="text-xs text-[#8db89d] mt-1">
            Vincule seu número para falar com o Assessor direto pelo WhatsApp.
          </p>

          {phoneMsg && (
            <p className="text-xs font-bold mt-2" style={{ color: phoneMsg.startsWith("⚠") ? "#ef4444" : "#15803d" }}>
              {phoneMsg}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
            ⚠ {error}
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
              Salvando...
            </span>
          ) : saved ? (
            <span className="flex items-center gap-2"><CheckCircle2 size={16}/> Salvo!</span>
          ) : "💾 Salvar perfil"}
        </button>
      </form>

      {/* Current profile display */}
      {(profile.estado || profile.ocupacao) && (
        <div className="card mt-5 animate-fade-up opacity-0 anim-4 bg-[#f8fdf9]">
          <p className="text-xs font-bold text-[#8db89d] uppercase tracking-wider mb-3">Perfil atual</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Idade", value: profile.idade ? `${profile.idade} anos` : "—" },
              { label: "Filhos", value: profile.filhos !== undefined ? String(profile.filhos) : "—" },
              { label: "Estado", value: profile.estado ? ESTADOS[profile.estado] ?? profile.estado : "—" },
              { label: "Cidade", value: profile.cidade ?? "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-bold text-[#8db89d] uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm font-bold text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>{value}</p>
              </div>
            ))}
          </div>
          {profile.ocupacao && (
            <p className="text-sm text-[#4a7a5a] mt-3">
              <strong>Ocupação:</strong> {profile.ocupacao}
            </p>
          )}
        </div>
      )}

      {/* Aparência */}
      <div className="card mt-5 animate-fade-up opacity-0 anim-4">
        <p className="font-bold mb-4" style={{ fontFamily: "Nunito, sans-serif", color: 'var(--text-1)' }}>
          🎨 Aparência
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>
              {isDark ? '🌙 Modo escuro ativo' : '☀️ Modo claro ativo'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {isDark ? 'Paleta verde escura — fácil para os olhos.' : 'Paleta branca padrão da iMoney.'}
            </p>
          </div>
          {/* Toggle switch */}
          <button
            onClick={toggle}
            aria-label="Alternar modo escuro"
            style={{
              position: 'relative', width: 52, height: 28, borderRadius: 99,
              background: isDark ? '#00C853' : '#d1d5db',
              border: 'none', cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.25s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: isDark ? 26 : 3,
              width: 22, height: 22, borderRadius: '50%',
              background: '#fff', transition: 'left 0.25s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12,
            }}>
              {isDark ? '🌙' : '☀️'}
            </span>
          </button>
        </div>

        {/* Preview das cores */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Fundo', color: isDark ? '#0d1f17' : '#f8fdf9' },
            { label: 'Card', color: isDark ? '#1a2e22' : '#ffffff' },
            { label: 'Borda', color: isDark ? '#2d4a38' : '#e4f5e9' },
            { label: 'Texto', color: isDark ? '#e8f5ee' : '#0d2414' },
            { label: 'Acento', color: '#00C853' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: color, border: '1.5px solid var(--border)', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Segurança */}
      <div className="mt-5">
        <p className="font-bold text-[#0d2414] mb-3" style={{ fontFamily: "Nunito, sans-serif" }}>
          🔐 Segurança
        </p>
        <TwoFactorSetup />
      </div>

      {/* NPS + Contato */}
      <div className="mt-8 card animate-fade-up opacity-0 anim-5">
        <p className="font-bold text-[#0d2414] mb-1" style={{ fontFamily: "Nunito, sans-serif" }}>
          ⭐ Avalie a iMoney
        </p>
        <p className="text-xs text-[#6b9e80] mb-4 leading-relaxed">
          Numa escala de 0 a 10, qual a probabilidade de você recomendar a iMoney para um amigo?
        </p>

        {npsSubmitted ? (
          <div style={{ background: "#f0fdf4", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
            <p className="text-sm font-bold text-[#0d2414] mb-1">
              🎉 Obrigado pelo seu feedback!
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: npsComment ? 8 : 0 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: "50%", fontWeight: 900, fontSize: 16,
                background: npsScore !== null ? npsScoreColor(npsScore) : "#00C853", color: "#fff",
              }}>
                {npsScore}
              </span>
              <span className="text-xs text-[#6b9e80]">sua nota</span>
            </div>
            {npsComment && (
              <p className="text-xs text-[#4a7a5a] italic">"{npsComment}"</p>
            )}
            <button
              onClick={() => setNpsSubmitted(false)}
              style={{ marginTop: 10, fontSize: 11, color: "#8db89d", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700 }}>
              Alterar avaliação
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setNpsScore(i)}
                  style={{
                    width: 36, height: 36, borderRadius: 10, fontWeight: 900, fontSize: 13,
                    border: npsScore === i ? "none" : `2px solid ${npsScoreColor(i)}`,
                    background: npsScore === i ? npsScoreColor(i) : "transparent",
                    color: npsScore === i ? "#fff" : npsScoreColor(i),
                    cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
                  }}>
                  {i}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: "#9ca3af" }}>Pouco provável</span>
              <span style={{ fontSize: 10, color: "#9ca3af" }}>Muito provável</span>
            </div>

            {npsScore !== null && (
              <textarea
                value={npsComment}
                onChange={e => setNpsComment(e.target.value)}
                placeholder="O que motivou sua nota? (opcional)"
                rows={2}
                className="input mb-3"
                style={{ resize: "vertical", fontSize: 13 }}
              />
            )}

            <button
              onClick={submitNPS}
              disabled={npsScore === null || npsSaving}
              className="btn-primary w-full disabled:opacity-40"
              style={{ marginBottom: 0 }}>
              {npsSaving ? "Enviando..." : "Enviar avaliação"}
            </button>
          </>
        )}

        <div style={{ borderTop: "1px solid #e4f5e9", marginTop: 16, paddingTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#0d2414", marginBottom: 2 }}>💬 Fale com a gente</p>
            <p style={{ fontSize: 11, color: "#6b9e80" }}>Suporte, dúvidas ou sugestões</p>
          </div>
          <a
            href="mailto:imoneyappcontato@gmail.com"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#f0fdf4", border: "1.5px solid #bbf7d0",
              color: "#15803d", fontWeight: 800, fontSize: 12,
              padding: "8px 14px", borderRadius: 10, textDecoration: "none",
              flexShrink: 0,
            }}>
            ✉ Enviar email
          </a>
        </div>
      </div>

      {/* Zona de perigo */}
      <div className="mt-8 border border-red-100 rounded-2xl p-5 bg-red-50">
        <p className="text-sm font-black text-red-600 mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>
          ⚠️ Zona de perigo
        </p>
        <div className="flex flex-col gap-3">
          {plan !== 'free' && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#0d2414]">Cancelar plano</p>
                <p className="text-xs text-[#8db89d]">Volta para o plano gratuito. Dados mantidos.</p>
              </div>
              <button onClick={() => setShowCancelPlan(true)}
                className="text-xs font-bold px-4 py-2 rounded-lg border border-red-200 text-red-500 bg-white flex-shrink-0 hover:bg-red-50 transition-colors">
                Cancelar plano
              </button>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#0d2414]">Excluir conta</p>
              <p className="text-xs text-[#8db89d]">Remove todos os dados permanentemente.</p>
            </div>
            <button onClick={() => setShowDeleteAccount(true)}
              className="text-xs font-bold px-4 py-2 rounded-lg text-white flex-shrink-0 transition-colors"
              style={{ background: '#ef4444' }}>
              Excluir conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
