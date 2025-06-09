
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InventoryItem } from "@/lib/types";
import { Edit, Trash2, PackageSearch } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (itemId: string) => void;
}

export function InventoryTable({ items, onEdit, onDelete }: InventoryTableProps) {
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      onDelete(itemToDelete.id);
      setItemToDelete(null); 
    }
  };
  
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 border rounded-lg bg-card shadow-sm">
        <PackageSearch className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Inventory Items Found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or add new items to the inventory.</p>
      </div>
    );
  }

  return (
    <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setItemToDelete(null);
      }
    }}>
      <div className="border rounded-lg shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className={item.stock <= item.lowStockThreshold ? "bg-destructive/10 hover:bg-destructive/20" : ""}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.supplier}</TableCell>
                <TableCell className={`text-right font-semibold ${item.stock <= item.lowStockThreshold ? 'text-destructive' : ''}`}>
                  {item.stock}
                </TableCell>
                <TableCell className="text-right">INR ₹{item.unitPrice.toFixed(2)}</TableCell>
                <TableCell>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {item.tags.slice(0,3).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    {item.tags.length > 3 && <Badge variant="outline">+{item.tags.length - 3}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="mr-2 hover:text-primary">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)} className="hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {itemToDelete && (
        <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete "{itemToDelete.name}" from the inventory.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
