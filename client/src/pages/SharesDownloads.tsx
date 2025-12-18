import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar, FilterState } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { StatCard } from "@/components/dashboard/StatCard";
import { fetchSharesDownloads } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { exportToCSV } from "@/lib/csvExport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SharesDownloads() {
  const [filters, setFilters] = useState<FilterState>({});
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('day');
  
  const queryParams = useMemo(() => {
    const params: Record<string, string> = { ...filters };
    if (timePeriod) {
      params.timePeriod = timePeriod;
    }
    return params;
  }, [filters, timePeriod]);
  
  const { data, isLoading } = useQuery({
    queryKey: ['shares-downloads', queryParams],
    queryFn: () => fetchSharesDownloads(queryParams),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // A. Aggregate Stats
  const aggregate = data?.aggregate || {
    totalShares: 0,
    totalDownloads: 0,
    shareDownloadRate: 0
  };

  const kpis = [
    {
      label: "Total Shares",
      value: aggregate.totalShares.toLocaleString(),
      change: 0,
      trend: "neutral" as const,
      hideComparison: true
    },
    {
      label: "Total Downloads",
      value: aggregate.totalDownloads.toLocaleString(),
      change: 0,
      trend: "neutral" as const,
      hideComparison: true
    },
    {
      label: "Share/Download Rate",
      value: `${aggregate.shareDownloadRate.toFixed(2)}%`,
      change: 0,
      trend: "neutral" as const,
      hideComparison: true
    },
  ];

  // B. By Dimension
  const byClassification = data?.byClassification || [];
  const byDevice = data?.byDevice || [];
  const byGeography = data?.byGeography || [];
  const byTime = data?.byTime || [];

  // Prepare chart data
  const classificationChart = byClassification.map((item: any) => ({
    name: item.classification === 'hard_surface' ? 'Hard Surface' : 
          item.classification === 'carpet' ? 'Carpet' : 'Mixed',
    shares: item.shares || 0,
    downloads: item.downloads || 0,
    total: item.total || 0
  }));

  const deviceChart = byDevice.map((item: any) => ({
    name: item.device || 'Unknown',
    shares: item.shares || 0,
    downloads: item.downloads || 0,
    total: item.total || 0
  }));

  const geographyChart = byGeography.slice(0, 20).map((item: any) => ({
    name: `${item.city || 'Unknown'}, ${item.state || 'Unknown'}`,
    shares: item.shares || 0,
    downloads: item.downloads || 0,
    total: item.total || 0
  }));

  const timeChart = byTime.map((item: any) => ({
    period: item.period || '',
    shares: item.shares || 0,
    downloads: item.downloads || 0,
    total: item.total || 0
  }));

  const handleExport = () => {
    const exportData = [
      ...classificationChart.map(item => ({
        Dimension: 'Classification',
        Category: item.name,
        Shares: item.shares,
        Downloads: item.downloads,
        Total: item.total
      })),
      ...deviceChart.map(item => ({
        Dimension: 'Device',
        Category: item.name,
        Shares: item.shares,
        Downloads: item.downloads,
        Total: item.total
      })),
      ...geographyChart.map(item => ({
        Dimension: 'Geography',
        Category: item.name,
        Shares: item.shares,
        Downloads: item.downloads,
        Total: item.total
      })),
      ...timeChart.map(item => ({
        Dimension: 'Time',
        Period: item.period,
        Shares: item.shares,
        Downloads: item.downloads,
        Total: item.total
      }))
    ];
    exportToCSV(exportData, 'shares-downloads');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Shares & Downloads</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Social engagement and save metrics.
          </p>
        </div>
        <Skeleton className="h-32 w-full mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Shares & Downloads</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Track how users share and download Color Match recommendations across different dimensions.
        </p>
      </div>

      <FilterBar onFilterChange={setFilters} onExport={handleExport} initialFilters={filters} />

      {/* A. Aggregate Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
        {kpis.map((kpi, i) => (
          <StatCard key={i} data={kpi} />
        ))}
      </div>

      {/* B. By Dimension */}
      <div className="space-y-8">
        {/* 1. By Classification (Carpet vs Hard Surface) */}
        <ChartWrapper 
          title="By Surface Type" 
          description="Shares and downloads breakdown by Carpet vs Hard Surface vs Mixed"
        >
          <div className="h-[300px] sm:h-[400px] w-full">
            {classificationChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classificationChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    formatter={(value: any) => value.toLocaleString()}
                  />
                  <Legend />
                  <Bar dataKey="shares" name="Shares" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="downloads" name="Downloads" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No classification data available
              </div>
            )}
          </div>
        </ChartWrapper>

        {/* 2. By Device Type */}
        <ChartWrapper 
          title="By Device Type" 
          description="Shares and downloads breakdown by Mobile, Desktop, and Tablet"
        >
          <div className="h-[300px] sm:h-[400px] w-full">
            {deviceChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    formatter={(value: any) => value.toLocaleString()}
                  />
                  <Legend />
                  <Bar dataKey="shares" name="Shares" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="downloads" name="Downloads" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No device data available
              </div>
            )}
          </div>
        </ChartWrapper>

        {/* 3. By Geography */}
        <ChartWrapper 
          title="By Geography" 
          description="Top locations for shares and downloads (Top 20 cities)"
        >
          <div className="h-[400px] sm:h-[500px] w-full">
            {geographyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={geographyChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number"
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Count', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    width={150}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    formatter={(value: any) => value.toLocaleString()}
                  />
                  <Legend />
                  <Bar dataKey="shares" name="Shares" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="downloads" name="Downloads" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No geography data available
              </div>
            )}
          </div>
        </ChartWrapper>

        {/* 4. By Time (Day/Week/Month) */}
        <ChartWrapper 
          title="By Time" 
          description="Shares and downloads trends over time"
          headerRight={
            <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="h-[300px] sm:h-[400px] w-full">
            {timeChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="period" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: timePeriod === 'day' ? 'Day' : timePeriod === 'week' ? 'Week' : 'Month', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    formatter={(value: any) => value.toLocaleString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="shares" 
                    stroke="var(--color-chart-1)" 
                    strokeWidth={2}
                    name="Shares"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="downloads" 
                    stroke="var(--color-chart-2)" 
                    strokeWidth={2}
                    name="Downloads"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No time data available
              </div>
            )}
          </div>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
