"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import type { BillInProgressItem } from "@/lib/types";
import { useMemo } from "react";

const formSchema = z.object({
  customerName: z.string().optional(),
  customerAddress: z.string().optional(),
  remarks: z.string().optional(),
  discountAmount: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().min(0, "Discount must be a positive number.").optional()
  ),
  status: z.enum(["paid", "debt"], {
    required_error: "You need to select a payment status.",
  }),
  amountPaid: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().min(0, "Amount paid must be a positive number.").optional()
  ),
});


export type BillFinalizationFormValues = z.infer<typeof formSchema>;

interface BillFinalizationProps {
  billItems: BillInProgressItem[];
  subTotal: number;
  onFinalize: (data: BillFinalizationFormValues, grandTotal: number, remainingBalance: number, amountActuallyPaid: number) => Promise<void>;
  isProcessing: boolean;
}

export function BillFinalization({ billItems, subTotal, onFinalize, isProcessing }: BillFinalizationProps) {
  
  const form = useForm<BillFinalizationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerAddress: "",
      remarks: "",
      discountAmount: undefined,
      status: "paid",
      amountPaid: undefined,
    },
  });

  const watchedDiscount = form.watch("discountAmount");
  const watchedStatus = form.watch("status");
  const watchedAmountPaid = form.watch("amountPaid");

  const grandTotal = useMemo(() => {
    const discount = watchedDiscount || 0;
    const calculatedTotal = subTotal - discount;
    return calculatedTotal > 0 ? calculatedTotal : 0;
  }, [subTotal, watchedDiscount]);

  const { amountActuallyPaid, remainingBalance } = useMemo(() => {
    if (watchedStatus === 'paid') {
      // If status is 'paid', they are paying the full grand total for this transaction.
      return { amountActuallyPaid: grandTotal, remainingBalance: 0 };
    }
    // For 'debt' status, calculate based on the amount being paid right now.
    const paidAmount = Number(watchedAmountPaid) || 0;
    return { amountActuallyPaid: paidAmount, remainingBalance: grandTotal - paidAmount };
  }, [grandTotal, watchedStatus, watchedAmountPaid]);

  async function onSubmit(data: BillFinalizationFormValues) {
    if (data.discountAmount && data.discountAmount > subTotal) {
        form.setError("discountAmount", { type: "manual", message: "Discount cannot be greater than subtotal." });
        return;
    }
     if (data.status === 'debt' && data.amountPaid && data.amountPaid >= grandTotal) {
        form.setError("amountPaid", { type: "manual", message: "For 'Debt', amount paid must be less than the grand total. If paying in full, please select 'Paid'." });
        return;
    }
    await onFinalize(data, grandTotal, remainingBalance, amountActuallyPaid);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Customer Name (Optional)</FormLabel>
                    <FormControl>
                    <Input placeholder="Walk-in Customer" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="customerAddress"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Customer Address (Optional)</FormLabel>
                    <FormControl>
                    <Input placeholder="123 Main St, Anytown" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        
        <FormField
            control={form.control}
            name="discountAmount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Discount Amount (₹)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Paid via UPI" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Payment Status</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="paid" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Paid
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="debt" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Debt (Partial/No Payment)
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedStatus === 'debt' && (
             <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount Paid Now (₹)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Enter the amount the customer is paying now. Can be zero.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}


        <div className="p-4 border-t text-right space-y-2">
            <p className="text-lg">Subtotal: <span className="font-semibold">₹{subTotal.toFixed(2)}</span></p>
            <p className="text-lg">Grand Total (After Discount): <span className="font-bold text-xl">₹{grandTotal.toFixed(2)}</span></p>
             {watchedStatus === 'debt' && (
                <p className="text-lg text-destructive">Remaining Balance: <span className="font-bold">₹{remainingBalance.toFixed(2)}</span></p>
            )}
        </div>

        <Button type="submit" className="w-full text-lg py-6" disabled={isProcessing || billItems.length === 0}>
            {isProcessing ? (
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            ) : (
             "Finalize Bill"
            )}
        </Button>
      </form>
    </Form>
  );
}
