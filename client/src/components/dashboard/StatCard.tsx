import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { KPI } from "@/lib/mockData";

interface StatCardProps {
  data: KPI;
  hideComparison?: boolean; // Option to hide "vs last period" text
}

export function StatCard({ data, hideComparison = false }: StatCardProps) {
  const isPositive = data.trend === 'up';
  const isNeutral = data.trend === 'neutral';
  
  // Custom logic: for "rank", "down" (lower number) is usually better, but let's stick to the prop 'trend'
  // If the data represents something where "up" is good (users, revenue), use green.
  // If "down" is bad, red. 
  // Let's assume the mock data handles the "trend" string correctly (up = green/good, down = red/bad)
  
  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-card/50">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {data.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">
          {data.value}
          {data.suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{data.suffix}</span>}
        </div>
        {!hideComparison && (
          <div className="flex items-center mt-1 text-xs">
            <span 
              className={cn(
                "flex items-center font-medium",
                isPositive ? "text-emerald-600" : isNeutral ? "text-muted-foreground" : "text-destructive"
              )}
            >
              {isPositive ? <ArrowUp className="h-3 w-3 mr-1" /> : isNeutral ? <ArrowRight className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
              {Math.abs(data.change)}%
            </span>
            <span className="text-muted-foreground ml-2">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
