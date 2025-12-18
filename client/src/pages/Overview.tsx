import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { fetchOverview } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useCallback } from "react";
import { FilterState } from "@/components/dashboard/FilterBar";

export default function Overview() {
  const [filters, setFilters] = useState<FilterState>({});
  
  // Memoize the filter change handler to prevent infinite loops
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);
  
  const { data, isLoading } = useQuery({
    queryKey: ['overview', filters],
    queryFn: () => fetchOverview(filters as Record<string, string>),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">
            Performance summary for EF Color Match dashboard.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const kpis = data?.kpis || {};
  const deviceStats = data?.deviceStats || [];
  
  // Transform KPIs into the format expected by StatCard
  const kpiCards = [
    { label: "Total Active Users", value: kpis.totalUsers?.toLocaleString() || "0", change: 0, trend: "neutral" as const },
    { label: "Total Image Uploads", value: kpis.totalUploads?.toLocaleString() || "0", change: 0, trend: "neutral" as const },
    { label: "Avg Uploads/User", value: kpis.avgUploadsPerUser || "0", change: 0, trend: "neutral" as const },
    { label: "Total Product Clicks", value: kpis.totalClicks?.toLocaleString() || "0", change: 0, trend: "neutral" as const },
    { label: "Click Rate", value: `${kpis.clickRate}%` || "0%", change: 0, trend: "neutral" as const },
    { label: "Share/Download Rate", value: `${kpis.shareDownloadRate || 0}%`, change: 0, trend: "neutral" as const },
  ];

  const deviceChartData = deviceStats
    .filter((stat: any) => stat._id && stat._id.toLowerCase() !== 'unknown')
    .map((stat: any, i: number) => ({
      name: stat._id || 'Unknown',
      value: stat.count,
      fill: `var(--color-chart-${(i % 5) + 1})`
    }));

  return (
    <DashboardLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Performance summary for EF Color Match dashboard.
        </p>
      </div>

      <FilterBar onFilterChange={handleFilterChange} initialFilters={filters} hideLocationFilters={true} />

      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
        {kpiCards.map((kpi, i) => (
          <StatCard 
            key={i} 
            data={kpi} 
            hideComparison={true}
          />
        ))}
      </div>

      <div className="grid gap-6 mb-8">
        {/* Device Split */}
        <ChartWrapper 
          title="Device Breakdown" 
          description="User sessions by device type"
        >
          <div className="h-[300px] sm:h-[350px] w-full flex items-center justify-center">
            {deviceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                     itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No device data available</p>
            )}
          </div>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
