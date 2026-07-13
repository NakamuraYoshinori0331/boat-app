import { useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import api from '../api/client';

interface DateRangeResponse {
  min_date: string | null;
  max_date: string | null;
  count: number;
  dates: string[];
}

export function useDataDateRange() {
  const [range, setRange] = useState<DateRangeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DateRangeResponse>('/data/date-range')
      .then((res) => setRange(res.data))
      .catch(() => setRange(null))
      .finally(() => setLoading(false));
  }, []);

  const availableSet = useMemo(
    () => new Set(range?.dates ?? []),
    [range?.dates],
  );

  const minDate = range?.min_date ? dayjs(range.min_date, 'YYYYMMDD') : null;
  const maxDate = range?.max_date ? dayjs(range.max_date, 'YYYYMMDD') : null;

  const disabledDate = (current: Dayjs) => {
    if (!current) return false;
    if (!range?.dates?.length) return false;
    return !availableSet.has(current.format('YYYYMMDD'));
  };

  const defaultTrainRange = useMemo(() => {
    if (!minDate || !maxDate) {
      return { start: dayjs().subtract(1, 'year'), end: dayjs() };
    }
    const oneYearBeforeMax = maxDate.subtract(1, 'year');
    return {
      start: oneYearBeforeMax.isBefore(minDate) ? minDate : oneYearBeforeMax,
      end: maxDate,
    };
  }, [minDate, maxDate]);

  const defaultSimRange = useMemo(() => {
    if (!minDate || !maxDate) {
      return [dayjs().subtract(30, 'day'), dayjs()] as [Dayjs, Dayjs];
    }
    const thirtyDaysBeforeMax = maxDate.subtract(30, 'day');
    return [
      thirtyDaysBeforeMax.isBefore(minDate) ? minDate : thirtyDaysBeforeMax,
      maxDate,
    ] as [Dayjs, Dayjs];
  }, [minDate, maxDate]);

  return {
    loading,
    range,
    minDate,
    maxDate,
    disabledDate,
    defaultTrainRange,
    defaultSimRange,
  };
}
