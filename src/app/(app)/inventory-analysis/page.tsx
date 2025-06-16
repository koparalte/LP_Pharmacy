
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileClock, PackageSearch } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import type { InventoryMovement, DailyMovementLog } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button"; // For Load More

const MOVEMENT_HISTORY_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const DAYS_TO_LOAD_INITIALLY = 7; // Load last 7 days initially
const DAYS_TO_LOAD_MORE = 7; // Load 7 more days when "Load More" is clicked

export default function InventoryAnalysisPage() {
  const [allMovements, setAllMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [lastFetchedMovements, setLastFetchedMovements] = useState<number | null>(null);
  const { toast } = useToast();
  const [oldestDocDateLoaded, setOldestDocDateLoaded] = useState<Date | null>(null);
  const [canLoadMore, setCanLoadMore] = useState(true);

  const fetchDailyLogs = useCallback(async (startDate: Date, endDate: Date, isInitialLoad: boolean = false) => {
    setLoadingMovements(true);
    let newFetchedMovements: InventoryMovement[] = [];
    let processedOldestDate: Date | null = startDate;

    try {
      const dateArray: string[] = [];
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dateArray.push(format(currentDate, "yyyy-MM-dd"));
        currentDate.setDate(currentDate.getDate() + 1); // This logic is for fetching a range, for "last N days" it's different.
      }
      
      // For fetching last N days, we need to query based on document IDs (which are dates)
      // Construct date strings for the period to fetch
      const dateStringsToFetch: string[] = [];
      for (let i = 0; i < (isInitialLoad ? DAYS_TO_LOAD_INITIALLY : DAYS_TO_LOAD_MORE); i++) {
          const dateToFetch = subDays(startDate, i); // startDate will be 'today' or 'oldestDocDateLoaded - 1 day'
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
      // Firestore 'in' query supports up to 30 elements, ensure we don't exceed this.
      // For simplicity, fetching one by one if it's many days, or adjust strategy.
      // Here, we'll fetch up to `DAYS_TO_LOAD_INITIALLY` or `DAYS_TO_LOAD_MORE` which is small.
      const q = query(dailyLogsCollection, where("id", "in", dateStringsToFetch), orderBy("id", "desc"));
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(docSnap => {
        const dailyLog = docSnap.data() as DailyMovementLog;
        newFetchedMovements.push(...(dailyLog.movements || []));
      });

      if (snapshot.docs.length < dateStringsToFetch.length) {
         // If we fetched fewer documents than requested days, we might have reached the beginning of logs
         setCanLoadMore(false);
      }
      
      if (snapshot.empty && !isInitialLoad) { // If load more fetches nothing
        setCanLoadMore(false);
      }


    } catch (error) {
      console.error("Error fetching daily movement logs: ", error);
      toast({ title: "Error", description: "Could not load movement history.", variant: "destructive" });
    } finally {
      setLoadingMovements(false);
    }
    return { fetchedMovements: newFetchedMovements, oldestDate: processedOldestDate };
  }, [toast]);


  const loadInitialMovements = useCallback(async () => {
    if (lastFetchedMovements && (Date.now() - lastFetchedMovements < MOVEMENT_HISTORY_STALE_TIME)) {
      setLoadingMovements(false);
      return;
    }
    const today = new Date();
    const { fetchedMovements, oldestDate } = await fetchDailyLogs(today, today, true); // endDate not really used this way for initial
    
    const sortedMovements = fetchedMovements.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    setAllMovements(sortedMovements);
    setOldestDocDateLoaded(oldestDate);
    setLastFetchedMovements(Date.now());
    if (fetchedMovements.length < DAYS_TO_LOAD_INITIALLY * (5) ) { // Heuristic: avg 5 movements/day
        // If initial load is sparse, maybe there's not much more data
        // This condition might need tuning based on typical data volume
    }

  }, [fetchDailyLogs, lastFetchedMovements]);

  useEffect(() => {
    loadInitialMovements();
  }, [loadInitialMovements]);

  const handleLoadMore = async () => {
    if (!oldestDocDateLoaded || !canLoadMore) return;
    setLoadingMovements(true);
    
    const dayBeforeOldest = subDays(oldestDocDateLoaded, 1);
    const { fetchedMovements, oldestDate: newOldestDate } = await fetchDailyLogs(dayBeforeOldest, dayBeforeOldest, false);

    if (fetchedMovements.length > 0) {
      setAllMovements(prevMovements => 
        [...prevMovements, ...fetchedMovements].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      );
      setOldestDocDateLoaded(newOldestDate);
    } else {
      setCanLoadMore(false); // No more data found
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
          <CardDescription>Automatically recorded stock movements. Logs are grouped by day.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-350px)]"> {/* Adjusted height for load more button */}
            {loadingMovements && allMovements.length === 0 ? ( // Show skeleton only on initial full load
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
              <Button onClick={handleLoadMore} disabled={loadingMovements}>
                {loadingMovements ? "Loading..." : "Load More Movements"}
              </Button>
            </div>
          )}
           {!canLoadMore && allMovements.length > 0 && (
            <p className="mt-4 text-center text-muted-foreground">No more movements to load.</p>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
