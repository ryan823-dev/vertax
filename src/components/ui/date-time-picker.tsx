"use client";

import * as React from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface DateTimePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "选择日期和时间",
  disabled = false,
  className,
  minDate,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [selectedHour, setSelectedHour] = React.useState<string>(
    value ? format(value, "HH") : "09"
  );
  const [selectedMinute, setSelectedMinute] = React.useState<string>(
    value ? format(value, "mm") : "00"
  );

  // Sync internal state with external value
  React.useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
      setSelectedHour(format(value, "HH"));
      setSelectedMinute(format(value, "mm"));
    } else {
      setSelectedDate(undefined);
      setSelectedHour("09");
      setSelectedMinute("00");
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      onChange(null);
      return;
    }

    // Check minDate constraint
    if (minDate && date < minDate) {
      date = minDate;
    }

    setSelectedDate(date);
    updateDateTime(date, selectedHour, selectedMinute);
  };

  const handleTimeChange = (hour: string, minute: string) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    if (selectedDate) {
      updateDateTime(selectedDate, hour, minute);
    }
  };

  const updateDateTime = (date: Date, hour: string, minute: string) => {
    const newDate = new Date(date);
    newDate.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
    
    // Check minDate constraint
    if (minDate && newDate < minDate) {
      // Set to minimum valid time
      onChange(new Date(minDate));
    } else {
      onChange(newDate);
    }
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    setSelectedHour("09");
    setSelectedMinute("00");
    onChange(null);
  };

  // Generate hour options (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  // Generate minute options (00, 15, 30, 45)
  const minutes = ["00", "15", "30", "45"];

  const formatDisplay = (date: Date | null | undefined) => {
    if (!date) return placeholder;
    return format(date, "PPP p", { locale: zhCN });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDisplay(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => minDate ? date < minDate : false}
            initialFocus
          />
        </div>
        <div className="p-3 border-b flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-1">
            <Select
              value={selectedHour}
              onValueChange={(val) => handleTimeChange(val, selectedMinute)}
            >
              <SelectTrigger className="w-[60px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#FFFCF7]">
                {hours.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select
              value={selectedMinute}
              onValueChange={(val) => handleTimeChange(selectedHour, val)}
            >
              <SelectTrigger className="w-[60px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#FFFCF7]">
                {minutes.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            >
              清除
            </Button>
          )}
        </div>
        {selectedDate && (
          <div className="p-3 text-xs text-muted-foreground">
            已选择: {formatDisplay(selectedDate)}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}