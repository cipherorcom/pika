import {useEffect, useState} from 'react';
import {ChevronDown} from 'lucide-react';
import type {TimeRangeOption} from '@/api/property.ts';
import {cn} from '@/lib/utils';

interface CustomRange {
    start: number;
    end: number;
}

interface TimeRangeSelectorProps {
    value: string;
    onChange: (value: string) => void;
    options: readonly TimeRangeOption[];
    enableCustom?: boolean;
    customRange?: CustomRange | null;
    onCustomRangeApply?: (range: CustomRange) => void;
    className?: string;
}

export const TimeRangeSelector = ({
                                      value,
                                      onChange,
                                      options,
                                      enableCustom = false,
                                      customRange,
                                      onCustomRangeApply,
                                      className,
                                  }: TimeRangeSelectorProps) => {
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        if (customRange?.start) {
            setCustomStart(toDateTimeLocal(customRange.start));
        }
        if (customRange?.end) {
            setCustomEnd(toDateTimeLocal(customRange.end));
        }
    }, [customRange]);

    const startMs = parseDateTimeLocal(customStart);
    const endMs = parseDateTimeLocal(customEnd);
    const canApply = startMs !== null && endMs !== null && startMs < endMs;
    const showCustomOption = enableCustom && value === 'custom';

    return (
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
            <div className="relative">
                <select
                    value={showCustomOption ? 'custom' : value}
                    onChange={(event) => {
                        const nextValue = event.target.value;
                        if (nextValue === 'custom') {
                            onChange('custom');
                            return;
                        }
                        onChange(nextValue);
                    }}
                    className="appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-10 text-xs font-medium whitespace-nowrap text-slate-700 transition-all hover:border-blue-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                >
                    {enableCustom && <option value="custom">自定义</option>}
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-300"/>
            </div>
            {showCustomOption && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        自定义
                    </span>
                    <input
                        type="datetime-local"
                        value={customStart}
                        onChange={(event) => setCustomStart(event.target.value)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 px-2 py-1 text-xs font-medium"
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        至
                    </span>
                    <input
                        type="datetime-local"
                        value={customEnd}
                        onChange={(event) => setCustomEnd(event.target.value)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 px-2 py-1 text-xs font-medium"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (!canApply || startMs === null || endMs === null) return;
                            onCustomRangeApply?.({start: startMs, end: endMs});
                            onChange("custom");
                        }}
                        disabled={!canApply}
                        className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                            canApply
                                ? "border-blue-500 dark:border-blue-500 bg-blue-500 dark:bg-blue-600 text-white shadow-sm hover:bg-blue-600 dark:hover:bg-blue-700"
                                : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                        )}
                    >
                        应用
                    </button>
                </div>
            )}
        </div>
    );
};

const parseDateTimeLocal = (value: string): number | null => {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) {
        return null;
    }
    return timestamp;
};

const toDateTimeLocal = (timestamp: number): string => {
    const date = new Date(timestamp);
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(timestamp - offsetMs).toISOString().slice(0, 16);
};
