import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, AlertTriangle, ListChecks, CalendarClock } from "lucide-react";
import type { ReportData } from "@/lib/types"; // Assuming this might expand

interface ExtendedReportData extends ReportData {
  itemsExpiringSoon?: number; // Example of an additional metric
  categoriesCount?: number;
}

interface ReportSummaryProps {
  data: ExtendedReportData;
}

export function ReportSummary({ data }: ReportSummaryProps) {
  const summaries = [
    { title: "Total Unique Items", value: data.totalItems, icon: Package, details: "Count of distinct products." },
    { title: "Total Inventory Value", value: `$${data.totalValue.toFixed(2)}`, icon: DollarSign, details: "Estimated value of all stock." },
    { title: "Low Stock Alerts", value: data.lowStockItemsCount, icon: AlertTriangle, details: "Items below reorder threshold." },
    { title: "Items Expiring Soon", value: data.itemsExpiringSoon ?? 0, icon: CalendarClock, details: "Items expiring in next 30 days." },
    { title: "Number of Categories", value: data.categoriesCount ?? 0, icon: ListChecks, details: "Distinct product categories." },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {summaries.map((summary) => (
        <Card key={summary.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{summary.title}</CardTitle>
            <summary.icon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.value}</div>
            <p className="text-xs text-muted-foreground">{summary.details}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
