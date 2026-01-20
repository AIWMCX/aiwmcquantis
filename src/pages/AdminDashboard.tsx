import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminMetricsDashboard } from '@/components/admin/AdminMetricsDashboard';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Database, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
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

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Redirect non-admin users
  useEffect(() => {
    if (!adminLoading && !authLoading && isAuthenticated && !isAdmin) {
      navigate('/app');
    }
  }, [adminLoading, authLoading, isAuthenticated, isAdmin, navigate]);

  const isLoading = authLoading || adminLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />
        <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

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

        {/* Metrics Dashboard */}
        <AdminMetricsDashboard />
      </main>

      <Footer />
    </div>
  );
}
