import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PurgeRequest {
  tableName: "orders" | "order_items" | "download_tokens";
  recordCount: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client for auth verification
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user and check super_admin role
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("[purge-data] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is super_admin using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if user has super_admin role (user may have multiple roles)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin");

    if (roleError) {
      console.error("[purge-data] Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if any row with super_admin role exists
    if (!roleData || roleData.length === 0) {
      console.warn("[purge-data] Access denied for user:", user.id, "- not a super_admin");
      return new Response(
        JSON.stringify({ error: "Super Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: PurgeRequest = await req.json();
    const { tableName, recordCount } = body;

    // Validate inputs
    const validTables = ["orders", "order_items", "download_tokens"];
    if (!validTables.includes(tableName)) {
      return new Response(
        JSON.stringify({ error: "Invalid table name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recordCount || recordCount < 1 || recordCount > 1000) {
      return new Response(
        JSON.stringify({ error: "Record count must be between 1 and 1000" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[purge-data] User ${user.email} purging ${recordCount} records from ${tableName}`);

    // Fetch records to delete (oldest first)
    const { data: recordsToDelete, error: fetchError } = await supabaseAdmin
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: true })
      .limit(recordCount);

    if (fetchError) {
      console.error("[purge-data] Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch records: " + fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recordsToDelete || recordsToDelete.length === 0) {
      return new Response(
        JSON.stringify({ error: "No records found to delete", deletedCount: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate CSV content
    const headers = Object.keys(recordsToDelete[0]);
    const csvRows = [
      headers.join(","),
      ...recordsToDelete.map((record) =>
        headers.map((header) => {
          const value = record[header];
          if (value === null || value === undefined) return "";
          if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(",")
      ),
    ];
    const csvContent = csvRows.join("\n");

    // Get IDs to delete
    const idsToDelete = recordsToDelete.map((r) => r.id);

    // For orders table, also delete related records first (cascade manually for safety)
    if (tableName === "orders") {
      // Delete related download_tokens
      const { error: tokenDeleteError } = await supabaseAdmin
        .from("download_tokens")
        .delete()
        .in("order_id", idsToDelete);

      if (tokenDeleteError) {
        console.error("[purge-data] Token delete error:", tokenDeleteError);
        // Continue anyway, may not have tokens
      }

      // Delete related order_items
      const { error: itemDeleteError } = await supabaseAdmin
        .from("order_items")
        .delete()
        .in("order_id", idsToDelete);

      if (itemDeleteError) {
        console.error("[purge-data] Items delete error:", itemDeleteError);
        // Continue anyway
      }
    }

    // Delete the main records
    const { error: deleteError } = await supabaseAdmin
      .from(tableName)
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("[purge-data] Delete error:", deleteError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete records: " + deleteError.message,
          csvContent, // Still return backup even on failure
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[purge-data] Successfully deleted ${idsToDelete.length} records from ${tableName}`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: idsToDelete.length,
        csvContent,
        message: `Successfully deleted ${idsToDelete.length} records from ${tableName}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[purge-data] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
