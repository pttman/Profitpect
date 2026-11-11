import { parseAmount, today, validateEntry } from "./ledger.js";

const RULES = [
  [
    "food",
    /餐|饭|早餐|午餐|晚餐|奶茶|咖啡|外卖|麦当劳|肯德基|瑞幸|星巴克|食堂/,
  ],
  ["transport", /地铁|公交|打车|滴滴|车费|火车|高铁|机票|加油|停车/],
  ["home", /房租|租金|房贷/],
  ["daily", /水费|电费|燃气|话费|日用|超市|便利店/],
  ["health", /药|医院|挂号|诊疗|体检/],
  ["learn", /书|课程|学费|培训/],
  ["fun", /电影|游戏|会员|演出|音乐|娱乐/],
  ["gift", /红包|礼物|份子|礼金/],
  ["shopping", /购物|淘宝|京东|衣服|鞋|拼多多|网购/],
];

export function inferCategory(text, type = "expense") {
  if (type === "income") {
    if (/工资|薪资|薪水/.test(text)) return "salary";
    if (/奖金|年终奖/.test(text)) return "bonus";
    if (/兼职|稿费|副业/.test(text)) return "side";
    return "income-other";
  }
  return RULES.find(([, rule]) => rule.test(text))?.[0] ?? "other";
}

export function validateRecognition(value) {
  if (!value || typeof value !== "object")
    throw new Error("识别结果无效，请手动记账");
  const entry = {
    type: value.type,
    amount: value.amount,
    category: value.category,
    date: value.date,
    note: value.note,
  };
  validateEntry(entry);
  return entry;
}

// Local rules are deliberately conservative and are labelled separately from cloud AI.
export function recognizeLocally(input, anchor = today()) {
  const text = input.normalize("NFKC").trim();
  if (!text || text.length > 1000)
    throw new Error("请输入 1–1000 字的单笔收支描述");
  if (
    /退款|转账|还款|借款|待支付|付款失败|支付失败|已取消|明天|后天|美元|港币|美金|USD|HKD|EUR|€|\$|(?<!\d)[-−]\s*[¥￥]?\s*\d|[¥￥]\s*[-−]/i.test(
      text,
    )
  )
    throw new Error("这类交易暂不支持自动识别，请核对后手动记录");
  let date = anchor;
  let rest = text;
  const explicit = rest.match(/(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})日?/);
  if (explicit) {
    date = `${explicit[1]}-${explicit[2].padStart(2, "0")}-${explicit[3].padStart(2, "0")}`;
    rest = rest.replace(explicit[0], "");
  } else if (/\d{1,2}月\d{1,2}日/.test(rest)) {
    const shortDate = rest.match(/(\d{1,2})月(\d{1,2})日/);
    date = `${anchor.slice(0, 4)}-${shortDate[1].padStart(2, "0")}-${shortDate[2].padStart(2, "0")}`;
    rest = rest.replace(shortDate[0], "");
  } else if (/上周|上个月|去年|前年|明年|周[一二三四五六日天]/.test(rest)) {
    throw new Error("请写明发生日期，例如 2026-11-09，或使用云端 AI 识别");
  } else if (/昨天|前天/.test(rest)) {
    const day = new Date(`${anchor}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() - (rest.includes("前天") ? 2 : 1));
    date = day.toISOString().slice(0, 10);
  }
  // Remove time, never treat order numbers or balances as the amount.
  rest = rest.replace(/\d{1,2}:\d{2}(?::\d{2})?/g, "");
  const amounts = [
    ...rest.matchAll(
      /(?:[¥￥]\s*(\d[\d,]*(?:\.\d+)?))|(?:(\d[\d,]*(?:\.\d+)?)\s*(?:元|块(?:钱)?))/g,
    ),
  ];
  let token;
  if (amounts.length === 1) token = amounts[0][1] ?? amounts[0][2];
  else if (amounts.length > 1)
    throw new Error("发现多个金额，请一次描述一笔，并保留实际支付金额");
  else {
    if (/订单|单号|余额|尾号|手机号/.test(rest))
      throw new Error("请明确写出实际收支金额，例如 28 元");
    const bare = [...rest.matchAll(/\d+(?:\.\d+)?/g)];
    if (bare.length !== 1)
      throw new Error("没有找到唯一金额，可以写“午餐 28 元”");
    token = bare[0][0];
  }
  const type = /收入|工资|薪资|奖金|到账|收到|兼职|稿费/.test(text)
    ? "income"
    : "expense";
  return validateRecognition({
    type,
    amount: parseAmount(normalizeAmount(token)),
    category: inferCategory(text, type),
    date,
    note: text.slice(0, 200),
  });
}

function normalizeAmount(token) {
  if (!/^(?:\d{1,8}|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(token))
    throw new Error("金额格式无效，请保留最多两位小数");
  return token.replaceAll(",", "");
}

export async function recognizeWithAI(text, { signal } = {}) {
  const endpoint = import.meta.env?.VITE_AI_ENDPOINT || "/api/recognize";
  if (globalThis.XiaozhangAndroid && !import.meta.env?.VITE_AI_ENDPOINT)
    throw new Error("此安卓包尚未配置云端 AI 服务，请使用本机识别");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, date: today() }),
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "云端 AI 暂不可用，请切换本机识别或稍后重试");
  }
  return validateRecognition(await response.json());
}
