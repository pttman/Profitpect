import { today } from "./ledger.js";

export function demoEntries() {
  const now = today();
  const day = Number(now.slice(8));
  const month = now.slice(0, 7);
  const date = (offset) =>
    `${month}-${String(Math.max(1, day - offset)).padStart(2, "0")}`;
  const rows = [
    ["expense", 3250, "food", 0, "午间的小满足"],
    ["expense", 1800, "food", 0, "一杯拿铁，给周一加点甜"],
    ["expense", 600, "transport", 0, "地铁通勤"],
    ["expense", 8650, "daily", 1, "补充冰箱里的小幸福"],
    ["expense", 6800, "learn", 1, "新书《日日是好日》"],
    ["income", 1250000, "salary", 2, "认真生活的底气"],
    ["expense", 12800, "food", 2, "和朋友好好吃一顿"],
    ["expense", 4500, "fun", 3, "周末电影"],
    ["expense", 16900, "shopping", 4, "柔软的新围巾"],
    ["expense", 280000, "home", 5, "给自己一个温暖的家"],
    ["expense", 2800, "food", 5, "今天也有好好吃饭"],
    ["expense", 2400, "transport", 6, "雨天打车回家"],
    ["expense", 1500, "food", 6, "路边的咖啡香"],
  ];
  return rows.map(([type, amount, category, offset, note], index) => ({
    id: `demo-${index}`,
    type,
    amount,
    category,
    date: date(offset),
    note,
    createdAt: `${date(offset)}T${String(10 + (index % 10)).padStart(2, "0")}:00:00Z`,
  }));
}
