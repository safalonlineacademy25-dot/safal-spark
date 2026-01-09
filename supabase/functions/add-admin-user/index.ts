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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, password, role } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: 'Email and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    if (!['admin', 'super_admin'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be admin or super_admin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with service role to verify the requesting user
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the current user from the auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super_admin (only super_admins can add users)
    const { data: isSuperAdmin, error: roleError } = await supabaseClient.rpc('is_super_admin', {
      _user_id: user.id,
    });

    if (roleError || !isSuperAdmin) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Only Super Admins can add new admin users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if user already exists
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    let targetUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // If user doesn't exist and password is provided, create them
    if (!targetUser) {
      if (!password) {
        return new Response(
          JSON.stringify({ error: 'Password is required when creating a new user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create the user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetUser = newUser.user;
      console.log(`Created new user: ${email}`);
    }

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'Failed to create or find user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a role
    const { data: existingRole, error: existingError } = await adminClient
      .from('user_roles')
      .select('id, role')
      .eq('user_id', targetUser.id)
      .in('role', ['admin', 'super_admin'])
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing role:', existingError);
      throw existingError;
    }

    if (existingRole) {
      // Update existing role
      const { error: updateError } = await adminClient
        .from('user_roles')
        .update({ role })
        .eq('id', existingRole.id);

      if (updateError) {
        console.error('Error updating role:', updateError);
        throw updateError;
      }

      console.log(`Updated ${email} role from ${existingRole.role} to ${role}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `User role updated from ${existingRole.role} to ${role}`,
          user: {
            id: targetUser.id,
            email: targetUser.email,
            role,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new role
    const { error: insertError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: targetUser.id,
        role,
      });

    if (insertError) {
      console.error('Error inserting role:', insertError);
      throw insertError;
    }

    console.log(`Added ${email} as ${role}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${email} added as ${role}`,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          role,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in add-admin-user:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
