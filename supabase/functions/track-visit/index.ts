import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[track-visit] Tracking visitor...');

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Call the increment function with retry for transient SSL errors
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, error } = await supabase.rpc('increment_visitor_count');

        if (error) {
          // Check if error message contains HTML (SSL/proxy error)
          const errMsg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
          if (errMsg.includes('<!DOCTYPE') || errMsg.includes('<html')) {
            console.warn(`[track-visit] Transient SSL/proxy error on attempt ${attempt + 1}, retrying...`);
            lastError = new Error('Transient SSL handshake error from upstream');
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          console.error('[track-visit] Error incrementing visitor count:', error);
          throw error;
        }

        console.log('[track-visit] Visit tracked successfully:', data);

        return new Response(
          JSON.stringify({ success: true, data }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (e: any) {
        lastError = e;
        const msg = e?.message || '';
        if (msg.includes('SSL') || msg.includes('<!DOCTYPE') || msg.includes('<html')) {
          console.warn(`[track-visit] Transient error on attempt ${attempt + 1}:`, msg.substring(0, 100));
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw e;
      }
    }

    // All retries exhausted
    console.error('[track-visit] All retries exhausted:', lastError?.message?.substring(0, 100));
    return new Response(
      JSON.stringify({ success: true, data: null, note: 'Visit tracking skipped due to transient error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    const errMsg = error?.message || 'Unknown error';
    console.error('[track-visit] Error:', errMsg.substring(0, 200));
    return new Response(
      JSON.stringify({ success: false, error: 'Visit tracking temporarily unavailable' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
