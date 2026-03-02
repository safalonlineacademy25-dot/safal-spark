import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_EMAIL_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendDownloadEmailWithRetry(
  orderId: string,
  customerEmail: string,
  customerName: string | null,
  products: Array<{ name: string; downloadToken: string }>,
  isMultiFileEmail = false,
  productName?: string,
  emailIndex?: number,
  totalEmails?: number
): Promise<{ success: boolean; error?: string; attempts: number }> {
  let lastError = '';
  
  for (let attempt = 1; attempt <= MAX_EMAIL_RETRIES; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${MAX_EMAIL_RETRIES}] Sending email ${emailIndex || 1}/${totalEmails || 1} to: ${customerEmail}`);
      
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
      console.log(`[Attempt ${attempt}] Email delivery result:`, result);
      
      if (result.success) {
        return { success: true, attempts: attempt };
      }
      
      lastError = result.error || 'Unknown error from send-download-email';
      console.error(`[Attempt ${attempt}] Email failed: ${lastError}`);
      
    } catch (error: any) {
      lastError = error.message || 'Network/fetch error';
      console.error(`[Attempt ${attempt}] Email fetch error: ${lastError}`);
    }
    
    // Wait before retrying (except on last attempt)
    if (attempt < MAX_EMAIL_RETRIES) {
      console.log(`Waiting ${RETRY_DELAY_MS}ms before retry...`);
      await delay(RETRY_DELAY_MS);
    }
  }
  
  console.error(`All ${MAX_EMAIL_RETRIES} attempts failed for email ${emailIndex || 1}/${totalEmails || 1} to ${customerEmail}. Last error: ${lastError}`);
  return { success: false, error: lastError, attempts: MAX_EMAIL_RETRIES };
}

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
      body: JSON.stringify({ email: customerEmail }),
    });
    const result = await response.json();
    console.log("WhatsApp delivery result:", result);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    console.error("Error calling send-whatsapp-download:", error);
    return { success: false, error: error.message };
  }
}

// Create a refund entry for partially failed deliveries
async function createRefundForFailedDelivery(
  supabase: any,
  orderId: string,
  customerEmail: string,
  failedParts: string[]
): Promise<void> {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, razorpay_payment_id, total_amount, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error("Could not fetch order for refund:", orderError);
      return;
    }

    if ((order.status === 'paid' || order.status === 'completed') && order.razorpay_payment_id) {
      // Check if refund already exists
      const { data: existingRefund } = await supabase
        .from('refunds')
        .select('id')
        .eq('order_id', orderId)
        .single();

      if (!existingRefund) {
        const failedPartsStr = failedParts.join(', ');
        console.log(`Creating refund entry for partially failed delivery. Failed parts: ${failedPartsStr}`);
        await supabase.from('refunds').insert({
          order_id: orderId,
          razorpay_payment_id: order.razorpay_payment_id,
          amount: order.total_amount,
          currency: 'INR',
          reason: 'email_delivery_failed',
          failed_email: customerEmail,
          status: 'eligible',
        });
      }
    }
  } catch (err) {
    console.error("Error creating refund for failed delivery:", err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();

    if (!order_id) {
      throw new Error("order_id is required");
    }

    console.log("Processing delivery for order:", order_id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, product_name')
      .eq('order_id', order_id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    // Send Telegram notification (fire-and-forget)
    fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        type: 'new_order',
        data: {
          order_number: order.order_number,
          total_amount: order.total_amount,
          customer_email: order.customer_email,
          customer_name: order.customer_name,
          items_count: orderItems?.length || 0,
          currency: order.currency || 'INR',
        },
      }),
    }).catch(err => console.error('Telegram notification failed:', err));

    // Build product file lists and create download tokens
    const emailsToSend: Array<{
      emailLabel: string;
      files: Array<{ name: string; downloadToken: string }>;
    }> = [];

    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        if (!item.product_id) continue;

        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, category')
          .eq('id', item.product_id)
          .single();

        if (productError || !product) {
          console.error("Error fetching product:", productError);
          continue;
        }

        // Get document files
        const { data: documentFiles, error: documentFilesError } = await supabase
          .from('combo_pack_files')
          .select('*, source_product_id, source_product_name')
          .eq('product_id', item.product_id)
          .order('file_order', { ascending: true });

        if (documentFilesError) {
          console.error("Error fetching document files:", documentFilesError);
        }

        // Get audio files
        const { data: audioFiles, error: audioFilesError } = await supabase
          .from('product_audio_files')
          .select('*, source_product_id, source_product_name')
          .eq('product_id', item.product_id)
          .order('file_order', { ascending: true });

        if (audioFilesError) {
          console.error("Error fetching audio files:", audioFilesError);
        }

        const isComboProduct = product.category === 'combo-pack';
        console.log(`Product ${product.name}: ${documentFiles?.length || 0} documents, ${audioFiles?.length || 0} audio files, isCombo: ${isComboProduct}`);

        if (isComboProduct) {
          // For combo packs: group files by source_product_id/source_product_name
          const sourceProductGroups: Map<string, {
            sourceProductName: string;
            docFiles: typeof documentFiles;
            audioFilesArr: typeof audioFiles;
          }> = new Map();

          if (documentFiles) {
            for (const docFile of documentFiles) {
              const sourceKey = docFile.source_product_id || 'unknown';
              const sourceName = docFile.source_product_name || product.name;
              if (!sourceProductGroups.has(sourceKey)) {
                sourceProductGroups.set(sourceKey, { sourceProductName: sourceName, docFiles: [], audioFilesArr: [] });
              }
              sourceProductGroups.get(sourceKey)!.docFiles!.push(docFile);
            }
          }

          if (audioFiles) {
            for (const audioFile of audioFiles) {
              const sourceKey = audioFile.source_product_id || 'unknown';
              const sourceName = audioFile.source_product_name || product.name;
              if (!sourceProductGroups.has(sourceKey)) {
                sourceProductGroups.set(sourceKey, { sourceProductName: sourceName, docFiles: [], audioFilesArr: [] });
              }
              sourceProductGroups.get(sourceKey)!.audioFilesArr!.push(audioFile);
            }
          }

          for (const [_sourceKey, group] of sourceProductGroups) {
            const fileTokens: Array<{ name: string; downloadToken: string }> = [];

            for (const docFile of (group.docFiles || [])) {
              const token = crypto.randomUUID();
              const { error: tokenError } = await supabase.from('download_tokens').insert({
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
              fileTokens.push({ name: `📄 ${docFile.file_name}`, downloadToken: token });
            }

            for (const audioFile of (group.audioFilesArr || [])) {
              const token = crypto.randomUUID();
              const { error: tokenError } = await supabase.from('download_tokens').insert({
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
              fileTokens.push({ name: `🎧 ${audioFile.file_name}`, downloadToken: token });
            }

            if (fileTokens.length > 0) {
              emailsToSend.push({
                emailLabel: group.sourceProductName,
                files: fileTokens,
              });
            }
          }
        } else {
          // Non-combo: standard per-product email
          const fileTokens: Array<{ name: string; downloadToken: string }> = [];

          if (documentFiles && documentFiles.length > 0) {
            for (const docFile of documentFiles) {
              const token = crypto.randomUUID();
              const { error: tokenError } = await supabase.from('download_tokens').insert({
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
              fileTokens.push({ name: `📄 ${docFile.file_name}`, downloadToken: token });
            }
          }

          if (audioFiles && audioFiles.length > 0) {
            for (const audioFile of audioFiles) {
              const token = crypto.randomUUID();
              const { error: tokenError } = await supabase.from('download_tokens').insert({
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
              fileTokens.push({ name: `🎧 ${audioFile.file_name}`, downloadToken: token });
            }
          }

          if (fileTokens.length > 0) {
            emailsToSend.push({
              emailLabel: product.name,
              files: fileTokens,
            });
          }
        }
      }
    }

    console.log("Total emails to send:", emailsToSend.length);

    // Send download links via email with retry logic
    let deliveryStatus = 'pending';
    const deliveryResults: { whatsapp?: any; productEmails?: any[] } = {};
    const totalEmails = emailsToSend.length;
    const failedParts: string[] = [];

    if (totalEmails > 0) {
      deliveryResults.productEmails = [];

      for (let i = 0; i < emailsToSend.length; i++) {
        const emailEntry = emailsToSend[i];
        if (i > 0) await delay(2000);

        const emailResult = await sendDownloadEmailWithRetry(
          order_id,
          order.customer_email,
          order.customer_name,
          emailEntry.files,
          totalEmails > 1,
          emailEntry.emailLabel,
          i + 1,
          totalEmails
        );

        deliveryResults.productEmails!.push({
          productName: emailEntry.emailLabel,
          fileCount: emailEntry.files.length,
          emailIndex: i + 1,
          totalEmails,
          ...emailResult,
        });

        if (emailResult.success) {
          deliveryStatus = 'sent';
        } else {
          failedParts.push(`Part ${i + 1} (${emailEntry.emailLabel})`);
        }
      }
    }

    // Send WhatsApp
    if (totalEmails > 0) {
      const whatsappResult = await sendWhatsAppDownload(
        order.customer_email,
        order.whatsapp_optin || false
      );
      deliveryResults.whatsapp = whatsappResult;

      // Determine final delivery status
      const allEmailsFailed = deliveryResults.productEmails?.every((e: any) => !e.success);
      const someEmailsFailed = failedParts.length > 0;

      if (allEmailsFailed) {
        deliveryStatus = 'failed';
      } else if (someEmailsFailed) {
        deliveryStatus = 'partial_failure';
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

      // If any emails failed after all retries, create refund entry and send Telegram alert
      if (failedParts.length > 0) {
        await createRefundForFailedDelivery(supabase, order_id, order.customer_email, failedParts);

        // Send Telegram alert about failed delivery
        fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: 'delivery_failed',
            data: {
              order_number: order.order_number,
              customer_email: order.customer_email,
              failed_parts: failedParts.join(', '),
              total_emails: totalEmails,
              successful_emails: totalEmails - failedParts.length,
            },
          }),
        }).catch(err => console.error('Telegram failure alert failed:', err));
      }
    }

    console.log("Delivery completed for order:", order_id, "Status:", deliveryStatus, "Emails sent:", totalEmails, "Failed parts:", failedParts);

    return new Response(
      JSON.stringify({ success: true, delivery_status: deliveryStatus, emails_sent: totalEmails, failed_parts: failedParts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in process-order-delivery:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
