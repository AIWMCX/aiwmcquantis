import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrandProfileSetup } from '@/components/docs/BrandProfileSetup';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function BrandProfilePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-2xl py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Brand Profile</CardTitle>
            <CardDescription>Customize how your documents and invoices look.</CardDescription>
          </CardHeader>
          <CardContent>
            <BrandProfileSetup mode="settings" />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
