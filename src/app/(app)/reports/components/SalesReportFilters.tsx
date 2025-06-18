
"use client";

import { useState, useEffect } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, X, Filter } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface ReportFiltersState {
  dateRange: DateRange;
  status: "all" | "paid" | "debt";
  searchTerm: string;
  searchType: "billId" | "customerName";
}

interface SalesReportFiltersProps {
  onFilterChange: (filters: ReportFiltersState) => void;
  initialFilters: ReportFiltersState;
}

export function SalesReportFilters({ onFilterChange, initialFilters }: SalesReportFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialFilters.dateRange);
  const [status, setStatus] = useState<ReportFiltersState["status"]>(initialFilters.status);
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm);
  const [searchType, setSearchType] = useState<ReportFiltersState["searchType"]>(initialFilters.searchType);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  useEffect(() => {
    // This effect ensures that if initialFilters change externally, local state updates.
    // However, usually filters are controlled from parent via onFilterChange.
    setDateRange(initialFilters.dateRange);
    setStatus(initialFilters.status);
    setSearchTerm(initialFilters.searchTerm);
    setSearchType(initialFilters.searchType);
  }, [initialFilters]);

  const handleApplyFilters = () => {
    onFilterChange({
      dateRange: dateRange || { from: undefined, to: undefined },
      status,
      searchTerm,
      searchType,
    });
  };

  const handleClearFilters = () => {
    const clearedFilters: ReportFiltersState = {
      dateRange: { from: undefined, to: undefined },
      status: "all",
      searchTerm: "",
      searchType: "billId",
    };
    setDateRange(undefined);
    setStatus("all");
    setSearchTerm("");
    setSearchType("billId");
    onFilterChange(clearedFilters);
  };
  
  const handleDateSelect = (selectedRange: DateRange | undefined) => {
    setDateRange(selectedRange);
    if(selectedRange?.from && selectedRange?.to) {
        setDatePopoverOpen(false);
    } else if (selectedRange?.from && !selectedRange?.to) {
        // Keep popover open if only 'from' is selected, waiting for 'to'
    } else {
        setDatePopoverOpen(false);
    }
  }

  return (
    <div className="mb-6 p-4 border rounded-lg shadow-sm bg-card space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        
        {/* Date Range Picker */}
        <div className="space-y-1">
          <Label htmlFor="date-range">Date Range</Label>
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                id="date-range"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateSelect}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <Label htmlFor="status-filter">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as ReportFiltersState["status"])}>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="debt">Debt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Search Type and Term */}
        <div className="space-y-1 md:col-span-2 grid grid-cols-3 gap-2 items-end">
           <div className="col-span-1 space-y-1">
             <Label htmlFor="search-type">Search By</Label>
             <Select value={searchType} onValueChange={(value) => setSearchType(value as ReportFiltersState["searchType"])}>
                <SelectTrigger id="search-type">
                  <SelectValue placeholder="Search by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="billId">Bill ID</SelectItem>
                  <SelectItem value="customerName">Customer Name</SelectItem>
                </SelectContent>
              </Select>
           </div>
           <div className="col-span-2 space-y-1">
            <Label htmlFor="search-term">Search Term</Label>
            <div className="relative">
                <Input
                id="search-term"
                placeholder={searchType === 'billId' ? "Enter Bill ID..." : "Enter Customer Name..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
           </div>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <Button onClick={handleApplyFilters} variant="default">
          <Filter className="mr-2 h-4 w-4" /> Apply Filters
        </Button>
        <Button onClick={handleClearFilters} variant="outline">
          <X className="mr-2 h-4 w-4" /> Clear Filters
        </Button>
      </div>
    </div>
  );
}
