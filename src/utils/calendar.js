import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export function getMonthDays(date) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
  
  return eachDayOfInterval({ start, end }).map(day => ({
    date: day,
    isCurrentMonth: isSameMonth(day, date),
    isToday: isToday(day),
    dateString: format(day, 'yyyy-MM-dd')
  }));
}

export function formatMonthYear(date) {
  return format(date, 'yyyy年M月', { locale: zhTW });
}

export function getEventsForDay(events, date) {
  const dateString = format(date, 'yyyy-MM-dd');
  return events.filter(event => event.date === dateString);
}

export const weekDays = ['日', '一', '二', '三', '四', '五', '六'];