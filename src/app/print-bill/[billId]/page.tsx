
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FinalizedBill, BillItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

// Helper function to format date
const formatDateForPrint = (dateString: string) => {
  try {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'});
  } catch (e) {
    return dateString;
  }
};

export default function PrintBillPage() {
  const params = useParams();
  const billId = params.billId as string;
  const [bill, setBill] = useState<FinalizedBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (billId) {
      const fetchBill = async () => {
        setLoading(true);
        setError(null);
        try {
          const billDocRef = doc(db, 'finalizedBills', billId);
          const billDocSnap = await getDoc(billDocRef);

          if (billDocSnap.exists()) {
            setBill({ id: billDocSnap.id, ...billDocSnap.data() } as FinalizedBill);
          } else {
            setError('Bill not found.');
          }
        } catch (e) {
          console.error("Error fetching bill for printing: ", e);
          setError('Failed to load bill data.');
        } finally {
          setLoading(false);
        }
      };
      fetchBill();
    } else {
      setError('No bill ID provided.');
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    if (bill && !loading && !error) {
      const timer = setTimeout(() => {
        window.print();
        // Optional: window.onafterprint = () => window.close();
      }, 500); // Delay to ensure content is rendered
      return () => clearTimeout(timer);
    }
  }, [bill, loading, error]);

  if (loading) {
    return (
      <div className="p-8 print-force-styles">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-2" />
        <Skeleton className="h-6 w-1/3 mb-8" />
        <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="h-12 w-1/2 ml-auto mt-8" />
        <p className="text-center mt-4 text-muted-foreground text-sm">Loading bill for printing...</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-600 font-semibold text-lg">{error}</div>;
  }

  if (!bill) {
    return <div className="p-8 text-center text-muted-foreground text-lg">Bill data could not be loaded.</div>;
  }

  return (
    <div id="printable-bill-content" className="print-force-styles">
      <div className="print-header">
        <h2 className="text-xl font-bold">LP PHARMACY</h2>
        <p className="text-sm">Venglai, Lunglei</p>
        <p className="text-sm">Phone : 8118969532</p>
      </div>

      <div className="print-customer-details">
        <p><strong>Bill ID:</strong> {bill.id}</p>
        <p><strong>Date:</strong> {formatDateForPrint(bill.date)}</p>
        <p><strong>Customer Name:</strong> {bill.customerName}</p>
        <p><strong>Address:</strong> {bill.customerAddress || 'N/A'}</p>
        <p><strong>Status:</strong> {bill.status ? bill.status.charAt(0).toUpperCase() + bill.status.slice(1) : 'Unknown'}</p>
      </div>

      <table className="print-items-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Batch No.</th>
            <th className="text-center">Qty</th>
            <th className="text-right">MRP (₹)</th>
            <th className="text-right">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item: BillItem, index: number) => (
            <tr key={`print-item-${index}-${item.id || index}`}>
              <td>{item.name}</td>
              <td>{item.batchNo || 'N/A'}</td>
              <td className="text-center">{item.quantityInBill}</td>
              <td className="text-right">₹{item.mrp.toFixed(2)}</td>
              <td className="text-right">₹{(item.mrp * item.quantityInBill).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-totals">
          <p>Subtotal: INR ₹{bill.subTotal?.toFixed(2) ?? '0.00'}</p>
          <p>Discount: INR ₹{bill.discountAmount?.toFixed(2) ?? '0.00'}</p>
          <p className="font-semibold text-base">Grand Total: INR ₹{bill.grandTotal.toFixed(2)}</p>
          <p>Amount Paid: INR ₹{(bill.amountActuallyPaid || 0).toFixed(2)}</p>
          <p className="font-medium">Remaining Balance: INR ₹{(bill.remainingBalance || 0).toFixed(2)}</p>
      </div>
      <div className="print-footer">
          <p>Thank you for your visit!</p>
      </div>
    </div>
  );
}
