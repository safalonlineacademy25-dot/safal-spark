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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

// Helper function to convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Function to verify Razorpay signature using Web Crypto API
async function verifyRazorpaySignature(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
  secret: string,
  isTestMode: boolean
): Promise<boolean> {
  // In test mode, accept test signatures
  if (isTestMode) {
    console.log("⚠️ Test mode - skipping signature verification");
    return true;
  }
  
  try {
    // Create the expected signature using HMAC SHA256
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);
    
    // Import key for HMAC
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Sign the message
    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    const expectedSignature = arrayBufferToHex(signature);
    
    // Compare signatures using timing-safe comparison
    if (expectedSignature.length !== razorpay_signature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |= expectedSignature.charCodeAt(i) ^ razorpay_signature.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

// Helper function to delay execution (for spacing out emails)
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to send download email
async function sendDownloadEmail(
  orderId: string,
  customerEmail: string,
  customerName: string | null,
  products: Array<{ name: string; downloadToken: string }>,
  isComboPackEmail = false,
  comboPackName?: string,
  emailIndex?: number,
  totalEmails?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Sending download email to:", customerEmail, "isCombo:", isComboPackEmail);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-download-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        orderId,
        customerEmail,
        customerName,
        products,
        isComboPackEmail,
        comboPackName,
        emailIndex,
        totalEmails,
      }),
    });

    const result = await response.json();
    console.log("Email delivery result:", result);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    console.error("Error calling send-download-email:", error);
    return { success: false, error: error.message };
  }
}

