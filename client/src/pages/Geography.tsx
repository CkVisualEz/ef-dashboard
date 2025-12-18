import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar, FilterState } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { fetchGeography } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { exportToCSV } from "@/lib/csvExport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { USMap } from "@/components/geography/USMap";

export default function Geography() {
  const [filters, setFilters] = useState<FilterState>({});
  const [mapMetric, setMapMetric] = useState<'Unique Users' | 'Uploads' | 'PDP Clicks'>('Unique Users');
  
  const { data, isLoading } = useQuery({
    queryKey: ['geography', filters],
    queryFn: () => fetchGeography(filters),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const geoData = data?.geoData || [];
  const stateData = data?.stateData || [];

  // List of all US states (common states) - can be extended for other countries
  const commonStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming', 'District of Columbia'
  ];

  // Create a map of state data
  const stateDataMap = new Map<string, any>();
  stateData.forEach((item: any) => {
    if (item.state && item.state !== 'Unknown') {
      stateDataMap.set(item.state, {
        'Unique Users': item.uniqueUsers || 0,
        'Uploads': item.uploads || 0,
        'PDP Clicks': item.clicks || 0
      });
    }
  });

  // Get all unique states from data
  const statesFromData = Array.from(new Set(stateData.map((item: any) => item.state).filter((s: any) => s && s !== 'Unknown')));
  
  // Combine common states with states from data
  const allStatesSet = new Set([...commonStates, ...statesFromData]);
  const allStates = Array.from(allStatesSet).sort();

  // Prepare heatmap data (by state) - show all metrics, including states with 0 values
  const heatmapData = allStates
    .map((state: string) => {
      const data = stateDataMap.get(state);
      return {
        state,
        'Unique Users': data?.['Unique Users'] || 0,
        'Uploads': data?.['Uploads'] || 0,
        'PDP Clicks': data?.['PDP Clicks'] || 0
      };
    })
    .sort((a: any, b: any) => {
      // Sort by total of all metrics (states with data first, then alphabetically)
      const totalA = a['Unique Users'] + a['Uploads'] + a['PDP Clicks'];
      const totalB = b['Unique Users'] + b['Uploads'] + b['PDP Clicks'];
      if (totalA === 0 && totalB === 0) {
        return a.state.localeCompare(b.state);
      }
      if (totalA === 0) return 1;
      if (totalB === 0) return -1;
      return totalB - totalA;
    });

  // Top Locations Table (by state/city)
  const topLocations = geoData
    .map((item: any) => ({
      state: item.state || 'Unknown',
      city: item.city || 'Unknown',
      uniqueUsers: item.uniqueUsers || 0,
      uploads: item.uploads || 0,
      clicks: item.clicks || 0,
      clickRate: item.clickRate || 0,
      avgRank: item.avgRank || 0
    }))
    .sort((a, b) => b.uniqueUsers - a.uniqueUsers)
    .slice(0, 50); // Top 50 locations

  const handleExport = () => {
    const exportData = topLocations.map((location: any) => ({
      State: location.state,
      City: location.city,
      'Unique Users': location.uniqueUsers,
      'Uploads': location.uploads,
      'PDP Clicks': location.clicks,
      'Click Rate per Upload (%)': location.clickRate,
      'Average Clicked Rank': location.avgRank
    }));
    exportToCSV(exportData, 'geography');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Geography</h1>
          <p className="text-muted-foreground mt-1">
            User location and regional performance.
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Geography</h1>
        <p className="text-muted-foreground mt-1">
          Where Color Match is used more, where it performs best, and where to push local dealer campaigns.
        </p>
      </div>

      <FilterBar onFilterChange={setFilters} onExport={handleExport} initialFilters={filters} />

      {/* A. State/City Heatmap */}
      <div className="mb-8">
        <ChartWrapper 
          title="State/City Heatmap" 
          description="Map showing geographic distribution by state"
          headerRight={
            <Select value={mapMetric} onValueChange={(value: any) => setMapMetric(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unique Users">Unique Users</SelectItem>
                <SelectItem value="Uploads">Uploads</SelectItem>
                <SelectItem value="PDP Clicks">PDP Clicks</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="h-[600px] w-full">
            {heatmapData.length > 0 ? (
              <USMap data={heatmapData} metric={mapMetric} />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No geographic data available
              </div>
            )}
          </div>
        </ChartWrapper>
      </div>

      {/* B. Top Locations Table */}
      <div className="mb-8">
        <ChartWrapper 
          title="Top Locations" 
          description="State/City performance metrics"
        >
          {topLocations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>State</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Unique Users</TableHead>
                    <TableHead className="text-right">Uploads</TableHead>
                    <TableHead className="text-right">PDP Clicks</TableHead>
                    <TableHead className="text-right">Click Rate per Upload (%)</TableHead>
                    <TableHead className="text-right">Average Clicked Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLocations.map((location, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{location.state}</TableCell>
                      <TableCell>{location.city}</TableCell>
                      <TableCell className="text-right">{location.uniqueUsers.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{location.uploads.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{location.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{location.clickRate.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{location.avgRank.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No location data available
            </div>
          )}
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
