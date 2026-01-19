import React, { useState } from 'react';
import { useApiKeys, ApiKey, ApiKeyCreateResult } from '@/hooks/useApiKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  Check,
  Clock,
  BarChart3,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ApiKeysManager() {
  const {
    apiKeys,
    loading,
    creating,
    createApiKey,
    revokeApiKey,
    toggleApiKey,
  } = useApiKeys();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<ApiKeyCreateResult | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    
    const result = await createApiKey(newKeyName.trim());
    if (result) {
      setCreatedKey(result);
      setNewKeyName('');
    }
  };

  const handleCopyKey = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey.key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreatedKey(null);
    setNewKeyName('');
    setCopiedKey(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          API Keys
        </CardTitle>
        <CardDescription>
          Manage API keys for programmatic access to AIWMC Quantis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Documentation Link */}
        <div className="p-4 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
          <div>
            <p className="font-medium">API Documentation</p>
            <p className="text-sm text-muted-foreground">
              Learn how to integrate with the AIWMC Quantis API
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href="#api-docs" onClick={(e) => {
              e.preventDefault();
              // TODO: Open API docs modal or navigate to docs page
              alert('API Documentation coming soon!');
            }}>
              <ExternalLink className="w-4 h-4" />
              View Docs
            </a>
          </Button>
        </div>

        {/* Create New Key */}
        <Dialog open={createDialogOpen} onOpenChange={handleCloseCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            {!createdKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Give your API key a name to help you identify it later
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production Integration"
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseCreateDialog}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreate} 
                    disabled={creating || !newKeyName.trim()}
                  >
                    {creating ? 'Creating...' : 'Create Key'}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    API Key Created
                  </DialogTitle>
                  <DialogDescription>
                    Copy your API key now. You won't be able to see it again!
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted font-mono text-sm break-all">
                    <span className="flex-1">{createdKey.key}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyKey}
                      className="shrink-0"
                    >
                      {copiedKey ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                    <p className="text-sm text-warning">
                      Store this key securely. It will only be shown once.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseCreateDialog}>
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* API Keys List */}
        <div className="space-y-3">
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No API keys yet</p>
              <p className="text-sm">Create your first API key to get started</p>
            </div>
          ) : (
            apiKeys.map((key) => (
              <ApiKeyCard
                key={key.id}
                apiKey={key}
                onToggle={(active) => toggleApiKey(key.id, active)}
                onRevoke={() => revokeApiKey(key.id)}
              />
            ))
          )}
        </div>

        {/* Usage Note */}
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-start gap-3">
            <BarChart3 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Rate Limits</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pro plan includes 60 API requests per hour per key. 
                Contact us for higher limits.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onToggle: (active: boolean) => void;
  onRevoke: () => void;
}

function ApiKeyCard({ apiKey, onToggle, onRevoke }: ApiKeyCardProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{apiKey.name}</span>
            {!apiKey.is_active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <code className="bg-muted px-2 py-0.5 rounded text-xs">
              {apiKey.key_prefix}...
            </code>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Created {formatDistanceToNow(new Date(apiKey.created_at), { addSuffix: true })}
            </span>
            {apiKey.last_used_at && (
              <span>
                Used {formatDistanceToNow(new Date(apiKey.last_used_at), { addSuffix: true })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>{apiKey.usage_count} requests</span>
            <span>•</span>
            <span>{apiKey.rate_limit_per_hour}/hour limit</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={apiKey.is_active}
            onCheckedChange={onToggle}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the API key "{apiKey.name}". 
                  Any applications using this key will stop working immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onRevoke} className="bg-destructive">
                  Revoke Key
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
