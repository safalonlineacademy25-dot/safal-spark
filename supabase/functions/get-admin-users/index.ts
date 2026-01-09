import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    // Extract the token
    const token = authHeader.replace('Bearer ', '');

    // Create client with anon key to verify the user's JWT
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user using the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key to bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if user has admin access (admin or super_admin)
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

    // Fetch admin user roles (both admin and super_admin)
    const { data: adminRoles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('id, user_id, role, created_at')
      .in('role', ['admin', 'super_admin']);

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      throw rolesError;
    }

    // Fetch user emails for each admin
    const adminUsers = await Promise.all(
      (adminRoles || []).map(async (role) => {
        const { data: userData, error: userFetchError } = await adminClient.auth.admin.getUserById(role.user_id);
        
        if (userFetchError) {
          console.error(`Error fetching user ${role.user_id}:`, userFetchError);
          return {
            id: role.id,
            user_id: role.user_id,
            email: role.user_id, // Fallback to user_id
            role: role.role,
            created_at: role.created_at,
          };
        }

        return {
          id: role.id,
          user_id: role.user_id,
          email: userData.user?.email || role.user_id,
          role: role.role,
          created_at: role.created_at,
        };
      })
    );

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
