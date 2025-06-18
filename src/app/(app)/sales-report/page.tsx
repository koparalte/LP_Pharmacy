
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart } from "lucide-react";

export default function SalesReportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Sales Report</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-6 w-6 text-destructive" />
            Module Temporarily Disabled
          </CardTitle>
          <CardDescription>
            The Sales Report module is currently disabled. It will be re-enabled in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please check back later or contact support if you have any questions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
