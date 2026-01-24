import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminMetricsDashboard } from '@/components/admin/AdminMetricsDashboard';
import { SystemHealthDashboard } from '@/components/admin/SystemHealthDashboard';
import { UptimeStatusCard } from '@/components/admin/UptimeStatusCard';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Shield, Database, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Note: Authentication and admin role checks are handled by ProtectedRoute in App.tsx

export default function AdminDashboard() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />
      
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        {/* Admin Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Monitor business metrics and platform health
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/app">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to App
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/benchmarks">
                <Database className="w-4 h-4 mr-2" />
                Benchmarks
              </Link>
            </Button>
          </div>
        </div>

        {/* System Health & Uptime Grid */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <SystemHealthDashboard />
          <UptimeStatusCard />
        </div>

        {/* Metrics Dashboard */}
        <AdminMetricsDashboard />
      </main>

      <Footer />
    </div>
  );
}
