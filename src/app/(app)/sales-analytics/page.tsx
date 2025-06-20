
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"; // Import limit
import type { FinalizedBill } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
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

export default function SalesAnalyticsPage() {
  const [finalizedBills, setFinalizedBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [lastFetchedAnalyticsBills, setLastFetchedAnalyticsBills] = useState<number | null>(null);

  const fetchFinalizedBills = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && lastFetchedAnalyticsBills && (Date.now() - lastFetchedAnalyticsBills < ANALYTICS_BILLS_STALE_TIME)) {
        setLoading(false); 
        return;
    }
    setLoading(true);
    try {
      const billsCollection = collection(db, "finalizedBills");
      const q = query(billsCollection, orderBy("date", "desc"), limit(BILLS_FETCH_LIMIT)); // Add limit
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

      // Sales are based on item.mrp (which is the selling price)
      const salesForBill = bill.items.reduce((sum, item) => sum + (item.mrp * item.quantityInBill), 0);
      
      // Profit is (MRP_selling_price - Rate_cost_price) * Quantity for each item
      const profitForBill = bill.items.reduce((sum, item) => {
        const itemProfitContribution = (item.mrp - item.rate) * item.quantityInBill;
        return sum + itemProfitContribution;
      }, 0);

      aggregated[periodKey].totalSales += salesForBill;
      aggregated[periodKey].totalProfit += profitForBill;
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
        <p className="text-2xl font-bold">Sales: INR ₹{sales.toFixed(2)}</p>
        <p className="text-xl text-green-600">Profit: INR ₹{profit.toFixed(2)}</p>
      </CardContent>
    </Card>
  );

  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentMonthStart = startOfMonth(today);

  const calculatePerformance = (filteredBills: FinalizedBill[]) => {
    return filteredBills.reduce((acc, bill) => {
      acc.sales += bill.items.reduce((itemSum, item) => itemSum + (item.mrp * item.quantityInBill), 0);
      acc.profit += bill.items.reduce((itemSum, item) => itemSum + (item.mrp - item.rate) * item.quantityInBill, 0);
      return acc;
    }, { sales: 0, profit: 0 });
  };
  
  const todaySales = useMemo(() => calculatePerformance(
      finalizedBills.filter(bill => format(parseISO(bill.date), "yyyy-MM-dd") === format(today, "yyyy-MM-dd"))
    ), [finalizedBills, today]);

  const thisWeekSales = useMemo(() => calculatePerformance(
      finalizedBills.filter(bill => isWithinInterval(parseISO(bill.date), { start: currentWeekStart, end: endOfWeek(today, { weekStartsOn: 1 }) }))
    ), [finalizedBills, currentWeekStart, today]);

  const thisMonthSales = useMemo(() => calculatePerformance(
      finalizedBills.filter(bill => format(parseISO(bill.date), "yyyy-MM") === format(currentMonthStart, "yyyy-MM"))
    ), [finalizedBills, currentMonthStart]);


  const renderSalesDataTable = (data: SalesData[], caption: string) => {
    if (loading && data.length === 0) { 
      return (
        <div className="space-y-2 pt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }
    if (data.length === 0 && !loading) {
      return <p className="text-muted-foreground pt-4">No sales data for this period.</p>;
    }
    return (
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Total Sales (₹)</TableHead>
            <TableHead className="text-right">Total Profit (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry) => (
            <TableRow key={entry.period}>
              <TableCell>{entry.period}</TableCell>
              <TableCell className="text-right">INR ₹{entry.totalSales.toFixed(2)}</TableCell>
              <TableCell className="text-right text-green-600">INR ₹{entry.totalProfit.toFixed(2)}</TableCell>
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

      {loading && !finalizedBills.length ? ( 
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
          <CardDescription>View sales and profit data aggregated by different time periods. Analysis is based on the last {BILLS_FETCH_LIMIT} transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4">
              {renderSalesDataTable(dailySalesData, "Daily sales and profit figures.")}
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
              {renderSalesDataTable(weeklySalesData, "Weekly sales and profit figures.")}
            </TabsContent>
            <TabsContent value="monthly" className="mt-4">
              {renderSalesDataTable(monthlySalesData, "Monthly sales and profit figures.")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
