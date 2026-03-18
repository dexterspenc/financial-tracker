import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body — Supabase validates the apikey automatically
    const { messages, context } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepend financial context to the first user message server-side
    const apiMessages = messages.map((msg: { role: string; content: string }, idx: number) => {
      if (idx === 0 && context) {
        return {
          role: 'user',
          content: `Berikut adalah data keuangan pengguna (format JSON):\n\`\`\`json\n${context}\n\`\`\`\n\nPertanyaan: ${msg.content}`,
        };
      }
      return { role: msg.role, content: msg.content };
    });

    // Call Anthropic API — key lives here only, never on client
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system:
          'Kamu adalah financial advisor pribadi. Jawab dalam Bahasa Indonesia. Kalau user sapa atau tanya hal casual, balas casual dan singkat saja — jangan langsung analisis keuangan tanpa diminta. Analisis keuangan hanya kalau user memang meminta atau bertanya soal keuangan. Data keuangan pengguna diberikan sebagai konteks, tapi jangan dibahas kalau tidak relevan dengan pertanyaan.',
        messages: apiMessages,
      }),
    });

    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ error: (errData as { error?: { message?: string } })?.error?.message || `Anthropic error ${anthropicRes.status}` }),
        {
          status: anthropicRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const data = await anthropicRes.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
