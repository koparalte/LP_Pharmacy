
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
import { Loader2 } from "lucide-react";
import type { CashoutTransaction } from "@/lib/types";

const paymentMethods = ["Bank Transfer", "UPI", "PayTM Wallet", "Other"];

const formSchema = z.object({
  amount: z.coerce.number().min(1, { message: "Amount must be at least ₹1." }),
  method: z.string().min(1, { message: "Please select a payment method." }),
  notes: z.string().max(200, { message: "Notes cannot exceed 200 characters." }).optional(),
});

type CashoutFormValues = z.infer<typeof formSchema>;

interface CashoutFormProps {
  onFormSubmit: (data: Omit<CashoutTransaction, 'id' | 'status' | 'date'>) => Promise<void>;
  isSubmitting: boolean;
}

export function CashoutForm({ onFormSubmit, isSubmitting }: CashoutFormProps) {
  const form = useForm<CashoutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      method: "",
      notes: "",
    },
  });

  async function onSubmit(data: CashoutFormValues) {
    await onFormSubmit(data);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (₹)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 5000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payment method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Reason for cashout, reference number" {...field} rows={3} />
              </FormControl>
              <FormDescription>Any additional information for this cashout request.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Request Cashout
          </Button>
        </div>
      </form>
    </Form>
  );
}
