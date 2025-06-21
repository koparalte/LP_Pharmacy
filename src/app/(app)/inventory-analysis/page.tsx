
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileClock, PackageSearch, Trash2 } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import type { InventoryMovement, DailyMovementLog } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clearAllDailyMovementLogs } from "@/lib/inventoryLogService";
import { useAuth } from "@/hooks/useAuth";


const MOVEMENT_HISTORY_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const DAYS_TO_LOAD_INITIALLY = 7; 
const DAYS_TO_LOAD_MORE = 7; 

export default function InventoryAnalysisPage() {
  const [allMovements, setAllMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [lastFetchedMovements, setLastFetchedMovements] = useState<number | null>(null);
  const { toast } = useToast();
  const [oldestDocDateLoaded, setOldestDocDateLoaded] = useState<Date | null>(null);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [isClearingLog, setIsClearingLog] = useState(false);
  const { isAdmin, loading: authLoading } = useAuth();

  const fetchDailyLogs = useCallback(async (startDate: Date, isInitialLoad: boolean = false) => {
    setLoadingMovements(true);
    let newFetchedMovements: InventoryMovement[] = [];
    let processedOldestDate: Date | null = startDate;

    try {
      const dateStringsToFetch: string[] = [];
      for (let i = 0; i < (isInitialLoad ? DAYS_TO_LOAD_INITIALLY : DAYS_TO_LOAD_MORE); i++) {
          const dateToFetch = subDays(startDate, i); 
          dateStringsToFetch.push(format(dateToFetch, "yyyy-MM-dd"));
          if (i === (isInitialLoad ? DAYS_TO_LOAD_INITIALLY : DAYS_TO_LOAD_MORE) - 1) {
            processedOldestDate = dateToFetch;
          }
      }
      
      if (dateStringsToFetch.length === 0) {
        setCanLoadMore(false);
        setLoadingMovements(false);
        return { fetchedMovements: [], oldestDate: startDate };
      }

      const dailyLogsCollection = collection(db, "dailyMovementLogs");
      const q = query(dailyLogsCollection, where("id", "in", dateStringsToFetch), orderBy("id", "desc"));
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(docSnap => {
        const dailyLog = docSnap.data() as DailyMovementLog;
        newFetchedMovements.push(...(dailyLog.movements || []));
      });

      if (snapshot.docs.length < dateStringsToFetch.length) {
         setCanLoadMore(false);
      }
      
      if (snapshot.empty && !isInitialLoad) { 
        setCanLoadMore(false);
      }

    } catch (error) {
      console.error("Error fetching daily movement logs: ", error);
      toast({ title: "Error", description: "Could not load movement history.", variant: "destructive" });
    } finally {
      // setLoadingMovements(false); is handled by the calling functions
    }
    return { fetchedMovements: newFetchedMovements, oldestDate: processedOldestDate };
  }, [toast]);


  const loadInitialMovements = useCallback(async () => {
    if (lastFetchedMovements && (Date.now() - lastFetchedMovements < MOVEMENT_HISTORY_STALE_TIME)) {
      setLoadingMovements(false);
      return;
    }
    setLoadingMovements(true);
    const today = new Date();
    const { fetchedMovements, oldestDate } = await fetchDailyLogs(today, true); 
    
    const sortedMovements = fetchedMovements.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    setAllMovements(sortedMovements);
    setOldestDocDateLoaded(oldestDate);
    setLastFetchedMovements(Date.now());
    if (fetchedMovements.length === 0) setCanLoadMore(false);
    else if (fetchedMovements.length < DAYS_TO_LOAD_INITIALLY) setCanLoadMore(false); 
    setLoadingMovements(false);
  }, [fetchDailyLogs, lastFetchedMovements]);

  useEffect(() => {
    loadInitialMovements();
  }, [loadInitialMovements]);

  const handleLoadMore = async () => {
    if (!oldestDocDateLoaded || !canLoadMore || loadingMovements) return;
    setLoadingMovements(true);
    
    const dayBeforeOldest = subDays(oldestDocDateLoaded, 1);
    const { fetchedMovements, oldestDate: newOldestDate } = await fetchDailyLogs(dayBeforeOldest, false);

    if (fetchedMovements.length > 0) {
      setAllMovements(prevMovements => 
        [...prevMovements, ...fetchedMovements].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      );
      setOldestDocDateLoaded(newOldestDate);
    } else {
      setCanLoadMore(false); 
    }
    setLoadingMovements(false);
  };


  const formatDateForDisplay = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      if (dateString.includes('T')) {
        return format(parseISO(dateString), "PPp"); 
      }
      return format(parseISO(dateString + "T00:00:00"), "PPP"); 
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

  const handleClearLogConfirm = async () => {
    setIsClearingLog(true);
    try {
      await clearAllDailyMovementLogs();
      setAllMovements([]);
      setOldestDocDateLoaded(null);
      setLastFetchedMovements(null);
      setCanLoadMore(true); 
      toast({
        title: "Log Cleared",
        description: "All inventory movement logs have been deleted.",
      });
    } catch (error) {
      console.error("Error clearing logs:", error);
      toast({
        title: "Error Clearing Log",
        description: "Could not clear inventory movement logs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearingLog(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <FileClock className="mr-3 h-8 w-8 text-primary" />
          Inventory Movement Log
        </h1>
        {!authLoading && isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={allMovements.length === 0 || loadingMovements || isClearingLog}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Logs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  inventory movement logs from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isClearingLog}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearLogConfirm}
                  disabled={isClearingLog}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isClearingLog ? "Clearing..." : "Yes, delete all logs"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
          <CardDescription>Automatically recorded stock movements. Logs are grouped by day.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-400px)]"> 
            {loadingMovements && allMovements.length === 0 ? ( 
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : allMovements.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recorded At</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason / Details</TableHead>
                    <TableHead>Moved By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMovements.map((movement) => (
                    <TableRow key={movement.eventId}>
                      <TableCell className="text-xs">{formatDateForDisplay(movement.recordedAt)}</TableCell>
                      <TableCell>{movement.itemName}</TableCell>
                      <TableCell className={`text-center font-medium ${movement.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                        {movement.type.toUpperCase()}
                      </TableCell>
                      <TableCell className="text-right">{movement.quantity}</TableCell>
                      <TableCell className="text-sm">{getSourceDisplay(movement.source)}</TableCell>
                      <TableCell className="text-xs">{movement.reason || 'N/A'}</TableCell>
                      <TableCell className="text-xs">{movement.movedByUserName || 'System'}</TableCell>
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
          {canLoadMore && allMovements.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Button onClick={handleLoadMore} disabled={loadingMovements || isClearingLog}>
                {loadingMovements ? "Loading..." : "Load More Movements"}
              </Button>
            </div>
          )}
           {!canLoadMore && allMovements.length > 0 && !loadingMovements && (
            <p className="mt-4 text-center text-muted-foreground">No more movements to load.</p>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
