import { format, subDays } from "date-fns";
import type { FilterState } from "@/components/dashboard/FilterBar";

export const getDefaultDateFilters = (): FilterState => {
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  return {
    startDate: format(thirtyDaysAgo, "yyyy-MM-dd"),
    endDate: format(today, "yyyy-MM-dd"),
  };
};
