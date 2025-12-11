import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { StatCard } from "@/components/dashboard/StatCard";
import { MOCK_CATEGORY } from "@/lib/mockData";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar
} from 'recharts';

export default function CategoryComparison() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Category Comparison</h1>
        <p className="text-muted-foreground mt-1">
          Carpet vs Hard Surface performance analysis.
        </p>
      </div>

      <FilterBar />

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {MOCK_CATEGORY.kpis.map((kpi, i) => (
          <StatCard key={i} data={kpi} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <ChartWrapper title="Category Trends" description="Upload volume by surface type over time">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_CATEGORY.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="carpet" name="Carpet" stroke="var(--color-chart-4)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="hardSurface" name="Hard Surface" stroke="var(--color-chart-5)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>

        <ChartWrapper title="Conversion by Category" description="Clicks vs Uploads">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_CATEGORY.conversion}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} cursor={{fill: 'hsl(var(--muted))'}} />
                <Legend />
                <Bar dataKey="uploads" name="Uploads (Indexed)" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicks" name="Clicks (Indexed)" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
