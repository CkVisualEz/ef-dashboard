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
import { WorldPinMap, guessISO } from "@/components/geography/WorldPinMap";
import { getDefaultDateFilters } from "@/lib/defaultFilters";

export default function Geography() {
  const [filters, setFilters] = useState<FilterState>(() => getDefaultDateFilters());
  const [mapMetric, setMapMetric] = useState<'Unique Users' | 'Uploads' | 'PDP Clicks'>('Unique Users');
  const [selectedCountryISO, setSelectedCountryISO] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['geography', filters],
    queryFn: () => fetchGeography(filters),
  });

  const geoData = data?.geoData || [];

  // Top Locations Table (by state/city)
  const topLocations = geoData
    .map((item: any) => ({
      state: item.state || 'Unknown',
      city: item.city || 'Unknown',
      uniqueUsers: item.uniqueUsers || 0,
      uploads: item.uploads || 0,
      clicks: item.clicks || 0,
      clickRate: item.clickRate || 0,
      avgRank: item.avgRank || 0,
      lat: item.lat,
      lon: item.lon,
    }))
    .filter((loc: any) => {
      if (!selectedCountryISO) return true; // show all if no country selected
      return guessISO(loc.state, loc.city) === selectedCountryISO;
    })
    .sort((a: any, b: any) => b.uniqueUsers - a.uniqueUsers)
    .slice(0, 50);

  const handleExport = () => {
    const exportData = topLocations.map((location: any) => ({
      State: location.state,
      City: location.city,
      'Unique Users': location.uniqueUsers,
      'Uploads': location.uploads,
      'PDP Clicks': location.clicks,
      'Click Rate per Upload (%)': location.clickRate,
      'Average Clicked Rank': location.avgRank,
    }));
    exportToCSV(exportData, 'geography');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Geography</h1>
          <p className="text-muted-foreground mt-1">User location and regional performance.</p>
        </div>
        <Skeleton className="h-32 w-full mb-8" />
        <Skeleton className="h-[500px] w-full" />
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

      {/* Map Section */}
      <div className="mb-8">
        <ChartWrapper
          title="Global User Activity"
          description="Click any highlighted country to drill into its city-level data"
        >
          <div className="flex items-center justify-end px-2 pb-2">
            <Select value={mapMetric} onValueChange={(value: any) => setMapMetric(value)}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unique Users">Unique Users</SelectItem>
                <SelectItem value="Uploads">Uploads</SelectItem>
                <SelectItem value="PDP Clicks">PDP Clicks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {geoData && geoData.length > 0 ? (
            <WorldPinMap data={geoData} metric={mapMetric} onCountrySelect={setSelectedCountryISO} />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No geographic data available
            </div>
          )}
        </ChartWrapper>
      </div>

      {/* Top Locations Table */}
      <div className="mb-8">
        <ChartWrapper
          title={selectedCountryISO ? "Top Locations in Selected Region" : "Top Locations Worldwide"}
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
                  {topLocations.map((location: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{location.state}</TableCell>
                      <TableCell>{location.city}</TableCell>
                      <TableCell className="text-right">{location.uniqueUsers.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{location.uploads.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{location.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(location.clickRate || 0).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{Number(location.avgRank || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No location data available for this selection
            </div>
          )}
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
