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
  name: "get_sales_summary",
  title: "Get sales summary",
  description: "Aggregate sales metrics (orders count, revenue) for the last N days.",
  inputSchema: {
    days: z.number().int().min(1).max(90).describe("Look-back window in days (1-90)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    const gate = await requireAdmin(ctx);
    if (!gate.ok) return { content: [{ type: "text", text: gate.msg }], isError: true };

    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await adminClient()
      .from("orders")
      .select("total_amount, status, created_at")
      .gte("created_at", since);

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    const paid = (data ?? []).filter((o: any) => o.status === "paid");
    const revenue = paid.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
    const summary = {
      window_days: days,
      total_orders: data?.length ?? 0,
      paid_orders: paid.length,
      revenue_inr: revenue,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
