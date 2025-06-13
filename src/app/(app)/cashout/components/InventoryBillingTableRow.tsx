
"use client";

import type { InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";

interface InventoryBillingTableRowProps {
  item: InventoryItem;
  onAddItemToBill: (item: InventoryItem) => void;
  isOutOfStock: boolean;
  isMaxInBill: boolean;
}

export function InventoryBillingTableRow({ item, onAddItemToBill, isOutOfStock, isMaxInBill }: InventoryBillingTableRowProps) {
  const disabled = isOutOfStock || isMaxInBill;
  let buttonText = "Add to Bill";
  if (isOutOfStock) {
    buttonText = "Out of Stock";
  } else if (isMaxInBill) {
    buttonText = "Max in Bill";
  }

  return (
    <TableRow key={item.id} className={item.stock === 0 ? "opacity-50" : item.stock <= item.lowStockThreshold && item.stock > 0 ? "bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50" : ""}>
      <TableCell className="font-medium py-2">{item.name}</TableCell><TableCell className="text-right py-2">INR ₹{item.rate.toFixed(2)}</TableCell><TableCell className={`text-right py-2 ${item.stock <= item.lowStockThreshold && item.stock > 0 ? 'text-orange-600 font-semibold' : item.stock === 0 ? 'text-destructive font-semibold' : ''}`}>
        {item.stock}
      </TableCell><TableCell className="text-center py-2">
        <Button
          onClick={() => onAddItemToBill(item)}
          size="sm"
          variant="outline"
          disabled={disabled}
          className="text-xs"
        >
          <PlusCircle className="mr-1 h-3.5 w-3.5" />
          {buttonText}
        </Button>
      </TableCell>
    </TableRow>
  );
}
