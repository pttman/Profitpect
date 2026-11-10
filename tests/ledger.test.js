import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAmount,
  summarize,
  validateEntry,
  shiftMonth,
  today,
  groupEntries,
  lastSevenDays,
} from "../src/lib/ledger.js";
import { createLedger, validateLedger } from "../src/lib/storage.js";

const date = today();
const month = date.slice(0, 7);
const makeEntry = (overrides = {}) => ({
  id: "test-record",
  type: "expense",
  amount: 1850,
  category: "food",
  date,
  note: "早餐",
  createdAt: new Date().toISOString(),
  ...overrides,
});

test("以整数分处理金额，避免浮点误差", () => {
  assert.equal(parseAmount("0.10") + parseAmount("0.20"), 30);
  assert.equal(parseAmount("18."), 1800);
  assert.equal(parseAmount("18.5"), 1850);
  assert.equal(parseAmount("99999999.99"), 9999999999);
});
test("拒绝零、负数、超精度、指数、空值和超限金额", () => {
  for (const value of [
    "0",
    "-1",
    "1.001",
    "1e4",
    "",
    "100000000",
    "NaN",
    ".50",
  ])
    assert.throws(() => parseAmount(value));
});
test("月汇总按发生月份计入，收入不会混入支出分类", () => {
  const entries = [
    makeEntry(),
    makeEntry({
      id: "income",
      type: "income",
      amount: 100000,
      category: "salary",
    }),
    makeEntry({ id: "old", date: `${shiftMonth(month, -1)}-01`, amount: 9900 }),
  ];
  const result = summarize(entries, month);
  assert.equal(result.expense, 1850);
  assert.equal(result.income, 100000);
  assert.equal(result.balance, 98150);
  assert.equal(result.days, 1);
  assert.equal(result.count, 2);
  assert.equal(result.categories[0].id, "food");
  assert.equal(result.categories[0].amount, 1850);
});
test("拒绝不存在的日期、未来日期与类型不匹配的分类", () => {
  assert.throws(() => validateEntry(makeEntry({ date: "2025-02-30" })));
  assert.throws(() => validateEntry(makeEntry({ date: "2099-01-01" })));
  assert.throws(() => validateEntry(makeEntry({ category: "salary" })));
  assert.throws(() => validateEntry(makeEntry({ type: "transfer" })));
  assert.throws(() => validateEntry(makeEntry({ note: "字".repeat(201) })));
});
test("完整备份能够往返恢复，并拒绝重复记录和非法预算", () => {
  const data = {
    ...createLedger(),
    started: true,
    entries: [makeEntry()],
    budgets: { [month]: 500000 },
  };
  assert.deepEqual(validateLedger(JSON.parse(JSON.stringify(data))), data);
  assert.throws(() =>
    validateLedger({ ...data, entries: [makeEntry(), makeEntry()] }),
  );
  assert.throws(() =>
    validateLedger({ ...data, budgets: { "2026-13": 1000 } }),
  );
  assert.throws(() => validateLedger({ ...data, budgets: { [month]: 0 } }));
  assert.throws(() => validateLedger({ ...data, version: 2 }));
  assert.throws(() =>
    validateLedger({ ...data, settings: { hidden: "false" } }),
  );
});
test("跨年月份和七日窗口保持正确顺序", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  const days = lastSevenDays("2026-03-02");
  assert.equal(days.length, 7);
  assert.equal(days[0], "2026-02-24");
  assert.equal(days.at(-1), "2026-03-02");
});
test("账单按发生日期而非创建日期分组和排序", () => {
  const older = makeEntry({ id: "older", date: "2025-01-01" });
  const newer = makeEntry({ id: "newer", date: "2025-02-01" });
  assert.equal(groupEntries([older, newer])[0][0], "2025-02-01");
});
