import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { fetchOverview } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useCallback, useMemo } from "react";
import { FilterState } from "@/components/dashboard/FilterBar";
import { format, subDays, parseISO } from "date-fns";

export default function Overview() {
  // Initialize with last 30 days as default
  const getDefaultFilters = (): FilterState => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    return {
      startDate: format(thirtyDaysAgo, "yyyy-MM-dd"),
      endDate: format(today, "yyyy-MM-dd"),
    };
  };

  const [filters, setFilters] = useState<FilterState>(getDefaultFilters());
  
  // Memoize the filter change handler to prevent infinite loops
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);
  
  const { data, isLoading } = useQuery({
    queryKey: ['overview', filters],
    queryFn: () => fetchOverview(filters as Record<string, string>),
  });

  const trendChartData = useMemo(() => {
    const activityTrend = data?.activityTrend || [];
    return activityTrend.map((item: { date: string; activeUsers: number; uploads: number; clicks: number }) => ({
      ...item,
      label: format(parseISO(item.date), "MMM d"),
    }));
  }, [data?.activityTrend]);

  const hasTrendData = trendChartData.some(
    (item: { activeUsers: number; uploads: number; clicks: number }) =>
      item.activeUsers > 0 || item.uploads > 0 || item.clicks > 0
  );

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
        <ChartWrapper
          title="Activity Trend"
          description="Daily active users, image uploads, and product clicks for the selected filters"
        >
          <div className="h-[300px] sm:h-[400px] w-full">
            {hasTrendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                    labelFormatter={(_, payload) => {
                      const date = payload?.[0]?.payload?.date;
                      return date ? format(parseISO(date), "MMM d, yyyy") : "";
                    }}
                    formatter={(value: number) => value.toLocaleString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="activeUsers"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    name="Active Users"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="uploads"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    name="Image Uploads"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="var(--color-chart-3)"
                    strokeWidth={2}
                    name="Product Clicks"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No trend data available for the selected filters
              </div>
            )}
          </div>
        </ChartWrapper>
      </div>

      <div className="grid gap-6 mb-8">
        {/* Device Split */}
        <ChartWrapper 
          title="Device Breakdown" 
          description="Image Uploads by device type"
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
