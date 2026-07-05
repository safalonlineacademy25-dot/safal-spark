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
  name: "get_order",
  title: "Get order",
  description: "Look up a single order by its order number (e.g. SOA20260704-1234).",
  inputSchema: {
    order_number: z.string().trim().min(3).max(64).describe("Order number to look up."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ order_number }, ctx) => {
    const gate = await requireAdmin(ctx);
    if (!gate.ok) return { content: [{ type: "text", text: gate.msg }], isError: true };

    const { data, error } = await adminClient()
      .from("orders")
      .select("id, order_number, customer_name, customer_email, customer_phone, total_amount, status, created_at, razorpay_payment_id")
      .eq("order_number", order_number)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No order found with number ${order_number}.` }] };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { order: data },
    };
  },
});
