
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { FinalizedBill } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, subMonths, subWeeks, subDays } from "date-fns";
import { TrendingUp } from "lucide-react";

interface SalesData {
  period: string;
  totalSales: number;
  totalProfit: number;
}

export default function SalesAnalyticsPage() {
  const [finalizedBills, setFinalizedBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFinalizedBills = useCallback(async () => {
    setLoading(true);
    try {
      const billsCollection = collection(db, "finalizedBills");
      const q = query(billsCollection, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const billsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as FinalizedBill));
      setFinalizedBills(billsList);
    } catch (error) {
      console.error("Error fetching finalized bills: ", error);
      toast({
        title: "Error Fetching Sales Data",
        description: "Could not load sales transactions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFinalizedBills();
  }, [fetchFinalizedBills]);

  const calculateProfitAndSales = (bills: FinalizedBill[]): SalesData[] => {
    const aggregatedData: { [key: string]: { totalSales: number; totalProfit: number } } = {};

    bills.forEach(bill => {
      const billDate = parseISO(bill.date);
      const periodKey = format(billDate, "yyyy-MM-dd"); // For daily aggregation

      if (!aggregatedData[periodKey]) {
        aggregatedData[periodKey] = { totalSales: 0, totalProfit: 0 };
      }

      const salesForBill = bill.grandTotal;
      const costOfGoodsSold = bill.items.reduce((sum, item) => {
        // Fallback to 0 if costPrice is somehow missing, though it should be there.
        const cost = item.costPrice || 0; 
        return sum + item.quantityInBill * cost;
      }, 0);
      const profitForBill = salesForBill - costOfGoodsSold;

      aggregatedData[periodKey].totalSales += salesForBill;
      aggregatedData[periodKey].totalProfit += profitForBill;
    });

    return Object.entries(aggregatedData).map(([period, data]) => ({
      period,
      ...data,
    })).sort((a,b) => b.period.localeCompare(a.period)); // Sort descending by date
  };
  
  const aggregateDataByPeriod = (
    bills: FinalizedBill[], 
    periodType: "daily" | "weekly" | "monthly"
  ): SalesData[] => {
    const aggregated: { [key: string]: { totalSales: number; totalProfit: number; rawDate: Date } } = {};

    bills.forEach(bill => {
      const billDate = parseISO(bill.date);
      let periodKey: string;
      let displayPeriod: string;

      if (periodType === "daily") {
        periodKey = format(billDate, "yyyy-MM-dd");
        displayPeriod = format(billDate, "PPP"); // e.g., Jun 20, 2024
      } else if (periodType === "weekly") {
        const weekStart = startOfWeek(billDate, { weekStartsOn: 1 }); // Monday
        periodKey = format(weekStart, "yyyy-MM-dd"); // Key by week start date
        displayPeriod = `Week of ${format(weekStart, "MMM d, yyyy")}`;
      } else { // monthly
        const monthStart = startOfMonth(billDate);
        periodKey = format(monthStart, "yyyy-MM"); // Key by YYYY-MM
        displayPeriod = format(monthStart, "MMMM yyyy");
      }

      if (!aggregated[periodKey]) {
        aggregated[periodKey] = { totalSales: 0, totalProfit: 0, rawDate: periodType === 'daily' ? billDate : (periodType === 'weekly' ? startOfWeek(billDate, {weekStartsOn: 1}) : startOfMonth(billDate)) };
      }

      const salesForBill = bill.grandTotal;
      const costOfGoodsSold = bill.items.reduce((sum, item) => (sum + item.quantityInBill * (item.costPrice || 0)), 0);
      const profitForBill = salesForBill - costOfGoodsSold;

      aggregated[periodKey].totalSales += salesForBill;
      aggregated[periodKey].totalProfit += profitForBill;
      // We store displayPeriod with the key, so we'll reconstruct it from `rawDate` later
    });

    return Object.entries(aggregated)
      .map(([key, data]) => {
         let displayPeriodResolved: string;
         if (periodType === "daily") displayPeriodResolved = format(data.rawDate, "PPP");
         else if (periodType === "weekly") displayPeriodResolved = `Week of ${format(data.rawDate, "MMM d, yyyy")}`;
         else displayPeriodResolved = format(data.rawDate, "MMMM yyyy");
        
        return {
            period: displayPeriodResolved, // Use the display format
            totalSales: data.totalSales,
            totalProfit: data.totalProfit,
            rawDate: data.rawDate, // Keep rawDate for sorting
        };
      })
      .sort((a,b) => b.rawDate.getTime() - a.rawDate.getTime()) // Sort by actual date descending
      .map(({rawDate, ...rest}) => rest); // Remove rawDate from final output objects
  };


  const dailySalesData = useMemo(() => aggregateDataByPeriod(finalizedBills, "daily"), [finalizedBills]);
  const weeklySalesData = useMemo(() => aggregateDataByPeriod(finalizedBills, "weekly"), [finalizedBills]);
  const monthlySalesData = useMemo(() => aggregateDataByPeriod(finalizedBills, "monthly"), [finalizedBills]);
  
  const SummaryCard = ({ title, sales, profit }: { title: string, sales: number, profit: number }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">Sales: ₹{sales.toFixed(2)}</p>
        <p className="text-xl text-green-600">Profit: ₹{profit.toFixed(2)}</p>
      </CardContent>
    </Card>
  );

  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentMonthStart = startOfMonth(today);

  const todaySales = finalizedBills
    .filter(bill => format(parseISO(bill.date), "yyyy-MM-dd") === format(today, "yyyy-MM-dd"))
    .reduce((acc, bill) => {
      const sales = bill.grandTotal;
      const cogs = bill.items.reduce((s, i) => s + i.quantityInBill * (i.costPrice || 0), 0);
      acc.sales += sales;
      acc.profit += sales - cogs;
      return acc;
    }, { sales: 0, profit: 0 });

  const thisWeekSales = finalizedBills
    .filter(bill => isWithinInterval(parseISO(bill.date), { start: currentWeekStart, end: endOfWeek(today, { weekStartsOn: 1 }) }))
    .reduce((acc, bill) => {
      const sales = bill.grandTotal;
      const cogs = bill.items.reduce((s, i) => s + i.quantityInBill * (i.costPrice || 0), 0);
      acc.sales += sales;
      acc.profit += sales - cogs;
      return acc;
    }, { sales: 0, profit: 0 });

  const thisMonthSales = finalizedBills
    .filter(bill => format(parseISO(bill.date), "yyyy-MM") === format(currentMonthStart, "yyyy-MM"))
    .reduce((acc, bill) => {
      const sales = bill.grandTotal;
      const cogs = bill.items.reduce((s, i) => s + i.quantityInBill * (i.costPrice || 0), 0);
      acc.sales += sales;
      acc.profit += sales - cogs;
      return acc;
    }, { sales: 0, profit: 0 });


  const renderSalesDataTable = (data: SalesData[], caption: string) => {
    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }
    if (data.length === 0) {
      return <p className="text-muted-foreground">No sales data for this period.</p>;
    }
    return (
      <Table>
        <caption>{caption}</caption>
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
              <TableCell className="text-right">₹{entry.totalSales.toFixed(2)}</TableCell>
              <TableCell className="text-right">₹{entry.totalProfit.toFixed(2)}</TableCell>
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

      {loading ? (
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
          <CardDescription>View sales and profit data aggregated by different time periods.</CardDescription>
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
