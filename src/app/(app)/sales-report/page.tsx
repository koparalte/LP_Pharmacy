
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";

export default function SalesReportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Sales Report</h1>
      <Card>
        <CardHeader>
          <CardTitle>Sales Data Overview</CardTitle>
          <CardDescription>
            Detailed sales analytics and trends will be displayed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
          <Image
            src="https://placehold.co/600x300.png"
            alt="Placeholder for sales report chart"
            width={600}
            height={300}
            className="rounded-md object-cover"
            data-ai-hint="sales chart graph"
          />
          <p className="mt-4 text-muted-foreground">
            Sales report functionality is under development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
