
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
});

export type EditBillFormValues = z.infer<typeof formSchema>;

interface EditBillFormProps {
  initialData: FinalizedBill;
  onFormSubmit: (data: EditBillFormValues) => Promise<void>;
  isLoading?: boolean;
  subTotal: number; // To validate discount against
}

export function EditBillForm({ initialData, onFormSubmit, isLoading = false, subTotal }: EditBillFormProps) {
  const router = useRouter();
  const [currentDiscount, setCurrentDiscount] = useState(initialData.discountAmount);
  const [currentStatus, setCurrentStatus] = useState(initialData.status);

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
    },
  });

  useEffect(() => {
    form.reset({
      customerName: initialData.customerName,
      customerAddress: initialData.customerAddress,
      discountAmount: initialData.discountAmount,
      remarks: initialData.remarks,
      status: initialData.status,
    });
    setCurrentDiscount(initialData.discountAmount);
    setCurrentStatus(initialData.status);
  }, [form, initialData]);

  const watchedDiscount = form.watch("discountAmount");
  const calculatedGrandTotal = Math.max(0, subTotal - (isNaN(watchedDiscount) ? 0 : watchedDiscount));

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
                            field.onChange(value);
                            if (!isNaN(value)) setCurrentDiscount(value); else setCurrentDiscount(0);
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
                        setCurrentStatus(value as "paid" | "debt");
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
        
        <div className="p-4 border rounded-md bg-muted/50 space-y-2 text-sm">
            <div className="flex justify-between">
                <span>Subtotal:</span>
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
