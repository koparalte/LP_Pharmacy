
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CashoutForm } from "./components/CashoutForm";
import { CashoutHistoryTable } from "./components/CashoutHistoryTable";
import type { CashoutTransaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = 'lpPharmacyCashoutHistory';

export default function CashoutPage() {
  const [transactions, setTransactions] = useState<CashoutTransaction[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedTransactions = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTransactions) {
      try {
        setTransactions(JSON.parse(storedTransactions));
      } catch (e) {
        console.error("Failed to parse cashout transactions from localStorage", e);
        setTransactions([]);
      }
    }
  }, []);

  const saveTransactions = (updatedTransactions: CashoutTransaction[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTransactions));
    setTransactions(updatedTransactions);
  };

  const handleFormSubmit = async (data: Omit<CashoutTransaction, 'id' | 'status' | 'date'>) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newTransaction: CashoutTransaction = {
      ...data,
      id: String(Date.now()),
      status: 'Pending', // Default status for new requests
      date: new Date().toISOString(),
    };

    const updatedTransactions = [...transactions, newTransaction];
    saveTransactions(updatedTransactions);

    toast({
      title: "Cashout Requested",
      description: `Your request for ₹${data.amount.toFixed(2)} has been submitted.`,
    });
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Cashout</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Request New Cashout</CardTitle>
          <CardDescription>Submit a request to withdraw funds.</CardDescription>
        </CardHeader>
        <CardContent>
          <CashoutForm onFormSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cashout History</CardTitle>
          <CardDescription>View your past cashout transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <CashoutHistoryTable transactions={transactions} />
        </CardContent>
      </Card>
    </div>
  );
}
