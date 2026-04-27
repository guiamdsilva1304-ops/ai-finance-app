import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MCP_SERVERS = [
  { type: "url", url: "https://mcp.supabase.com/mcp", name: "supabase-mcp" },
  { type: "url", url: "https://mcp.vercel.com", name: "vercel-mcp" },
];

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const start = Date.now();
  console.log("🤖 iMoney Agents Cron — Iniciando...");

  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `Você é Ana, COO da iMoney. Execute o briefing diário automaticamente:
1. Leia dados do Supabase (user_profiles, transactions, chat_history, metas, agent_messages)
2. Gere briefing executivo resumido
3. Salve em admin_posts com platform='interno', format='briefing', used=false
4. Atualize agent_jobs SET last_run_at=NOW(), runs_total=runs_total+1 WHERE agent_id='ana'`,
      messages: [{ role: "user", content: "Execute o briefing diário agora." }],
      mcp_servers: MCP_SERVERS,
    });

    const reply = res.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    console.log("✅ Concluído em", Date.now() - start, "ms");

    return Response.json({ success: true, duration_ms: Date.now() - start, summary: reply.slice(0, 300) });
  } catch (error) {
    console.error("❌ Erro:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
