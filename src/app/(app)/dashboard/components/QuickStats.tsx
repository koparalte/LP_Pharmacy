
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, AlertTriangle, PackageCheck, PackageX } from "lucide-react";
import type { ReportData } from "@/lib/types";

interface QuickStatsProps {
  data: ReportData;
}

export function QuickStats({ data }: QuickStatsProps) {
  const stats = [
    { title: "Total Unique Items", value: data.totalUniqueItems, icon: Package, color: "text-primary" },
    { title: "Items In Stock", value: data.itemsInStockCount, icon: PackageCheck, color: "text-green-600" },
    { title: "Items Out of Stock", value: data.itemsOutOfStockCount, icon: PackageX, color: "text-red-500" },
    { title: "Total Inventory Value (at Rate)", value: `INR ₹${data.totalValue.toFixed(2)}`, icon: DollarSign, color: "text-accent" },
    { title: "Low Stock Alerts", value: data.lowStockItemsCount, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
