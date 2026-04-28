import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const STYLE = `Instagram post for iMoney Brazilian fintech. MANDATORY:
BACKGROUND: Pure white #FFFFFF only. No gradients. No dark colors.
TEXT: Main Portuguese text CENTER of image. Ultra-bold sans-serif. Dark green #1a3a1a. ALL CAPS. Giant, 50-65% of image.
FLOATING ICONS: Green glossy 3D coins with dollar sign, upward arrow, bar chart, lightbulb - scattered at corners.
LOGO: Small iMoney compass logo bottom-right corner with text iMoney below.
NO people. NO faces. NO English. Square 1:1.`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { postId, visual_description } = body;

  const supabase = createClient(
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    await supabase.from('content_pipeline').update({ image_status: 'generating' }).eq('id', postId);

    const prompt = STYLE + ' Content: ' + (visual_description || 'Brazilian personal finance tips');

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
      }),
    });

      const err = await res.json();
      throw new Error(err.error?.message || 'OpenAI error: ' + res.status);
    }

    const data = await res.json();
    
    // gpt-image-1 retorna base64
    const b64 = data.data?.[0]?.b64_json;
    const url = data.data?.[0]?.url;

    let finalUrl = url || '';

    if (b64) {
      // Salva no Supabase Storage
      const buffer = Buffer.from(b64, 'base64');
      const fileName = 'marketing/' + postId + '-' + Date.now() + '.png';
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('imoney-media')
        .upload(fileName, buffer, { contentType: 'image/png', upsert: true });

        const { data: pub } = supabase.storage.from('imoney-media').getPublicUrl(fileName);
        finalUrl = pub.publicUrl;
      } else {
        finalUrl = 'data:image/png;base64,' + b64;
      }
    }


    await supabase.from('content_pipeline').update({
      image_url: finalUrl,
      image_status: 'ready',
    }).eq('id', postId);

    return NextResponse.json({ success: true, image_url: finalUrl });

  } catch (err: any) {
    console.error('Image error:', err.message);
    await supabase.from('content_pipeline').update({ image_status: 'failed' }).eq('id', postId);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
