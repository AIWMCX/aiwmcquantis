/**
 * AIWMC Quantis — POST /team-invite
 *
 * Spec §11.1: Team access — invited members inherit PRO read access; the
 * host's tier and the 3-seat cap are enforced server-side. Both checks are
 * also enforced at the DB layer via `enforce_team_seat_cap` trigger; this
 * function returns clean JSON envelopes for the UI.
 *
 * Body: { team_id: uuid, invitee_email: string, role?: 'member' | 'admin' }
 * Returns: { success, invitation_id, expires_at }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeadersFor } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Caller identity
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { team_id?: string; invitee_email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'INVALID_JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { team_id, invitee_email, role = 'member' } = body;
  if (!team_id || !invitee_email) {
    return new Response(JSON.stringify({ error: 'team_id + invitee_email required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Whitelist role values — prevents privilege escalation to 'owner'/'super_admin'/etc.
  const ALLOWED_ROLES = ['member', 'admin'] as const;
  if (!ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
    return new Response(
      JSON.stringify({
        error: 'INVALID_ROLE',
        message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}.`,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Caller must be an admin/owner of this team
  const { data: isAdmin } = await admin.rpc('is_team_admin', {
    _user_id: user.id,
    _team_id: team_id,
  });
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ success: false, error: 'FORBIDDEN', message: 'Only team admins can invite members.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Owner must be PRO
  const { data: team } = await admin.from('teams').select('owner_id').eq('id', team_id).maybeSingle();
  if (!team) {
    return new Response(JSON.stringify({ error: 'Team not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data: ownerIsPro } = await admin.rpc('verify_pro_subscription', { p_user_id: team.owner_id });
  if (!ownerIsPro) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'TIER_GATE',
        required_tier: 'PRO',
        message: 'Team seats require the team owner to hold a PRO subscription.',
        upgrade_url: 'https://www.aiwmcquantis.com/pricing?plan=pro',
        cta: 'Upgrade to PRO',
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // 3-seat cap (members + pending invites)
  const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
    admin.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', team_id),
    admin
      .from('team_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()),
  ]);
  if ((memberCount ?? 0) + (inviteCount ?? 0) >= 3) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'SEAT_CAP_REACHED',
        message: 'PRO plan includes 3 team seats. Remove a member or invite to free up a seat.',
      }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Create invitation
  const token = crypto.randomUUID().replace(/-/g, '');
  const { data: inv, error: invErr } = await admin
    .from('team_invitations')
    .insert({
      team_id,
      inviter_user_id: user.id,
      invitee_email: invitee_email.trim().toLowerCase(),
      role,
      invitation_token: token,
    })
    .select('id, expires_at')
    .single();

  if (invErr) {
    return new Response(JSON.stringify({ success: false, error: invErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      invitation_id: inv.id,
      expires_at: inv.expires_at,
      invite_url: `https://www.aiwmcquantis.com/team/accept?token=${token}`,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
