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
  Search,
  Bell,
  UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS = [
  { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/returning-users", label: "Returning Users", icon: Users },
  { href: "/dashboard/category-comparison", label: "Category Comparison", icon: Layers },
  { href: "/dashboard/product-performance", label: "Product Performance", icon: ShoppingBag },
  { href: "/dashboard/geography", label: "Geography", icon: Map },
  { href: "/dashboard/device-analytics", label: "Device Analytics", icon: Smartphone },
  { href: "/dashboard/time-patterns", label: "Time Patterns", icon: Clock },
  { href: "/dashboard/shares-downloads", label: "Shares & Downloads", icon: Share2 },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-lg">EF</span>
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-lg text-sidebar-foreground truncate">
              Color Match
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== '/dashboard/overview' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              title={!sidebarOpen ? item.label : undefined}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
           <Button 
            variant="ghost" 
            size="icon" 
            className="w-full justify-start px-2 hover:bg-sidebar-accent text-sidebar-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
             <Menu className="h-5 w-5" />
             {sidebarOpen && <span className="ml-2 text-sm">Collapse</span>}
           </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-16"
        )}
      >
        {/* Top Header */}
        <header className="h-16 border-b bg-card px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4 w-96">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search analytics..." 
                className="w-full pl-9 bg-background" 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border border-card" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-muted-foreground">admin@efcolormatch.com</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle className="h-8 w-8 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-8 overflow-y-auto bg-muted/20">
          {children}
        </div>
      </main>
    </div>
  );
}
