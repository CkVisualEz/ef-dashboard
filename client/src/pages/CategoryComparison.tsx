import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar, FilterState } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { StatCard } from "@/components/dashboard/StatCard";
import { fetchCategorySummary } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useEffect } from "react";
import { exportToCSV } from "@/lib/csvExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export default function CategoryComparison() {
  const [filters, setFilters] = useState<FilterState>({});
  
  // Trend chart controls (separate from main filters)
  const [trendPeriod, setTrendPeriod] = useState<"days" | "week" | "month">("days");
  const [trendDateRange, setTrendDateRange] = useState<DateRange | undefined>(() => {
    // Default: last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { from: start, to: end };
  });

  // Update trend date range when period changes
  useEffect(() => {
    if (trendPeriod === "month") {
      const start = new Date(new Date().getFullYear(), 0, 1);
      const end = new Date();
      setTrendDateRange({ from: start, to: end });
    } else {
      // For days and week, use last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setTrendDateRange({ from: start, to: end });
    }
  }, [trendPeriod]);

  // Build query params including trend filters
  const queryParams = useMemo(() => {
    const params: FilterState & { trendPeriod?: string; trendStartDate?: string; trendEndDate?: string } = { ...filters };
    if (trendPeriod) {
      params.trendPeriod = trendPeriod;
    }
    if (trendDateRange?.from) {
      params.trendStartDate = format(trendDateRange.from, "yyyy-MM-dd");
    }
    if (trendDateRange?.to) {
      params.trendEndDate = format(trendDateRange.to, "yyyy-MM-dd");
    }
    return params;
  }, [filters, trendPeriod, trendDateRange]);
  
  const { data, isLoading } = useQuery({
    queryKey: ['category-summary', queryParams],
    queryFn: () => fetchCategorySummary(queryParams),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const surfaceData = data?.surfaceData || {};
  const trendData = data?.trendData || [];
  const totalUniqueUsers = data?.totalUniqueUsers || 0;

  const carpet = surfaceData.carpet || { users: 0, uploads: 0, pdpClicks: 0, clickRate: 0, avgRank: 0, shareDownloadRate: 0 };
  const hardSurface = surfaceData.hard_surface || { users: 0, uploads: 0, pdpClicks: 0, clickRate: 0, avgRank: 0, shareDownloadRate: 0 };
  const mixed = surfaceData.mixed || { users: 0, uploads: 0, pdpClicks: 0, clickRate: 0, avgRank: 0, shareDownloadRate: 0 };

  const totalUploads = carpet.uploads + hardSurface.uploads + mixed.uploads;

  const kpis = [
    {
      label: "Total Uploads",
      value: totalUploads.toLocaleString(),
      change: 0,
      trend: "neutral" as const,
    },
    {
      label: "Carpet Uploads",
      value: carpet.uploads.toLocaleString(),
      change: 0,
      trend: "neutral" as const,
    },
    {
      label: "Hard Surface Uploads",
      value: hardSurface.uploads.toLocaleString(),
      change: 0,
      trend: "neutral" as const,
    },
    {
      label: "Mixed/Both Uploads",
      value: mixed.uploads.toLocaleString(),
      change: 0,
      trend: "neutral" as const,
    },
    {
      label: "Total Users",
      value: totalUniqueUsers.toLocaleString(),
      change: 0,
      trend: "neutral" as const,
    },
  ];

  // Data for donut chart (% of uploads by segment)
  const uploadDistributionData = [
    { name: "Carpet", value: carpet.uploads, color: "var(--color-chart-1)" },
    { name: "Hard Surface", value: hardSurface.uploads, color: "var(--color-chart-2)" },
    { name: "Mixed/Both", value: mixed.uploads, color: "var(--color-chart-3)" },
  ].filter(item => item.value > 0);

  const handleExport = () => {
    const exportData = [
      {
        "Surface Type": "Carpet",
        "Users": carpet.users,
        "Uploads": carpet.uploads,
        "PDP Clicks": carpet.pdpClicks,
        "Click Rate (%)": carpet.clickRate.toFixed(2),
        "Avg Rank": carpet.avgRank.toFixed(2),
        "Share/Download Rate (%)": carpet.shareDownloadRate.toFixed(2),
      },
      {
        "Surface Type": "Hard Surface",
        "Users": hardSurface.users,
        "Uploads": hardSurface.uploads,
        "PDP Clicks": hardSurface.pdpClicks,
        "Click Rate (%)": hardSurface.clickRate.toFixed(2),
        "Avg Rank": hardSurface.avgRank.toFixed(2),
        "Share/Download Rate (%)": hardSurface.shareDownloadRate.toFixed(2),
      },
      {
        "Surface Type": "Mixed/Both",
        "Users": mixed.users,
        "Uploads": mixed.uploads,
        "PDP Clicks": mixed.pdpClicks,
        "Click Rate (%)": mixed.clickRate.toFixed(2),
        "Avg Rank": mixed.avgRank.toFixed(2),
        "Share/Download Rate (%)": mixed.shareDownloadRate.toFixed(2),
      },
    ];
    exportToCSV(exportData, 'category-comparison');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Category Comparison</h1>
          <p className="text-muted-foreground mt-1">
            Carpet vs Hard Surface performance analysis.
          </p>
        </div>
        <Skeleton className="h-32 w-full mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Category Comparison</h1>
        <p className="text-muted-foreground mt-1">
          Carpet vs Hard Surface performance analysis.
        </p>
      </div>

      <FilterBar onFilterChange={setFilters} onExport={handleExport} initialFilters={filters} />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        {kpis.map((kpi, i) => (
          <StatCard key={i} data={kpi} hideComparison={true} />
        ))}
      </div>

      {/* A. Split by Surface Type - Side-by-side Comparison Cards */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Carpet Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Carpet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{carpet.users.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uploads</p>
                <p className="text-2xl font-bold">{carpet.uploads.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PDP Clicks</p>
                <p className="text-2xl font-bold">{carpet.pdpClicks.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold">{carpet.clickRate.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Rank</p>
                <p className="text-2xl font-bold">{carpet.avgRank.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Share/Download Rate</p>
                <p className="text-2xl font-bold">{carpet.shareDownloadRate.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hard Surface Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Hard Surface</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{hardSurface.users.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uploads</p>
                <p className="text-2xl font-bold">{hardSurface.uploads.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PDP Clicks</p>
                <p className="text-2xl font-bold">{hardSurface.pdpClicks.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold">{hardSurface.clickRate.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Rank</p>
                <p className="text-2xl font-bold">{hardSurface.avgRank.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Share/Download Rate</p>
                <p className="text-2xl font-bold">{hardSurface.shareDownloadRate.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mixed/Both Card (if needed) */}
      {mixed.uploads > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Mixed/Both</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{mixed.users.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uploads</p>
                <p className="text-2xl font-bold">{mixed.uploads.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PDP Clicks</p>
                <p className="text-2xl font-bold">{mixed.pdpClicks.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold">{mixed.clickRate.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Rank</p>
                <p className="text-2xl font-bold">{mixed.avgRank.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Share/Download Rate</p>
                <p className="text-2xl font-bold">{mixed.shareDownloadRate.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Stacked Bar or Donut Chart - % of uploads by segment */}
        <ChartWrapper title="Upload Distribution" description="% of uploads by surface type">
          <div className="h-[250px] sm:h-[350px] w-full">
            {uploadDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={uploadDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {uploadDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No upload data available
              </div>
            )}
          </div>
        </ChartWrapper>

        {/* Stacked Bar Chart - Uploads by segment */}
        <ChartWrapper title="Uploads by Surface Type" description="Total uploads breakdown">
          <div className="h-[250px] sm:h-[350px] w-full">
            {totalUploads > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "Carpet", uploads: carpet.uploads },
                  { name: "Hard Surface", uploads: hardSurface.uploads },
                  { name: "Mixed/Both", uploads: mixed.uploads },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} cursor={{fill: 'hsl(var(--muted))'}} />
                  <Bar dataKey="uploads" name="Uploads" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No upload data available
              </div>
            )}
          </div>
        </ChartWrapper>
      </div>

      {/* B. Trend Over Time by Surface Type */}
      <ChartWrapper 
        title="Trend Over Time by Surface Type" 
        description="Uploads over time: Carpet vs Hard Surface vs Mixed"
        headerRight={
          <div className="flex items-center gap-2">
            <Select value={trendPeriod} onValueChange={(value: "days" | "week" | "month") => {
              setTrendPeriod(value);
              // Update date range based on period
              const end = new Date();
              let start = new Date();
              if (value === "month") {
                start = new Date(new Date().getFullYear(), 0, 1); // Start of year
              } else {
                start.setDate(start.getDate() - 30); // Last 30 days
              }
              setTrendDateRange({ from: start, to: end });
            }}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal h-8",
                    !trendDateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {trendDateRange?.from ? (
                    trendDateRange.to ? (
                      <>
                        {format(trendDateRange.from, "LLL dd, y")} -{" "}
                        {format(trendDateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(trendDateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Select trend date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={trendDateRange?.from}
                  selected={trendDateRange}
                  onSelect={setTrendDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        }
      >
        <div className="h-[300px] sm:h-[400px] w-full">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} cursor={{fill: 'hsl(var(--muted))'}} />
                <Legend />
                <Line type="monotone" dataKey="carpet" stroke="var(--color-chart-1)" strokeWidth={2} name="Carpet" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="hard_surface" stroke="var(--color-chart-2)" strokeWidth={2} name="Hard Surface" dot={{ r: 4 }} />
                {mixed.uploads > 0 && (
                  <Line type="monotone" dataKey="mixed" stroke="var(--color-chart-3)" strokeWidth={2} name="Mixed/Both" dot={{ r: 4 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No trend data available for the selected period.
            </div>
          )}
        </div>
      </ChartWrapper>
    </DashboardLayout>
  );
}
