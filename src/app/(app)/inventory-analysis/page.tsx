
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Loader2, PackageSearch, FileClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, runTransaction, query, orderBy, addDoc } from "firebase/firestore";
import type { InventoryItem, InventoryMovement } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const movementFormSchema = z.object({
  itemId: z.string().min(1, { message: "Please select an item." }),
  type: z.enum(["in", "out"], { required_error: "Please select movement type." }),
  quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1." }),
  movementDate: z.date({ required_error: "Movement date is required." }),
  reason: z.string().max(200, { message: "Reason cannot exceed 200 characters." }).optional(),
});

type MovementFormValues = z.infer<typeof movementFormSchema>;

const MOVEMENT_HISTORY_STALE_TIME = 2 * 60 * 1000; // 2 minutes

export default function InventoryAnalysisPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFetchedMovements, setLastFetchedMovements] = useState<number | null>(null);

  const { toast } = useToast();

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      itemId: "",
      type: "in",
      quantity: 1,
      movementDate: new Date(),
      reason: "",
    },
  });

  const fetchInventoryForSelect = useCallback(async () => {
    setLoadingInventory(true);
    try {
      const inventoryCollection = collection(db, "inventory");
      const q = query(inventoryCollection, orderBy("name"));
      const snapshot = await getDocs(q);
      const itemsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventoryItems(itemsList);
    } catch (error) {
      console.error("Error fetching inventory for select: ", error);
      toast({ title: "Error", description: "Could not load inventory items for selection.", variant: "destructive" });
    } finally {
      setLoadingInventory(false);
    }
  }, [toast]);

  const fetchMovements = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && lastFetchedMovements && (Date.now() - lastFetchedMovements < MOVEMENT_HISTORY_STALE_TIME)) {
      setLoadingMovements(false);
      return;
    }
    setLoadingMovements(true);
    try {
      const movementsCollection = collection(db, "inventoryMovements");
      const q = query(movementsCollection, orderBy("recordedAt", "desc")); // Show newest first
      const snapshot = await getDocs(q);
      const movementsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryMovement));
      setMovements(movementsList);
      setLastFetchedMovements(Date.now());
    } catch (error) {
      console.error("Error fetching inventory movements: ", error);
      toast({ title: "Error", description: "Could not load movement history.", variant: "destructive" });
    } finally {
      setLoadingMovements(false);
    }
  }, [toast, lastFetchedMovements]);

  useEffect(() => {
    fetchInventoryForSelect();
    fetchMovements();
  }, [fetchInventoryForSelect, fetchMovements]);

  const onSubmit = async (data: MovementFormValues) => {
    setIsSubmitting(true);
    const selectedItem = inventoryItems.find(item => item.id === data.itemId);
    if (!selectedItem) {
      toast({ title: "Error", description: "Selected item not found.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const itemDocRef = doc(db, "inventory", data.itemId);
        const itemDoc = await transaction.get(itemDocRef);

        if (!itemDoc.exists()) {
          throw new Error("Inventory item not found in database.");
        }
        const currentItemData = itemDoc.data() as InventoryItem;
        let newStock = currentItemData.stock;

        if (data.type === "in") {
          newStock += data.quantity;
        } else { // type === "out"
          if (currentItemData.stock < data.quantity) {
            // Allow stock to go negative but show a warning toast.
            // Strict control can be added later if business rules require it.
            toast({
              title: "Warning: Stock Low",
              description: `${selectedItem.name} stock will become negative. Current: ${currentItemData.stock}, Out: ${data.quantity}.`,
              variant: "default", 
            });
          }
          newStock -= data.quantity;
        }
        
        transaction.update(itemDocRef, { 
          stock: newStock, 
          lastUpdated: new Date().toISOString() 
        });

        const newMovementRef = doc(collection(db, "inventoryMovements"));
        transaction.set(newMovementRef, {
          itemId: data.itemId,
          itemName: selectedItem.name,
          type: data.type,
          quantity: data.quantity,
          movementDate: format(data.movementDate, "yyyy-MM-dd"),
          reason: data.reason || "",
          recordedAt: new Date().toISOString(),
        });
      });

      toast({
        title: "Movement Recorded",
        description: `Stock for ${selectedItem.name} updated and movement logged.`,
      });
      form.reset({ itemId: "", type: "in", quantity: 1, movementDate: new Date(), reason: "" });
      fetchMovements(true); // Force refresh of movements
      // also update local inventory items for immediate reflection in select if needed, or rely on next full fetch
       setInventoryItems(prevItems => prevItems.map(it => it.id === data.itemId ? {...it, stock: it.stock + (data.type === 'in' ? data.quantity : -data.quantity)} : it ));


    } catch (error: any) {
      console.error("Error recording movement: ", error);
      toast({ title: "Error Recording Movement", description: error.message || "Could not process the movement.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatDateForDisplay = (dateString: string) => {
    try {
      if (dateString.length === 10) { // YYYY-MM-DD
         return format(parseISO(dateString + "T00:00:00"), "PPP"); // Add time part for parseISO
      }
      return format(parseISO(dateString), "PPp"); // For full ISO strings
    } catch {
      return "Invalid Date";
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <FileClock className="mr-3 h-8 w-8 text-primary" />
          Inventory Movement Analysis
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Record Stock Movement</CardTitle>
            <CardDescription>Log manual stock adjustments, new arrivals, or disposals.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="itemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory Item</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={loadingInventory}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingInventory ? "Loading items..." : "Select an item"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {inventoryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} (Current Stock: {item.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Movement Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="in" />
                            </FormControl>
                            <FormLabel className="font-normal">Stock In</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="out" />
                            </FormControl>
                            <FormLabel className="font-normal">Stock Out</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} min="1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="movementDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Movement Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Received new shipment, Stock take adjustment" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting || loadingInventory} className="w-full">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Movement
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Movement History</CardTitle>
            <CardDescription>Recent stock movements recorded.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-350px)]">
              {loadingMovements ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : movements.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="text-xs">{formatDateForDisplay(movement.movementDate)}</TableCell>
                        <TableCell>{movement.itemName}</TableCell>
                        <TableCell className={`text-center font-medium ${movement.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                          {movement.type.toUpperCase()}
                        </TableCell>
                        <TableCell className="text-right">{movement.quantity}</TableCell>
                        <TableCell className="text-xs">{movement.reason || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12 h-full">
                    <PackageSearch className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Movements Recorded</h3>
                    <p className="text-muted-foreground">
                        Use the form to record stock changes.
                    </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

