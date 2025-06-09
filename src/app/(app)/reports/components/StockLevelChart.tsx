"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { StockByCategory } from "@/lib/types";

const chartConfig = {
  stock: {
    label: "Stock Count",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

interface StockLevelChartProps {
  data: StockByCategory[];
}

export function StockLevelChart({ data }: StockLevelChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels by Category</CardTitle>
          <CardDescription>Visual representation of item counts per category.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available to display chart.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Levels by Category</CardTitle>
        <CardDescription>Visual representation of item counts per category.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="category" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={60} 
              />
              <YAxis allowDecimals={false} />
              <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="count" fill="var(--color-stock)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
