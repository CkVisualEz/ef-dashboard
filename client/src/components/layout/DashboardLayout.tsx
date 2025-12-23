import React, { useState } from 'react';
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Layers,
  ShoppingBag,
  Map,
  Smartphone,
  Clock,
  Share2,
  Menu,
  Bell,
  UserCircle,
  Image,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";

// Get base path for navigation (handles subdirectory deployment)
const getBasePath = () => {
  if (typeof window !== 'undefined' && import.meta.env.PROD) {
    const basePath = import.meta.env.BASE_URL || '/EF-Dashboard/';
    return basePath.replace(/\/$/, ''); // Remove trailing slash
  }
  return ''; // Development uses root
};

const BASE_PATH = getBasePath();

const NAV_ITEMS = [
  { href: `${BASE_PATH}/dashboard/overview`, label: "Overview", icon: LayoutDashboard },
  { href: `${BASE_PATH}/dashboard/returning-users`, label: "Returning Users", icon: Users },
  { href: `${BASE_PATH}/dashboard/category-comparison`, label: "Category Comparison", icon: Layers },
  { href: `${BASE_PATH}/dashboard/product-performance`, label: "Product Performance", icon: ShoppingBag },
  { href: `${BASE_PATH}/dashboard/geography`, label: "Geography", icon: Map },
  { href: `${BASE_PATH}/dashboard/device-analytics`, label: "Device Analytics", icon: Smartphone },
  { href: `${BASE_PATH}/dashboard/time-patterns`, label: "Time Patterns", icon: Clock },
  { href: `${BASE_PATH}/dashboard/shares-downloads`, label: "Shares & Downloads", icon: Share2 },
  { href: `${BASE_PATH}/dashboard/latest-queries`, label: "Latest Queries", icon: Image },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile/tablet, expanded on desktop
  const { user, logout } = useAuth();
  
  // Auto-close sidebar on mobile/tablet when clicking a link
  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };
  
  // Normalize location for comparison (remove base path if present)
  const normalizeLocation = (path: string) => {
    if (BASE_PATH && path.startsWith(BASE_PATH)) {
      return path.slice(BASE_PATH.length) || '/';
    }
    return path;
  };
  
  const normalizedLocation = normalizeLocation(location);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile/Tablet overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
          // Mobile/Tablet: slide in/out (hidden by default, shown when sidebarOpen)
          sidebarOpen ? "w-64 translate-x-0" : "-translate-x-full",
          // Desktop (lg+): always visible and expanded
          "lg:translate-x-0 lg:w-64"
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-lg">EF</span>
          </div>
          <span className={cn(
            "font-semibold text-lg text-sidebar-foreground truncate",
            sidebarOpen ? "block" : "hidden lg:block"
          )}>
            Color Match
          </span>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            // Normalize item href for comparison (remove base path)
            const normalizedItemHref = normalizeLocation(item.href);
            const isActive = normalizedLocation === normalizedItemHref || 
              (normalizedItemHref !== '/dashboard/overview' && normalizedLocation.startsWith(normalizedItemHref));
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className={cn(
                  sidebarOpen ? "block" : "hidden lg:block"
                )}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border lg:hidden">
           <Button 
            variant="ghost" 
            size="icon" 
            className="w-full justify-start px-2 hover:bg-sidebar-accent text-sidebar-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
             <Menu className="h-5 w-5" />
             {sidebarOpen && <span className="ml-2 text-sm">Close</span>}
           </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          // Mobile/Tablet: no margin (sidebar overlays)
          // Desktop: always has margin for expanded sidebar
          "lg:ml-64"
        )}
      >
        {/* Top Header */}
        <header className="h-16 border-b bg-card px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-destructive rounded-full border border-card" />
            </Button>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium">{user?.username || 'User'}</p>
                <p className="text-xs text-muted-foreground">Dashboard Admin</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  logout();
                  const loginPath = BASE_PATH ? `${BASE_PATH}/login` : '/login';
                  window.location.href = loginPath;
                }}
                title="Logout"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-muted/20">
          {children}
        </div>
      </main>
    </div>
  );
}
