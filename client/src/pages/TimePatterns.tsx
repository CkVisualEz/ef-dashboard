import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar, FilterState } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { fetchTimePatterns } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { exportToCSV } from "@/lib/csvExport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDefaultDateFilters } from "@/lib/defaultFilters";

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TimePatterns() {
  const [filters, setFilters] = useState<FilterState>(() => getDefaultDateFilters());
  const [hourlyMetric, setHourlyMetric] = useState<'uploads' | 'users'>('uploads');
  
  const { data, isLoading } = useQuery({
    queryKey: ['time-patterns', filters],
    queryFn: () => fetchTimePatterns(filters),
  });

  const hourlyData = data?.hourlyData || [];
  const dailyData = data?.dailyData || [];
  const monthlyData = data?.monthlyData || [];

  // A. Usage by Hour
  const hourlyChart = hourlyData.map((item: any) => ({
    hour: item.hour,
    hourLabel: `${item.hour}:00`,
    uploads: item.uploads || 0,
    users: item.users || 0
  }));

  // B. Usage by Day of Week
  const dailyChart = dailyData.map((item: any) => ({
    day: item.day,
    name: DAY_NAMES[item.day] || `Day ${item.day}`,
    uploads: item.uploads || 0,
    clicks: item.clicks || 0,
    clickRate: item.clickRate || 0
  }));

  // C. Monthly Trend
  const monthlyChart = monthlyData.map((item: any) => ({
    month: item.month,
    users: item.users || 0,
    uploads: item.uploads || 0,
    clicks: item.clicks || 0,
    sharesDownloads: item.sharesDownloads || 0
  }));

  const handleExport = () => {
    const exportData = [
      ...hourlyChart.map(item => ({ 
        Type: 'Hourly', 
        Time: item.hourLabel, 
        Uploads: item.uploads,
        Users: item.users
      })),
      ...dailyChart.map(item => ({ 
        Type: 'Daily', 
        Day: item.name, 
        Uploads: item.uploads,
        'PDP Clicks': item.clicks,
        'Click Rate (%)': item.clickRate
      })),
      ...monthlyChart.map(item => ({
        Type: 'Monthly',
        Month: item.month,
        Users: item.users,
        Uploads: item.uploads,
        'PDP Clicks': item.clicks,
        'Shares/Downloads': item.sharesDownloads
      }))
    ];
    exportToCSV(exportData, 'time-patterns');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Time Patterns</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            When are users engaging with Color Match?
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Time Patterns</h1>
        <p className="text-muted-foreground mt-1">
          Usage patterns by hour, day of week, and monthly trends for quarterly presentations.
        </p>
      </div>

      <FilterBar onFilterChange={setFilters} onExport={handleExport} initialFilters={filters} />

      {/* A. Usage by Hour */}
      <div className="mb-8">
        <ChartWrapper 
          title="Usage by Hour" 
          description="Upload count or users by hour of day (0-23)"
          headerRight={
            <Select value={hourlyMetric} onValueChange={(value: any) => setHourlyMetric(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uploads">Uploads</SelectItem>
                <SelectItem value="users">Users</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="h-[300px] sm:h-[400px] w-full">
            {hourlyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: hourlyMetric === 'uploads' ? 'Upload Count' : 'User Count', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    labelFormatter={(value) => `Hour ${value}:00`}
                    formatter={(value: any) => [value.toLocaleString(), hourlyMetric === 'uploads' ? 'Uploads' : 'Users']}
                  />
                  <Bar 
                    dataKey={hourlyMetric} 
                    fill="var(--color-chart-1)" 
                    radius={[4, 4, 0, 0]}
                    name={hourlyMetric === 'uploads' ? 'Uploads' : 'Users'}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No hourly data available
              </div>
            )}
          </div>
        </ChartWrapper>
      </div>

      {/* B. Usage by Day of Week */}
      <div className="mb-8">
        <ChartWrapper 
          title="Usage by Day of Week" 
          description="Uploads, PDP Clicks, and Click Rate per Upload (Mon-Sun)"
        >
          <div className="h-[300px] sm:h-[400px] w-full">
            {dailyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Click Rate (%)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="uploads" fill="var(--color-chart-1)" name="Uploads" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="clicks" fill="var(--color-chart-2)" name="PDP Clicks" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="clickRate" fill="var(--color-chart-3)" name="Click Rate (%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No daily data available
              </div>
            )}
          </div>
        </ChartWrapper>
      </div>

      {/* C. Monthly Trend */}
      <div className="mb-8">
        <ChartWrapper 
          title="Monthly Trend" 
          description="Users, Uploads, PDP Clicks, and Share/Download count per month"
        >
          <div className="h-[400px] sm:h-[500px] w-full">
            {monthlyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
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
                    dataKey="users" 
                    stroke="var(--color-chart-1)" 
                    strokeWidth={2}
                    name="Users"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uploads" 
                    stroke="var(--color-chart-2)" 
                    strokeWidth={2}
                    name="Uploads"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="var(--color-chart-3)" 
                    strokeWidth={2}
                    name="PDP Clicks"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sharesDownloads" 
                    stroke="var(--color-chart-4)" 
                    strokeWidth={2}
                    name="Shares/Downloads"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No monthly data available
              </div>
            )}
          </div>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
