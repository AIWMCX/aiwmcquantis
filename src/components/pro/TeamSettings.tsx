import React, { useState } from 'react';
import { useTeam, TeamMember, TeamInvitation } from '@/hooks/useTeam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Plus, 
  Crown, 
  Shield, 
  User, 
  Eye,
  Mail,
  Trash2,
  Clock,
  UserPlus,
  Settings,
  LogOut
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const ROLE_COLORS = {
  owner: 'bg-warning/10 text-warning border-warning/30',
  admin: 'bg-primary/10 text-primary border-primary/30',
  member: 'bg-muted text-muted-foreground',
  viewer: 'bg-muted text-muted-foreground',
};

export function TeamSettings() {
  const {
    team,
    members,
    invitations,
    loading,
    saving,
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
  } = useTeam();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    await createTeam(teamName.trim());
    setTeamName('');
    setCreateDialogOpen(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    await inviteMember(inviteEmail.trim(), inviteRole);
    setInviteEmail('');
    setInviteRole('member');
    setInviteDialogOpen(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No team yet - show create option
  if (!team) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Workspace
          </CardTitle>
          <CardDescription>
            Create a team to collaborate with others on analyses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Team Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create a team workspace to share analyses and collaborate with your colleagues
            </p>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Team Workspace</DialogTitle>
                  <DialogDescription>
                    Name your team. You can invite members after creating it.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g., Acme Corp"
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTeam} 
                    disabled={saving || !teamName.trim()}
                  >
                    {saving ? 'Creating...' : 'Create Team'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Has team - show management UI
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {team.name}
            </CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? 's' : ''}
              {invitations.length > 0 && ` • ${invitations.length} pending invitation${invitations.length !== 1 ? 's' : ''}`}
            </CardDescription>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your team
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="inviteEmail">Email Address</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="inviteRole">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin - Can manage team</SelectItem>
                          <SelectItem value="member">Member - Can analyze</SelectItem>
                          <SelectItem value="viewer">Viewer - Read only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleInvite} 
                      disabled={saving || !inviteEmail.trim()}
                    >
                      {saving ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Members */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Members
          </h3>
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isCurrentUserOwner={isOwner}
              isCurrentUserAdmin={isAdmin}
              teamOwnerId={team.owner_id}
              onUpdateRole={(role) => updateMemberRole(member.user_id, role)}
              onRemove={() => removeMember(member.user_id)}
            />
          ))}
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Pending Invitations
            </h3>
            {invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onCancel={() => cancelInvitation(invitation.id)}
              />
            ))}
          </div>
        )}

        {/* Team Actions */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            {isOwner ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete Team
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Team?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the team "{team.name}" and remove all members. 
                      Shared analyses will no longer be accessible to the team.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteTeam} className="bg-destructive">
                      Delete Team
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <LogOut className="w-4 h-4" />
                    Leave Team
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave Team?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will lose access to shared team analyses. 
                      You can be re-invited later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={leaveTeam}>
                      Leave Team
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MemberCardProps {
  member: TeamMember;
  isCurrentUserOwner: boolean;
  isCurrentUserAdmin: boolean;
  teamOwnerId: string;
  onUpdateRole: (role: string) => void;
  onRemove: () => void;
}

function MemberCard({ 
  member, 
  isCurrentUserOwner, 
  isCurrentUserAdmin,
  teamOwnerId,
  onUpdateRole, 
  onRemove 
}: MemberCardProps) {
  const RoleIcon = ROLE_ICONS[member.role];
  const isTeamOwner = member.user_id === teamOwnerId;
  const canModify = isCurrentUserAdmin && !isTeamOwner;

  return (
    <div className="p-4 rounded-lg border border-border bg-card flex items-center gap-4">
      <Avatar>
        <AvatarFallback>
          {member.full_name?.charAt(0) || member.email?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {member.full_name || member.email || 'Unknown User'}
          </span>
          <Badge variant="outline" className={ROLE_COLORS[member.role]}>
            <RoleIcon className="w-3 h-3 mr-1" />
            {ROLE_LABELS[member.role]}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
          <Clock className="w-3 h-3" />
          Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
        </div>
      </div>
      {canModify && (
        <div className="flex items-center gap-2">
          <Select value={member.role} onValueChange={onUpdateRole}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove {member.full_name || 'this member'} from the team.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove} className="bg-destructive">
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

interface InvitationCardProps {
  invitation: TeamInvitation;
  onCancel: () => void;
}

function InvitationCard({ invitation, onCancel }: InvitationCardProps) {
  return (
    <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Mail className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{invitation.email}</span>
          <Badge variant="secondary">Pending</Badge>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
          <Clock className="w-3 h-3" />
          Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onCancel} className="text-destructive">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
