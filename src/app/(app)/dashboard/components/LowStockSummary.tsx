import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface LowStockSummaryProps {
  items: InventoryItem[];
}

export function LowStockSummary({ items }: LowStockSummaryProps) {
  const lowStockItems = items.filter(item => item.stock <= item.lowStockThreshold);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Summary
            </CardTitle>
            <CardDescription>Items that need reordering soon.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory?filter=low_stock">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {lowStockItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockItems.slice(0, 5).map((item) => ( // Show top 5
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link href={`/inventory/edit/${item.id}`} className="hover:underline">
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-destructive font-semibold">{item.stock}</TableCell>
                  <TableCell className="text-right">{item.lowStockThreshold}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No items are currently low on stock. Well done!</p>
        )}
      </CardContent>
    </Card>
  );
}
