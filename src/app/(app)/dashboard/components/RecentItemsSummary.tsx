
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock } from "lucide-react";
import { format, parseISO } from "date-fns";

interface RecentItemsSummaryProps {
  items: InventoryItem[];
}

export function RecentItemsSummary({ items }: RecentItemsSummaryProps) {
  // Sort items by lastUpdated in descending order and take top 5
  const recentItems = [...items]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 5);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "PPp"); // e.g., Aug 17, 2023, 5:30 PM
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recently Updated Items
            </CardTitle>
            <CardDescription>Top 5 most recently added or updated items.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory">View All Inventory</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-right">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{formatDate(item.lastUpdated)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No inventory items found or recently updated.</p>
        )}
      </CardContent>
    </Card>
  );
}
