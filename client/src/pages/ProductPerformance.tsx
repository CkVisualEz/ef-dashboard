import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ChartWrapper } from "@/components/dashboard/ChartWrapper";
import { MOCK_PRODUCTS } from "@/lib/mockData";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProductPerformance() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Product Performance</h1>
        <p className="text-muted-foreground mt-1">
          SKU-level analysis and ranking metrics.
        </p>
      </div>

      <FilterBar />

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <ChartWrapper title="Rank Distribution" description="% of clicks by rank position" className="col-span-1">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_PRODUCTS.rankDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} cursor={{fill: 'hsl(var(--muted))'}} />
                <Bar dataKey="value" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]}>
                  {MOCK_PRODUCTS.rankDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-chart-${(index % 5) + 1})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>

        <ChartWrapper title="Top Performing SKUs" description="Highest click-through rates" className="col-span-2">
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Avg Rank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_PRODUCTS.topSkus.map((sku) => (
                <TableRow key={sku.id}>
                  <TableCell className="font-medium">{sku.id}</TableCell>
                  <TableCell>{sku.name}</TableCell>
                  <TableCell>{sku.category}</TableCell>
                  <TableCell className="text-right">{sku.clicks}</TableCell>
                  <TableCell className="text-right text-green-600 font-medium">{sku.ctr}</TableCell>
                  <TableCell className="text-right">{sku.rank}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartWrapper>
      </div>
    </DashboardLayout>
  );
}
