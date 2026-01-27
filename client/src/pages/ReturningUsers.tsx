import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar, FilterState } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { StatCard } from "@/components/dashboard/StatCard";
import { fetchReturningUsers } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { exportToCSV } from "@/lib/csvExport";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { getDefaultDateFilters } from "@/lib/defaultFilters";

export default function ReturningUsers() {
  const [filters, setFilters] = useState<FilterState>(() => getDefaultDateFilters());
  
  // Trend chart controls (separate from main filters)
  const [trendPeriod, setTrendPeriod] = useState<"days" | "week" | "month">("days");
  const [trendDateRange, setTrendDateRange] = useState<DateRange | undefined>(() => {
    // Default: last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { from: start, to: end };
  });

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
    queryKey: ['returning-users', queryParams],
    queryFn: () => fetchReturningUsers(queryParams),
  });

  const newUsers = data?.newUsers || 0;
  const returningUsers = data?.returningUsers || 0;
  const returningRate = parseFloat(data?.returningRate || "0");
  const frequencyDist = data?.frequencyDist || {};
  const trendData = data?.trendData || [];

  const kpis = [
    {
      label: "New Users",
      value: newUsers.toLocaleString(),
      change: 0,
      trend: "neutral" as const,
    },
    {
      label: "Returning Users",
      value: returningUsers.toLocaleString(),
      change: 0,
      trend: "neutral" as const,
    },
    {
      label: "Returning Rate",
      value: `${returningRate.toFixed(1)} days`,
      change: 0,
      trend: "neutral" as const,
    },
  ];

  const frequencyChartData = Object.entries(frequencyDist).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const handleExport = () => {
    const exportData = [
      { Metric: 'New Users', Value: newUsers },
      { Metric: 'Returning Users', Value: returningUsers },
      { Metric: 'Returning Rate (days)', Value: returningRate.toFixed(2) },
      ...frequencyChartData.map(item => ({
        Metric: `Frequency: ${item.name} uploads`,
        Value: item.value,
      })),
    ];
    exportToCSV(exportData, 'returning-users');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Returning Users</h1>
          <p className="text-muted-foreground mt-1">
            Loyalty and stickiness metrics.
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Returning Users</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Loyalty and stickiness metrics.
        </p>
      </div>

      <FilterBar onFilterChange={setFilters} onExport={handleExport} initialFilters={filters} />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
        {kpis.map((kpi, i) => (
          <StatCard key={i} data={kpi} hideComparison={true} />
        ))}
      </div>

      {/* Trend over Time Chart */}
      <div className="grid gap-6 mb-8">
        <ChartWrapper 
          title="Trend over Time" 
          description="New vs returning users over time"
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {/* Period Selector */}
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
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
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
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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

          <div className="h-[250px] sm:h-[350px] w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{ stroke: 'hsl(var(--muted))' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="newUsers" 
                    name="New Users" 
                    stroke="var(--color-chart-1)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="returningUsers" 
                    name="Returning Users" 
                    stroke="var(--color-chart-2)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No trend data available
              </div>
            )}
          </div>
        </ChartWrapper>

        <ChartWrapper title="Upload Frequency Distribution" description="Distribution of uploads per user">
          <div className="h-[250px] sm:h-[350px] w-full">
            {frequencyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frequencyChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} cursor={{fill: 'hsl(var(--muted))'}} />
                  <Bar dataKey="value" fill="var(--color-chart-3)" radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No frequency data available
              </div>
            )}
          </div>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
