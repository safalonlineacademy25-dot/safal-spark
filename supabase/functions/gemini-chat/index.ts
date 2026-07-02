import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://safalonlinesolutions.com',
  'https://safal-spark.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com'))
    ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const SYSTEM_PROMPT = `You are the friendly study assistant for Safal Online Academy, an Indian platform that sells competitive exam notes, mock question papers (PDFs), and printed hard-copy books.

Guidelines:
- Answer briefly (2-4 sentences unless the user asks for detail).
- Help students choose notes/mock papers for exams like SSC, Banking, Railway, UPSC state PSC, etc.
- For order/payment/download issues, guide them to: check email for download link, contact support via the Contact section, or WhatsApp.
- Payment is via Razorpay (UPI/Card/NetBanking). Digital PDFs are delivered by email. Books are shipped by courier.
- Do NOT invent product names, prices, or order statuses. If unsure, tell the user to browse /products or /books.
- Keep answers in simple English (add Hindi phrases if user writes in Hindi).
- Never share admin, internal, or technical details.`;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages array required');
    }

    // Convert to Gemini format
    const contents = messages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '').slice(0, 4000) }],
      }));

    const model = 'gemini-1.5-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Gemini error:', resp.status, errText);
      return new Response(JSON.stringify({
        error: 'AI service unavailable. Please try again shortly.',
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await resp.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('gemini-chat error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
