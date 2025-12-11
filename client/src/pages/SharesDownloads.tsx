import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { StatCard } from "@/components/dashboard/StatCard";
import { MOCK_SHARES } from "@/lib/mockData";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function SharesDownloads() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Shares & Downloads</h1>
        <p className="text-muted-foreground mt-1">
          Social engagement and save metrics.
        </p>
      </div>

      <FilterBar />

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {MOCK_SHARES.kpis.map((kpi, i) => (
          <StatCard key={i} data={kpi} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-1 mb-8">
        <ChartWrapper title="Engagement by Device" description="Shares vs Downloads breakdown">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_SHARES.shareByDevice}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} cursor={{fill: 'hsl(var(--muted))'}} />
                <Legend />
                <Bar dataKey="shares" name="Shares" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="downloads" name="Downloads" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
