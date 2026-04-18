"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { formatBRL } from "@/lib/utils";
import { Landmark, Trash2, RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import Script from "next/script";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    PluggyConnect: new (options: {
      connectToken: string;
      includeSandbox?: boolean;
      onSuccess: (data: { item: { id: string; connector: { name: string } } }) => void;
      onError: (err: { message?: string }) => void;
      onClose?: () => void;
    }) => { init: () => void };
  }
}

interface Connection {
  id: string;
  item_id: string;
  connector_name: string;
  status: string;
  connected_at: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export default function OpenFinancePage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [accounts, setAccounts] = useState<Record<string, Account[]>>({});
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const supabase = createSupabaseBrowser();

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // Get auth token for API calls
  async function getAuthToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  const loadConnections = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("pluggy_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false });
    setConnections(data ?? []);
    setLoading(false);
  }, [supabase]);

  const fetchToken = useCallback(async () => {
    setTokenError("");
    const authToken = await getAuthToken();
    if (!authToken) return;
    try {
      const res = await fetch("/api/openfinance/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) { setTokenError(data.error ?? "Erro ao gerar token."); return; }
      setToken(data.accessToken);
    } catch {
      setTokenError("Erro de rede ao conectar com Pluggy.");
    }
  }, []);

  useEffect(() => {
    loadConnections();
    fetchToken();
  }, [loadConnections, fetchToken]);

  // Load Pluggy Connect SDK accounts for each connection
  useEffect(() => {
    // Accounts are fetched lazily when user expands a connection
  }, [connections]);

  function openWidget() {
    if (!token) { showToast("Token não disponível. Recarregue a página.", "err"); return; }
    if (!sdkReady || !window.PluggyConnect) {
      showToast("SDK Pluggy ainda carregando. Aguarde.", "err"); return;
    }
    setWidgetOpen(true);
    setConnecting(true);
    const widget = new window.PluggyConnect({
      connectToken: token,
      includeSandbox: false,
      onSuccess: async (data) => {
        setWidgetOpen(false);
        setConnecting(false);
        const itemId = data.item?.id;
        const connName = data.item?.connector?.name ?? "Banco";
        if (!itemId) { showToast("Item ID não recebido.", "err"); return; }
        // Save connection
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("pluggy_connections").upsert({
          user_id: user.id,
          item_id: itemId,
          connector_name: connName,
          status: "connected",
          connected_at: new Date().toISOString(),
        });
        showToast(`✅ ${connName} conectado com sucesso!`);
        loadConnections();
        fetchToken(); // refresh token for next use
      },
      onError: (err) => {
        setWidgetOpen(false);
        setConnecting(false);
        showToast(err.message ?? "Erro ao conectar banco.", "err");
      },
      onClose: () => {
        setWidgetOpen(false);
        setConnecting(false);
      },
    });
    widget.init();
  }

  async function disconnect(itemId: string, connName: string) {
    if (!confirm(`Desconectar ${connName}?`)) return;
    const authToken = await getAuthToken();
    if (authToken) {
      await fetch(`/api/openfinance/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("pluggy_connections")
        .delete().eq("item_id", itemId).eq("user_id", user.id);
    }
    showToast(`${connName} desconectado.`);
    loadConnections();
  }

  const pluggyConfigured = !tokenError.includes("não configurado");

  return (
    <>
      {/* Pluggy Connect SDK — loaded via Next.js Script component */}
      <Script
        src="https://cdn.pluggy.ai/pluggy-connect/v2.7.0/pluggy-connect.js"
        strategy="lazyOnload"
        onLoad={() => setSdkReady(true)}
        onError={() => setTokenError("Falha ao carregar SDK da Pluggy.")}
      />

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold",
          "animate-fade-up",
          toast.type === "ok"
            ? "bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d]"
            : "bg-red-50 border border-red-200 text-red-700"
        )}>
          {toast.type === "ok" ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      <div className="p-5 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-2xl font-black text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
              🏦 Open Finance
            </h1>
            <p className="text-sm text-[#6b9e80] mt-0.5">
              Conecte seus bancos via Pluggy — seguro, regulamentado pelo Banco Central
            </p>
          </div>
        </div>

        {/* Status bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Fase 1", desc: "Dados abertos", status: "available", badge: "✓ Disponível" },
            { label: "Fase 2", desc: "Extratos e saldos", status: "beta", badge: "⏳ Em homologação" },
            { label: "Fase 3+", desc: "Pix e pagamentos", status: "roadmap", badge: "🗓 Roadmap" },
          ].map(({ label, desc, status, badge }) => (
            <div key={label} className="card text-center py-4">
              <p className="font-black text-[#0d2414] text-sm mb-0.5" style={{ fontFamily: "Nunito, sans-serif" }}>{label}</p>
              <p className="text-xs text-[#6b9e80] mb-2">{desc}</p>
              <span className={cn("badge text-xs",
                status === "available" ? "badge-green" :
                status === "beta" ? "badge-yellow" : "bg-gray-100 text-gray-500"
              )}>{badge}</span>
            </div>
          ))}
        </div>

        {/* Plugin not configured warning */}
        {!pluggyConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <p className="font-bold text-amber-800 mb-2">⚙️ Pluggy não configurado</p>
            <p className="text-sm text-amber-700 mb-3">
              Adicione as chaves no arquivo <code className="bg-amber-100 px-1 rounded">.env.local</code>:
            </p>
            <pre className="bg-amber-100 rounded-xl p-3 text-xs text-amber-800 overflow-x-auto">{`PLUGGY_CLIENT_ID="seu-client-id"
PLUGGY_CLIENT_SECRET="seu-client-secret"
PLUGGY_WEBHOOK_URL="https://seu-dominio.com/api/openfinance/webhook"  # opcional`}</pre>
            <a href="https://dashboard.pluggy.ai" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-amber-700 font-bold hover:text-amber-900">
              Obter chaves no Dashboard Pluggy <ExternalLink size={13}/>
            </a>
          </div>
        )}

        {/* Connect button */}
        {pluggyConfigured && (
          <div className="card mb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-[#0d2414] mb-1" style={{ fontFamily: "Nunito, sans-serif" }}>
                  ➕ Conectar banco
                </p>
                <p className="text-sm text-[#6b9e80]">
                  O widget seguro da Pluggy abrirá em modal. Suas credenciais nunca são armazenadas pelo iMoney.
                </p>
              </div>
              <Landmark size={22} className="text-[#16a34a] shrink-0 mt-0.5" />
            </div>

            <button
              onClick={openWidget}
              disabled={!token || !sdkReady || connecting || widgetOpen}
              className="btn-primary w-full mt-4"
            >
              {connecting || widgetOpen ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                  Abrindo widget...
                </span>
              ) : !sdkReady ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                  Carregando SDK...
                </span>
              ) : !token ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={15} className="animate-spin"/>
                  Gerando token...
                </span>
              ) : (
                "🏦 Conectar meu banco agora"
              )}
            </button>

            {token && (
              <p className="text-center text-[11px] text-[#8db89d] mt-2">
                🔐 Token seguro gerado — válido por 30 min
              </p>
            )}
            {tokenError && (
              <p className="text-center text-xs text-red-500 mt-2">{tokenError}</p>
            )}
          </div>
        )}

        {/* Connected banks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-[#0d2414]" style={{ fontFamily: "Nunito, sans-serif" }}>
              Bancos conectados {connections.length > 0 && `(${connections.length})`}
            </p>
            <button onClick={loadConnections} className="btn-ghost p-2 rounded-lg" title="Atualizar">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0,1].map(i => <div key={i} className="card h-20 shimmer" />)}
            </div>
          ) : connections.length === 0 ? (
            <div className="card text-center py-10 bg-[#f8fdf9]">
              <p className="text-4xl mb-3">🏦</p>
              <p className="font-bold text-[#0d2414]">Nenhum banco conectado</p>
              <p className="text-sm text-[#6b9e80] mt-1">Conecte seu banco acima para ver saldos e extratos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((conn) => (
                <div key={conn.id} className="card card-hover">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] flex items-center justify-center text-[#16a34a]">
                        <Landmark size={18}/>
                      </div>
                      <div>
                        <p className="font-bold text-[#0d2414] text-sm" style={{ fontFamily: "Nunito, sans-serif" }}>
                          {conn.connector_name}
                        </p>
                        <p className="text-xs text-[#8db89d]">
                          Conectado em {new Date(conn.connected_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-green">✓ Ativo</span>
                      <button
                        onClick={() => disconnect(conn.item_id, conn.connector_name)}
                        className="p-2 rounded-lg hover:bg-red-50 text-[#8db89d] hover:text-red-500 transition-colors"
                        title="Desconectar"
                      >
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="mt-6 bg-[#f0fdf4] border border-[#dcfce7] rounded-2xl p-4">
          <p className="font-bold text-[#15803d] text-sm mb-2">🔒 Segurança e Privacidade</p>
          <ul className="text-xs text-[#4a7a5a] space-y-1">
            {[
              "O iMoney nunca armazena suas senhas bancárias",
              "Conexão usa OAuth 2.0 + FAPI regulamentado pelo Banco Central",
              "Você pode revogar o acesso a qualquer momento pelo app do banco",
              "Dados protegidos pela LGPD — consentimento expira em 12 meses",
            ].map(t => <li key={t}>• {t}</li>)}
          </ul>
        </div>
      </div>
    </>
  );
}
