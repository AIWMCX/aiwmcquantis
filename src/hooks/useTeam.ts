import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invited_by: string | null;
  joined_at: string;
  // Joined profile data
  email?: string;
  full_name?: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: string;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface UseTeamReturn {
  team: Team | null;
  members: TeamMember[];
  invitations: TeamInvitation[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  canInvite: boolean;
  createTeam: (name: string) => Promise<Team | null>;
  updateTeam: (updates: { name?: string; settings?: Json }) => Promise<void>;
  deleteTeam: () => Promise<void>;
  inviteMember: (email: string, role: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  updateMemberRole: (userId: string, role: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  leaveTeam: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTeam(): UseTeamReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamData = useCallback(async () => {
    if (!user) {
      setTeam(null);
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, find user's team membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError && membershipError.code !== 'PGRST116') {
        throw membershipError;
      }

      if (!membershipData) {
        setTeam(null);
        setMembers([]);
        setInvitations([]);
        setLoading(false);
        return;
      }

      // Fetch team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', membershipData.team_id)
        .single();

      if (teamError) throw teamError;

      setTeam(teamData);

      // Fetch team members with profile info
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          team_id,
          user_id,
          role,
          invited_by,
          joined_at
        `)
        .eq('team_id', membershipData.team_id)
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;

      // Fetch profile data for members
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      const enrichedMembers: TeamMember[] = (membersData || []).map(m => ({
        ...m,
        role: m.role as TeamMember['role'],
        full_name: profilesMap.get(m.user_id)?.full_name || undefined,
      }));

      setMembers(enrichedMembers);

      // Fetch pending invitations (only for admins/owners)
      const userMember = enrichedMembers.find(m => m.user_id === user.id);
      if (userMember?.role === 'owner' || userMember?.role === 'admin') {
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('team_id', membershipData.team_id)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString());

        if (!invitationsError) {
          setInvitations(invitationsData || []);
        }
      } else {
        setInvitations([]);
      }
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Computed values
  const userMember = members.find(m => m.user_id === user?.id);
  const isOwner = team?.owner_id === user?.id;
  const isAdmin = userMember?.role === 'admin' || isOwner;
  const canInvite = isAdmin;

  const createTeam = async (name: string): Promise<Team | null> => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to create a team',
        variant: 'destructive',
      });
      return null;
    }

    if (team) {
      toast({
        title: 'Already in a team',
        description: 'You must leave your current team before creating a new one',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setSaving(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('teams')
        .insert({
          name,
          owner_id: user.id,
        })
        .select()
        .single();

      if (insertError) {
        // Check for RLS policy violation (Pro subscription required)
        if (insertError.message?.includes('row-level security') || insertError.code === '42501') {
          throw new Error('Team collaboration requires a Pro subscription. Please upgrade to create teams.');
        }
        throw insertError;
      }

      await fetchTeamData();

      toast({
        title: 'Team Created',
        description: `Your team "${name}" has been created`,
      });

      return data;
    } catch (err) {
      console.error('Error creating team:', err);
      const message = err instanceof Error ? err.message : 'Failed to create team';
      setError(message);
      toast({
        title: 'Creation Failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateTeam = async (updates: { name?: string; settings?: Json }) => {
    if (!team || !isAdmin) return;

    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', team.id);

      if (updateError) throw updateError;

      await fetchTeamData();

      toast({
        title: 'Team Updated',
        description: 'Team settings have been saved',
      });
    } catch (err) {
      console.error('Error updating team:', err);
      toast({
        title: 'Update Failed',
        description: err instanceof Error ? err.message : 'Failed to update team',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteTeam = async () => {
    if (!team || !isOwner) return;

    try {
      setSaving(true);

      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id);

      if (deleteError) throw deleteError;

      setTeam(null);
      setMembers([]);
      setInvitations([]);

      toast({
        title: 'Team Deleted',
        description: 'Your team has been permanently deleted',
      });
    } catch (err) {
      console.error('Error deleting team:', err);
      toast({
        title: 'Delete Failed',
        description: err instanceof Error ? err.message : 'Failed to delete team',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const inviteMember = async (email: string, role: string) => {
    if (!team || !canInvite || !user) return;

    try {
      setSaving(true);

      const { error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          team_id: team.id,
          email,
          role,
          invited_by: user.id,
        });

      if (inviteError) throw inviteError;

      await fetchTeamData();

      toast({
        title: 'Invitation Sent',
        description: `An invitation has been sent to ${email}`,
      });
    } catch (err) {
      console.error('Error inviting member:', err);
      toast({
        title: 'Invite Failed',
        description: err instanceof Error ? err.message : 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!team || !isAdmin) return;

    // Cannot remove owner
    if (userId === team.owner_id) {
      toast({
        title: 'Cannot Remove Owner',
        description: 'The team owner cannot be removed',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const { error: deleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      setMembers(prev => prev.filter(m => m.user_id !== userId));

      toast({
        title: 'Member Removed',
        description: 'The team member has been removed',
      });
    } catch (err) {
      console.error('Error removing member:', err);
      toast({
        title: 'Remove Failed',
        description: err instanceof Error ? err.message : 'Failed to remove member',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateMemberRole = async (userId: string, role: string) => {
    if (!team || !isAdmin) return;

    // Cannot change owner role
    if (userId === team.owner_id) {
      toast({
        title: 'Cannot Change Owner Role',
        description: 'The team owner role cannot be changed',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from('team_members')
        .update({ role })
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setMembers(prev =>
        prev.map(m =>
          m.user_id === userId ? { ...m, role: role as TeamMember['role'] } : m
        )
      );

      toast({
        title: 'Role Updated',
        description: 'Member role has been updated',
      });
    } catch (err) {
      console.error('Error updating role:', err);
      toast({
        title: 'Update Failed',
        description: err instanceof Error ? err.message : 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    if (!team || !isAdmin) return;

    try {
      setSaving(true);

      const { error: deleteError } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (deleteError) throw deleteError;

      setInvitations(prev => prev.filter(i => i.id !== invitationId));

      toast({
        title: 'Invitation Canceled',
        description: 'The invitation has been canceled',
      });
    } catch (err) {
      console.error('Error canceling invitation:', err);
      toast({
        title: 'Cancel Failed',
        description: err instanceof Error ? err.message : 'Failed to cancel invitation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const leaveTeam = async () => {
    if (!team || !user || isOwner) return;

    try {
      setSaving(true);

      const { error: deleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setTeam(null);
      setMembers([]);
      setInvitations([]);

      toast({
        title: 'Left Team',
        description: 'You have left the team',
      });
    } catch (err) {
      console.error('Error leaving team:', err);
      toast({
        title: 'Leave Failed',
        description: err instanceof Error ? err.message : 'Failed to leave team',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    team,
    members,
    invitations,
    loading,
    saving,
    error,
    isOwner,
    isAdmin,
    canInvite,
    createTeam,
    updateTeam,
    deleteTeam,
    inviteMember,
    removeMember,
    updateMemberRole,
    cancelInvitation,
    leaveTeam,
    refetch: fetchTeamData,
  };
}
