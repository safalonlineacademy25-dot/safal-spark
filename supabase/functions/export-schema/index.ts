import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Edge function source code registry - maps function names to their purposes
const EDGE_FUNCTIONS = [
  { name: 'create-razorpay-order', description: 'Creates Razorpay payment orders' },
  { name: 'verify-razorpay-payment', description: 'Verifies Razorpay payment signatures and updates order status' },
  { name: 'process-order-delivery', description: 'Processes order deliveries, generates download tokens, sends emails/WhatsApp' },
  { name: 'send-download-email', description: 'Sends download links via email using Resend API' },
  { name: 'send-whatsapp-download', description: 'Sends download links via WhatsApp using MatrixCloud API' },
  { name: 'download-file', description: 'Validates download tokens and serves file downloads' },
  { name: 'track-visit', description: 'Tracks website visitor counts' },
  { name: 'broadcast-whatsapp', description: 'Broadcasts WhatsApp messages to customers by product category' },
  { name: 'send-promotion', description: 'Sends promotional WhatsApp messages to opted-in customers' },
  { name: 'process-refund', description: 'Processes payment refunds via Razorpay API' },
  { name: 'resend-webhook', description: 'Handles Resend email webhooks for delivery status' },
  { name: 'whatsapp-webhook', description: 'Handles WhatsApp webhook events for delivery status' },
  { name: 'send-telegram-notification', description: 'Sends notifications to Telegram chat' },
  { name: 'daily-visit-summary', description: 'Calculates daily visitor/order summaries for Telegram' },
  { name: 'get-admin-users', description: 'Retrieves list of admin users' },
  { name: 'add-admin-user', description: 'Adds or updates admin user roles' },
  { name: 'reset-admin-password', description: 'Resets admin user passwords (super_admin only)' },
  { name: 'purge-data', description: 'Purges oldest records from specified tables (super_admin only)' },
  { name: 'export-schema', description: 'Exports database schema as SQL' },
];

// Tables that contain mandatory config/seed data
const SEED_TABLES = ['settings', 'user_roles'];

