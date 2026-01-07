import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
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

// Helper function to get settings from database
async function getSettings(supabase: any): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value');
  
  if (error) {
    console.error("Error fetching settings:", error);
    return {};
  }
  
  const settings: Record<string, string> = {};
  if (data) {
    data.forEach((s: { key: string; value: string | null }) => {
      if (s.value) settings[s.key] = s.value;
    });
  }
  return settings;
}

// Create a real Razorpay order via their API
async function createRazorpayOrder(
  keyId: string,
  keySecret: string,
  amount: number,
  currency: string,
  receipt: string
): Promise<{ id: string; amount: number; currency: string }> {
  const auth = btoa(`${keyId}:${keySecret}`);
  
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Razorpay API error:", errorText);
    throw new Error(`Razorpay API error: ${response.status}`);
  }

  return await response.json();
}

// Rate limit configuration: 5 orders per minute per IP/email
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client early for rate limiting
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { items, customer_email, customer_phone, whatsapp_optin } = await req.json();
    
    console.log("Creating order for:", { customer_email, customer_phone, items_count: items?.length });

    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    if (!customer_email || !customer_phone) {
      throw new Error("Customer email and phone are required");
    }

    // Rate limiting: Use email + IP as identifier
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    const rateLimitIdentifier = `${customer_email}:${clientIP}`;
    
    const { data: isAllowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      _identifier: rateLimitIdentifier,
      _endpoint: 'create-razorpay-order',
      _max_requests: RATE_LIMIT_MAX_REQUESTS,
      _window_seconds: RATE_LIMIT_WINDOW_SECONDS
    });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue if rate limit check fails - don't block legitimate requests
    } else if (!isAllowed) {
      console.warn("Rate limit exceeded for:", rateLimitIdentifier);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many requests. Please wait a moment before trying again.",
          retry_after: RATE_LIMIT_WINDOW_SECONDS
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(RATE_LIMIT_WINDOW_SECONDS)
          }, 
          status: 429 
        }
      );
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.product.price, 0);
    const amountInPaise = Math.round(totalAmount * 100);

    // Get Razorpay settings from database
    const settings = await getSettings(supabase);
    const RAZORPAY_KEY_ID = settings['razorpay_key_id'] || Deno.env.get('RAZORPAY_KEY_ID') || "";
    const RAZORPAY_KEY_SECRET = settings['razorpay_key_secret'] || Deno.env.get('RAZORPAY_KEY_SECRET') || "";
    const isTestMode = settings['razorpay_test_mode'] === 'true' || !settings['razorpay_key_id'];
    
    console.log("Using Razorpay key:", RAZORPAY_KEY_ID.substring(0, 10) + "...", "Test mode:", isTestMode);

    // Generate order number
    const { data: orderNumberData, error: orderNumberError } = await supabase.rpc('generate_order_number');
    if (orderNumberError) {
      console.error("Error generating order number:", orderNumberError);
      throw orderNumberError;
    }
    const orderNumber = orderNumberData;

    let razorpayOrderId: string;
    
    if (isTestMode) {
      // In test mode, check if key_id is available for frontend
      if (!RAZORPAY_KEY_ID) {
        console.error("Test mode enabled but no Razorpay key ID configured");
        throw new Error("Payment gateway not configured. Please set up Razorpay API keys in admin settings.");
      }
      // Generate a simulated order ID
      razorpayOrderId = `order_test_${Date.now()}`;
      console.log("Test mode: Generated simulated order ID:", razorpayOrderId);
    } else {
      // In live mode, create a real Razorpay order
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        console.error("Live mode requires both Razorpay key ID and secret");
        throw new Error("Payment gateway not configured. Please set up Razorpay API keys in admin settings.");
      }
      
      const razorpayOrder = await createRazorpayOrder(
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET,
        amountInPaise,
        'INR',
        orderNumber
      );
      razorpayOrderId = razorpayOrder.id;
      console.log("Live mode: Created Razorpay order:", razorpayOrderId);
    }
    
    console.log("Generated order number:", orderNumber, "Razorpay order ID:", razorpayOrderId);

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_email,
        customer_phone,
        total_amount: totalAmount,
        whatsapp_optin,
        razorpay_order_id: razorpayOrderId,
        status: 'pending',
        currency: 'INR',
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw orderError;
    }

    console.log("Order created:", order.id);

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_name: item.product.name,
      product_price: item.product.price,
      quantity: 1,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      throw itemsError;
    }

    console.log("Order items created successfully");

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: orderNumber,
        razorpay_order_id: razorpayOrderId,
        amount: amountInPaise,
        currency: 'INR',
        key_id: RAZORPAY_KEY_ID,
        is_test_mode: isTestMode,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Error in create-razorpay-order:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
