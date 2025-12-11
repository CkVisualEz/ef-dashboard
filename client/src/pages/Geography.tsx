import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { MOCK_GEOGRAPHY } from "@/lib/mockData";
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Geography() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Geography</h1>
        <p className="text-muted-foreground mt-1">
          User location and regional performance.
        </p>
      </div>

      <FilterBar />

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <ChartWrapper title="Regional Distribution" description="Traffic by US Region">
          <div className="h-[350px] w-full flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_GEOGRAPHY.mapData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {MOCK_GEOGRAPHY.mapData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-chart-${index + 1})`} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>

        <ChartWrapper title="Top States" description="Highest volume states">
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Uploads</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_GEOGRAPHY.topStates.map((state) => (
                <TableRow key={state.state}>
                  <TableCell className="font-medium">{state.state}</TableCell>
                  <TableCell className="text-right">{state.users.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{state.uploads.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{state.clicks.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
