import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSupabaseEnv } from "../env";

function adminClient() {
  const { url, serviceRole } = getSupabaseEnv();
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAdmin(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) return { ok: false, msg: "Not authenticated" };
  const uid = ctx.getUserId();
  if (!uid) return { ok: false, msg: "Missing user id" };
  const { data, error } = await adminClient().rpc("has_admin_access", { _user_id: uid });
  if (error) return { ok: false, msg: `Auth check failed: ${error.message}` };
  if (!data) return { ok: false, msg: "Admin access required" };
  return { ok: true as const };
}

export default defineTool({
  name: "list_recent_orders",
  title: "List recent orders",
  description: "List the most recent orders, optionally filtered by status.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).describe("Number of orders (1-50)."),
    status: z.enum(["pending", "paid", "failed", "partial_failure"]).optional().describe("Optional order status filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    const gate = await requireAdmin(ctx);
    if (!gate.ok) return { content: [{ type: "text", text: gate.msg }], isError: true };

    let q = adminClient()
      .from("orders")
      .select("order_number, customer_name, customer_email, total_amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { orders: data ?? [] },
    };
  },
});
