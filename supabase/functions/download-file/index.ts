import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://safalonlinesolutions.com',
  'https://hujuqkhbdptsdnbnkslo.supabase.co',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com')
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const MAX_DOWNLOADS = 3;

// Rate limit configuration: 10 download attempts per minute per IP/token
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      console.log("No token provided");
      return new Response(
        JSON.stringify({ error: "Download token is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Processing download for token:", token.substring(0, 8) + "...");

    // Rate limiting: Use IP + token as identifier
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    const rateLimitIdentifier = `${clientIP}:${token.substring(0, 8)}`;
    
    const { data: isAllowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      _identifier: rateLimitIdentifier,
      _endpoint: 'download-file',
      _max_requests: RATE_LIMIT_MAX_REQUESTS,
      _window_seconds: RATE_LIMIT_WINDOW_SECONDS
    });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue if rate limit check fails - don't block legitimate requests
    } else if (!isAllowed) {
      console.warn("Rate limit exceeded for download:", rateLimitIdentifier);
      return new Response(
        JSON.stringify({ 
          error: "Too many download attempts. Please wait a moment before trying again.",
          retry_after: RATE_LIMIT_WINDOW_SECONDS
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS)
          } 
        }
      );
    }

    // Validate download token
    const { data: tokenData, error: tokenError } = await supabase
      .from("download_tokens")
      .select(`
        id,
        token,
        order_id,
        product_id,
        download_count,
        expires_at,
        products:product_id (
          id,
          name,
          file_url
        )
      `)
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("Token not found:", tokenError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired download token" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check if token is expired
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      console.log("Token expired:", tokenData.expires_at);
      return new Response(
        JSON.stringify({ error: "Download link has expired" }),
        { 
          status: 410, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check download count
    const currentDownloads = tokenData.download_count || 0;
    if (currentDownloads >= MAX_DOWNLOADS) {
      console.log("Max downloads reached:", currentDownloads);
      return new Response(
        JSON.stringify({ 
          error: "Maximum download limit reached",
          downloads_used: currentDownloads,
          max_downloads: MAX_DOWNLOADS
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get product details
    const product = tokenData.products as any;
    if (!product || !product.file_url) {
      console.error("Product or file URL not found");
      return new Response(
        JSON.stringify({ error: "Product file not available" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Product found:", product.name);

    // Increment download count
    const { error: updateError } = await supabase
      .from("download_tokens")
      .update({ download_count: currentDownloads + 1 })
      .eq("id", tokenData.id);

    if (updateError) {
      console.error("Error updating download count:", updateError);
      // Continue anyway - don't block download
    }

    // Increment product download count (optional - ignore errors)
    try {
      await supabase
        .from('products')
        .update({ download_count: (product.download_count || 0) + 1 })
        .eq('id', product.id);
    } catch {
      console.log("Note: Could not update product download count");
    }

    // Get file URL
    const fileUrl = product.file_url;
    
    // If it's a Supabase Storage URL, generate a signed URL
    if (fileUrl.includes('supabase') && fileUrl.includes('product-files')) {
      // Extract the file path from the URL
      const match = fileUrl.match(/product-files\/(.+)/);
      if (match) {
        const filePath = match[1];
        
        // Generate signed URL (valid for 5 minutes)
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from('product-files')
          .createSignedUrl(filePath, 300); // 5 minutes
        
        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.error("Error generating signed URL:", signedUrlError);
          return new Response(
            JSON.stringify({ error: "Failed to generate download link" }),
            { 
              status: 500, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        console.log("Redirecting to signed URL for:", product.name);
        
        // Return redirect to signed URL
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            "Location": signedUrlData.signedUrl,
          },
        });
      }
    }

    // For legacy Google Drive URLs or other external URLs
    // Note: This is a security risk - external URLs should be migrated to Supabase Storage
    console.log("⚠️ Warning: Serving external URL (should migrate to Supabase Storage):", fileUrl.substring(0, 50));
    
    return new Response(
      JSON.stringify({ 
        success: true,
        download_url: fileUrl,
        product_name: product.name,
        downloads_remaining: MAX_DOWNLOADS - (currentDownloads + 1),
        message: "Click the download URL to get your file"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error processing download:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Download failed" }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(null), "Content-Type": "application/json" } 
      }
    );
  }
});