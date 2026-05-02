import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ATLAS_KEY = process.env.ATLAS_API_KEY!
const ATLAS_URL = 'https://api.atlascloud.ai/api/v1'

// Converte roteiro em prompt otimizado para vídeo de finanças
function roteiroParaPrompt(roteiro: string): string {
  return `Vertical video 9:16 for Instagram Reels. Young Brazilian person talking about personal finance. Modern clean background, good lighting. Natural and confident gestures. Topic: ${roteiro.slice(0, 200)}. Photorealistic, cinematic quality, smooth motion.`
}

// Gera vídeo via Atlas Cloud (Seedance)
async function gerarVideo(prompt: string, duracao: number): Promise<string> {
  const res = await fetch(`${ATLAS_URL}/model/generateVideo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ATLAS_KEY}`,
    },
    body: JSON.stringify({
      model: 'bytedance/seedance-v1.5-pro/text-to-video',
      input: {
        prompt,
        duration: duracao,
        aspect_ratio: '9:16',
        resolution: '1080p',
      },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao gerar vídeo')
  return data.id
}

// Verifica status do vídeo
async function verificarVideo(taskId: string): Promise<{ status: string; url?: string }> {
  const res = await fetch(`${ATLAS_URL}/model/prediction/${taskId}`, {
    headers: { 'Authorization': `Bearer ${ATLAS_KEY}` },
  })
  const data = await res.json()
  return {
    status: data.status,
    url: data.outputs?.[0],
  }
}

// POST — cria novo vídeo na fila
export async function POST(req: NextRequest) {
  try {
    const { roteiro, legenda, hashtags, formato = 'Reels', duracao = 30 } = await req.json()
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
      mensagem: `Vídeo sendo gerado — leva ~${Math.ceil(duracao * 3 / 60)} minutos`,
    })
  } catch (error) {
    console.error('[POST /api/admin/video]', error)
    return NextResponse.json({ error: 'Erro ao iniciar geração' }, { status: 500 })
  }
}

// GET — lista fila de vídeos ou verifica status de um vídeo específico
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('task_id')
  const id = req.nextUrl.searchParams.get('id')

  // Verifica status de um vídeo específico
  if (taskId && id) {
    try {
      const { status, url } = await verificarVideo(taskId)
      if (status === 'completed' && url) {
        await supabase.from('video_queue').update({
          status: 'pronto',
          video_url: url,
          atualizado_em: new Date().toISOString(),
        }).eq('id', id)
      } else if (status === 'failed') {
        await supabase.from('video_queue').update({
          status: 'erro',
          atualizado_em: new Date().toISOString(),
        }).eq('id', id)
      }
      return NextResponse.json({ status, url })
    } catch (error) {
      console.error('[GET /api/admin/video status]', error)
      return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 })
    }
  }

  // Lista fila completa
  const { data, error } = await supabase
    .from('video_queue')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ videos: data })
}

// PATCH — aprova um vídeo para postar
export async function PATCH(req: NextRequest) {
  try {
    const { id, aprovado } = await req.json()
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
    await supabase.from('video_queue').update({
      aprovado,
      atualizado_em: new Date().toISOString(),
    }).eq('id', id)
    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('[PATCH /api/admin/video]', error)
    return NextResponse.json({ error: 'Erro ao aprovar' }, { status: 500 })
  }
}
