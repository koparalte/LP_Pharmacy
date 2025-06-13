
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import type { InventoryItem } from "@/lib/types";
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100),
  batchNo: z.string().max(50).optional(),
  unit: z.string().max(30).optional().describe("e.g., strips, bottle, pcs"),
  stock: z.coerce.number().int().min(0, { message: "Stock cannot be negative." }),
  lowStockThreshold: z.coerce.number().int().min(0, { message: "Threshold cannot be negative." }),
  costPrice: z.coerce.number().min(0.01, { message: "Cost price must be at least 0.01."}),
  rate: z.coerce.number().min(0.01, { message: "Rate must be at least 0.01." }),
  mrp: z.coerce.number().min(0.01, { message: "MRP must be at least 0.01." }),
  expiryDate: z.date().optional(),
  stockAdjustment: z.coerce.number().int().optional(), 
}).refine(data => data.mrp >= data.rate, {
  message: "MRP should be greater than or equal to Rate.",
  path: ["mrp"],
}).refine(data => data.rate >= data.costPrice, {
  message: "Rate should be greater than or equal to Cost Price.",
  path: ["rate"],
});

export type AddItemFormValues = z.infer<typeof formSchema>;

interface AddItemFormProps {
  initialData?: InventoryItem;
  isEditMode?: boolean;
  onFormSubmit: (data: AddItemFormValues, originalItem?: InventoryItem) => Promise<void>;
  isLoading?: boolean;
}

export function AddItemForm({ initialData, isEditMode = false, onFormSubmit, isLoading = false }: AddItemFormProps) {
  const router = useRouter();

  const form = useForm<AddItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      batchNo: "",
      unit: "",
      stock: 0,
      lowStockThreshold: 10,
      costPrice: 0,
      rate: 0,
      mrp: 0,
      expiryDate: undefined,
      stockAdjustment: 0,
    },
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset({
        ...initialData,
        expiryDate: initialData.expiryDate ? new Date(initialData.expiryDate) : undefined,
        stockAdjustment: 0, 
      });
    }
  }, [form, isEditMode, initialData]);

  async function onSubmit(data: AddItemFormValues) {
    await onFormSubmit(data, initialData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Amoxicillin 250mg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="batchNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch No. (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., BATCH123XYZ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., strips, bottle, pcs" {...field} />
                  </FormControl>
                  <FormDescription>Specify the unit of measurement.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiry Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal", 
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().toDateString()) || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
           <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Price (₹)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormDescription>The purchase price of the item.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate (₹)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormDescription>Actual selling price.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mrp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MRP (₹)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormDescription>Maximum Retail Price.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isEditMode ? "Current Stock" : "Initial Stock Quantity"}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} readOnly={isEditMode} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {isEditMode && (
             <FormField
                control={form.control}
                name="stockAdjustment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjust Stock By (+/-)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormDescription>Enter positive to add, negative to subtract.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
          )}
          <FormField
            control={form.control}
            name="lowStockThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Low Stock Threshold</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="10" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
            {(form.formState.isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update Item" : "Add Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
