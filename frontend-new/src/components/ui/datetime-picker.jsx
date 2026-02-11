"use client";
import React, { forwardRef, useCallback } from "react";
import { useTimescape } from "timescape/react";

import { Input } from "./input";
import { cn } from "../../lib/utils";

const timePickerInputBase =
    "p-1 inline tabular-nums h-fit border-none outline-none content-box rounded-sm min-w-8 text-center focus:bg-foreground/20 focus-visible:ring-0 focus-visible:outline-none";
const timePickerSeparatorBase = "text-xs text-gray-400";

const DEFAULTS = [
    ["months", "days", "years"],
    ["hours", "minutes", "am/pm"],
];

const INPUT_PLACEHOLDERS = {
    months: "MM",
    days: "DD",
    years: "YYYY",
    hours: "HH",
    minutes: "MM",
    seconds: "SS",
    "am/pm": "AM/PM",
};

const DatetimeGrid = forwardRef(
    (
        {
            format,
            className,
            timescape,
            placeholders,
        },
        ref,
    ) => {
        return (
            <div
                className={cn(
                    "flex items-center w-full justify-between p-1 border border-input rounded-md gap-1 bg-background",
                    "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
                    className,
                    "selection:bg-transparent selection:text-foreground",
                )}
                {...timescape.getRootProps()}
                ref={ref}
            >
                {!!format?.length
                    ? format.map((group, i) => (
                        <React.Fragment key={i === 0 ? "dates" : "times"}>
                            {!!group?.length
                                ? group.map((unit, j) => (
                                    <React.Fragment key={unit}>
                                        <Input
                                            className={cn(timePickerInputBase, "min-w-8 flex-1 text-center border-0 shadow-none bg-transparent focus-visible:ring-0 focus-visible:bg-accent/50", {
                                                "min-w-12": unit === "years",
                                                "bg-foreground/15": unit === "am/pm",
                                            })}
                                            {...timescape.getInputProps(unit)}
                                            placeholder={placeholders[unit]}
                                        />
                                        {i === 0 && j < group.length - 1 ? (
                                            // date separator
                                            <span className={timePickerSeparatorBase}>/</span>
                                        ) : (
                                            j < group.length - 2 && (
                                                // time separator
                                                <span className={timePickerSeparatorBase}>:</span>
                                            )
                                        )}
                                    </React.Fragment>
                                ))
                                : null}
                            {format[1]?.length && !i ? (
                                // date-time separator - only if both date and time are present
                                <span
                                    className={cn(
                                        timePickerSeparatorBase,
                                        "opacity-30 text-xl",
                                    )}
                                >
                                    |
                                </span>
                            ) : null}
                        </React.Fragment>
                    ))
                    : null}
            </div>
        );
    },
);

DatetimeGrid.displayName = "DatetimeGrid";

const DEFAULT_TS_OPTIONS = {
    date: new Date(),
    hour12: true,
};

export const DatetimePicker = forwardRef(
    (
        {
            value,
            format = DEFAULTS,
            placeholders,
            dtOptions = DEFAULT_TS_OPTIONS,
            onChange,
            className,
        },
        ref,
    ) => {
        const handleDateChange = useCallback(
            (nextDate) => {
                onChange ? onChange(nextDate) : console.log(nextDate);
            },
            [onChange],
        );
        const timescape = useTimescape({
            ...dtOptions,
            ...(value && { date: value }),
            onChangeDate: handleDateChange,
        });
        return (
            <DatetimeGrid
                format={format}
                className={className}
                timescape={timescape}
                placeholders={placeholders ?? INPUT_PLACEHOLDERS}
                ref={ref}
            />
        );
    },
);

DatetimePicker.displayName = "DatetimePicker";
