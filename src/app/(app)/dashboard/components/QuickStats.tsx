import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, AlertTriangle } from "lucide-react";
import type { ReportData } from "@/lib/types";

interface QuickStatsProps {
  data: ReportData;
}

export function QuickStats({ data }: QuickStatsProps) {
  const stats = [
    { title: "Total Items", value: data.totalItems, icon: Package, color: "text-primary" },
    { title: "Total Inventory Value", value: `$${data.totalValue.toFixed(2)}`, icon: DollarSign, color: "text-accent" },
    { title: "Low Stock Items", value: data.lowStockItemsCount, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
