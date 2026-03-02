import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Create a Razorpay Payment Link for a simpler checkout experience
async function createRazorpayPaymentLink(
  keyId: string,
  keySecret: string,
  amount: number,
  currency: string,
  description: string,
  referenceId: string,
  customerEmail: string,
  customerPhone: string,
  customerName: string | null,
  callbackUrl: string,
  orderId: string
): Promise<{ id: string; short_url: string }> {
  const auth = btoa(`${keyId}:${keySecret}`);
  
  const payload: any = {
    amount,
    currency,
    accept_partial: false,
    description,
    reference_id: referenceId,
    customer: {
      email: customerEmail,
      contact: customerPhone,
    },
    notify: {
      sms: false,
      email: false,
    },
    reminder_enable: false,
    callback_url: callbackUrl,
    callback_method: "get",
    notes: {
      internal_order_id: orderId,
    },
  };

  if (customerName) {
    payload.customer.name = customerName;
  }

  console.log("Creating Razorpay Payment Link with payload:", JSON.stringify(payload));

  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Razorpay Payment Link API error:", errorText);
    throw new Error(`Razorpay API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log("Payment Link created:", result.id, "Short URL:", result.short_url);
  return { id: result.id, short_url: result.short_url };
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
    const { items, customer_email, customer_phone, customer_name, whatsapp_optin, callback_origin } = await req.json();
    
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
    const isTestMode = settings['razorpay_test_mode'] === 'true';

    console.log(
      "Using Razorpay key:",
      RAZORPAY_KEY_ID ? RAZORPAY_KEY_ID.substring(0, 10) + "..." : "<missing>",
      "Test mode:",
      isTestMode
    );

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error("Razorpay credentials missing (key id/secret)");
      throw new Error(
        "Payment gateway not configured. Please add Razorpay Key ID and Key Secret in Admin → Settings."
      );
    }

    // Generate order number
    const { data: orderNumberData, error: orderNumberError } = await supabase.rpc('generate_order_number');
    if (orderNumberError) {
      console.error("Error generating order number:", orderNumberError);
      throw orderNumberError;
    }
    const orderNumber = orderNumberData;

    // Create order in database first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_email,
        customer_phone,
        customer_name: customer_name || null,
        total_amount: totalAmount,
        whatsapp_optin,
        status: 'pending',
        currency: 'INR',
      })
      .select()
      .single();

    console.log("Order insert result:", { order, orderError });

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw orderError;
    }

    if (!order || !order.id) {
      console.error("Order insert returned no id:", order);
      throw new Error("Order insert failed to return an id");
    }

    console.log("Order created (id):", order.id);

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_name: item.product.name,
      product_price: item.product.price,
      quantity: 1,
    }));

    const { data: itemsInserted, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    console.log("Order items insert result:", { itemsInserted, itemsError });

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      throw itemsError;
    }

    // Build product description for payment link
    const productNames = items.map((item: any) => item.product.name).join(', ');
    const description = productNames.length > 200 
      ? productNames.substring(0, 197) + '...' 
      : productNames;

    // Determine callback URL using the origin sent from frontend
    const baseUrl = callback_origin || origin || 'https://safalonlinesolutions.com';
    const callbackUrl = `${baseUrl}/order-success`;

    console.log("Callback URL:", callbackUrl);

    // Create Razorpay Payment Link (instead of Order)
    const paymentLink = await createRazorpayPaymentLink(
      RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET,
      amountInPaise,
      'INR',
      `Order ${orderNumber} - ${description}`,
      orderNumber, // reference_id = order number
      customer_email,
      customer_phone,
      customer_name || null,
      callbackUrl,
      order.id
    );

    // Store payment link ID in the order
    await supabase
      .from('orders')
      .update({ razorpay_order_id: paymentLink.id })
      .eq('id', order.id);

    console.log("Payment Link created. ID:", paymentLink.id, "URL:", paymentLink.short_url);

    const responsePayload = {
      success: true,
      order_id: order.id,
      order_number: orderNumber,
      payment_link_id: paymentLink.id,
      payment_url: paymentLink.short_url,
      amount: amountInPaise,
      currency: 'INR',
      is_test_mode: isTestMode,
    };

    console.log("Responding to client with:", responsePayload);

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Error in create-razorpay-order:", error, error instanceof Error ? error.stack : null);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
