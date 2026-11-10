import { today, lastSevenDays } from "./ledger.js";
export const dateTitle = (date) =>
  date === today()
    ? "今天"
    : date === lastSevenDays().at(-2)
      ? "昨天"
      : `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8))} 日`;
export const dayOfWeek = (date) =>
  new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(
    new Date(`${date}T12:00:00`),
  );
