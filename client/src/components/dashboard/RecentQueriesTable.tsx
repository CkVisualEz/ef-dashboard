import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchRecentQueries } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function RecentQueriesTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['recent-queries'],
    queryFn: fetchRecentQueries,
  });

  const queries = data?.queries || [];

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Top Recent Queries (High Engagement)</CardTitle>
          <CardDescription>Loading recent sessions...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Top Recent Queries (High Engagement)</CardTitle>
        <CardDescription>
          Recent sessions with more than 5 user actions (uploads, clicks, shares).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Device</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queries.length > 0 ? queries.map((query: any) => (
                <TableRow key={query.sessionId}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <div className="h-8 w-8 rounded overflow-hidden bg-muted">
                      {query.userImage ? (
                        <img src={query.userImage} alt="Upload" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500" />
                      )}
                    </div>
                    <span className="font-mono text-xs">{query.sessionId}</span>
                  </TableCell>
                  <TableCell>{format(new Date(query.createdAt), "MMM dd, HH:mm")}</TableCell>
                  <TableCell>{query.userLocation || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      query.classification === "carpet" 
                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                        : query.classification === "hard_surface"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }>
                      {query.classification}
                    </Badge>
                  </TableCell>
                  <TableCell>{query.deviceType || 'Unknown'}</TableCell>
                  <TableCell className="text-right font-semibold">{query.actions}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={query.segmentation_success ? "default" : "secondary"}>
                      {query.segmentation_success ? "Success" : "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No high-engagement queries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
