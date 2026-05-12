import * as React from "react";
import { DatePicker, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import isoWeek from "dayjs/plugin/isoWeek";

// Setup dayjs to use ISO 8601 standard weeks
dayjs.extend(isoWeek);
dayjs.locale("zh-cn");

interface WeekPickerProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

export function WeekPicker({ value, onChange, className }: WeekPickerProps) {
  
  // Parse custom string "YYYY-Www" to Dayjs object
  const dateValue = React.useMemo(() => {
    if (!value || typeof value !== 'string' || !value.includes("-W")) {
      return null;
    }
    const [yearStr, weekStr] = value.split("-W");
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);
    
    if (isNaN(year) || isNaN(week)) return null;

    // Construct dayjs starting from this isoWeek
    // We use .year(Y).isoWeek(W) to generate correctly
    return dayjs().year(year).isoWeek(week).startOf("isoWeek");
  }, [value]);

  // Format Dayjs back to "YYYY-Www"
  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (!date) {
      onChange("");
      return;
    }
    
    // Get the ISO year and week number
    const isoYear = date.isoWeekYear();
    const isoWeekNumber = date.isoWeek();
    
    // String pad it
    const result = `${isoYear}-W${isoWeekNumber.toString().padStart(2, "0")}`;
    onChange(result);
  };

  return (
    <ConfigProvider locale={zhCN}>
      <DatePicker
        picker="week"
        value={dateValue}
        onChange={handleDateChange}
        className={className || "w-full"}
        placeholder="请选择周数"
        style={{ height: 40, borderRadius: 6 }}
        format={(value) => {
            // Ensure display formatting includes start/end dates for maximum visual clarity, similar to our previous custom view
            const start = value.startOf('isoWeek');
            const end = value.endOf('isoWeek');
            return `W${value.isoWeek()} (${start.format('MM/DD')} - ${end.format('MM/DD')})`;
        }}
      />
    </ConfigProvider>
  );
}
