
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import type { FinalizedBill } from "@/lib/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  customerName: z.string().min(1, { message: "Customer name cannot be empty." }).max(100),
  customerAddress: z.string().max(200).optional(),
  discountAmount: z.coerce.number().min(0, { message: "Discount cannot be negative." }),
  remarks: z.string().max(500).optional(),
  status: z.enum(["paid", "debt"], { required_error: "Bill status is required." }),
  paymentReceivedNow: z.coerce.number().min(0, "Payment amount cannot be negative.").optional(),
  paidInFull: z.boolean().optional(),
}).refine(data => {
  if (data.status === 'debt' && data.paidInFull && data.paymentReceivedNow && data.paymentReceivedNow > 0) {
    return false; 
  }
  return true;
}, {
  message: "Cannot check 'Paid in Full' and enter a 'Payment Received Now' simultaneously.",
  path: ["paidInFull"], 
});


export type EditBillFormValues = z.infer<typeof formSchema>;

interface EditBillFormProps {
  initialData: FinalizedBill;
  onFormSubmit: (data: EditBillFormValues) => Promise<void>;
  isLoading?: boolean;
  subTotal: number; 
}

export function EditBillForm({ initialData, onFormSubmit, isLoading = false, subTotal }: EditBillFormProps) {
  const router = useRouter();

  const form = useForm<EditBillFormValues>({
    resolver: zodResolver(formSchema.refine(data => data.discountAmount <= subTotal, {
        message: "Discount cannot be greater than the subtotal.",
        path: ["discountAmount"],
    })),
    defaultValues: {
      customerName: initialData.customerName || "",
      customerAddress: initialData.customerAddress || "",
      discountAmount: initialData.discountAmount || 0,
      remarks: initialData.remarks || "",
      status: initialData.status || "paid",
      paymentReceivedNow: undefined,
      paidInFull: false,
    },
  });

  useEffect(() => {
    form.reset({
      customerName: initialData.customerName,
      customerAddress: initialData.customerAddress,
      discountAmount: initialData.discountAmount,
      remarks: initialData.remarks,
      status: initialData.status,
      paymentReceivedNow: undefined,
      paidInFull: false,
    });
  }, [form, initialData]);

  const watchedDiscount = form.watch("discountAmount");
  const calculatedGrandTotal = Math.max(0, subTotal - (isNaN(watchedDiscount) ? 0 : watchedDiscount));
  
  const watchedPaymentReceivedNow = form.watch("paymentReceivedNow");
  const watchedPaidInFull = form.watch("paidInFull");
  const currentFormStatus = form.watch("status");

  const projectedRemainingBalance = useMemo(() => {
    if (initialData.status !== 'debt' && currentFormStatus !== 'debt') return 0;

    let currentPaid = initialData.amountActuallyPaid;
    let paymentNow = isNaN(parseFloat(String(watchedPaymentReceivedNow))) ? 0 : parseFloat(String(watchedPaymentReceivedNow));
    
    if (watchedPaidInFull) {
        return 0;
    }
    const newTotalPaid = currentPaid + paymentNow;
    const remaining = calculatedGrandTotal - newTotalPaid;
    return Math.max(0, remaining);

  }, [initialData, calculatedGrandTotal, watchedPaymentReceivedNow, watchedPaidInFull, currentFormStatus]);


  async function onSubmit(data: EditBillFormValues) {
    await onFormSubmit(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter customer name" {...field} />
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
                  <Input placeholder="Enter customer address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <FormField
                control={form.control}
                name="discountAmount"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Discount Amount (₹)</FormLabel>
                    <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} 
                        onChange={e => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? undefined : value);
                        }}
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Bill Status</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        if (value === 'paid') {
                            form.setValue('paymentReceivedNow', undefined);
                            form.setValue('paidInFull', false);
                        }
                    }} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select bill status" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="debt">Debt</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter any remarks for this bill" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {(initialData.status === 'debt' || currentFormStatus === 'debt') && (
            <Card className="p-4 bg-muted/30">
                <FormLabel className="text-base font-semibold">Debt Management</FormLabel>
                <Separator className="my-3" />
                <div className="space-y-4 text-sm">
                    <div className="flex justify-between">
                        <span>Original Amount Paid:</span>
                        <span className="font-medium">₹{initialData.amountActuallyPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Original Remaining Balance:</span>
                        <span className="font-medium">₹{initialData.remainingBalance.toFixed(2)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 items-end">
                    <FormField
                        control={form.control}
                        name="paymentReceivedNow"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Receive Payment Now (₹)</FormLabel>
                            <FormControl>
                            <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00" 
                                {...field} 
                                onChange={e => {
                                    const value = parseFloat(e.target.value);
                                    field.onChange(isNaN(value) ? undefined : value);
                                }}
                                disabled={watchedPaidInFull || currentFormStatus === 'paid'}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="paidInFull"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-card shadow-sm h-10">
                            <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked) {
                                      form.setValue('paymentReceivedNow', undefined);
                                    }
                                }}
                                disabled={(watchedPaymentReceivedNow || 0) > 0 || currentFormStatus === 'paid'}
                            />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal">
                                Mark as Paid in Full
                            </FormLabel>
                            </div>
                        </FormItem>
                        )}
                    />
                </div>
                { (watchedPaymentReceivedNow || watchedPaidInFull) && (
                     <div className="mt-3 text-sm flex justify-between font-medium text-primary">
                        <span>Projected New Remaining Balance:</span>
                        <span>₹{projectedRemainingBalance.toFixed(2)}</span>
                    </div>
                )}
                 <FormMessage>
                    {form.formState.errors.paidInFull?.message}
                </FormMessage>
            </Card>
        )}
        
        <div className="p-4 border rounded-md bg-muted/50 space-y-2 text-sm mt-6">
            <div className="flex justify-between">
                <span>Subtotal (Original):</span>
                <span className="font-medium">₹{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
                <span>New Discount:</span>
                <span className="font-medium">₹{(form.getValues("discountAmount") || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
                <span>New Grand Total:</span>
                <span className="font-bold">₹{calculatedGrandTotal.toFixed(2)}</span>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
            {(form.formState.isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Bill
          </Button>
        </div>
      </form>
    </Form>
  );
}

