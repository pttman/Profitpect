export const CATEGORIES = [
  { id: "food", name: "餐饮", icon: "Utensils", color: "peach" },
  { id: "transport", name: "交通", icon: "TrainFront", color: "blue" },
  { id: "shopping", name: "购物", icon: "ShoppingBag", color: "lavender" },
  { id: "home", name: "住房", icon: "House", color: "sage" },
  { id: "daily", name: "日用", icon: "Basket", color: "sand" },
  { id: "fun", name: "娱乐", icon: "Headphones", color: "pink" },
  { id: "health", name: "医疗", icon: "HeartPulse", color: "rose" },
  { id: "learn", name: "学习", icon: "BookOpen", color: "blue" },
  { id: "gift", name: "人情", icon: "Gift", color: "lavender" },
  { id: "other", name: "其他", icon: "Ellipsis", color: "sage" },
];
export const INCOME_CATEGORIES = [
  { id: "salary", name: "工资", icon: "BriefcaseBusiness", color: "sage" },
  { id: "bonus", name: "奖金", icon: "Sparkles", color: "sand" },
  { id: "side", name: "兼职", icon: "Laptop", color: "blue" },
  { id: "income-other", name: "其他", icon: "CirclePlus", color: "lavender" },
];
export const categoryOf = (id) =>
  [...CATEGORIES, ...INCOME_CATEGORIES].find((item) => item.id === id) ??
  CATEGORIES.at(-1);
export const formatMoney = (cents) =>
  (cents / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const monthOf = (date) => date.slice(0, 7);
export const monthLabel = (month) => `${Number(month.slice(5))} 月`;
export function shiftMonth(month, delta) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function parseAmount(value) {
  const text = String(value).trim();
  if (!/^\d{1,8}(\.\d{0,2})?$/.test(text))
    throw new Error("请输入最多两位小数的有效金额");
  const [whole, decimal = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (amount <= 0 || amount > 9999999999)
    throw new Error("金额需大于 0，且不超过 99,999,999.99 元");
  return amount;
}
export function validateEntry(entry) {
  if (!entry || !["expense", "income"].includes(entry.type))
    throw new Error("当前版本仅支持收入和支出");
  if (
    !Number.isSafeInteger(entry.amount) ||
    entry.amount <= 0 ||
    entry.amount > 9999999999
  )
    throw new Error("账单金额无效");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date ?? ""))
    throw new Error("请选择有效日期");
  const parsed = new Date(`${entry.date}T12:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== entry.date ||
    entry.date > today()
  )
    throw new Error("日期无效或晚于今天");
  const categories = entry.type === "income" ? INCOME_CATEGORIES : CATEGORIES;
  if (!categories.some((category) => category.id === entry.category))
    throw new Error("请选择有效分类");
  if (typeof entry.note !== "string" || entry.note.length > 200)
    throw new Error("备注最多 200 字");
  return entry;
}
export function summarize(entries, month) {
  const selected = entries.filter((entry) => monthOf(entry.date) === month);
  const expense = selected
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const income = selected
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const days = new Set(selected.map((entry) => entry.date)).size;
  const categories = CATEGORIES.map((category) => ({
    ...category,
    amount: selected
      .filter(
        (entry) => entry.type === "expense" && entry.category === category.id,
      )
      .reduce((sum, entry) => sum + entry.amount, 0),
  }))
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  return {
    expense,
    income,
    balance: income - expense,
    days,
    count: selected.length,
    categories,
  };
}
export function groupEntries(entries) {
  const groups = new Map();
  [...entries]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )
    .forEach((entry) => {
      if (!groups.has(entry.date)) groups.set(entry.date, []);
      groups.get(entry.date).push(entry);
    });
  return [...groups];
}
export function lastSevenDays(anchor = today()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${anchor}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 6 + index);
    return date.toISOString().slice(0, 10);
  });
}
