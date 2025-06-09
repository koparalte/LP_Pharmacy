
"use client";

import { useState, useEffect, useCallback } from "react";
import type { FinalizedBill } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinalizedBillsTable } from "./components/FinalizedBillsTable";
import { FileText } from "lucide-react";

const FINALIZED_BILLS_STORAGE_KEY = 'lpPharmacyFinalizedBills';

export default function SalesReportPage() {
  const [finalizedBills, setFinalizedBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBills = useCallback(() => {
    const storedBillsRaw = localStorage.getItem(FINALIZED_BILLS_STORAGE_KEY);
    let parsedBills: FinalizedBill[] = [];
    if (storedBillsRaw) {
      try {
        parsedBills = JSON.parse(storedBillsRaw);
        if (!Array.isArray(parsedBills)) { 
          parsedBills = [];
        }
      } catch (e) {
        console.error("Failed to parse finalized bills from localStorage", e);
        parsedBills = []; 
      }
    }
    // Sort bills by date, most recent first
    parsedBills.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setFinalizedBills(parsedBills);
  }, []);

  useEffect(() => {
    loadBills();
    setLoading(false);
  }, [loadBills]);

  const handleBillUpdate = useCallback((updatedBills: FinalizedBill[]) => {
    // The updatedBills from child is already sorted and from localStorage.
    setFinalizedBills(updatedBills);
  }, []);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Sales Report</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Finalized Bills
          </CardTitle>
          <CardDescription>
            Review all completed sales transactions. Customer details can be edited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading sales data...</p>
          ) : (
            <FinalizedBillsTable bills={finalizedBills} onBillUpdate={handleBillUpdate} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
