import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar, FilterState } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { fetchAbTesting } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDefaultDateFilters } from "@/lib/defaultFilters";
import { exportToCSV } from "@/lib/csvExport";
import { format, parseISO } from "date-fns";
import { Trophy, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type VariantMetrics = {
  served: number;
  ctaClicked: number;
  activeUsers: number;
  uploads: number;
  clicks: number;
  shares: number;
  downloads: number;
  recommendations: number;
  returningUsers: number;
  clickRate: number;
  ctaClickRate: number;
  conversionRate: number;
  shareDownloadRate: number;
  avgUploadsPerUser: number;
  avgClickedRank: number;
};

type ComparisonMetric = {
  label: string;
  v1: number;
  v2: number;
  winner: "v1" | "v2" | "tie";
  delta: number;
  format: "number" | "percent";
};

type Comparison = {
  metrics: ComparisonMetric[];
  overallWinner: "v1" | "v2" | "tie";
  v1Wins: number;
  v2Wins: number;
};

const emptyMetrics: VariantMetrics = {
  served: 0,
  ctaClicked: 0,
  activeUsers: 0,
  uploads: 0,
  clicks: 0,
  shares: 0,
  downloads: 0,
  recommendations: 0,
  returningUsers: 0,
  clickRate: 0,
  ctaClickRate: 0,
  conversionRate: 0,
  shareDownloadRate: 0,
  avgUploadsPerUser: 0,
  avgClickedRank: 0,
};

function formatMetricValue(value: number, formatType: "number" | "percent") {
  if (formatType === "percent") return `${value.toFixed(2)}%`;
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(2);
}

function buildComparisonFromVariants(v1: VariantMetrics, v2: VariantMetrics): Comparison {
  const metricDefs: Array<{ key: keyof VariantMetrics; label: string; format: "number" | "percent" }> = [
    { key: "conversionRate", label: "Conversion Rate", format: "percent" },
    { key: "ctaClickRate", label: "CTA Click Rate", format: "percent" },
    { key: "activeUsers", label: "Active Users", format: "number" },
    { key: "uploads", label: "Image Uploads", format: "number" },
    { key: "clickRate", label: "Product Click Rate", format: "percent" },
    { key: "clicks", label: "Product Clicks", format: "number" },
    { key: "avgUploadsPerUser", label: "Avg Uploads / User", format: "number" },
    { key: "returningUsers", label: "Returning Users", format: "number" },
    { key: "shareDownloadRate", label: "Share / Download Rate", format: "percent" },
  ];

  let v1Wins = 0;
  let v2Wins = 0;

  const metrics = metricDefs.map(({ key, label, format }) => {
    const v1Value = v1[key] as number;
    const v2Value = v2[key] as number;
    let winner: "v1" | "v2" | "tie" = "tie";
    if (v1Value > v2Value) {
      winner = "v1";
      v1Wins += 1;
    } else if (v2Value > v1Value) {
      winner = "v2";
      v2Wins += 1;
    }
    const delta = v1Value === 0
      ? (v2Value > 0 ? 100 : 0)
      : parseFloat((((v2Value - v1Value) / v1Value) * 100).toFixed(1));
    return { label, v1: v1Value, v2: v2Value, winner, delta, format };
  });

  const overallWinner = v1Wins > v2Wins ? "v1" : v2Wins > v1Wins ? "v2" : "tie";
  return { metrics, overallWinner, v1Wins, v2Wins };
}

function WinnerBadge({ winner }: { winner: "v1" | "v2" | "tie" }) {
  if (winner === "tie") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Minus className="h-3 w-3" />
        Tie
      </Badge>
    );
  }
  return (
    <Badge className={cn("gap-1", winner === "v1" ? "bg-chart-1 hover:bg-chart-1" : "bg-chart-2 hover:bg-chart-2")}>
      <Trophy className="h-3 w-3" />
      UI {winner.toUpperCase()}
    </Badge>
  );
}

