import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Record<string, any> = {};

    // Clean product-files bucket
    for (const bucket of ["product-files", "product-images"]) {
      const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list("", { limit: 1000 });

      if (listError) {
        results[bucket] = { error: listError.message };
        continue;
      }

      if (!files || files.length === 0) {
        results[bucket] = { deleted: 0, message: "No files found" };
        continue;
      }

      // For nested folders, we need to list recursively
      const allFiles: string[] = [];
      
      // List top-level files
      for (const item of files) {
        if (item.id) {
          allFiles.push(item.name);
        } else {
          // It's a folder, list its contents recursively
          const { data: subFiles } = await supabase.storage
            .from(bucket)
            .list(item.name, { limit: 1000 });
          
          if (subFiles) {
            for (const subFile of subFiles) {
              if (subFile.id) {
                allFiles.push(`${item.name}/${subFile.name}`);
              } else {
                // Go one more level deep (e.g., productId/audio/file.mp3)
                const { data: deepFiles } = await supabase.storage
                  .from(bucket)
                  .list(`${item.name}/${subFile.name}`, { limit: 1000 });
                if (deepFiles) {
                  for (const deepFile of deepFiles) {
                    if (deepFile.id) {
                      allFiles.push(`${item.name}/${subFile.name}/${deepFile.name}`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (allFiles.length > 0) {
        const { data: deleteData, error: deleteError } = await supabase.storage
          .from(bucket)
          .remove(allFiles);
        
        results[bucket] = {
          deleted: deleteData?.length ?? 0,
          errors: deleteError?.message,
          files: allFiles,
        };
      } else {
        results[bucket] = { deleted: 0, message: "No files to delete" };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
