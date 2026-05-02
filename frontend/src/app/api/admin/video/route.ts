import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ATLAS_KEY = process.env.ATLAS_API_KEY!
const ATLAS_URL = 'https://api.atlascloud.ai/api/v1'

function roteiroParaPrompt(roteiro: string): string {
  return `Vertical video 9:16 for Instagram Reels. Young Brazilian person talking confidently about personal finance. Modern clean background, good lighting. Natural gestures. Topic: ${roteiro.slice(0, 200)}. Photorealistic, cinematic, 1080p.`
}

async function gerarVideo(prompt: string, duracao: number): Promise<string> {
  const res = await fetch(`${ATLAS_URL}/model/generateVideo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ATLAS_KEY}`,
    },
    body: JSON.stringify({
      model: 'bytedance/seedance-2.0/text-to-video',
      prompt,
      duration: duracao,
      resolution: '720p',
      ratio: '9:16',
      generate_audio: false,
      watermark: false,
    }),
  })
  const data = await res.json()
  console.log('[Atlas generate response]', JSON.stringify(data))
  if (!res.ok) throw new Error(data?.error || data?.message || 'Erro ao gerar vídeo')
  // ID pode estar em data.data.id ou data.id dependendo da versão
  const id = data?.data?.id ?? data?.id
  if (!id) throw new Error('ID não retornado: ' + JSON.stringify(data))
  return id
}

async function verificarVideo(taskId: string): Promise<{ status: string; url?: string }> {
  const res = await fetch(`${ATLAS_URL}/model/prediction/${taskId}`, {
    headers: { 'Authorization': `Bearer ${ATLAS_KEY}` },
  })
  const data = await res.json()
  console.log('[Atlas status response]', JSON.stringify(data))
  // Status pode estar em data.data.status ou data.status
  const inner = data?.data ?? data
  const status = inner?.status ?? 'processing'
  const url = inner?.outputs?.[0]
  return { status, url }
}

export async function POST(req: NextRequest) {
  try {
    const { roteiro, legenda, hashtags, formato = 'Reels', duracao = 8 } = await req.json()
    if (!roteiro) return NextResponse.json({ error: 'roteiro obrigatório' }, { status: 400 })

    const prompt = roteiroParaPrompt(roteiro)
    const taskId = await gerarVideo(prompt, duracao)

    const { data, error } = await supabase.from('video_queue').insert({
      roteiro,
      prompt_video: prompt,
      formato,
      duracao_segundos: duracao,
      status: 'gerando',
      task_id: taskId,
      legenda: legenda ?? '',
      hashtags: hashtags ?? '',
    }).select().single()

    if (error) throw error

    return NextResponse.json({
      sucesso: true,
      id: data.id,
      task_id: taskId,
      mensagem: `Vídeo sendo gerado — leva ~2 minutos`,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/admin/video]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('task_id')
  const id = req.nextUrl.searchParams.get('id')

  if (taskId && id) {
    try {
      const { status, url } = await verificarVideo(taskId)
      const concluido = status === 'completed' || status === 'succeeded'
      const falhou = status === 'failed'

      if (concluido && url) {
        await supabase.from('video_queue').update({
          status: 'pronto', video_url: url, atualizado_em: new Date().toISOString(),
        }).eq('id', id)
      } else if (falhou) {
        await supabase.from('video_queue').update({
          status: 'erro', atualizado_em: new Date().toISOString(),
        }).eq('id', id)
      }
      return NextResponse.json({ status, url })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[GET status]', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  const { data, error } = await supabase
    .from('video_queue')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ videos: data })
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, aprovado } = await req.json()
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
    await supabase.from('video_queue').update({
      aprovado, atualizado_em: new Date().toISOString(),
    }).eq('id', id)
    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('[PATCH /api/admin/video]', error)
    return NextResponse.json({ error: 'Erro ao aprovar' }, { status: 500 })
  }
}