function VariantCard({
  version,
  metrics,
  isOverallWinner,
}: {
  version: string;
  metrics: VariantMetrics;
  isOverallWinner: boolean;
}) {
  return (
    <Card className={cn("overflow-hidden", isOverallWinner && "ring-2 ring-primary")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            UI {version.toUpperCase()}
            {isOverallWinner && (
              <Badge className="gap-1">
                <Trophy className="h-3 w-3" />
                Leading
              </Badge>
            )}
          </span>
          <Badge variant="outline">{version}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-muted-foreground">Users Served</div>
            <div className="text-lg font-semibold">{metrics.served.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">CTA Click Rate</div>
            <div className="text-lg font-semibold">{metrics.ctaClickRate.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Active Users</div>
            <div className="text-lg font-semibold">{metrics.activeUsers.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Image Uploads</div>
            <div className="text-lg font-semibold">{metrics.uploads.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Conversion Rate</div>
            <div className="text-lg font-semibold">{metrics.conversionRate.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Avg Uploads/User</div>
            <div className="text-lg font-semibold">{metrics.avgUploadsPerUser.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Product Clicks</div>
            <div className="text-lg font-semibold">{metrics.clicks.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Click Rate</div>
            <div className="text-lg font-semibold">{metrics.clickRate.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Returning Users</div>
            <div className="text-lg font-semibold">{metrics.returningUsers.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Share/Download Rate</div>
            <div className="text-lg font-semibold">{metrics.shareDownloadRate.toFixed(2)}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ABTesting() {
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...getDefaultDateFilters(),
    domain: "engineeredfloors.com",
  }));

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["ab-testing", filters],
    queryFn: () => fetchAbTesting(filters as Record<string, string>),
  });

  const variants = data?.variants || { v1: emptyMetrics, v2: emptyMetrics };
  const comparison = useMemo((): Comparison => {
    if (data?.comparison?.metrics?.length) {
      return data.comparison;
    }
    return buildComparisonFromVariants(variants.v1, variants.v2);
  }, [data?.comparison, variants]);
  const deviceByVariant = data?.deviceByVariant || { v1: [], v2: [] };
  const geoByVariant = data?.geoByVariant || { v1: [], v2: [] };

  const trendChartData = useMemo(() => {
    return (data?.trend || []).map((item: {
      date: string;
      v1Served: number;
      v2Served: number;
      v1Uploads: number;
      v2Uploads: number;
      v1Clicks: number;
      v2Clicks: number;
    }) => ({
      ...item,
      label: format(parseISO(item.date), "MMM d"),
    }));
  }, [data?.trend]);

  const deviceChartData = useMemo(() => {
    const devices = new Set<string>();
    [...deviceByVariant.v1, ...deviceByVariant.v2].forEach((item: { device: string }) => {
      devices.add(item.device);
    });

    return Array.from(devices).map((device) => {
      const v1 = deviceByVariant.v1.find((item: { device: string }) => item.device === device);
      const v2 = deviceByVariant.v2.find((item: { device: string }) => item.device === device);
      return {
        device,
        v1Uploads: v1?.uploads || 0,
        v2Uploads: v2?.uploads || 0,
      };
    });
  }, [deviceByVariant]);

  const handleExport = () => {
    const rows = comparison.metrics.map((row: ComparisonMetric) => ({
      Metric: row.label,
      "UI v1": row.format === "percent" ? `${row.v1.toFixed(2)}%` : row.v1,
      "UI v2": row.format === "percent" ? `${row.v2.toFixed(2)}%` : row.v2,
      Winner: row.winner === "tie" ? "Tie" : row.winner.toUpperCase(),
      "V2 vs V1 (%)": row.delta,
    }));

    exportToCSV(
      [
        { Metric: "Overall Winner", "UI v1": comparison.overallWinner === "v1" ? "Yes" : "", "UI v2": comparison.overallWinner === "v2" ? "Yes" : "" },
        { Metric: "Users Served", "UI v1": variants.v1.served, "UI v2": variants.v2.served },
        ...rows,
      ],
      "ab-testing"
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">A/B Testing</h1>
          <p className="text-muted-foreground mt-1">CTA UI v1 vs v2 experiment insights.</p>
        </div>
        <Skeleton className="h-32 w-full mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">A/B Testing</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          CTA UI v1 vs v2 — served users from ui_events; engagement metrics after each user&apos;s first ui_events entry.
        </p>
      </div>

      <FilterBar
        onFilterChange={setFilters}
        onExport={handleExport}
        initialFilters={filters}
        hideLocationFilters={true}
      />

      {isError && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load A/B testing data{(error as Error)?.message ? `: ${(error as Error).message}` : "."}
        </div>
      )}

      <div className="mb-8">
        <ChartWrapper title="Variant Overview" description="Side-by-side KPI comparison for UI v1 and UI v2">
          <div className="grid gap-4 md:grid-cols-2">
            <VariantCard version="v1" metrics={variants.v1} isOverallWinner={comparison.overallWinner === "v1"} />
            <VariantCard version="v2" metrics={variants.v2} isOverallWinner={comparison.overallWinner === "v2"} />
          </div>
        </ChartWrapper>
      </div>

      <div className="grid gap-6 mb-8">
        <ChartWrapper title="Daily Trend" description="Served users, uploads, and product clicks over time">
          <div className="h-[300px] sm:h-[400px] w-full">
            {trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))" }}
                    labelFormatter={(_, payload) => {
                      const date = payload?.[0]?.payload?.date;
                      return date ? format(parseISO(date), "MMM d, yyyy") : "";
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="v1Served" stroke="var(--color-chart-1)" strokeWidth={2} name="v1 Served" dot={false} />
                  <Line type="monotone" dataKey="v2Served" stroke="var(--color-chart-2)" strokeWidth={2} name="v2 Served" dot={false} />
                  <Line type="monotone" dataKey="v1Uploads" stroke="var(--color-chart-3)" strokeWidth={2} name="v1 Uploads" dot={false} />
                  <Line type="monotone" dataKey="v2Uploads" stroke="var(--color-chart-4)" strokeWidth={2} name="v2 Uploads" dot={false} />
                  <Line type="monotone" dataKey="v1Clicks" stroke="var(--color-chart-5)" strokeWidth={2} name="v1 Clicks" dot={false} />
                  <Line type="monotone" dataKey="v2Clicks" stroke="hsl(var(--primary))" strokeWidth={2} name="v2 Clicks" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No trend data available</div>
            )}
          </div>
        </ChartWrapper>
      </div>

      <div className="grid gap-6 mb-8">
        <ChartWrapper title="Device Breakdown" description="Uploads by device type per UI variant">
          <div className="h-[280px] sm:h-[350px] w-full">
            {deviceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="device" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))" }} />
                  <Legend />
                  <Bar dataKey="v1Uploads" fill="var(--color-chart-1)" name="v1 Uploads" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="v2Uploads" fill="var(--color-chart-2)" name="v2 Uploads" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No device data available</div>
            )}
          </div>
        </ChartWrapper>
      </div>

      <div className="mb-8">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Overall Winner
              </span>
              <WinnerBadge winner={comparison.overallWinner} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              UI {comparison.overallWinner === "tie" ? "v1 and v2 are tied" : comparison.overallWinner.toUpperCase()} leads with{" "}
              {comparison.overallWinner === "v1" ? comparison.v1Wins : comparison.overallWinner === "v2" ? comparison.v2Wins : comparison.v1Wins} of{" "}
              {comparison.metrics.length} key metrics
              {comparison.overallWinner !== "tie" && (
                <> ({comparison.v1Wins} v1 · {comparison.v2Wins} v2)</>
              )}
              . Engagement metrics include only users with a ui_events entry after their first assignment.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">UI V1</TableHead>
                    <TableHead className="text-right">UI V2</TableHead>
                    <TableHead className="text-right">V2 vs V1</TableHead>
                    <TableHead className="text-right">Winner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.metrics.map((row: ComparisonMetric) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className={cn("text-right", row.winner === "v1" && "font-semibold text-chart-1")}>
                        {formatMetricValue(row.v1, row.format)}
                      </TableCell>
                      <TableCell className={cn("text-right", row.winner === "v2" && "font-semibold text-chart-2")}>
                        {formatMetricValue(row.v2, row.format)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.delta > 0 ? "+" : ""}{row.delta}%
                      </TableCell>
                      <TableCell className="text-right">
                        <WinnerBadge winner={row.winner} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {(["v1", "v2"] as const).map((version) => (
          <ChartWrapper
            key={version}
            title={`Geography — UI ${version.toUpperCase()}`}
            description="Top locations by uploads"
          >
            <div className="max-h-[360px] overflow-y-auto">
              {(geoByVariant[version] || []).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>State</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Users</TableHead>
                      <TableHead className="text-right">Uploads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {geoByVariant[version].slice(0, 10).map((row: {
                      state: string;
                      city: string;
                      uniqueUsers: number;
                      uploads: number;
                    }, index: number) => (
                      <TableRow key={`${version}-${row.state}-${row.city}-${index}`}>
                        <TableCell>{row.state}</TableCell>
                        <TableCell>{row.city}</TableCell>
                        <TableCell className="text-right">{row.uniqueUsers}</TableCell>
                        <TableCell className="text-right">{row.uploads}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">No geography data available</div>
              )}
            </div>
          </ChartWrapper>
        ))}
      </div>
    </DashboardLayout>
  );
}
