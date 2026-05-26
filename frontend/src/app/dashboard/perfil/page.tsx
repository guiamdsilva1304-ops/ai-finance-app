"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { CheckCircle2, User } from "lucide-react";
import TwoFactorSetup from "@/components/TwoFactorSetup";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Icon, type IconName } from "@/components/imoney/primitives";

// Brazilian states and cities data
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
  const [dataNascimento, setDataNascimento] = useState("");
  const [idade, setIdade] = useState("");
  const [filhos, setFilhos] = useState("0");
  const [ocupacao, setOcupacao] = useState(OCUPACOES[0]);
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");

  const supabase = createSupabaseBrowser();

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
        setDataNascimento(data.data_nascimento ?? "");
        setIdade(data.idade?.toString() ?? "");
        setFilhos(data.filhos?.toString() ?? "0");
        setOcupacao(data.ocupacao ?? OCUPACOES[0]);
        setEstado(data.estado ?? "");
        setCidade(data.cidade ?? "");
        setPlan(data.plan ?? "free");
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  useEffect(() => { setCidade(""); }, [estado]);

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

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const upsertData: Record<string, unknown> = {
      user_id: user!.id,
      filhos: parseInt(filhos) || 0,
      ocupacao,
      updated_at: new Date().toISOString(),
    };
    if (idadeN) upsertData.idade = idadeN;
    if (estado) upsertData.estado = estado;
    if (cidade) upsertData.cidade = cidade;

    const { error: err } = await supabase.from("user_profiles").upsert(upsertData, { onConflict: "user_id" });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setProfile({ ...profile, ...upsertData } as Profile);
  }

  const cidades = estado ? (CIDADES[estado] ?? []) : [];

  if (loading) return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto">
      <div className="card h-64 shimmer"/>
    </div>
  );

  return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
          👤 Meu Perfil
        </h1>
        <p className="text-sm text-[#6b9e80] mt-0.5">
          Suas informações ajudam o assessor IA a dar recomendações mais precisas
        </p>
      </div>

      {/* Email + plano */}
      <div className="card mb-5 flex items-center justify-between gap-3 animate-fade-up opacity-0 anim-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#16a34a] to-[#22c55e] flex items-center justify-center text-white">
            <User size={22}/>
          </div>
          <div>
            <p className="text-xs font-bold text-[#8db89d] uppercase tracking-wider">Como te chamar</p>
            <p className="font-bold text-[#0d2414]">{nome || email}</p>
          </div>
        </div>
        <div>
          {plan === 'free' && (
            <Link href="/dashboard/pro" className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: '#1D9E75' }}>
              ✦ Fazer upgrade
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
        <p className="font-bold text-[#0d2414] mb-5" style={{ fontFamily: "Nunito, sans-serif" }}>
          📋 Informações Pessoais
        </p>

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

      <div className="mt-5">
        <p className="font-bold text-[#0d2414] mb-3" style={{ fontFamily: "Nunito, sans-serif" }}>
          🔐 Segurança
        </p>
        <TwoFactorSetup />
      </div>
    </div>
  );
}
