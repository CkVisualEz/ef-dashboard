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
import { MOCK_RECENT_QUERIES } from "@/lib/mockData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink } from "lucide-react";

export function RecentQueriesTable() {
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
              {MOCK_RECENT_QUERIES.map((query) => (
                <TableRow key={query.sessionId}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <div className="h-8 w-8 rounded overflow-hidden bg-muted">
                      <img src={query.thumbnail} alt="Upload" className="h-full w-full object-cover" />
                    </div>
                    <span className="font-mono text-xs">{query.sessionId}</span>
                  </TableCell>
                  <TableCell>{query.date}</TableCell>
                  <TableCell>{query.location}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      query.classification === "Carpet" 
                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                        : query.classification === "Hard Surface"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }>
                      {query.classification}
                    </Badge>
                  </TableCell>
                  <TableCell>{query.device}</TableCell>
                  <TableCell className="text-right font-semibold">{query.actions}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={query.status === "Completed" ? "default" : "secondary"}>
                      {query.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
