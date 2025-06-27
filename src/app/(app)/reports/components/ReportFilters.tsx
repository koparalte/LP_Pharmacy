
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, X, Calendar as CalendarIcon } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ReportFiltersProps {
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  statusFilter: 'all' | 'paid' | 'debt';
  setStatusFilter: Dispatch<SetStateAction<'all' | 'paid' | 'debt'>>;
  dateFilter: Date | null;
  setDateFilter: Dispatch<SetStateAction<Date | null>>;
  clearFilters: () => void;
}

export function ReportFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  clearFilters,
}: ReportFiltersProps) {

  return (
    <div className="mb-6 p-4 border rounded-lg shadow-sm bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        
        {/* Search Input */}
        <div className="space-y-1 lg:col-span-2">
          <label htmlFor="search-term" className="text-sm font-medium text-muted-foreground">Search by Bill No. or Customer</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="search-term"
              placeholder="e.g., LP123456 or John Doe"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="debt">Debt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Filter */}
        <div className="space-y-1">
          <label htmlFor="date-filter" className="text-sm font-medium text-muted-foreground">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateFilter && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter ? format(dateFilter, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFilter ?? undefined}
                onSelect={(date) => setDateFilter(date || null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={clearFilters} variant="outline" size="sm">
          <X className="mr-2 h-4 w-4" /> Clear Filters
        </Button>
      </div>
    </div>
  );
}
