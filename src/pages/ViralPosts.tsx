import React, { useState } from 'react';
import { Copy, Check, Linkedin, Twitter, MessageSquare, ArrowLeft, Hash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { marketingPosts, type Platform } from '@/data/marketingPosts';

const platformMeta: Record<Platform, { label: string; icon: React.ReactNode; color: string }> = {
  linkedin: { label: 'LinkedIn', icon: <Linkedin className="h-4 w-4" />, color: 'text-blue-600' },
  twitter: { label: 'X / Twitter', icon: <Twitter className="h-4 w-4" />, color: 'text-foreground' },
  reddit: { label: 'Reddit', icon: <MessageSquare className="h-4 w-4" />, color: 'text-orange-500' },
};

export default function ViralPosts() {
  useDocumentTitle('Marketing Copy Library — AIWMC Quantis');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard — ready to paste!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const buildCopyText = (post: typeof marketingPosts[0]) => {
    const tags = post.hashtags.length ? '\n\n' + post.hashtags.join(' ') : '';
    return post.body + tags;
  };

  return (

      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Marketing Copy Library
            </h1>
          </div>
          <p className="text-muted-foreground mb-8 ml-8">
            15 unique, ready-to-publish posts. Click copy → paste → post.
          </p>

          <Tabs defaultValue="linkedin" className="w-full">
            <TabsList className="mb-6 w-full sm:w-auto">
              {(Object.keys(platformMeta) as Platform[]).map((p) => (
                <TabsTrigger key={p} value={p} className="gap-1.5">
                  {platformMeta[p].icon}
                  <span className="hidden sm:inline">{platformMeta[p].label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {(Object.keys(platformMeta) as Platform[]).map((platform) => (
              <TabsContent key={platform} value={platform} className="space-y-6">
                {marketingPosts
                  .filter((p) => p.platform === platform)
                  .map((post) => {
                    const fullText = buildCopyText(post);
                    const charCount = fullText.length;
                    const isCopied = copiedId === post.id;

                    return (
                      <Card key={post.id} className="overflow-hidden border-border/60">
                        <CardContent className="p-5 sm:p-6">
                          {/* Title row */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="font-semibold text-foreground text-lg leading-tight">
                                {post.title}
                              </h2>
                              {post.subreddit && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  {post.subreddit}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={isCopied ? 'default' : 'outline'}
                              className="shrink-0 gap-1.5"
                              onClick={() => copy(post.id, fullText)}
                            >
                              {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              {isCopied ? 'Copied' : 'Copy'}
                            </Button>
                          </div>

                          {/* Body */}
                          <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground leading-relaxed mb-4 max-h-[400px] overflow-y-auto">
                            {post.body}
                          </pre>

                          {/* Footer: hashtags + char count */}
                          <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-border/40">
                            {post.hashtags.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Hash className="h-3.5 w-3.5 text-muted-foreground/60" />
                                {post.hashtags.map((tag) => (
                                  <span key={tag} className="text-xs text-primary/80">{tag}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic">No hashtags — narrative format</span>
                            )}
                            <span className="text-xs text-muted-foreground/60">
                              {charCount.toLocaleString()} chars
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </>
  );
}
