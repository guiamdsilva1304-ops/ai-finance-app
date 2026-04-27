// frontend/app/api/cron/agents/route.js
// Roda automaticamente via Vercel Cron — configure em vercel.json:
// { "crons": [{ "path": "/api/cron/agents", "schedule": "0 8 * * *" }] }

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MCP_SERVERS = [
  { type: "url", url: "https://mcp.supabase.com/mcp", name: "supabase-mcp" },
  { type: "url", url: "https://mcp.vercel.com", name: "vercel-mcp" },
];

const BASE_CONTEXT = `
EMPRESA: iMoney — fintech brasileira de IA financeira pessoal
FUNDADOR: Gui Moreira
SUPABASE: ${process.env.NEXT_PUBLIC_SUPABASE_URL}
STACK: Next.js 14, Supabase, Claude Sonnet, Vercel, Resend
EXECUÇÃO: Job autônomo rodando via Vercel Cron — sem intervenção humana
`;

// ── AGENT RUNNERS ─────────────────────────────────────────────────────────────
async function runAgent(agentId, agentName, systemPrompt, task) {
  console.log(`[${agentName}] Iniciando job: ${task}`);

  // Marca job como running
  await supabase
    .from("agent_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("agent_id", agentId);

  const runStart = Date.now();
  let runId;

  // Cria registro de execução
  const { data: runData } = await supabase
    .from("agent_runs")
    .insert({ agent_id: agentId, status: "running" })
    .select("id")
    .single();
  runId = runData?.id;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: task }],
      mcp_servers: MCP_SERVERS,
    });

    const content = response.content || [];
    const tools = content.filter(b => b.type === "mcp_tool_use").map(b => b.name);
    const reply = content.filter(b => b.type === "text").map(b => b.text).join("") || "";
    const duration = Date.now() - runStart;

    // Atualiza job e run como completos
    await supabase.from("agent_jobs").update({
      status: "completed",
      last_run_at: new Date().toISOString(),
      runs_total: supabase.rpc("increment", { x: 1 }),
      runs_success: supabase.rpc("increment", { x: 1 }),
      result_summary: reply.slice(0, 200),
      updated_at: new Date().toISOString(),
    }).eq("agent_id", agentId);

    if (runId) {
      await supabase.from("agent_runs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        actions_taken: tools,
        output: reply.slice(0, 2000),
        duration_ms: duration,
      }).eq("id", runId);
    }

    console.log(`[${agentName}] ✅ Concluído em ${duration}ms. Tools usadas: ${tools.join(", ")}`);
    return { success: true, agentId, output: reply.slice(0, 500), tools };
  } catch (error) {
    console.error(`[${agentName}] ❌ Erro:`, error.message);
    await supabase.from("agent_jobs").update({ status: "failed", error_message: error.message }).eq("agent_id", agentId);
    if (runId) await supabase.from("agent_runs").update({ status: "failed", error: error.message, completed_at: new Date().toISOString() }).eq("id", runId);
    return { success: false, agentId, error: error.message };
  }
}

