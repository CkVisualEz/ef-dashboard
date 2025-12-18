import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}

export function ChartWrapper({ title, description, children, className, headerRight }: ChartWrapperProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {headerRight && <div>{headerRight}</div>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