// Helper function to send WhatsApp download
async function sendWhatsAppDownload(
  customerEmail: string,
  whatsappOptin: boolean
): Promise<{ success: boolean; error?: string }> {
  // Only send if customer opted in
  if (!whatsappOptin) {
    console.log("Customer did not opt-in for WhatsApp, skipping");
    return { success: true, error: "Skipped - no opt-in" };
  }

  try {
    console.log("Sending WhatsApp download for email:", customerEmail);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        email: customerEmail,
      }),
    });

    const result = await response.json();
    console.log("WhatsApp delivery result:", result);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    console.error("Error calling send-whatsapp-download:", error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();
    
    console.log("Verifying payment:", { order_id, razorpay_payment_id, razorpay_order_id });

    // Validate required fields
    if (!order_id) {
      throw new Error("Order ID is required");
    }

    if (!razorpay_payment_id || !razorpay_order_id) {
      throw new Error("Payment ID and Order ID are required");
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Razorpay settings from database
    const settings = await getSettings(supabase);
    const RAZORPAY_KEY_SECRET = settings['razorpay_key_secret'] || Deno.env.get('RAZORPAY_KEY_SECRET') || 'test_secret_key';
    const IS_TEST_MODE = settings['razorpay_test_mode'] === 'true' || !settings['razorpay_key_secret'];
    
    console.log("Using settings from database. Test mode:", IS_TEST_MODE);

    // Verify Razorpay signature (critical security check)
    if (!IS_TEST_MODE && !razorpay_signature) {
      throw new Error("Payment signature is required for verification");
    }

    const isValidSignature = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature || '',
      RAZORPAY_KEY_SECRET,
      IS_TEST_MODE
    );

    if (!isValidSignature) {
      console.error("Invalid payment signature - potential fraud attempt");
      throw new Error("Invalid payment signature");
    }

    console.log("Signature verified successfully");
    
    // Update order with payment details
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature || 'test_signature',
        delivery_status: 'pending',
      })
      .eq('id', order_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw updateError;
    }

    console.log("Payment verified, order updated:", order.id, "Status:", order.status);

    // Get order items with product details
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, product_name')
      .eq('order_id', order_id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    // For each order item, check if it's a combo pack
    const productDownloads: Array<{ name: string; downloadToken: string }> = [];
    const comboPackEmails: Array<{
      productName: string;
      files: Array<{ name: string; downloadToken: string; fileOrder: number }>;
    }> = [];
    
    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        if (!item.product_id) continue;
        
        // Get product details including category
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, category, file_url, audio_url')
          .eq('id', item.product_id)
          .single();
          
        if (productError || !product) {
          console.error("Error fetching product:", productError);
          continue;
        }
        
        // Check if it's a combo pack
        if (product.category === 'combo-packs') {
          // Get combo pack files
          const { data: comboFiles, error: comboFilesError } = await supabase
            .from('combo_pack_files')
            .select('*')
            .eq('product_id', item.product_id)
            .order('file_order', { ascending: true });
            
          if (comboFilesError) {
            console.error("Error fetching combo pack files:", comboFilesError);
            continue;
          }
          
          if (comboFiles && comboFiles.length > 0) {
            console.log(`Found ${comboFiles.length} files for combo pack: ${product.name}`);
            
            // Create download tokens for each combo file
            const comboFileTokens: Array<{ name: string; downloadToken: string; fileOrder: number }> = [];
            
            for (const comboFile of comboFiles) {
              const token = crypto.randomUUID();
              
              // Insert download token for combo file
              // We use a special format: product_id is the main product, but we store file info
              const { error: tokenError } = await supabase
                .from('download_tokens')
                .insert({
                  order_id: order_id,
                  product_id: item.product_id,
                  token: token,
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  download_count: 0,
                });
                
              if (tokenError) {
                console.error("Error creating combo file download token:", tokenError);
                continue;
              }
              
              comboFileTokens.push({
                name: comboFile.file_name,
                downloadToken: token,
                fileOrder: comboFile.file_order,
              });
            }
            
            // Also include audio file if present on the product
            if (product.audio_url) {
              console.log(`Found audio file for combo pack: ${product.name}`);
              const audioToken = crypto.randomUUID();
              
              // Extract audio file name from URL
              const audioFileName = product.audio_url.split('/').pop() || 'audio.mp3';
              
              const { error: audioTokenError } = await supabase
                .from('download_tokens')
                .insert({
                  order_id: order_id,
                  product_id: item.product_id,
                  token: audioToken,
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  download_count: 0,
                });
                
              if (audioTokenError) {
                console.error("Error creating audio file download token:", audioTokenError);
              } else {
                // Add audio file as the last item
                comboFileTokens.push({
                  name: `🎧 ${audioFileName}`,
                  downloadToken: audioToken,
                  fileOrder: comboFiles.length + 1,
                });
                console.log(`Added audio file to combo pack delivery: ${audioFileName}`);
              }
            }
            
            comboPackEmails.push({
              productName: product.name,
              files: comboFileTokens,
            });
          }
        } else {
          // Regular product - single file
          const token = crypto.randomUUID();
          
          const { error: tokenError } = await supabase
            .from('download_tokens')
            .insert({
              order_id: order_id,
              product_id: item.product_id,
              token: token,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              download_count: 0,
            });
            
          if (tokenError) {
            console.error("Error creating download token:", tokenError);
            continue;
          }
          
          productDownloads.push({
            name: item.product_name,
            downloadToken: token,
          });
        }
      }
    }

    console.log("Regular products:", productDownloads.length);
    console.log("Combo packs:", comboPackEmails.length);

    // Send download links via email and WhatsApp
    let deliveryStatus = 'pending';
    const deliveryResults: { email?: any; whatsapp?: any; comboEmails?: any[] } = {};

    // Send email for regular products
    if (productDownloads.length > 0) {
      const emailResult = await sendDownloadEmail(
        order_id,
        order.customer_email,
        order.customer_name,
        productDownloads
      );
      deliveryResults.email = emailResult;
      
      if (emailResult.success) {
        deliveryStatus = 'sent';
      }
    }

    // Send series of emails for combo packs
    if (comboPackEmails.length > 0) {
      deliveryResults.comboEmails = [];
      
      for (const comboPack of comboPackEmails) {
        const totalEmails = comboPack.files.length;
        
        for (let i = 0; i < comboPack.files.length; i++) {
          const file = comboPack.files[i];
          const emailIndex = i + 1;
          
          // Add a small delay between emails to avoid rate limiting
          if (i > 0) {
            await delay(2000); // 2 second delay between emails
          }
          
          const emailResult = await sendDownloadEmail(
            order_id,
            order.customer_email,
            order.customer_name,
            [{ name: file.name, downloadToken: file.downloadToken }],
            true, // isComboPackEmail
            comboPack.productName,
            emailIndex,
            totalEmails
          );
          
          deliveryResults.comboEmails!.push({
            productName: comboPack.productName,
            fileName: file.name,
            emailIndex,
            totalEmails,
            ...emailResult,
          });
          
          if (emailResult.success) {
            deliveryStatus = 'sent';
          }
        }
      }
    }

    // Send WhatsApp (only if opted in)
    if (productDownloads.length > 0 || comboPackEmails.length > 0) {
      const whatsappResult = await sendWhatsAppDownload(
        order.customer_email,
        order.whatsapp_optin || false
      );
      deliveryResults.whatsapp = whatsappResult;

      // Determine overall delivery status
      const hasSuccessfulDelivery = 
        deliveryResults.email?.success || 
        deliveryResults.comboEmails?.some((e: any) => e.success) ||
        (order.whatsapp_optin && whatsappResult.success);
        
      if (hasSuccessfulDelivery) {
        deliveryStatus = 'sent';
      } else if (!hasSuccessfulDelivery && (productDownloads.length > 0 || comboPackEmails.length > 0)) {
        deliveryStatus = 'failed';
      }

      // Update order delivery status
      const { error: deliveryUpdateError } = await supabase
        .from('orders')
        .update({ 
          delivery_status: deliveryStatus,
          delivery_attempts: 1,
        })
        .eq('id', order_id);

      if (deliveryUpdateError) {
        console.error("Error updating delivery status:", deliveryUpdateError);
      }
    }

    console.log("Delivery status:", deliveryStatus, "Results:", deliveryResults);

    return new Response(
      JSON.stringify({
        success: true,
        order_number: order.order_number,
        status: order.status,
        delivery_status: deliveryStatus,
        delivery_results: deliveryResults,
        message: 'Payment verified and download links sent!',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Error in verify-razorpay-payment:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
