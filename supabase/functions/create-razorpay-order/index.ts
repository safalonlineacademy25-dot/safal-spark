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

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, customer_email, customer_phone, whatsapp_optin } = await req.json();
    
    console.log("Creating order for:", { customer_email, customer_phone, items_count: items?.length });

    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    if (!customer_email || !customer_phone) {
      throw new Error("Customer email and phone are required");
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.product.price, 0);
    const amountInPaise = Math.round(totalAmount * 100);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Razorpay settings from database
    const settings = await getSettings(supabase);
    const RAZORPAY_KEY_ID = settings['razorpay_key_id'] || Deno.env.get('RAZORPAY_KEY_ID') || "rzp_test_1234567890abcd";
    const isTestMode = settings['razorpay_test_mode'] === 'true' || !settings['razorpay_key_id'];
    
    console.log("Using Razorpay key:", RAZORPAY_KEY_ID.substring(0, 10) + "...", "Test mode:", isTestMode);

    // Generate order number
    const { data: orderNumberData, error: orderNumberError } = await supabase.rpc('generate_order_number');
    if (orderNumberError) {
      console.error("Error generating order number:", orderNumberError);
      throw orderNumberError;
    }
    const orderNumber = orderNumberData;

    // For testing, we'll simulate a Razorpay order ID
    const razorpayOrderId = `order_test_${Date.now()}`;
    
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
