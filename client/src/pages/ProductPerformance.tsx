import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar, FilterState } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { fetchProductPerformance } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
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
import { Badge } from "@/components/ui/badge";

export default function ProductPerformance() {
  const [filters, setFilters] = useState<FilterState>({});
  
  const { data, isLoading } = useQuery({
    queryKey: ['product-performance', filters],
    queryFn: () => fetchProductPerformance(filters),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const topProducts = data?.topProducts || [];
  const rankDistribution = data?.rankDistribution || {};
  const avgRankByCategory = data?.avgRankByCategory || {};
  const avgRankByDevice = data?.avgRankByDevice || {};

  // Format rank distribution for chart
  const rankDistributionData = [
    { name: "Rank 1", value: rankDistribution["Rank 1"] || 0, clicks: rankDistribution["Rank 1"] || 0 },
    { name: "Rank 2", value: rankDistribution["Rank 2"] || 0, clicks: rankDistribution["Rank 2"] || 0 },
    { name: "Rank 3", value: rankDistribution["Rank 3"] || 0, clicks: rankDistribution["Rank 3"] || 0 },
    { name: "Rank 4+", value: rankDistribution["Rank 4+"] || 0, clicks: rankDistribution["Rank 4+"] || 0 },
  ];

  // Format average rank by category
  const avgRankByCategoryData = Object.entries(avgRankByCategory).map(([category, avgRank]) => ({
    name: category,
    value: typeof avgRank === 'number' ? avgRank : 0
  }));

  // Format average rank by device
  const avgRankByDeviceData = Object.entries(avgRankByDevice)
    .filter(([device]) => device !== "Unknown")
    .map(([device, avgRank]) => ({
      name: device,
      value: typeof avgRank === 'number' ? avgRank : 0
    }));

  const handleExport = () => {
    const exportData = topProducts.map((p: any) => ({
      'SKU ID': p.sku,
      'Product Name': p.productName,
      'Category': p.category,
      'Total Clicks': p.clicks,
      'Total Impressions': p.impressions,
      'CTR (%)': p.ctr,
      'Average Rank': p.avgRank,
      'Top States': p.topStates?.join(', ') || '',
      'Top Cities': p.topCities?.join(', ') || '',
    }));
    exportToCSV(exportData, 'product-performance');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Product Performance</h1>
          <p className="text-muted-foreground mt-1">
            SKU-level analysis and ranking metrics.
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Product Performance</h1>
        <p className="text-muted-foreground mt-1">
          Which products Color Match is pushing. Analyze SKU-level performance and ranking behavior.
        </p>
      </div>

      <FilterBar onFilterChange={setFilters} onExport={handleExport} initialFilters={filters} />

      {/* A. Top Clicked SKUs */}
      <div className="mb-8">
        <ChartWrapper 
          title="Top Clicked SKUs" 
          description="SKUs with the highest click counts, including impressions, CTR, and geography"
        >
          {topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU ID</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Total Clicks</TableHead>
                    <TableHead className="text-right">Total Impressions</TableHead>
                    <TableHead className="text-right">CTR (%)</TableHead>
                    <TableHead className="text-right">Avg Rank</TableHead>
                    <TableHead>Top States</TableHead>
                    <TableHead>Top Cities</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product: any) => (
                    <TableRow key={product.sku}>
                      <TableCell className="font-medium">{product.sku}</TableCell>
                      <TableCell>{product.productName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{product.clicks}</TableCell>
                      <TableCell className="text-right">{product.impressions}</TableCell>
                      <TableCell className="text-right">{product.ctr}%</TableCell>
                      <TableCell className="text-right">{product.avgRank}</TableCell>
                      <TableCell>
                        {product.topStates && product.topStates.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {product.topStates.map((state: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {state}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.topCities && product.topCities.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {product.topCities.map((city: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {city}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No product data available
            </div>
          )}
        </ChartWrapper>
      </div>

      {/* B. Rank Behavior */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        {/* Rank Distribution */}
        <ChartWrapper 
          title="Rank Behavior Distribution" 
          description="Distribution of clicked ranks (Rank 1, 2, 3, 4+)" 
          className="col-span-1"
        >
          <div className="h-[300px] w-full">
            {rankDistributionData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
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
                    formatter={(value: any) => [`${value}%`, 'Percentage']}
                  />
                  <Bar dataKey="value" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]}>
                    {rankDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`var(--color-chart-${(index % 5) + 1})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </ChartWrapper>

        {/* Average Rank by Category */}
        <ChartWrapper 
          title="Avg Rank by Category" 
          description="Average clicked rank split by Carpet vs Hard Surface" 
          className="col-span-1"
        >
          <div className="h-[300px] w-full">
            {avgRankByCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgRankByCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Avg Rank', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    formatter={(value: any) => [value.toFixed(2), 'Average Rank']}
                  />
                  <Bar dataKey="value" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]}>
                    {avgRankByCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`var(--color-chart-${(index % 5) + 2})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </ChartWrapper>

        {/* Average Rank by Device */}
        <ChartWrapper 
          title="Avg Rank by Device" 
          description="Average clicked rank split by Mobile vs Desktop" 
          className="col-span-1"
        >
          <div className="h-[300px] w-full">
            {avgRankByDeviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgRankByDeviceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Avg Rank', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    formatter={(value: any) => [value.toFixed(2), 'Average Rank']}
                  />
                  <Bar dataKey="value" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]}>
                    {avgRankByDeviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`var(--color-chart-${(index % 5) + 3})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
