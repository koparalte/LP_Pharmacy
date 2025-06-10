
"use client";

import { Input } from "@/components/ui/input";
// Select components are removed as category/supplier filters are gone
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

interface InventoryFiltersProps {
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  // selectedCategory: string; // Removed
  // setSelectedCategory: Dispatch<SetStateAction<string>>; // Removed
  // selectedSupplier: string; // Removed
  // setSelectedSupplier: Dispatch<SetStateAction<string>>; // Removed
  // categories: string[]; // Removed
  // suppliers: string[]; // Removed
}

export function InventoryFilters({
  searchTerm,
  setSearchTerm,
}: InventoryFiltersProps) {

  const handleClearFilters = () => {
    setSearchTerm("");
    // setSelectedCategory("all"); // Removed
    // setSelectedSupplier("all"); // Removed
  };

  return (
    <div className="mb-6 p-4 border rounded-lg shadow-sm bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div className="space-y-1 lg:col-span-3"> {/* Search takes more space now */}
          <label htmlFor="search-term" className="text-sm font-medium text-muted-foreground">Search by Name</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="search-term"
              placeholder="E.g., Amoxicillin"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {/* Category Filter Removed */}
        {/* Supplier Filter Removed */}
        <Button onClick={handleClearFilters} variant="outline" className="lg:col-span-1">
          <X className="mr-2 h-4 w-4" /> Clear Filters
        </Button>
      </div>
    </div>
  );
}
