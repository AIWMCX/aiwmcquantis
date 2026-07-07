import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { directories, optimizedDescriptions, type DirectoryWave, type DirectoryStatus } from "@/data/directorySubmissions";
import { PageSEO } from "@/components/seo/PageSEO";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Copy, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<DirectoryStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_started: { label: "Not Started", variant: "outline" },
  submitted: { label: "Submitted", variant: "secondary" },
  live: { label: "Live", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const priorityConfig: Record<string, { variant: "default" | "secondary" | "outline" }> = {
  HIGH: { variant: "default" },
  MED: { variant: "secondary" },
  LOW: { variant: "outline" },
};

export default function DirectoryTracker() {
  const [activeWave, setActiveWave] = useState<string>("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (activeWave === "all") return directories;
    return directories.filter((d) => d.wave === Number(activeWave));
  }, [activeWave]);

  const liveCount = directories.filter((d) => d.status === "live").length;
  const submittedCount = directories.filter((d) => d.status === "submitted" || d.status === "live").length;
  const progressPct = (submittedCount / directories.length) * 100;
  const publicProofs = directories.filter((d) => d.status === "live" && d.proofUrl);

  const waveStats = (wave: DirectoryWave) => {
    const w = directories.filter((d) => d.wave === wave);
    const done = w.filter((d) => d.status === "live" || d.status === "submitted").length;
    return `${done}/${w.length}`;
  };

  const handleCopy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="xl">
      <PageSEO
        title="Quantis Directory Proof Signals"
        description="Public directory and SEO proof signals where AIWMC Quantis has been submitted, indexed, or verified live."
        canonical="/directory-tracker"
        noindex
      />
      <div className="py-4 md:py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Directory Proof Signals</h1>
            <p className="text-muted-foreground mt-1">Connected listings, submission targets, and live proof links for Quantis visibility.</p>
          </div>
          <Badge variant="outline" className="w-fit border-primary/40 px-3 py-1 text-sm">
            {directories.length} tracked · {liveCount} live · {submittedCount} submitted/live
          </Badge>
        </div>

        {publicProofs.length > 0 && (
          <section aria-label="Verified public proof links" className="grid gap-3 md:grid-cols-2">
            {publicProofs.map((d) => (
              <a
                key={d.id}
                href={d.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-lg border border-[var(--q-border-default)] bg-[var(--q-bg-surface)] p-4 shadow-sm transition-colors hover:border-primary/50"
              >
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">{d.name} is live</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{d.notes}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </a>
            ))}
          </section>
        )}

        {/* Progress summary */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span>{submittedCount}/{directories.length} directories submitted or live</span>
              <span>{liveCount} live</span>
            </div>
            <Progress value={progressPct} className="h-3" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Wave 1: {waveStats(1)}</span>
              <span>Wave 2: {waveStats(2)}</span>
              <span>Wave 3: {waveStats(3)}</span>
              <span>Wave 4: {waveStats(4)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Optimized descriptions with copy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Optimized Descriptions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {Object.entries(optimizedDescriptions).map(([key, { label, text }]) => (
              <div key={key} className="flex items-start justify-between gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="text-sm text-foreground line-clamp-2 mt-0.5">{text}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => handleCopy(key, text)}
                >
                  {copiedKey === key ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Directory table with wave tabs */}
        <Tabs value={activeWave} onValueChange={setActiveWave}>
          <TabsList>
            <TabsTrigger value="all">All ({directories.length})</TabsTrigger>
            <TabsTrigger value="1">Wave 1</TabsTrigger>
            <TabsTrigger value="2">Wave 2</TabsTrigger>
            <TabsTrigger value="3">Wave 3</TabsTrigger>
            <TabsTrigger value="4">Wave 4</TabsTrigger>
          </TabsList>

          <TabsContent value={activeWave} className="mt-4">
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Directory</TableHead>
                    <TableHead className="w-16 text-center">DR</TableHead>
                    <TableHead className="w-24">Cost</TableHead>
                    <TableHead className="w-20 text-center">Priority</TableHead>
                    <TableHead className="w-14 text-center">Wave</TableHead>
                    <TableHead className="w-28 text-center">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                        >
                          {d.name}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        {d.proofUrl && (
                          <a
                            href={d.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
                          >
                            proof <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <span className="block text-xs text-muted-foreground">{d.type}</span>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {d.drScore ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{d.cost}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={priorityConfig[d.priority].variant} className="text-xs">
                          {d.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">{d.wave}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusConfig[d.status].variant} className="text-xs">
                          {statusConfig[d.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-xs truncate">
                        {d.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PublicPageShell>
  );
}
