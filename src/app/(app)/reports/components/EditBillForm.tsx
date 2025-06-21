
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FinalizedBill } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";

const formSchema = z.object({
  customerName: z.string().min(2, "Customer name is required."),
  customerAddress: z.string().optional(),
  remarks: z.string().optional(),
  status: z.enum(["paid", "debt"]),
  discountAmount: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().min(0, "Discount must be a positive number.").optional()
  ),
  paymentReceivedNow: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().min(0, "Payment must be a positive number.").optional()
  ),
  paidInFull: z.boolean().optional(),
}).refine(data => {
    // Cannot have both a partial payment and mark as paid in full
    return !(data.paidInFull && data.paymentReceivedNow && data.paymentReceivedNow > 0);
}, {
    message: "Cannot specify a payment amount if 'Paid in Full' is checked.",
    path: ["paymentReceivedNow"],
});


export type EditBillFormValues = z.infer<typeof formSchema>;

interface EditBillFormProps {
  initialData: FinalizedBill;
  onFormSubmit: (data: EditBillFormValues, billData: FinalizedBill) => Promise<void>;
  isLoading?: boolean;
}

export function EditBillForm({ initialData, onFormSubmit, isLoading = false }: EditBillFormProps) {
  const router = useRouter();

  const form = useForm<EditBillFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: initialData.customerName,
      customerAddress: initialData.customerAddress || "",
      remarks: initialData.remarks || "",
      status: initialData.status,
      discountAmount: initialData.discountAmount || undefined,
      paymentReceivedNow: undefined,
      paidInFull: false,
    },
  });

  const watchedDiscount = form.watch("discountAmount");
  const watchedPaymentReceived = form.watch("paymentReceivedNow");
  const watchedPaidInFull = form.watch("paidInFull");
  const currentFormStatus = form.watch("status");

  const projectedRemainingBalance = useMemo(() => {
    if (initialData.status !== 'debt' && currentFormStatus !== 'debt') return 0;

    const subTotal = initialData.subTotal;
    const discount = watchedDiscount || 0;
    const paymentNow = watchedPaymentReceived || 0;

    const grandTotal = subTotal - discount;

    if (watchedPaidInFull) {
        return 0;
    }
    
    if (currentFormStatus === 'paid') {
      return 0;
    }

    const totalPaid = (initialData.amountActuallyPaid || 0) + paymentNow;
    const newBalance = grandTotal - totalPaid;
    
    return newBalance < 0 ? 0 : newBalance;
  }, [initialData, watchedDiscount, watchedPaymentReceived, watchedPaidInFull, currentFormStatus]);


  useEffect(() => {
    const isPaidInFull = form.getValues("paidInFull");
    const paymentInput = document.getElementById("paymentReceivedNow") as HTMLInputElement;
    if (paymentInput) {
      paymentInput.disabled = !!isPaidInFull;
      if(isPaidInFull) {
        form.setValue("paymentReceivedNow", undefined, { shouldValidate: true });
      }
    }
  }, [watchedPaidInFull, form]);

  async function onSubmit(data: EditBillFormValues) {
    await onFormSubmit(data, initialData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
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
                  <Input placeholder="123 Main St" {...field} />
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
                <FormItem>
                <FormLabel>Bill Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <FormDescription>Set the payment status of the bill.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
        />

        {(initialData.status === 'debt' || currentFormStatus === 'debt') && (
            <Card className="p-4 bg-muted/30">
                <FormLabel className="text-base font-semibold">Debt Management</FormLabel>
                <Separator className="my-3" />
                <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="font-medium text-muted-foreground">Original Subtotal:</span><span className="text-right">₹{initialData.subTotal.toFixed(2)}</span>
                        <span className="font-medium text-muted-foreground">Amount Originally Paid:</span><span className="text-right">₹{(initialData.amountActuallyPaid || 0).toFixed(2)}</span>
                        <span className="font-medium text-muted-foreground">Original Remaining Balance:</span><span className="text-right font-semibold">₹{(initialData.remainingBalance || 0).toFixed(2)}</span>
                    </div>

                    <FormField
                        control={form.control}
                        name="paymentReceivedNow"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Payment Received Now (₹)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" id="paymentReceivedNow" placeholder="0.00" {...field} disabled={watchedPaidInFull} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="paidInFull"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-background">
                            <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if(checked) form.setValue("paymentReceivedNow", undefined, { shouldValidate: true });
                                }}
                            />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                            <FormLabel>
                                Mark as Paid in Full
                            </FormLabel>
                            <FormDescription>
                                This will clear the entire remaining balance and mark the bill as 'paid'.
                            </FormDescription>
                            </div>
                        </FormItem>
                        )}
                    />
                    <div className="p-3 bg-primary/10 rounded-md text-right">
                        <p className="text-base font-semibold">Projected New Remaining Balance: <span className="text-lg">₹{projectedRemainingBalance.toFixed(2)}</span></p>
                    </div>
                </div>
            </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
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
