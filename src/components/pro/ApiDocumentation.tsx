import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface ApiDocumentationProps {
  onClose?: () => void;
}

export function ApiDocumentation({ onClose }: ApiDocumentationProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-analyze`;

  const curlExample = `curl -X POST "${baseUrl}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "idea": "Coffee shop specializing in specialty roasts",
    "location": "Austin, TX",
    "industry": "food_service",
    "financial_inputs": {
      "startup_investment": 50000,
      "monthly_revenue": 25000
    }
  }'`;

  const jsExample = `const response = await fetch("${baseUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    idea: "Coffee shop specializing in specialty roasts",
    location: "Austin, TX",
    industry: "food_service",
    financial_inputs: {
      startup_investment: 50000,
      monthly_revenue: 25000
    }
  })
});

const data = await response.json();
console.log(data);`;

  const pythonExample = `import requests

response = requests.post(
    "${baseUrl}",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "idea": "Coffee shop specializing in specialty roasts",
        "location": "Austin, TX",
        "industry": "food_service",
        "financial_inputs": {
            "startup_investment": 50000,
            "monthly_revenue": 25000
        }
    }
)

data = response.json()
print(data)`;

  const responseExample = `{
  "success": true,
  "data": {
    "verdict": "VIABLE",
    "verdict_text": "Рекомендуется к запуску",
    "confidence_score": 78,
    "financial_analysis": {
      "startup_investment": 50000,
      "monthly_profit": 8500,
      "payback_months": 6,
      "roi_year1": 204,
      ...
    },
    "business_plan": { ... },
    "marketing_plan": { ... },
    "market_analysis": { ... }
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "latency_ms": 3420,
    "rate_limit": {
      "remaining": 58,
      "reset_at": "2026-01-19T23:00:00Z"
    }
  }
}`;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>API Documentation</span>
          <Badge variant="secondary">v1</Badge>
        </CardTitle>
        <CardDescription>
          Integrate AIWMC Quantis analysis into your applications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Endpoint */}
        <div>
          <h3 className="font-semibold mb-2">Endpoint</h3>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted font-mono text-sm">
            <Badge variant="default" className="bg-green-600">POST</Badge>
            <span className="flex-1 break-all">{baseUrl}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(baseUrl, 'endpoint')}
            >
              {copiedSection === 'endpoint' ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Authentication */}
        <div>
          <h3 className="font-semibold mb-2">Authentication</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Include your API key in the Authorization header:
          </p>
          <code className="block p-3 rounded-lg bg-muted text-sm">
            Authorization: Bearer qnts_xxxxxxxxxxxxxxxxxxxxx
          </code>
        </div>

        {/* Request Body */}
        <div>
          <h3 className="font-semibold mb-2">Request Body</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Parameter</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Required</th>
                <th className="text-left py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-mono">idea</td>
                <td className="py-2">string</td>
                <td className="py-2"><Badge variant="destructive" className="text-xs">Required</Badge></td>
                <td className="py-2 text-muted-foreground">Business idea description (min 10 chars)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono">location</td>
                <td className="py-2">string</td>
                <td className="py-2"><Badge variant="destructive" className="text-xs">Required</Badge></td>
                <td className="py-2 text-muted-foreground">Target market location (min 2 chars)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono">industry</td>
                <td className="py-2">string</td>
                <td className="py-2"><Badge variant="secondary" className="text-xs">Optional</Badge></td>
                <td className="py-2 text-muted-foreground">Industry code (e.g., food_service, saas)</td>
              </tr>
              <tr>
                <td className="py-2 font-mono">financial_inputs</td>
                <td className="py-2">object</td>
                <td className="py-2"><Badge variant="secondary" className="text-xs">Optional</Badge></td>
                <td className="py-2 text-muted-foreground">Custom financial parameters</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Financial Inputs */}
        <div>
          <h3 className="font-semibold mb-2">Financial Inputs (optional)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Field</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-mono">startup_investment</td>
                <td className="py-2">number</td>
                <td className="py-2 text-muted-foreground">Initial investment in USD</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono">monthly_revenue</td>
                <td className="py-2">number</td>
                <td className="py-2 text-muted-foreground">Expected monthly revenue</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono">average_price</td>
                <td className="py-2">number</td>
                <td className="py-2 text-muted-foreground">Average transaction value</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono">expected_customers</td>
                <td className="py-2">number</td>
                <td className="py-2 text-muted-foreground">Monthly customer count</td>
              </tr>
              <tr>
                <td className="py-2 font-mono">cac</td>
                <td className="py-2">number</td>
                <td className="py-2 text-muted-foreground">Customer acquisition cost</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Code Examples */}
        <div>
          <h3 className="font-semibold mb-2">Code Examples</h3>
          <Tabs defaultValue="curl" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>
            <TabsContent value="curl" className="relative">
              <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto">{curlExample}</pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(curlExample, 'curl')}
              >
                {copiedSection === 'curl' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </TabsContent>
            <TabsContent value="javascript" className="relative">
              <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto">{jsExample}</pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(jsExample, 'javascript')}
              >
                {copiedSection === 'javascript' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </TabsContent>
            <TabsContent value="python" className="relative">
              <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto">{pythonExample}</pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(pythonExample, 'python')}
              >
                {copiedSection === 'python' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        {/* Response */}
        <div>
          <h3 className="font-semibold mb-2">Response</h3>
          <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto max-h-64">{responseExample}</pre>
        </div>

        {/* Rate Limits */}
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <h3 className="font-semibold mb-2">Rate Limits</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>60 requests per hour</strong> per API key</li>
            <li>• Rate limit headers included in responses: <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code></li>
            <li>• Exceeding limits returns HTTP 429 with reset timestamp</li>
          </ul>
        </div>

        {/* Error Codes */}
        <div>
          <h3 className="font-semibold mb-2">Error Codes</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-mono">400</td>
                <td className="py-2 text-muted-foreground">Invalid request parameters</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono">401</td>
                <td className="py-2 text-muted-foreground">Invalid or missing API key</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono">403</td>
                <td className="py-2 text-muted-foreground">API key deactivated or Pro subscription required</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono">429</td>
                <td className="py-2 text-muted-foreground">Rate limit exceeded</td>
              </tr>
              <tr>
                <td className="py-2 font-mono">500</td>
                <td className="py-2 text-muted-foreground">Internal server error</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
