"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { CheckCircle2, User } from "lucide-react";
import TwoFactorSetup from "@/components/TwoFactorSetup";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/imoney/primitives";
import { C, FONT } from "@/components/imoney/tokens";

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

  // Form
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
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  // Reset cidade when estado changes
  useEffect(() => { setCidade(""); }, [estado]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaved(false);
    // Calcula idade pela data de nascimento se disponivel
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

      {/* Email card */}
      <div className="card mb-5 flex items-center gap-3 animate-fade-up opacity-0 anim-1">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#16a34a] to-[#22c55e] flex items-center justify-center text-white">
          <User size={22}/>
        </div>
        <div>
          <p className="text-xs font-bold text-[#8db89d] uppercase tracking-wider">Email</p>
          <p className="font-bold text-[#0d2414]">{email}</p>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={save} className="card animate-fade-up opacity-0 anim-2">
        <p className="font-bold text-[#0d2414] mb-5" style={{ fontFamily: "Nunito, sans-serif" }}>
          📋 Informações Pessoais
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <FormField
            label="Idade"
            placeholder="Sua idade"
            value={idade}
            onChange={setIdade}
          />
          <FormField
            label="Número de filhos"
            placeholder="0"
            value={filhos}
            onChange={setFilhos}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: C.green900, fontFamily: FONT, display: 'block', marginBottom: 6 }}>Ocupação</label>
            <select
              value={ocupacao}
              onChange={e => setOcupacao(e.target.value)}
              style={{
                width: '100%', padding: '13px 14px', border: `1.5px solid rgba(26,58,26,0.18)`,
                borderRadius: 12, fontSize: 15, fontFamily: FONT, color: C.ink,
                background: '#fff', outline: 'none', appearance: 'auto',
              }}>
              {OCUPACOES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-[#e4f5e9] pt-5 mb-5">
          <p className="font-bold text-[#0d2414] mb-4" style={{ fontFamily: "Nunito, sans-serif" }}>
            📍 Localização
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: C.green900, fontFamily: FONT, display: 'block', marginBottom: 6 }}>Estado</label>
              <select
                value={estado}
                onChange={e => setEstado(e.target.value)}
                style={{ width: '100%', padding: '13px 14px', border: `1.5px solid rgba(26,58,26,0.18)`, borderRadius: 12, fontSize: 15, fontFamily: FONT, color: C.ink, background: '#fff', outline: 'none' }}>
                <option value="">— Selecione o estado —</option>
                {Object.entries(ESTADOS).sort((a,b) => a[1].localeCompare(b[1])).map(([uf, n]) => (
                  <option key={uf} value={uf}>{uf} — {n}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: C.green900, fontFamily: FONT, display: 'block', marginBottom: 6 }}>Cidade</label>
              <select
                value={cidade}
                onChange={e => setCidade(e.target.value)}
                disabled={!estado}
                style={{ width: '100%', padding: '13px 14px', border: `1.5px solid rgba(26,58,26,0.18)`, borderRadius: 12, fontSize: 15, fontFamily: FONT, color: C.ink, background: '#fff', outline: 'none', opacity: !estado ? 0.5 : 1 }}>
                <option value="">— Selecione a cidade —</option>
                {cidades.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#ffebee', border: '1.5px solid #ef9a9a', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: C.danger, fontWeight: 600, fontFamily: FONT, marginBottom: 16 }}>
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
        <div className="card mt-5 animate-fade-up opacity-0 anim-3 bg-[#f8fdf9]">
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
import { useMFA } from "@/hooks/useMFA";

export function SecurityCard() {
  const { status, factors, refresh } = useMFA();
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  const isEnabled = status === "enabled";
  const isLoading = status === "loading";

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" stroke="#374151" strokeWidth="1.5" fill="none"/>
                <path d="M9 12l2 2 4-4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Segurança da conta</h3>
              <p className="text-xs text-gray-400">Proteja seus dados financeiros</p>
            </div>
          </div>
        </div>

        {/* 2FA Row */}
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">
                  Autenticação em dois fatores
                </span>
                {!isEnabled && (
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><path d="M5 0l1.18 3.64H10L7.09 5.9 8.27 9.55 5 7.28 1.73 9.55 2.91 5.9 0 3.64h3.82z"/></svg>
                    Recomendado
                  </span>
                )}
                {isEnabled && (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {isEnabled
                  ? "Seu código de verificação será solicitado em cada login."
                  : "Adicione verificação por código ao fazer login. Mais segurança para seus dados."}
              </p>

              {isEnabled && factors[0] && (
                <p className="text-xs text-gray-400 mt-1">
                  Ativado em{" "}
                  {new Date(factors[0].created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            <div className="flex-shrink-0">
              {isLoading ? (
                <div className="w-20 h-9 bg-gray-100 rounded-xl animate-pulse" />
              ) : isEnabled ? (
                <button
                  onClick={() => setShowDisable(true)}
                  className="px-4 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-red-500 hover:border-red-200 transition-all"
                >
                  Desativar
                </button>
              ) : (
                <button
                  onClick={() => setShowSetup(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#00C853] rounded-xl hover:bg-[#00B84A] transition-colors shadow-sm shadow-green-200"
                >
                  Ativar
                </button>
              )}
            </div>
          </div>

          {/* Security level indicator */}
          {!isLoading && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">Nível de segurança</span>
                <span className={`text-xs font-semibold ${isEnabled ? "text-green-600" : "text-amber-500"}`}>
                  {isEnabled ? "Alta" : "Básica"}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isEnabled
                      ? "w-full bg-gradient-to-r from-[#00C853] to-[#00E676]"
                      : "w-1/2 bg-gradient-to-r from-amber-400 to-amber-300"
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <MFASetupModal
        isOpen={showSetup}
        onClose={() => setShowSetup(false)}
        onSuccess={refresh}
      />

      <MFADisableModal
        isOpen={showDisable}
        onClose={() => setShowDisable(false)}
        onSuccess={refresh}
        factorId={factors[0]?.id}
      />
    </>
  );
}
