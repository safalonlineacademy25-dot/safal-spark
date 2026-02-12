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
   if (isTestMode) {
     console.log("⚠️ Test mode - skipping signature verification");
     return true;
   }
   
   try {
     const message = `${razorpay_order_id}|${razorpay_payment_id}`;
     const encoder = new TextEncoder();
     const keyData = encoder.encode(secret);
     const messageData = encoder.encode(message);
     
     const key = await crypto.subtle.importKey(
       "raw",
       keyData,
       { name: "HMAC", hash: "SHA-256" },
       false,
       ["sign"]
     );
     
     const signature = await crypto.subtle.sign("HMAC", key, messageData);
     const expectedSignature = arrayBufferToHex(signature);
     
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
   isMultiFileEmail = false,
   productName?: string,
   emailIndex?: number,
   totalEmails?: number
 ): Promise<{ success: boolean; error?: string }> {
   try {
     console.log("Sending download email to:", customerEmail, "isMultiFile:", isMultiFileEmail);
     
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
         isComboPackEmail: isMultiFileEmail,
         comboPackName: productName,
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
   
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();
     
     console.log("Verifying payment:", { order_id, razorpay_payment_id, razorpay_order_id });
 
     if (!order_id) {
       throw new Error("Order ID is required");
     }
 
     if (!razorpay_payment_id || !razorpay_order_id) {
       throw new Error("Payment ID and Order ID are required");
     }
 
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const settings = await getSettings(supabase);
     const RAZORPAY_KEY_SECRET = settings['razorpay_key_secret'] || Deno.env.get('RAZORPAY_KEY_SECRET') || 'test_secret_key';
     const IS_TEST_MODE = settings['razorpay_test_mode'] === 'true' || !settings['razorpay_key_secret'];
     
     console.log("Using settings from database. Test mode:", IS_TEST_MODE);
 
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
 
     const { data: orderItems, error: itemsError } = await supabase
       .from('order_items')
       .select('product_id, product_name')
       .eq('order_id', order_id);
 
     if (itemsError) {
       console.error("Error fetching order items:", itemsError);
     }
 
     // For each order item, gather document and audio files
     const productEmails: Array<{
       productName: string;
       files: Array<{ name: string; downloadToken: string; fileOrder: number }>;
     }> = [];
     
     if (orderItems && orderItems.length > 0) {
       for (const item of orderItems) {
         if (!item.product_id) continue;
         
         // Get product details
         const { data: product, error: productError } = await supabase
           .from('products')
           .select('id, name, category')
           .eq('id', item.product_id)
           .single();
           
         if (productError || !product) {
           console.error("Error fetching product:", productError);
           continue;
         }
         
         // Get document files (combo_pack_files table - now used for ALL products)
         const { data: documentFiles, error: documentFilesError } = await supabase
           .from('combo_pack_files')
           .select('*')
           .eq('product_id', item.product_id)
           .order('file_order', { ascending: true });
           
         if (documentFilesError) {
           console.error("Error fetching document files:", documentFilesError);
         }
 
         // Get audio files (product_audio_files table)
         const { data: audioFiles, error: audioFilesError } = await supabase
           .from('product_audio_files')
           .select('*')
           .eq('product_id', item.product_id)
           .order('file_order', { ascending: true });
           
         if (audioFilesError) {
           console.error("Error fetching audio files:", audioFilesError);
         }
 
         const productFileTokens: Array<{ name: string; downloadToken: string; fileOrder: number }> = [];
         const documentFilesCount = documentFiles?.length || 0;
         const audioFilesCount = audioFiles?.length || 0;
 
         console.log(`Product ${product.name}: ${documentFilesCount} documents, ${audioFilesCount} audio files`);
 
         // Create download tokens for each document file
         if (documentFiles && documentFilesCount > 0) {
           for (const docFile of documentFiles) {
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
               console.error("Error creating document download token:", tokenError);
               continue;
             }
 
             productFileTokens.push({
               name: `📄 ${docFile.file_name}`,
               downloadToken: token,
               fileOrder: docFile.file_order,
             });
           }
         }
 
         // Create download tokens for each audio file
         if (audioFiles && audioFilesCount > 0) {
           for (let i = 0; i < audioFiles.length; i++) {
             const audioFile = audioFiles[i];
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
               console.error("Error creating audio download token:", tokenError);
               continue;
             }
 
             productFileTokens.push({
               name: `🎧 ${audioFile.file_name}`,
               downloadToken: token,
               fileOrder: documentFilesCount + i,
             });
           }
         }
 
         // Only enqueue if we actually have something to send
         if (productFileTokens.length > 0) {
           productEmails.push({
             productName: product.name,
             files: productFileTokens,
           });
         } else {
           console.warn(`No deliverable files found for product ${product.name}`);
         }
       }
     }
 
     console.log("Products with files:", productEmails.length);
 
     // Send download links via email and WhatsApp
     let deliveryStatus = 'pending';
     const deliveryResults: { whatsapp?: any; productEmails?: any[] } = {};
 
     // Send series of emails for all products with files
     if (productEmails.length > 0) {
        deliveryResults.productEmails = [];
        
        for (const productEmail of productEmails) {
          // Separate document files (📄) and audio files (🎧)
          const documentFiles = productEmail.files.filter(f => f.name.startsWith('📄'));
          const audioFiles = productEmail.files.filter(f => f.name.startsWith('🎧'));
          
          const emailGroups: Array<{
            files: typeof productEmail.files;
            label: string;
          }> = [];
          
          if (documentFiles.length > 0) {
            emailGroups.push({ files: documentFiles, label: 'Documents' });
          }
          if (audioFiles.length > 0) {
            emailGroups.push({ files: audioFiles, label: 'Audio Files' });
          }
          
          const totalGroupEmails = emailGroups.length;
          
          for (let i = 0; i < emailGroups.length; i++) {
            const group = emailGroups[i];
            const emailIndex = i + 1;
            
            if (i > 0) {
              await delay(2000);
            }
            
            const emailResult = await sendDownloadEmail(
              order_id,
              order.customer_email,
              order.customer_name,
              group.files.map(f => ({ name: f.name, downloadToken: f.downloadToken })),
              true,
              `${productEmail.productName} - ${group.label}`,
              emailIndex,
              totalGroupEmails
            );
            
            deliveryResults.productEmails!.push({
              productName: productEmail.productName,
              fileType: group.label,
              fileCount: group.files.length,
              emailIndex,
              totalGroupEmails,
              ...emailResult,
            });
            
            if (emailResult.success) {
              deliveryStatus = 'sent';
            }
          }
        }
      }
 
     // Send WhatsApp (only if opted in)
     if (productEmails.length > 0) {
       const whatsappResult = await sendWhatsAppDownload(
         order.customer_email,
         order.whatsapp_optin || false
       );
       deliveryResults.whatsapp = whatsappResult;
 
       const hasSuccessfulDelivery = 
         deliveryResults.productEmails?.some((e: any) => e.success) ||
         (order.whatsapp_optin && whatsappResult.success);
         
       if (hasSuccessfulDelivery) {
         deliveryStatus = 'sent';
       } else if (!hasSuccessfulDelivery && productEmails.length > 0) {
         deliveryStatus = 'failed';
       }
 
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