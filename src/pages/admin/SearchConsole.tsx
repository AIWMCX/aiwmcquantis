import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageMeta } from "@/components/seo/PageMeta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, Circle, AlertTriangle, ExternalLink, Copy } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SITE_URL = "https://aiwmcquantis.com/";

interface VerificationRow {
  id: string;
  site_url: string;
  verification_token: string | null;
  verification_method: string;
  status: "pending" | "verified" | "failed";
  verified_at: string | null;
  notes: string | null;
  updated_at: string;
}

export default function SearchConsole() {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [row, setRow] = useState<VerificationRow | null>(null);
  const [token, setToken] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<VerificationRow["status"]>("pending");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data, error } = await supabase
        .from("gsc_verification" as never)
        .select("*")
        .eq("site_url", SITE_URL)
        .maybeSingle<VerificationRow>();
      if (error) toast.error(error.message);
      if (data) {
        setRow(data);
        setToken(data.verification_token ?? "");
        setNotes(data.notes ?? "");
        setStatus(data.status);
      }
      setLoading(false);
    })();
  }, [isAdmin]);

  async function save() {
    setSaving(true);
    const payload = {
      site_url: SITE_URL,
      verification_token: token || null,
      verification_method: "META",
      status,
      notes: notes || null,
      verified_at: status === "verified" ? new Date().toISOString() : null,
    };
    const { data, error } = await supabase
      .from("gsc_verification" as never)
      .upsert(payload as never, { onConflict: "site_url" })
      .select()
      .single<VerificationRow>();
    if (error) toast.error(error.message);
    else {
      setRow(data);
      toast.success("Verification status saved");
    }
    setSaving(false);
  }

  if (adminLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
        Loading…
      </main>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const metaTag = token
    ? `<meta name="google-site-verification" content="${token}" />`
    : `<meta name="google-site-verification" content="<TOKEN>" />`;

  return (
    <>
      <PageMeta title="Search Console — Admin" description="Google Search Console verification for aiwmcquantis.com" path="/admin/search-console" noIndex />
      <div className="min-h-screen bg-background text-foreground">
        <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>

          <div>
            <h1 className="text-3xl font-bold">Google Search Console</h1>
            <p className="text-muted-foreground mt-2">
              Verify ownership of <code className="text-primary">{SITE_URL}</code> and submit the sitemap.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current status:</span>
              <Badge variant={status === "verified" ? "default" : status === "failed" ? "destructive" : "secondary"}>
                {status.toUpperCase()}
              </Badge>
              {row?.verified_at && (
                <span className="text-xs text-muted-foreground">
                  on {new Date(row.verified_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Verification Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <Step n={1} done={!!token} title="Get a verification token from Google Search Console">
                Go to{" "}
                <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                  Search Console <ExternalLink className="h-3 w-3" />
                </a>
                . Add property → URL prefix → enter <code>{SITE_URL}</code>. Choose the
                <strong> HTML tag (META)</strong> verification method and copy the value of the <code>content</code> attribute.
              </Step>

              <Step n={2} done={!!token} title="Paste the token below and save">
                <div className="space-y-2">
                  <Label htmlFor="token">Verification token (content value)</Label>
                  <Input
                    id="token"
                    placeholder="abc123…"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The token is rendered into the <code>&lt;meta name="google-site-verification"&gt;</code> tag in <code>index.html</code>.
                    Replace the empty <code>content=""</code> with the value below, then republish.
                  </p>
                </div>
              </Step>

              <Step n={3} done={!!token} title="Confirm the meta tag is in your HTML head">
                <div className="bg-muted p-3 rounded-md flex items-start justify-between gap-2">
                  <pre className="text-xs overflow-x-auto flex-1">{metaTag}</pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(metaTag);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  After republishing, view-source the homepage and confirm the tag is present before clicking Verify in Search Console.
                </p>
              </Step>

              <Step n={4} done={status === "verified"} title="Click Verify in Search Console, then mark status here">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    {(["pending", "verified", "failed"] as const).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={status === s ? "default" : "outline"}
                        onClick={() => setStatus(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </Step>

              <Step n={5} done={status === "verified"} title="Submit the sitemap">
                In Search Console → Sitemaps, submit:{" "}
                <code className="text-primary">https://aiwmcquantis.com/sitemap.xml</code>
              </Step>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Failure reason, owner contact, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save status"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> What this page does NOT do
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>This page records verification status for internal tracking. It does not call Google's API directly.</p>
              <p>To automate token issuance + verify via the connector gateway, connect Google Search Console in <strong>Connectors → Google Search Console</strong>. Once connected, an admin tool can run the META verification flow end-to-end.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-0.5">
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="font-medium">
          Step {n}. {title}
        </div>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
