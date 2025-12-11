import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { StatCard } from "@/components/dashboard/StatCard";
import { MOCK_RETURNING } from "@/lib/mockData";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar
} from 'recharts';

export default function ReturningUsers() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Returning Users</h1>
        <p className="text-muted-foreground mt-1">
          Loyalty and stickiness metrics.
        </p>
      </div>

      <FilterBar />

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {MOCK_RETURNING.kpis.map((kpi, i) => (
          <StatCard key={i} data={kpi} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <ChartWrapper title="Retention Trend" description="New vs Returning Users over time">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_RETURNING.retentionTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="newUsers" name="New Users" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="returningUsers" name="Returning Users" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>

        <ChartWrapper title="Upload Frequency" description="Distribution of uploads per user">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_RETURNING.frequencyDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} cursor={{fill: 'hsl(var(--muted))'}} />
                <Bar dataKey="value" fill="var(--color-chart-3)" radius={[0, 4, 4, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
