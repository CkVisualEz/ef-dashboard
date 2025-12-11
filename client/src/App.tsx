import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Pages
import Overview from "@/pages/Overview";
import ReturningUsers from "@/pages/ReturningUsers";
import CategoryComparison from "@/pages/CategoryComparison";
import ProductPerformance from "@/pages/ProductPerformance";
import Geography from "@/pages/Geography";
import DeviceAnalytics from "@/pages/DeviceAnalytics";
import TimePatterns from "@/pages/TimePatterns";
import SharesDownloads from "@/pages/SharesDownloads";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard/overview" />} />
      <Route path="/dashboard/overview" component={Overview} />
      <Route path="/dashboard/returning-users" component={ReturningUsers} />
      <Route path="/dashboard/category-comparison" component={CategoryComparison} />
      <Route path="/dashboard/product-performance" component={ProductPerformance} />
      <Route path="/dashboard/geography" component={Geography} />
      <Route path="/dashboard/device-analytics" component={DeviceAnalytics} />
      <Route path="/dashboard/time-patterns" component={TimePatterns} />
      <Route path="/dashboard/shares-downloads" component={SharesDownloads} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
