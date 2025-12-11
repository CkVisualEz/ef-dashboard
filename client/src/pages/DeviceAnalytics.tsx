import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { MOCK_OVERVIEW } from "@/lib/mockData"; // Reusing device split
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

export default function DeviceAnalytics() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Device Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Mobile vs Desktop usage and behavior.
        </p>
      </div>

      <FilterBar />

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <ChartWrapper title="Device Split" description="Session distribution">
          <div className="h-[350px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_OVERVIEW.deviceSplit}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                   {MOCK_OVERVIEW.deviceSplit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>

        <ChartWrapper title="Conversion by Device" description="Click rate comparison">
           <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Mobile", rate: 62 },
                { name: "Desktop", rate: 45 },
                { name: "Tablet", rate: 51 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} cursor={{fill: 'hsl(var(--muted))'}} />
                <Bar dataKey="rate" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
