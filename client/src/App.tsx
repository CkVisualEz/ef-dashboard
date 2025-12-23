import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/Login";
import Overview from "@/pages/Overview";
import ReturningUsers from "@/pages/ReturningUsers";
import CategoryComparison from "@/pages/CategoryComparison";
import ProductPerformance from "@/pages/ProductPerformance";
import Geography from "@/pages/Geography";
import DeviceAnalytics from "@/pages/DeviceAnalytics";
import TimePatterns from "@/pages/TimePatterns";
import SharesDownloads from "@/pages/SharesDownloads";
import LatestQueries from "@/pages/LatestQueries";

// Get base path for routing (handles subdirectory deployment)
const getBasePath = () => {
  if (import.meta.env.PROD) {
    // Vite sets BASE_URL from the base config option
    let basePath = import.meta.env.BASE_URL;
    
    // Fallback: detect from current pathname if BASE_URL is not set
    if (!basePath && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      // If pathname starts with /EF-Dashboard, use that as base
      if (pathname.startsWith('/EF-Dashboard')) {
        basePath = '/EF-Dashboard/';
      }
    }
    
    // Default fallback
    if (!basePath) {
      basePath = '/EF-Dashboard/';
    }
    
    // Remove trailing slash and ensure it starts with /
    const normalized = basePath.replace(/\/$/, '');
    return normalized || '';
  }
  return ''; // Development uses root
};

const BASE_PATH = getBasePath();

function Router() {
  const [location] = useLocation();
  
  // Normalize location by removing base path
  // When deployed to /EF-Dashboard/, the location will be /EF-Dashboard/dashboard/overview
  // We need to strip /EF-Dashboard to get /dashboard/overview for route matching
  const normalizePath = (path: string) => {
    if (!BASE_PATH) return path;
    
    // Remove base path if present
    if (path.startsWith(BASE_PATH)) {
      const normalized = path.slice(BASE_PATH.length);
      return normalized || '/';
    }
    
    // Handle case where path is exactly the base path
    if (path === BASE_PATH || path === `${BASE_PATH}/`) {
      return '/';
    }
    
    // If path doesn't start with base path, return as-is (for development)
    return path;
  };
  
  const normalizedLocation = normalizePath(location);
  
  // Debug logging
  if (import.meta.env.DEV) {
    console.log('[Router] Location:', location, 'Normalized:', normalizedLocation);
  }

  return (
    <Switch location={normalizedLocation}>
      <Route path="/">
        {() => {
          const redirectPath = BASE_PATH ? `${BASE_PATH}/login` : '/login';
          return <Redirect to={redirectPath} />;
        }}
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/dashboard/overview">
        <ProtectedRoute>
          <Overview />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/returning-users">
        <ProtectedRoute>
          <ReturningUsers />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/category-comparison">
        <ProtectedRoute>
          <CategoryComparison />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/product-performance">
        <ProtectedRoute>
          <ProductPerformance />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/geography">
        <ProtectedRoute>
          <Geography />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/device-analytics">
        <ProtectedRoute>
          <DeviceAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/time-patterns">
        <ProtectedRoute>
          <TimePatterns />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/shares-downloads">
        <ProtectedRoute>
          <SharesDownloads />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/latest-queries">
        <ProtectedRoute>
          <LatestQueries />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
