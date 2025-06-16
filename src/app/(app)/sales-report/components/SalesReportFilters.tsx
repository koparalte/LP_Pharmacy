
"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SalesReportFiltersProps {
  searchTermBillId: string;
  setSearchTermBillId: Dispatch<SetStateAction<string>>;
  searchTermCustomerName: string;
  setSearchTermCustomerName: Dispatch<SetStateAction<string>>;
  startDate: Date | undefined;
  setStartDate: Dispatch<SetStateAction<Date | undefined>>;
  endDate: Date | undefined;
  setEndDate: Dispatch<SetStateAction<Date | undefined>>;
  selectedStatus: "all" | "paid" | "debt";
  setSelectedStatus: Dispatch<SetStateAction<"all" | "paid" | "debt">>;
  onClearFilters: () => void;
}

export function SalesReportFilters({
  searchTermBillId,
  setSearchTermBillId,
  searchTermCustomerName,
  setSearchTermCustomerName,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedStatus,
  setSelectedStatus,
  onClearFilters,
}: SalesReportFiltersProps) {
  return (
    <div className="mb-6 p-4 border rounded-lg shadow-sm bg-card space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div>
          <label htmlFor="search-bill-id" className="text-sm font-medium text-muted-foreground">Search Bill ID</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-bill-id"
              placeholder="E.g., LP12345"
              value={searchTermBillId}
              onChange={(e) => setSearchTermBillId(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <label htmlFor="search-customer-name" className="text-sm font-medium text-muted-foreground">Search Customer Name</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-customer-name"
              placeholder="E.g., John Doe"
              value={searchTermCustomerName}
              onChange={(e) => setSearchTermCustomerName(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">Filter by Status</label>
          <Select value={selectedStatus} onValueChange={(value: "all" | "paid" | "debt") => setSelectedStatus(value)}>
            <SelectTrigger id="status-filter" className="mt-1">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="debt">Debt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
         <div>
          <label htmlFor="start-date" className="text-sm font-medium text-muted-foreground">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="start-date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
        </div>
        <div>
            <label htmlFor="end-date" className="text-sm font-medium text-muted-foreground">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="end-date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => startDate ? date < startDate : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
        </div>
        <Button onClick={onClearFilters} variant="outline" className="self-end h-10">
          <X className="mr-2 h-4 w-4" /> Clear All Filters
        </Button>
      </div>
    </div>
  );
}
