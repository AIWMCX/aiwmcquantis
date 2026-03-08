
## Navigation System Implementation

### Overview
Create a comprehensive desktop sidebar navigation and update the top bar to align with Quantis Design System v2.0 specs. The sidebar will be 240px fixed on desktop with sectioned navigation, while mobile continues using the existing drawer.

### New Components

**`src/components/layout/AppSidebar.tsx`**
Desktop sidebar with Quantis styling:
- 240px width, `bg-[var(--q-bg-surface)]`, right border `var(--q-border-subtle)`
- Logo area: 64px height, Sora 700 logotype, 11px "by AIWMC AI Agency" subtitle, 3px left accent bar
- Navigation items: 44px height, 14px DM Sans 500, 16px icons with 12px gap
- Active state: `rgba(79,142,247,0.08)` bg, 2px left border `var(--q-accent-primary)`, text/icon in accent color
- Hover: `var(--q-bg-elevated)` bg
- Sections: ANALYSIS, DOCUMENTS, INTELLIGENCE, ACCOUNT with subtle labels
- Footer: User avatar + email + plan badge (Free/Plus) + settings icon

**`src/components/layout/AppTopBar.tsx`**
Secondary top bar for mobile + desktop:
- 56px height, `var(--q-bg-base)` with 1px bottom border
- Left: hamburger (mobile) or nothing (desktop with sidebar)
- Center: page title in Sora 500
- Right: notification bell + user avatar

### Navigation Structure
```
ANALYSIS
  ├─ Dashboard (/app)
  ├─ New Analysis (/app?new=true)
  └─ History (/app?tab=history)

DOCUMENTS
  ├─ My Documents (/docs)
  ├─ Invoice Creator (/app/invoices)
  └─ Templates (/docs?view=templates)

INTELLIGENCE
  ├─ Benchmarks (/admin/benchmarks) [admin only]
  ├─ Scenarios (future)
  └─ Progress (/leaderboard)

ACCOUNT
  ├─ Settings (/plus-settings)
  ├─ Billing (/plus-settings?tab=billing)
  └─ Help (external link)
```

### Layout Integration
- Wrap authenticated pages in `SidebarProvider` + `Sidebar` layout
- Create `AppLayout.tsx` wrapper that combines sidebar + top bar + main content
- Desktop: sidebar visible, top bar shows page title
- Mobile: sidebar hidden, hamburger in top bar triggers existing MobileNav drawer

### Files
| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | **New** — Full sidebar component |
| `src/components/layout/AppTopBar.tsx` | **New** — Simplified top bar |
| `src/components/layout/AppLayout.tsx` | **New** — Wrapper combining sidebar + topbar |
| `src/pages/AppDashboard.tsx` | Use AppLayout wrapper |
| `src/pages/DocsStudio.tsx` | Use AppLayout wrapper |
| `src/pages/PlusSettings.tsx` | Use AppLayout wrapper |
| `src/index.css` | Add `.nav-item`, `.nav-item-active` utilities |
