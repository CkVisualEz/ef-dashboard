import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Download, Filter, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export interface FilterState {
  startDate?: string;
  endDate?: string;
  classification?: string;
  device?: string;
  state?: string;
  city?: string;
}

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void;
  onExport?: () => void;
  initialFilters?: FilterState;
  hideLocationFilters?: boolean; // Hide state and city filters
}

export function FilterBar({ onFilterChange, onExport, initialFilters, hideLocationFilters = false }: FilterBarProps) {
  // Default to last 30 days if no initial filters
  const getDefaultDateRange = (): DateRange | undefined => {
    if (initialFilters?.startDate && initialFilters?.endDate) {
      return {
        from: new Date(initialFilters.startDate),
        to: new Date(initialFilters.endDate),
      };
    }
    // Default to last 30 days
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    return {
      from: thirtyDaysAgo,
      to: today,
    };
  };

  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange());
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [classification, setClassification] = useState<string>(initialFilters?.classification || "all");
  const [device, setDevice] = useState<string>(initialFilters?.device || "all");
  const [state, setState] = useState<string>(initialFilters?.state || "");
  const [city, setCity] = useState<string>(initialFilters?.city || "");

  // Use ref to store the latest onFilterChange to avoid infinite loops
  const onFilterChangeRef = useRef(onFilterChange);
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  // Initialize tempDateRange when popover opens
  useEffect(() => {
    if (isDatePickerOpen) {
      setTempDateRange(dateRange);
    }
  }, [isDatePickerOpen]);

  // Apply date range when Apply button is clicked
  const handleApplyDateRange = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      setDateRange(tempDateRange);
      setIsDatePickerOpen(false);
    }
  };

  // Handle date picker close - don't auto-apply, just close
  const handleDatePickerClose = (open: boolean) => {
    if (!open) {
      // Reset tempDateRange to current dateRange when closing without applying
      setTempDateRange(dateRange);
    }
    setIsDatePickerOpen(open);
  };

  useEffect(() => {
    if (onFilterChangeRef.current) {
      const filters: FilterState = {};
      
      // Only include date filters if both dates are selected
      if (dateRange?.from && dateRange?.to) {
        filters.startDate = format(dateRange.from, "yyyy-MM-dd");
        filters.endDate = format(dateRange.to, "yyyy-MM-dd");
      }
      if (classification && classification !== "all") {
        filters.classification = classification;
      }
      if (device && device !== "all") {
        filters.device = device;
      }
      if (!hideLocationFilters) {
        if (state) {
          filters.state = state;
        }
        if (city) {
          filters.city = city;
        }
      }

      onFilterChangeRef.current(filters);
    }
  }, [dateRange, classification, device, state, city, hideLocationFilters]);

  const clearFilters = () => {
    setDateRange(undefined);
    setTempDateRange(undefined);
    setClassification("all");
    setDevice("all");
    if (!hideLocationFilters) {
      setState("");
      setCity("");
    }
  };

  const hasActiveFilters = 
    dateRange?.from || 
    dateRange?.to || 
    (classification && classification !== "all") || 
    (device && device !== "all") || 
    (!hideLocationFilters && (state || city));

  return (
    <div className="flex flex-col gap-4 mb-8 bg-card p-4 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Popover open={isDatePickerOpen} onOpenChange={handleDatePickerClose}>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
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
            <div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDateRange?.from || dateRange?.from}
                selected={tempDateRange}
                onSelect={setTempDateRange}
                numberOfMonths={2}
              />
              <div className="p-3 border-t flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempDateRange(undefined);
                    setDateRange(undefined);
                    setIsDatePickerOpen(false);
                  }}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyDateRange}
                  disabled={!tempDateRange?.from || !tempDateRange?.to}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Select value={classification} onValueChange={setClassification}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Classification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Surfaces</SelectItem>
            <SelectItem value="carpet">Carpet</SelectItem>
            <SelectItem value="hard_surface">Hard Surface</SelectItem>
            <SelectItem value="both">Both/Mixed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={device} onValueChange={setDevice}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Device" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
          </SelectContent>
        </Select>

        {onExport && (
          <Button variant="outline" className="gap-2 ml-auto" onClick={onExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}
