
"use client";

import type { InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, PlusCircle } from "lucide-react";

interface InventoryItemCardProps {
  item: InventoryItem;
  onAddItemToBill: (item: InventoryItem) => void;
  isOutOfStock: boolean;
}

export function InventoryItemCard({ item, onAddItemToBill, isOutOfStock }: InventoryItemCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          {item.name}
        </CardTitle>
        <CardDescription className="text-xs truncate h-4">{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <p className="text-sm">
          <span className="font-semibold">Price:</span> INR ₹{item.unitPrice.toFixed(2)}
        </p>
        <p className={`text-sm ${item.stock <= item.lowStockThreshold && item.stock > 0 ? 'text-orange-600' : item.stock === 0 ? 'text-destructive' : ''}`}>
          <span className="font-semibold">Stock:</span> {item.stock} units
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold">Category:</span> {item.category}
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => onAddItemToBill(item)} 
          className="w-full"
          disabled={isOutOfStock}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {isOutOfStock ? "Out of Stock" : "Add to Bill"}
        </Button>
      </CardFooter>
    </Card>
  );
}
