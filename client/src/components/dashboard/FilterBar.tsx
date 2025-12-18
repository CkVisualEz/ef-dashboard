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
import { format } from "date-fns";
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (initialFilters?.startDate && initialFilters?.endDate) {
      return {
        from: new Date(initialFilters.startDate),
        to: new Date(initialFilters.endDate),
      };
    }
    return undefined;
  });
  const [classification, setClassification] = useState<string>(initialFilters?.classification || "all");
  const [device, setDevice] = useState<string>(initialFilters?.device || "all");
  const [state, setState] = useState<string>(initialFilters?.state || "");
  const [city, setCity] = useState<string>(initialFilters?.city || "");

  // Use ref to store the latest onFilterChange to avoid infinite loops
  const onFilterChangeRef = useRef(onFilterChange);
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  useEffect(() => {
    if (onFilterChangeRef.current) {
      const filters: FilterState = {};
      
      if (dateRange?.from) {
        filters.startDate = format(dateRange.from, "yyyy-MM-dd");
      }
      if (dateRange?.to) {
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
  }, [dateRange, classification, device, state, city]);

  const clearFilters = () => {
    setDateRange(undefined);
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
        <Popover>
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
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
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
