import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    // Structure: Array of email groups, each group = one email to send
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
          // and send one email per original product
          const sourceProductGroups: Map<string, {
            sourceProductName: string;
            docFiles: typeof documentFiles;
            audioFilesArr: typeof audioFiles;
          }> = new Map();

          // Group document files by source product
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

          // Group audio files by source product
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

          // For each source product, create tokens and build email entry
          for (const [_sourceKey, group] of sourceProductGroups) {
            const fileTokens: Array<{ name: string; downloadToken: string }> = [];

            // Document tokens
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

            // Audio tokens
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
          // Non-combo: standard per-product email grouping (documents + audio together)
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

    // Send download links via email - one email per product (with counter)
    let deliveryStatus = 'pending';
    const deliveryResults: { whatsapp?: any; productEmails?: any[] } = {};
    const totalEmails = emailsToSend.length;

    if (totalEmails > 0) {
      deliveryResults.productEmails = [];

      for (let i = 0; i < emailsToSend.length; i++) {
        const emailEntry = emailsToSend[i];
        if (i > 0) await delay(2000);

        const emailResult = await sendDownloadEmail(
          order_id,
          order.customer_email,
          order.customer_name,
          emailEntry.files,
          totalEmails > 1, // isMultiFileEmail - use combo template if multiple emails
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

        if (emailResult.success) deliveryStatus = 'sent';
      }
    }

    // Send WhatsApp
    if (totalEmails > 0) {
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
      } else if (!hasSuccessfulDelivery) {
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

    console.log("Delivery completed for order:", order_id, "Status:", deliveryStatus, "Emails sent:", totalEmails);

    return new Response(
      JSON.stringify({ success: true, delivery_status: deliveryStatus, emails_sent: totalEmails }),
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
