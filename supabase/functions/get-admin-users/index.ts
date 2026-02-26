import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: hasAccess, error: accessError } = await adminClient.rpc('has_admin_access', {
      _user_id: user.id,
    });

    if (accessError || !hasAccess) {
      console.error('Access check error:', accessError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch admin user roles
    const { data: adminRoles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('id, user_id, role, created_at')
      .in('role', ['admin', 'super_admin']);

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      throw rolesError;
    }

    // Batch fetch all admin user emails using listUsers instead of individual getUserById calls
    const userIds = (adminRoles || []).map(r => r.user_id);
    const emailMap: Record<string, string> = {};

    if (userIds.length > 0) {
      // Fetch all users at once - listUsers with pagination
      const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
        perPage: 1000,
      });

      if (!listError && listData?.users) {
        for (const u of listData.users) {
          if (userIds.includes(u.id)) {
            emailMap[u.id] = u.email || u.id;
          }
        }
      } else {
        console.error('Error listing users:', listError);
      }
    }

    const adminUsers = (adminRoles || []).map((role) => ({
      id: role.id,
      user_id: role.user_id,
      email: emailMap[role.user_id] || role.user_id,
      role: role.role,
      created_at: role.created_at,
    }));

    console.log(`Fetched ${adminUsers.length} admin users`);

    return new Response(
      JSON.stringify({ adminUsers }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in get-admin-users:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
