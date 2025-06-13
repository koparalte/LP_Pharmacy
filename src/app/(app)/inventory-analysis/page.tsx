
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileClock, PackageSearch } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { InventoryMovement } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const MOVEMENT_HISTORY_STALE_TIME = 2 * 60 * 1000; // 2 minutes

export default function InventoryAnalysisPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [lastFetchedMovements, setLastFetchedMovements] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchMovements = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && lastFetchedMovements && (Date.now() - lastFetchedMovements < MOVEMENT_HISTORY_STALE_TIME)) {
      setLoadingMovements(false);
      return;
    }
    setLoadingMovements(true);
    try {
      const movementsCollection = collection(db, "inventoryMovements");
      const q = query(movementsCollection, orderBy("recordedAt", "desc")); // Show newest first
      const snapshot = await getDocs(q);
      const movementsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryMovement));
      setMovements(movementsList);
      setLastFetchedMovements(Date.now());
    } catch (error) {
      console.error("Error fetching inventory movements: ", error);
      toast({ title: "Error", description: "Could not load movement history.", variant: "destructive" });
      setMovements([]);
      setLastFetchedMovements(null);
    } finally {
      setLoadingMovements(false);
    }
  }, [toast, lastFetchedMovements]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const formatDateForDisplay = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      // Check if it's a full ISO string or just YYYY-MM-DD
      if (dateString.includes('T')) {
        return format(parseISO(dateString), "PPp"); // e.g., Aug 17, 2023, 5:30 PM
      }
      return format(parseISO(dateString + "T00:00:00"), "PPP"); // For YYYY-MM-DD, e.g., Aug 17, 2023
    } catch {
      return "Invalid Date";
    }
  };
  
  const getSourceDisplay = (source: InventoryMovement['source']) => {
    switch(source) {
      case 'initial_stock': return 'Initial Stock';
      case 'stock_edit': return 'Stock Edit';
      case 'sale': return 'Sale';
      case 'csv_import': return 'CSV Import';
      default: return source;
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <FileClock className="mr-3 h-8 w-8 text-primary" />
          Inventory Movement Log
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
          <CardDescription>Automatically recorded stock movements from inventory updates and sales.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)]"> {/* Adjusted height */}
            {loadingMovements ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : movements.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recorded At</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason / Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-xs">{formatDateForDisplay(movement.recordedAt)}</TableCell>
                      <TableCell>{movement.itemName}</TableCell>
                      <TableCell className={`text-center font-medium ${movement.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                        {movement.type.toUpperCase()}
                      </TableCell>
                      <TableCell className="text-right">{movement.quantity}</TableCell>
                      <TableCell className="text-sm">{getSourceDisplay(movement.source)}</TableCell>
                      <TableCell className="text-xs">{movement.reason || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12 h-full">
                  <PackageSearch className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Movements Recorded Yet</h3>
                  <p className="text-muted-foreground">
                      Stock movements from sales, new items, edits, and imports will appear here.
                  </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
