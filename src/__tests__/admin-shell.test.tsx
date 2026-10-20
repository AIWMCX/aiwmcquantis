import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'admin@example.com' } }) }));
vi.mock('@/lib/flags', () => ({ isEnabled: () => true }));

import { AdminLayout, ADMIN_NAV } from '@/components/admin/AdminLayout';

const APP = readFileSync('src/App.tsx', 'utf8');
const SIDEBAR = readFileSync('src/components/layout/AppSidebar.tsx', 'utf8');

describe('admin shell', () => {
  it('renders every admin page in the sidebar and marks the active one', () => {
    render(
      <MemoryRouter initialEntries={['/admin/funnel']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="funnel" element={<p>funnel page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const total = ADMIN_NAV.flatMap((g) => g.items).length;
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/admin')).length).toBeGreaterThanOrEqual(total);
    const active = screen.getByRole('link', { name: 'Funnel & sources' });
    expect(active.getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('funnel page')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Back to app/ }).getAttribute('href')).toBe('/app');
  });

  it('every /admin route is nested under AdminLayout behind the admin guard', () => {
    expect(APP).toMatch(/<Route path="\/admin" element=\{<ProtectedRoute requireAdmin><AdminLayout \/><\/ProtectedRoute>\}>/);
    expect(APP).not.toMatch(/<Route path="\/admin\/[a-z-]+"/);
  });

  it('every nav target has a route', () => {
    for (const item of ADMIN_NAV.flatMap((g) => g.items)) {
      if (item.to === '/admin') continue;
      expect(APP, item.to).toContain(`path="${item.to.replace('/admin/', '')}"`);
    }
  });

  it('the customer app sidebar no longer lists admin tools, only one admin entry', () => {
    const adminLinks = SIDEBAR.match(/url: '\/admin[^']*'/g) ?? [];
    expect(adminLinks).toEqual(["url: '/admin'"]);
  });

  it('admin pages no longer render inside the customer app shell', () => {
    for (const f of ['Today', 'Autoposter', 'CommercialOps', 'PaidEngagements', 'ContentStudio']) {
      expect(readFileSync(`src/pages/admin/${f}.tsx`, 'utf8'), f).not.toContain('<AppLayout');
    }
  });
});
