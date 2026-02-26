import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Fetch table definitions
    const { data: columns } = await supabase
      .from("information_schema.columns" as any)
      .select("*")
      .eq("table_schema", "public");

    // Use raw SQL via rpc for schema info since information_schema isn't accessible via SDK
    // We'll build the schema from multiple queries

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

    // Execute all queries using the database connection
    const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
    
    // Use postgres connection
    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");
    const sql = postgres(dbUrl);

    const [tables, columnsList, constraints, indexes, rlsPolicies, rlsEnabled, functions, enums, triggers] = await Promise.all([
      sql.unsafe(sqlQueries.tables),
      sql.unsafe(sqlQueries.columns),
      sql.unsafe(sqlQueries.constraints),
      sql.unsafe(sqlQueries.indexes),
      sql.unsafe(sqlQueries.rls_policies),
      sql.unsafe(sqlQueries.rls_enabled),
      sql.unsafe(sqlQueries.functions),
      sql.unsafe(sqlQueries.enums),
      sql.unsafe(sqlQueries.triggers),
    ]);

    await sql.end();

    // Build the SQL output
    let output = '';
    output += '-- ============================================\n';
    output += '-- Database Schema Export\n';
    output += `-- Exported at: ${new Date().toISOString()}\n`;
    output += '-- Project: Safal Online Solutions\n';
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
    
    // Group columns, constraints by table
    for (const tableName of tableNames) {
      const tableCols = columnsList.filter((c: any) => c.table_name === tableName);
      const tablePks = constraints.filter((c: any) => c.table_name === tableName && c.constraint_type === 'PRIMARY KEY');
      const tableFks = constraints.filter((c: any) => c.table_name === tableName && c.constraint_type === 'FOREIGN KEY');
      const tableUniques = constraints.filter((c: any) => c.table_name === tableName && c.constraint_type === 'UNIQUE');

      output += `CREATE TABLE public.${tableName} (\n`;
      
      const colDefs: string[] = [];
      for (const col of tableCols) {
        let colType = col.udt_name;
        // Map common types
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

      // Primary key
      if (tablePks.length > 0) {
        const pkCols = [...new Set(tablePks.map((pk: any) => pk.column_name))];
        colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
      }

      // Unique constraints
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

      // Foreign keys as ALTER TABLE
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

    // Indexes (non-primary key)
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