// All tables for data dump
const ALL_DATA_TABLES = [
  'products', 'orders', 'order_items', 'customers', 'download_tokens',
  'user_roles', 'combo_pack_files', 'product_audio_files',
  'email_delivery_logs', 'broadcast_logs', 'promotion_logs',
  'refunds', 'settings', 'visitor_stats', 'rate_limits',
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabase.rpc("has_admin_access", {
      _user_id: user.id,
    });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body to determine export mode
    let exportMode = 'schema'; // default: schema only
    try {
      const body = await req.json();
      if (body?.mode) exportMode = body.mode;
    } catch {
      // no body = default schema mode
    }

    const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");
    const sql = postgres(dbUrl);

    if (exportMode === 'data-dump') {
      // Export all table data as INSERT statements
      let output = '';
      output += '-- ============================================\n';
      output += '-- Full Data Dump\n';
      output += `-- Exported at: ${new Date().toISOString()}\n`;
      output += '-- Project: Safal Online Solutions\n';
      output += '-- ============================================\n\n';
      output += '-- NOTE: Import schema first, then run this file.\n';
      output += '-- Tables are ordered to respect foreign key dependencies.\n\n';

      // Order tables to handle FK dependencies
      const orderedTables = [
        'settings', 'visitor_stats', 'rate_limits',
        'products', 'combo_pack_files', 'product_audio_files',
        'customers', 'user_roles',
        'orders', 'order_items', 'download_tokens',
        'email_delivery_logs', 'broadcast_logs', 'promotion_logs', 'refunds',
      ];

      for (const tableName of orderedTables) {
        const rows = await sql.unsafe(`SELECT * FROM public.${tableName} ORDER BY created_at ASC NULLS FIRST`);
        
        if (rows.length === 0) {
          output += `-- Table: ${tableName} (empty)\n\n`;
          continue;
        }

        output += `-- =====================\n`;
        output += `-- ${tableName} (${rows.length} rows)\n`;
        output += `-- =====================\n\n`;

        const columns = Object.keys(rows[0]);
        
        for (const row of rows) {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'boolean') return val ? 'true' : 'false';
            if (typeof val === 'number') return String(val);
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
            if (Array.isArray(val)) return `ARRAY[${val.map((v: any) => `'${String(v).replace(/'/g, "''")}'`).join(',')}]::text[]`;
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          
          output += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
        }
        output += '\n';
      }

      await sql.end();

      return new Response(JSON.stringify({ sql: output }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Schema export mode (default) — now includes seed data + edge function registry

    const sqlQueries = {
      tables: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `,
      columns: `
        SELECT table_name, column_name, data_type, udt_name, is_nullable, 
               column_default, character_maximum_length, numeric_precision, numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `,
      constraints: `
        SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
               kcu.column_name,
               ccu.table_name AS foreign_table_name,
               ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name;
      `,
      indexes: `
        SELECT indexname, tablename, indexdef 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
      `,
      rls_policies: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `,
      rls_enabled: `
        SELECT relname, relrowsecurity
        FROM pg_class 
        WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND relkind = 'r';
      `,
      functions: `
        SELECT p.proname AS function_name,
               pg_get_functiondef(p.oid) AS function_definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY p.proname;
      `,
      enums: `
        SELECT t.typname AS enum_name,
               string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS enum_values
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public'
        GROUP BY t.typname;
      `,
      triggers: `
        SELECT trigger_name, event_manipulation, event_object_table, action_statement, action_timing
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name;
      `,
    };

    // Fetch schema data + seed data in parallel
    const [tables, columnsList, constraints, indexes, rlsPolicies, rlsEnabled, functions, enums, triggers, settingsData, userRolesData] = await Promise.all([
      sql.unsafe(sqlQueries.tables),
      sql.unsafe(sqlQueries.columns),
      sql.unsafe(sqlQueries.constraints),
      sql.unsafe(sqlQueries.indexes),
      sql.unsafe(sqlQueries.rls_policies),
      sql.unsafe(sqlQueries.rls_enabled),
      sql.unsafe(sqlQueries.functions),
      sql.unsafe(sqlQueries.enums),
      sql.unsafe(sqlQueries.triggers),
      sql.unsafe(`SELECT * FROM public.settings ORDER BY key`),
      sql.unsafe(`SELECT * FROM public.user_roles ORDER BY created_at`),
    ]);

    await sql.end();

    // Build the SQL output
    let output = '';
    output += '-- ============================================\n';
    output += '-- Complete Database Schema + Seed Data Export\n';
    output += `-- Exported at: ${new Date().toISOString()}\n`;
    output += '-- Project: Safal Online Solutions\n';
    output += '-- Includes: Schema, RLS, Functions, Triggers,\n';
    output += '--           Seed Data (settings, user_roles),\n';
    output += '--           Edge Function Registry\n';
    output += '-- ============================================\n\n';

    // Enums
    if (enums.length > 0) {
      output += '-- =====================\n';
      output += '-- ENUM TYPES\n';
      output += '-- =====================\n\n';
      for (const e of enums) {
        const values = e.enum_values.split(', ').map((v: string) => `'${v}'`).join(', ');
        output += `CREATE TYPE public.${e.enum_name} AS ENUM (${values});\n\n`;
      }
    }

    // Tables
    output += '-- =====================\n';
    output += '-- TABLES\n';
    output += '-- =====================\n\n';

    const tableNames = tables.map((t: any) => t.table_name);
    
    for (const tableName of tableNames) {
      const tableCols = columnsList.filter((c: any) => c.table_name === tableName);
      const tablePks = constraints.filter((c: any) => c.table_name === tableName && c.constraint_type === 'PRIMARY KEY');
      const tableFks = constraints.filter((c: any) => c.table_name === tableName && c.constraint_type === 'FOREIGN KEY');
      const tableUniques = constraints.filter((c: any) => c.table_name === tableName && c.constraint_type === 'UNIQUE');

      output += `CREATE TABLE public.${tableName} (\n`;
      
      const colDefs: string[] = [];
      for (const col of tableCols) {
        let colType = col.udt_name;
        if (colType === 'int4') colType = 'integer';
        else if (colType === 'int8') colType = 'bigint';
        else if (colType === 'bool') colType = 'boolean';
        else if (colType === 'float8') colType = 'double precision';
        else if (colType === 'timestamptz') colType = 'timestamp with time zone';
        else if (colType === 'varchar' && col.character_maximum_length) colType = `varchar(${col.character_maximum_length})`;
        else if (colType === '_text') colType = 'text[]';

        let def = `  ${col.column_name} ${colType}`;
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        colDefs.push(def);
      }

      if (tablePks.length > 0) {
        const pkCols = [...new Set(tablePks.map((pk: any) => pk.column_name))];
        colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
      }

      const uniqueGroups = new Map<string, string[]>();
      for (const u of tableUniques) {
        if (!uniqueGroups.has(u.constraint_name)) uniqueGroups.set(u.constraint_name, []);
        uniqueGroups.get(u.constraint_name)!.push(u.column_name);
      }
      for (const [, cols] of uniqueGroups) {
        colDefs.push(`  UNIQUE (${cols.join(', ')})`);
      }

      output += colDefs.join(',\n');
      output += '\n);\n\n';

      const fkGroups = new Map<string, any>();
      for (const fk of tableFks) {
        if (!fkGroups.has(fk.constraint_name)) fkGroups.set(fk.constraint_name, fk);
      }
      for (const [name, fk] of fkGroups) {
        output += `ALTER TABLE public.${tableName} ADD CONSTRAINT ${name}\n`;
        output += `  FOREIGN KEY (${fk.column_name}) REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name});\n\n`;
      }
    }

    // RLS
    output += '-- =====================\n';
    output += '-- ROW LEVEL SECURITY\n';
    output += '-- =====================\n\n';

    for (const table of rlsEnabled) {
      if (table.relrowsecurity) {
        output += `ALTER TABLE public.${table.relname} ENABLE ROW LEVEL SECURITY;\n`;
      }
    }
    output += '\n';

    for (const policy of rlsPolicies) {
      const permissive = policy.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE';
      output += `CREATE POLICY "${policy.policyname}"\n`;
      output += `  ON public.${policy.tablename}\n`;
      output += `  AS ${permissive}\n`;
      output += `  FOR ${policy.cmd}\n`;
      output += `  TO ${policy.roles.join(', ')}\n`;
      if (policy.qual) output += `  USING (${policy.qual})\n`;
      if (policy.with_check) output += `  WITH CHECK (${policy.with_check})\n`;
      output += ';\n\n';
    }

    // Indexes
    const nonPkIndexes = indexes.filter((i: any) => !i.indexname.endsWith('_pkey'));
    if (nonPkIndexes.length > 0) {
      output += '-- =====================\n';
      output += '-- INDEXES\n';
      output += '-- =====================\n\n';
      for (const idx of nonPkIndexes) {
        output += `${idx.indexdef};\n\n`;
      }
    }

    // Functions
    if (functions.length > 0) {
      output += '-- =====================\n';
      output += '-- FUNCTIONS\n';
      output += '-- =====================\n\n';
      for (const fn of functions) {
        output += `${fn.function_definition};\n\n`;
      }
    }

    // Triggers
    if (triggers.length > 0) {
      output += '-- =====================\n';
      output += '-- TRIGGERS\n';
      output += '-- =====================\n\n';
      for (const trig of triggers) {
        output += `CREATE TRIGGER ${trig.trigger_name}\n`;
        output += `  ${trig.action_timing} ${trig.event_manipulation}\n`;
        output += `  ON public.${trig.event_object_table}\n`;
        output += `  FOR EACH ROW\n`;
        output += `  ${trig.action_statement};\n\n`;
      }
    }

    // ==================
    // SEED DATA
    // ==================
    output += '-- =====================\n';
    output += '-- SEED DATA: settings\n';
    output += `-- (${settingsData.length} rows)\n`;
    output += '-- =====================\n\n';

    for (const row of settingsData) {
      const val = row.value === null ? 'NULL' : `'${String(row.value).replace(/'/g, "''")}'`;
      output += `INSERT INTO public.settings (id, key, value, created_at, updated_at)\n`;
      output += `  VALUES ('${row.id}', '${row.key}', ${val}, '${row.created_at}', '${row.updated_at}')\n`;
      output += `  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;\n\n`;
    }

    output += '-- =====================\n';
    output += '-- SEED DATA: user_roles\n';
    output += `-- (${userRolesData.length} rows)\n`;
    output += '-- =====================\n\n';
    output += '-- NOTE: user_id references auth.users — you must recreate users first.\n\n';

    for (const row of userRolesData) {
      output += `INSERT INTO public.user_roles (id, user_id, role, created_at)\n`;
      output += `  VALUES ('${row.id}', '${row.user_id}', '${row.role}', '${row.created_at}')\n`;
      output += `  ON CONFLICT DO NOTHING;\n\n`;
    }

    // ==================
    // EDGE FUNCTIONS REGISTRY
    // ==================
    output += '-- =====================\n';
    output += '-- EDGE FUNCTIONS REGISTRY\n';
    output += '-- =====================\n';
    output += '-- These are Supabase Edge Functions (Deno) deployed with this project.\n';
    output += '-- Source code is in: supabase/functions/<name>/index.ts\n';
    output += '-- They are NOT stored in the database but are essential for the backend.\n\n';

    for (const fn of EDGE_FUNCTIONS) {
      output += `-- Function: ${fn.name}\n`;
      output += `--   Description: ${fn.description}\n`;
      output += `--   Path: supabase/functions/${fn.name}/index.ts\n\n`;
    }

    output += '-- =====================\n';
    output += '-- EDGE FUNCTIONS CONFIG (supabase/config.toml)\n';
    output += '-- =====================\n';
    output += '-- All edge functions require verify_jwt = false\n';
    output += '-- (JWT validation is handled in the function code)\n\n';

    for (const fn of EDGE_FUNCTIONS) {
      output += `-- [functions.${fn.name}]\n`;
      output += `-- verify_jwt = false\n\n`;
    }

    // Required secrets
    output += '-- =====================\n';
    output += '-- REQUIRED SECRETS (Edge Function env vars)\n';
    output += '-- =====================\n';
    output += '-- These must be configured in Supabase Dashboard > Settings > Edge Functions:\n';
    output += '--   SUPABASE_URL\n';
    output += '--   SUPABASE_ANON_KEY\n';
    output += '--   SUPABASE_SERVICE_ROLE_KEY\n';
    output += '--   SUPABASE_DB_URL\n';
    output += '--   RESEND_WEBHOOK_SECRET\n';
    output += '--   WHATSAPP_WEBHOOK_VERIFY_TOKEN\n';
    output += '-- Additional secrets configured via settings table:\n';
    output += '--   razorpay_key_id, razorpay_key_secret (in settings table)\n';
    output += '--   whatsapp_api_key, whatsapp_phone_id (in settings table)\n';
    output += '--   resend_api_key (in settings table)\n';
    output += '--   telegram_bot_token, telegram_chat_id (in settings table)\n\n';

    return new Response(JSON.stringify({ sql: output }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Schema export error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to export schema" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