// ── MAIN CRON HANDLER ─────────────────────────────────────────────────────────
export async function GET(request) {
  // Verifica autenticação do cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = [];

  console.log("🤖 iMoney Agent Cron — Iniciando execução autônoma...");

  // ── 1. KAI — Monitor de erros (roda primeiro, informa os outros) ──
  results.push(await runAgent("kai", "Kai", `${BASE_CONTEXT}
Você é Kai, CTO da iMoney. JOB AUTÔNOMO CRON.
Tarefa: monitorar infraestrutura e comunicar problemas aos outros agentes.
Após agir: INSERT INTO agent_messages (from_agent, to_agent, message_type, subject, body, priority) para cada descoberta relevante.`,
    `Execute o monitoramento completo:
1. Verifique logs do Supabase (api, auth) — use get_logs
2. Identifique erros 4xx/5xx
3. Verifique se o bug user_memory 406 ainda existe: SELECT * FROM agent_memory WHERE key='bugs_ativos'
4. Se o bug ainda existir, aplique o fix: CREATE POLICY IF NOT EXISTS "user_memory_select_own" ON public.user_memory FOR SELECT USING (auth.uid() = user_id)
5. Após corrigir: UPDATE agent_memory SET value=jsonb_set(value, '{bug_resolvido}', 'true'), updated_by='kai' WHERE key='bugs_ativos'
6. INSERT em agent_messages para 'ana' com o resultado
7. UPDATE agent_jobs SET runs_total=runs_total+1 WHERE agent_id='kai'`
  ));

  // ── 2. PEDRO — Unit economics (informa estado financeiro) ──
  results.push(await runAgent("pedro", "Pedro", `${BASE_CONTEXT}
Você é Pedro, CFO da iMoney. JOB AUTÔNOMO CRON.
Calcule unit economics reais e atualize a memória compartilhada.`,
    `Execute análise financeira:
1. SELECT COUNT(*) FROM user_profiles AS usuarios
2. SELECT COUNT(DISTINCT user_id) FROM chat_history AS usuarios_ia
3. SELECT COUNT(*) FROM chat_history AS total_chats
4. Calcule: custo_api = total_chats * 0.008 (USD)
5. UPDATE agent_memory SET value=jsonb_build_object('status','early_stage','usuarios', usuarios, 'chats', total_chats, 'custo_api_usd', custo_api, 'mrr', 0, 'runway', 'bootstrapped'), updated_by='pedro', updated_at=NOW() WHERE key='company_health'
6. INSERT em agent_messages (from_agent='pedro', to_agent='ana', message_type='response', subject='Unit Economics Atualizados', body='[métricas calculadas]', priority='normal')
7. UPDATE agent_jobs SET runs_total=runs_total+1 WHERE agent_id='pedro'`
  ));

  // ── 3. LUCAS — Gera conteúdo (usa dados reais) ──
  results.push(await runAgent("lucas", "Lucas", `${BASE_CONTEXT}
Você é Lucas, CMO da iMoney. JOB AUTÔNOMO CRON.
Gere um post com dados reais e salve no banco.`,
    `Execute criação de conteúdo:
1. SELECT value FROM agent_memory WHERE key='company_health'
2. SELECT COUNT(*) FROM user_profiles, SELECT COUNT(*) FROM chat_history, SELECT COUNT(*) FROM metas
3. Crie um post para LinkedIn usando UM dado real da iMoney (não inventar)
4. INSERT INTO admin_posts (platform, format, tone, audience, theme, post, hashtags, cta, melhor_horario, gancho, insight, used) VALUES ('linkedin','single','provocativo','empreendedores','ia-financeira','[POST COM DADO REAL]', ARRAY['imoney','financaspessoais','ia'], '[CTA]', '18h-20h', '[PRIMEIRA LINHA]', '[INSIGHT]', false)
5. UPDATE agent_memory SET value=jsonb_set(value::jsonb, '{posts_criados}', to_jsonb(COALESCE((value->>'posts_criados')::int,0)+1)), updated_by='lucas' WHERE key='content_pipeline'
6. UPDATE agent_jobs SET runs_total=runs_total+1 WHERE agent_id='lucas'`
  ));

  // ── 4. JULIA — Reativação (usa dados dos outros agentes) ──
  results.push(await runAgent("julia", "Julia", `${BASE_CONTEXT}
Você é Julia, Head CS da iMoney. JOB AUTÔNOMO CRON.
Identifique usuários que precisam de atenção e aja.`,
    `Execute reativação:
1. SELECT user_id FROM user_profiles WHERE welcome_sent = false LIMIT 10
2. Para cada user_id sem welcome: INSERT INTO email_queue (user_id, email, type, scheduled_for, status, metadata) VALUES (user_id, 'usuário@email.com', 'welcome', NOW() + INTERVAL '1 hour', 'pending', '{"subject":"Bem-vindo à iMoney!","body":"Você tem um assessor financeiro IA esperando por você."}')
3. SELECT COUNT(*) FROM user_profiles up WHERE NOT EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = up.user_id) AS inativos
4. INSERT em agent_messages para 'lucas' se houver muitos inativos: 'Precisamos de conteúdo de reativação — X usuários sem transações'
5. UPDATE agent_jobs SET runs_total=runs_total+1 WHERE agent_id='julia'`
  ));

  // ── 5. ANA — Briefing diário (consolida tudo) ──
  // Ana roda por último — consolida os resultados dos outros agentes
  results.push(await runAgent("ana", "Ana", `${BASE_CONTEXT}
Você é Ana, COO da iMoney. JOB AUTÔNOMO CRON — roda por último para consolidar tudo.
Leia as mensagens dos outros agentes e gere o briefing executivo do dia.`,
    `Execute o briefing consolidado:
1. SELECT * FROM agent_messages WHERE created_at > NOW() - INTERVAL '2 hours' ORDER BY priority DESC
2. SELECT * FROM agent_memory
3. SELECT COUNT(*) FROM user_profiles, COUNT(*) FROM transactions, COUNT(*) FROM chat_history, COUNT(*) FROM metas, COUNT(*) FROM email_queue WHERE status='pending'
4. Gere o briefing executivo completo em Markdown com: Saúde Geral, Números do Dia, O que cada agente fez hoje, Alertas Críticos, Prioridade #1
5. INSERT INTO admin_posts (platform, format, tone, audience, theme, post, hashtags, cta, melhor_horario, gancho, insight, used) VALUES ('interno','briefing','executivo','fundador','operacoes','[BRIEFING COMPLETO]',ARRAY['briefing','imoney'],'Revisar e agir','08:00','[RESUMO EM 1 LINHA]','[PRINCIPAL INSIGHT]',false)
6. UPDATE agent_memory SET value=jsonb_build_object('data', NOW()::text, 'resumo', '[RESUMO DO DIA]'), updated_by='ana', updated_at=NOW() WHERE key='last_briefing'
7. UPDATE agent_jobs SET runs_total=runs_total+1, last_run_at=NOW() WHERE agent_id='ana'`
  ));

  const totalTime = Date.now() - startTime;
  const successes = results.filter(r => r.success).length;

  console.log(`\n🏁 Cron concluído em ${totalTime}ms — ${successes}/${results.length} agentes com sucesso`);

  return Response.json({
    success: true,
    timestamp: new Date().toISOString(),
    duration_ms: totalTime,
    agents_run: results.length,
    agents_success: successes,
    results: results.map(r => ({ agentId: r.agentId, success: r.success, tools: r.tools })),
  });
}
