
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
import { useEffect, useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100),
  batchNo: z.string().max(50).optional(),
  unit: z.string().max(30).optional().describe("e.g., strips, bottle, pcs"),
  stock: z.coerce.number().int().min(0, { message: "Stock cannot be negative." }),
  lowStockThreshold: z.coerce.number().int().min(0, { message: "Threshold cannot be negative." }),
  rate: z.coerce.number().min(0.01, { message: "Rate (Cost Price) must be at least 0.01."}),
  mrp: z.coerce.number().min(0.01, { message: "MRP (Selling Price) must be at least 0.01." }),
  expiryDate: z.date().optional(),
  stockAdjustment: z.coerce.number().int().optional(), 
}).refine(data => data.mrp >= data.rate, {
  message: "MRP (Selling Price) should be greater than or equal to Rate (Cost Price).",
  path: ["mrp"],
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
  const [expiryPopoverOpen, setExpiryPopoverOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const firstDayOfCurrentMonth = new Date(currentYear, new Date().getMonth(), 1);
  firstDayOfCurrentMonth.setHours(0,0,0,0);


  const form = useForm<AddItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      batchNo: "",
      unit: "",
      stock: 0,
      lowStockThreshold: 10,
      rate: 0, // Cost price
      mrp: 0,  // Selling Price
      expiryDate: undefined,
      stockAdjustment: 0,
    },
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset({
        ...initialData,
        rate: initialData.rate, 
        mrp: initialData.mrp,
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
                  <FormLabel>Expiry Month/Year (Optional)</FormLabel>
                  <Popover open={expiryPopoverOpen} onOpenChange={setExpiryPopoverOpen}>
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
                            format(field.value, "MMMM yyyy")
                          ) : (
                            <span>Pick month & year</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setExpiryPopoverOpen(false);
                        }}
                        disabled={(date) => {
                           const day = new Date(date); 
                           day.setHours(0,0,0,0); 
                           return day < firstDayOfCurrentMonth;
                        }}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={currentYear}
                        toYear={currentYear + 15}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Select the month and year of expiry.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
           <FormField
            control={form.control}
            name="rate" 
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate (Cost Price) (₹)</FormLabel>
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
            name="mrp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MRP (Selling Price) (₹)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormDescription>Maximum Retail Price, also the selling price.</FormDescription>
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
