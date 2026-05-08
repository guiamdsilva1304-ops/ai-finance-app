import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.imoneycronsecret2026)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    // Claude Code revisa o projeto e corrige automaticamente
    const resultado = execSync(
      `cd /workspaces/ai-finance-app && claude --print "Revise todos os arquivos TypeScript em /frontend/src, identifique erros de tipo, bugs e problemas de segurança, corrija automaticamente e faça commit com a mensagem 'fix: revisão automática do agente dev'"`,
      { timeout: 120000, encoding: 'utf8' }
    )
    return NextResponse.json({ sucesso: true, log: resultado })
  } catch (error) {
    console.error('[/api/cron/revisar]', error)
    return NextResponse.json({ error: 'Erro na revisão automática' }, { status: 500 })
  }
}
