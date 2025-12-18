import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar, FilterState } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { StatCard } from "@/components/dashboard/StatCard";
import { fetchDeviceAnalytics } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { exportToCSV } from "@/lib/csvExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DeviceAnalytics() {
  const [filters, setFilters] = useState<FilterState>({});
  
  const { data, isLoading } = useQuery({
    queryKey: ['device-analytics', filters],
    queryFn: () => fetchDeviceAnalytics(filters),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const deviceData = data?.deviceData || [];
  const rankDistribution = data?.rankDistribution || {};
  const sharesDownloadsComparison = data?.sharesDownloadsComparison || [];

  // A. Overview Split - Side-by-side comparison tiles
  const deviceComparison = deviceData.map((device: any) => ({
    device: device.device,
    users: device.users || 0,
    uploads: device.uploads || 0,
    clicks: device.clicks || 0,
    clickRate: device.clickRate || 0,
    shares: device.shares || 0,
    downloads: device.downloads || 0,
    sharesDownloads: device.sharesDownloads || 0,
    avgRank: device.avgRank || 0
  }));

  // B. Behavior Insights
  // Rank distribution chart data
  const rankDistributionChartData: any[] = [];
  Object.keys(rankDistribution).forEach((deviceType) => {
    const dist = rankDistribution[deviceType];
    const total = dist["Rank 1"] + dist["Rank 2"] + dist["Rank 3"] + dist["Rank 4+"];
    if (total > 0) {
      rankDistributionChartData.push({
        device: deviceType,
        "Rank 1": parseFloat(((dist["Rank 1"] / total) * 100).toFixed(2)),
        "Rank 2": parseFloat(((dist["Rank 2"] / total) * 100).toFixed(2)),
        "Rank 3": parseFloat(((dist["Rank 3"] / total) * 100).toFixed(2)),
        "Rank 4+": parseFloat(((dist["Rank 4+"] / total) * 100).toFixed(2))
      });
    }
  });

  // Shares/Downloads comparison chart data
  const sharesDownloadsChartData = sharesDownloadsComparison.map((item: any) => ({
    device: item.device,
    Shares: item.shares || 0,
    Downloads: item.downloads || 0
  }));

  const handleExport = () => {
    const exportData = deviceComparison.map((device: any) => ({
      Device: device.device,
      Users: device.users,
      Uploads: device.uploads,
      'PDP Clicks': device.clicks,
      'Click Rate per Upload (%)': device.clickRate,
      Shares: device.shares,
      Downloads: device.downloads,
      'Shares/Downloads': device.sharesDownloads,
      'Average Clicked Rank': device.avgRank
    }));
    exportToCSV(exportData, 'device-analytics');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Device Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Mobile vs Desktop usage and behavior insights.
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Device Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Mobile vs Desktop usage and behavior insights for mobile UX focus.
        </p>
      </div>

      <FilterBar onFilterChange={setFilters} onExport={handleExport} initialFilters={filters} />

      {/* A. Overview Split - Side-by-side comparison tiles */}
      <div className="mb-8">
        <ChartWrapper 
          title="Device Overview Split" 
          description="Metrics comparison across device types"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {deviceComparison.map((device: any) => (
              <Card key={device.device} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{device.device}</span>
                    <Badge variant="outline">{device.device}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Users</div>
                      <div className="text-lg font-semibold">{device.users.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Uploads</div>
                      <div className="text-lg font-semibold">{device.uploads.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">PDP Clicks</div>
                      <div className="text-lg font-semibold">{device.clicks.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Click Rate</div>
                      <div className="text-lg font-semibold">{device.clickRate.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Shares</div>
                      <div className="text-lg font-semibold">{device.shares.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Downloads</div>
                      <div className="text-lg font-semibold">{device.downloads.toLocaleString()}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Avg Clicked Rank</div>
                      <div className="text-lg font-semibold">{device.avgRank.toFixed(2)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ChartWrapper>
      </div>

      {/* Segmented bar chart for comparison */}
      <div className="mb-8">
        <ChartWrapper 
          title="Device Metrics Comparison" 
          description="Side-by-side comparison of key metrics"
        >
          <div className="h-[300px] sm:h-[400px] w-full">
            {deviceComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceComparison}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="device" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                  />
                  <Legend />
                  <Bar dataKey="users" fill="var(--color-chart-1)" name="Users" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="uploads" fill="var(--color-chart-2)" name="Uploads" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicks" fill="var(--color-chart-3)" name="PDP Clicks" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No device data available
              </div>
            )}
          </div>
        </ChartWrapper>
      </div>

      {/* B. Behavior Insights */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Rank Distribution by Device */}
        <ChartWrapper 
          title="Rank Distribution by Device" 
          description="Are mobile users clicking deeper ranks or mostly rank 1?"
        >
          <div className="h-[250px] sm:h-[350px] w-full">
            {rankDistributionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankDistributionChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="device" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: '% of Clicks', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    formatter={(value: any) => [`${value}%`, '']}
                  />
                  <Legend />
                  <Bar dataKey="Rank 1" stackId="a" fill="var(--color-chart-1)" />
                  <Bar dataKey="Rank 2" stackId="a" fill="var(--color-chart-2)" />
                  <Bar dataKey="Rank 3" stackId="a" fill="var(--color-chart-3)" />
                  <Bar dataKey="Rank 4+" stackId="a" fill="var(--color-chart-4)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No rank distribution data available
              </div>
            )}
          </div>
        </ChartWrapper>

        {/* Shares/Downloads Comparison */}
        <ChartWrapper 
          title="Shares/Downloads by Device" 
          description="Are desktop users more likely to download/share?"
        >
          <div className="h-[250px] sm:h-[350px] w-full">
            {sharesDownloadsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sharesDownloadsChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="device" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                  />
                  <Legend />
                  <Bar dataKey="Shares" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Downloads" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No shares/downloads data available
              </div>
            )}
          </div>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
