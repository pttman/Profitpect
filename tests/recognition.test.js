import test from "node:test";
import assert from "node:assert/strict";
import {
  recognizeLocally,
  validateRecognition,
} from "../src/lib/recognition.js";
import { recognize } from "../server/recognize.js";
import { createLedger, validateLedger } from "../src/lib/storage.js";

test("本地识别金额、分类、收入与跨月相对日期", () => {
  assert.deepEqual(recognizeLocally("昨天瑞幸咖啡 18.5 元", "2026-11-01"), {
    type: "expense",
    amount: 1850,
    category: "food",
    date: "2026-10-31",
    note: "昨天瑞幸咖啡 18.5 元",
  });
  assert.equal(recognizeLocally("工资收入 8,000 元").category, "salary");
  assert.equal(recognizeLocally("地铁6元").amount, 600);
  assert.equal(
    recognizeLocally("2025-12-31 打车 23.8", "2026-01-01").date,
    "2025-12-31",
  );
  assert.equal(
    recognizeLocally("前天午餐28元", "2026-01-01").date,
    "2025-12-30",
  );
  assert.equal(recognizeLocally("午餐２８元").amount, 2800);
  assert.equal(
    recognizeLocally("1月2日午餐28元", "2026-02-01").date,
    "2026-01-02",
  );
  assert.throws(() => recognizeLocally("去年午餐28元"));
});
test("不猜测多金额、外币、退款、日期和非法金额", () => {
  for (const text of [
    "",
    "午餐",
    "午餐18元，咖啡20元",
    "明天打车20元",
    "退款18元",
    "转账18元",
    "支付失败18元",
    "咖啡1.001元",
    "咖啡0元",
    "咖啡-18元",
    "咖啡￥-18",
    "咖啡$18",
    "咖啡18美元",
    "午餐1,00元",
    "订单123456",
    "2025-02-30 午餐28元",
    "2099-01-01 午餐28元",
  ])
    assert.throws(() => recognizeLocally(text), text);
});
test("模型输出只采纳业务字段并再次校验", () => {
  const entry = {
    type: "expense",
    amount: 1850,
    category: "food",
    date: "2025-01-01",
    note: "早餐",
  };
  assert.deepEqual(
    validateRecognition({ ...entry, id: "injected", paymentId: "injected" }),
    entry,
  );
  assert.throws(() => validateRecognition({ ...entry, amount: "18.50" }));
  assert.throws(() => validateRecognition({ ...entry, category: "salary" }));
});
test("付款去重信息兼容旧备份并验证新备份", () => {
  const old = createLedger();
  delete old.paymentReceipts;
  assert.equal(validateLedger(old), old);
  assert.throws(() => validateLedger({ ...old, paymentReceipts: ["a", "a"] }));
  assert.throws(() => validateLedger({ ...old, paymentReceipts: [null] }));
  const book = { ...old, paymentReceipts: ["receipt"] };
  assert.deepEqual(validateLedger(JSON.parse(JSON.stringify(book))), book);
  const paymentEntry = {
    id: "payment-entry",
    type: "expense",
    amount: 1800,
    date: "2025-01-01",
    category: "food",
    note: "咖啡",
    createdAt: "2025-01-01T00:00:00Z",
    paymentId: "receipt",
    source: "wechat",
  };
  assert.throws(() =>
    validateLedger({ ...old, started: true, entries: [paymentEntry] }),
  );
  assert.doesNotThrow(() =>
    validateLedger({ ...book, started: true, entries: [paymentEntry] }),
  );
  assert.throws(() =>
    validateLedger({
      ...book,
      started: true,
      entries: [paymentEntry, { ...paymentEntry, id: "duplicate" }],
    }),
  );
});
test("云端接口使用结构化输出且不发送历史账本", async () => {
  let sent;
  const fetcher = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    sent = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  supported: true,
                  type: "expense",
                  amount: "18.50",
                  category: "food",
                  date: "2025-01-01",
                  note: "早餐",
                }),
              },
            ],
          },
        ],
      }),
    };
  };
  const result = await recognize("早餐18.50元", {
    apiKey: "test-only",
    model: "configured-model",
    fetcher,
  });
  assert.equal(result.amount, 1850);
  assert.equal(sent.store, false);
  assert.equal(sent.text.format.strict, true);
  assert.equal(sent.input, "早餐18.50元");
  assert.equal(sent.model, "configured-model");
});
test("未配置、模型拒绝或错误结果不会生成账单", async () => {
  await assert.rejects(recognize("午餐18元"), /尚未配置/);
  await assert.rejects(recognize("字".repeat(1001)), /1000/);
  const response = (result) => async () => ({
    ok: true,
    json: async () => ({
      output: [
        { content: [{ type: "output_text", text: JSON.stringify(result) }] },
      ],
    }),
  });
  for (const result of [
    { supported: false },
    {
      supported: true,
      type: "expense",
      amount: "1.001",
      category: "food",
      date: "2025-01-01",
      note: "早餐",
    },
  ])
    await assert.rejects(
      recognize("早餐18元", {
        apiKey: "test-only",
        model: "configured-model",
        fetcher: response(result),
      }),
      /未能确定/,
    );
});
