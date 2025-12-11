import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { RecentQueriesTable } from "@/components/dashboard/RecentQueriesTable";
import { MOCK_OVERVIEW } from "@/lib/mockData";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function Overview() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Performance summary for EF Color Match dashboard.
        </p>
      </div>

      <FilterBar />

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        {MOCK_OVERVIEW.kpis.map((kpi, i) => (
          <StatCard key={i} data={kpi} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mb-8">
        {/* Main Trend Chart */}
        <ChartWrapper 
          title="Upload Trends" 
          description="Daily upload volume by surface type"
          className="col-span-4"
        >
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_OVERVIEW.uploadsTrend}>
                <defs>
                  <linearGradient id="colorCarpet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value}`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Legend verticalAlign="top" height={36}/>
                <Area 
                  type="monotone" 
                  dataKey="carpet" 
                  name="Carpet"
                  stroke="var(--color-chart-1)" 
                  fillOpacity={1} 
                  fill="url(#colorCarpet)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="hardSurface" 
                  name="Hard Surface"
                  stroke="var(--color-chart-2)" 
                  fillOpacity={1} 
                  fill="url(#colorHard)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>

        {/* Device Split */}
        <ChartWrapper 
          title="Device Breakdown" 
          description="User sessions by device type"
          className="col-span-3"
        >
          <div className="h-[350px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_OVERVIEW.deviceSplit}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {MOCK_OVERVIEW.deviceSplit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                   itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>
      </div>

      <div className="mb-8">
        <RecentQueriesTable />
      </div>
    </DashboardLayout>
  );
}
