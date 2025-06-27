
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import type { FinalizedBill } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { TrendingUp } from "lucide-react";

interface SalesData {
  period: string;
  totalSales: number;
  totalProfit: number;
}

const ANALYTICS_BILLS_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const BILLS_FETCH_LIMIT = 500; // Performance cap


/**
 * Calculates the recognized sales and profit for a bill based on the amount paid.
 * Sales are equal to the amount actually paid.
 * Profit is recognized proportionally to the amount paid relative to the grand total.
 */
function getRecognizedValuesForBill(bill: FinalizedBill) {
    const sales = bill.amountActuallyPaid;
    
    const totalProfitForBill = bill.items.reduce((itemSum, item) => {
        const itemProfit = (item.mrp - item.rate) * item.quantityInBill;
        return itemSum + itemProfit;
    }, 0);

    const recognizedProfit = bill.grandTotal > 0
      ? totalProfitForBill * (bill.amountActuallyPaid / bill.grandTotal)
      : 0;

    return { sales, profit: recognizedProfit };
}


export default function SalesAnalyticsPage() {
  const [finalizedBills, setFinalizedBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const [lastFetchedAnalyticsBills, setLastFetchedAnalyticsBills] = useState<number | null>(null);

  const fetchFinalizedBills = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && lastFetchedAnalyticsBills && (Date.now() - lastFetchedAnalyticsBills < ANALYTICS_BILLS_STALE_TIME)) {
        setLoading(false); 
        return;
    }
    setLoading(true);
    try {
      const billsCollection = collection(db, "finalizedBills");
      const q = query(billsCollection, orderBy("date", "desc"), limit(BILLS_FETCH_LIMIT));
      const querySnapshot = await getDocs(q);
      const billsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            billNumber: doc.id,
            ...data,
        } as FinalizedBill;
      });
      setFinalizedBills(billsList);
      setLastFetchedAnalyticsBills(Date.now());
    } catch (error) {
      console.error("Error fetching finalized bills: ", error);
      toast({
        title: "Error Fetching Sales Data",
        description: "Could not load sales transactions. This might be due to a missing database index. Please check the browser console for a link to create it.",
        variant: "destructive",
      });
      setFinalizedBills([]);
      setLastFetchedAnalyticsBills(null);
    } finally {
      setLoading(false);
    }
  }, [toast, lastFetchedAnalyticsBills]);

  useEffect(() => {
    fetchFinalizedBills();
  }, [fetchFinalizedBills]);

  const aggregateDataByPeriod = useCallback((
    bills: FinalizedBill[],
    periodType: "daily" | "weekly" | "monthly"
  ): SalesData[] => {
    const aggregated: { [key: string]: { totalSales: number; totalProfit: number; rawDate: Date } } = {};

    bills.forEach(bill => {
      const billDate = parseISO(bill.date);
      let periodKey: string;

      if (periodType === "daily") {
        periodKey = format(billDate, "yyyy-MM-dd");
      } else if (periodType === "weekly") {
        const weekStart = startOfWeek(billDate, { weekStartsOn: 1 }); // Monday
        periodKey = format(weekStart, "yyyy-MM-dd");
      } else { // monthly
        const monthStart = startOfMonth(billDate);
        periodKey = format(monthStart, "yyyy-MM");
      }

      if (!aggregated[periodKey]) {
        aggregated[periodKey] = {
          totalSales: 0,
          totalProfit: 0,
          rawDate: periodType === 'daily' ? billDate : (periodType === 'weekly' ? startOfWeek(billDate, {weekStartsOn: 1}) : startOfMonth(billDate))
        };
      }
      
      const { sales, profit } = getRecognizedValuesForBill(bill);
      aggregated[periodKey].totalSales += sales;
      aggregated[periodKey].totalProfit += profit;
    });

    return Object.entries(aggregated)
      .map(([key, data]) => {
         let displayPeriodResolved: string;
         if (periodType === "daily") displayPeriodResolved = format(data.rawDate, "PPP");
         else if (periodType === "weekly") displayPeriodResolved = `Week of ${format(data.rawDate, "MMM d, yyyy")}`;
         else displayPeriodResolved = format(data.rawDate, "MMMM yyyy");

        return {
            period: displayPeriodResolved,
            totalSales: data.totalSales,
            totalProfit: data.totalProfit,
            rawDate: data.rawDate,
        };
      })
      .sort((a,b) => b.rawDate.getTime() - a.rawDate.getTime())
      .map(({rawDate, ...rest}) => rest);
  }, []);


  const dailySalesData = useMemo(() => aggregateDataByPeriod(finalizedBills, "daily"), [finalizedBills, aggregateDataByPeriod]);
  const weeklySalesData = useMemo(() => aggregateDataByPeriod(finalizedBills, "weekly"), [finalizedBills, aggregateDataByPeriod]);
  const monthlySalesData = useMemo(() => aggregateDataByPeriod(finalizedBills, "monthly"), [finalizedBills, aggregateDataByPeriod]);

  const SummaryCard = ({ title, sales, profit }: { title: string, sales: number, profit: number }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">Sales (Paid): INR ₹{sales.toFixed(2)}</p>
        {isAdmin && <p className="text-xl text-green-600">Profit (Recognized): INR ₹{profit.toFixed(2)}</p>}
      </CardContent>
    </Card>
  );

  const today = new Date();
  
  const calculatePerformance = (filteredBills: FinalizedBill[]) => {
    return filteredBills.reduce((acc, bill) => {
      const { sales, profit } = getRecognizedValuesForBill(bill);
      acc.sales += sales;
      acc.profit += profit;
      return acc;
    }, { sales: 0, profit: 0 });
  };
  
  const todaySales = useMemo(() => calculatePerformance(
      finalizedBills.filter(bill => format(parseISO(bill.date), "yyyy-MM-dd") === format(today, "yyyy-MM-dd"))
    ), [finalizedBills, today]);

  const thisWeekSales = useMemo(() => calculatePerformance(
      finalizedBills.filter(bill => isWithinInterval(parseISO(bill.date), { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) }))
    ), [finalizedBills, today]);

  const thisMonthSales = useMemo(() => calculatePerformance(
      finalizedBills.filter(bill => format(parseISO(bill.date), "yyyy-MM") === format(startOfMonth(today), "yyyy-MM"))
    ), [finalizedBills, today]);


  const renderSalesDataTable = (data: SalesData[], caption: string) => {
    if ((loading || authLoading) && data.length === 0) { 
      return (
        <div className="space-y-2 pt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }
    if (data.length === 0 && !(loading || authLoading)) {
      return <p className="text-muted-foreground pt-4">No sales data for this period.</p>;
    }
    return (
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Total Sales (Paid) (₹)</TableHead>
            {isAdmin && <TableHead className="text-right">Total Profit (Recognized) (₹)</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry) => (
            <TableRow key={entry.period}>
              <TableCell>{entry.period}</TableCell>
              <TableCell className="text-right">INR ₹{entry.totalSales.toFixed(2)}</TableCell>
              {isAdmin && <TableCell className="text-right text-green-600">INR ₹{entry.totalProfit.toFixed(2)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <TrendingUp className="mr-3 h-8 w-8 text-primary" />
          Sales Analytics
        </h1>
      </div>

      {(loading || authLoading) && !finalizedBills.length ? ( 
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
         <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard title="Today's Performance" sales={todaySales.sales} profit={todaySales.profit} />
            <SummaryCard title="This Week's Performance" sales={thisWeekSales.sales} profit={thisWeekSales.profit} />
            <SummaryCard title="This Month's Performance" sales={thisMonthSales.sales} profit={thisMonthSales.profit} />
          </div>
      )}


      <Card>
        <CardHeader>
          <CardTitle>Sales & Profit Breakdown</CardTitle>
          <CardDescription>View amounts paid{isAdmin ? " and recognized profit" : ""} aggregated by different time periods. Analysis is based on the last {BILLS_FETCH_LIMIT} transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4">
              {renderSalesDataTable(dailySalesData, "Daily paid sales and recognized profit figures.")}
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
              {renderSalesDataTable(weeklySalesData, "Weekly paid sales and recognized profit figures.")}
            </TabsContent>
            <TabsContent value="monthly" className="mt-4">
              {renderSalesDataTable(monthlySalesData, "Monthly paid sales and recognized profit figures.")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
