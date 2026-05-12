import * as React from "react";
import { Select, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);
dayjs.locale("zh-cn");

interface WeekPickerProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

// Helper to get nice display string for a specific ISO week string
const getWeekDisplay = (weekStr: string, label?: string) => {
  if (!weekStr.includes("-W")) return weekStr;
  const [yStr, wStr] = weekStr.split("-W");
  const d = dayjs().year(parseInt(yStr, 10)).isoWeek(parseInt(wStr, 10)).startOf('isoWeek');
  const range = `[${d.format('MM/DD')} - ${d.endOf('isoWeek').format('MM/DD')}]`;
  const prefix = label ? `W${d.isoWeek()} (${label})` : `W${d.isoWeek()}`;
  return `${prefix} ${range}`;
};

export function WeekPicker({ value, onChange, className }: WeekPickerProps) {
  
  const options = React.useMemo(() => {
    const now = dayjs();
    
    const fmt = (d: dayjs.Dayjs) => `${d.isoWeekYear()}-W${String(d.isoWeek()).padStart(2, '0')}`;
    
    const thisWeekVal = fmt(now);
    const nextWeekVal = fmt(now.add(1, 'week'));
    
    const opts = [
      { value: thisWeekVal, label: getWeekDisplay(thisWeekVal, "本周") },
      { value: nextWeekVal, label: getWeekDisplay(nextWeekVal, "下周") }
    ];
    
    // If current value exists and isn't in the current set (e.g., legacy task edit), preserve it!
    if (value && value !== thisWeekVal && value !== nextWeekVal) {
      opts.unshift({
        value: value,
        label: getWeekDisplay(value, "原设置")
      });
    }
    
    return opts;
  }, [value]);

  return (
    <ConfigProvider locale={zhCN}>
      <Select
        value={value || undefined}
        onChange={onChange}
        options={options}
        className={`${className || "w-full"} text-sm`}
        placeholder="请选择归属周"
        style={{ height: 40, borderRadius: 6 }}
        popupMatchSelectWidth={false}
      />
    </ConfigProvider>
  );
}
