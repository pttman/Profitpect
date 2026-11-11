import { validateEntry } from "./ledger.js";

export const STORAGE_KEY = "xiaozhang-island:v1";
export const createLedger = () => ({
  version: 1,
  started: false,
  entries: [],
  budgets: {},
  settings: { hidden: false, island: true, reduceMotion: false },
  unlockedStage: 0,
  paymentReceipts: [],
});
export function readRawLedger() {
  return globalThis.XiaozhangAndroid
    ? globalThis.XiaozhangAndroid.readLedger() || null
    : localStorage.getItem(STORAGE_KEY);
}
export function validateLedger(data) {
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.entries) ||
    typeof data.started !== "boolean" ||
    !data.budgets ||
    typeof data.budgets !== "object" ||
    Array.isArray(data.budgets) ||
    !data.settings ||
    typeof data.settings !== "object"
  )
    throw new Error("备份格式不正确，或版本暂不支持");
  if (!data.started && data.entries.length)
    throw new Error("备份中的账本状态与记录不一致");
  const ids = new Set();
  const paymentIds = new Set();
  if (
    data.paymentReceipts !== undefined &&
    (!Array.isArray(data.paymentReceipts) ||
      data.paymentReceipts.some(
        (id) => typeof id !== "string" || !id || id.length > 200,
      ) ||
      new Set(data.paymentReceipts).size !== data.paymentReceipts.length)
  )
    throw new Error("备份中的付款去重信息无效");
  for (const entry of data.entries) {
    validateEntry(entry);
    if (
      typeof entry.id !== "string" ||
      !entry.id ||
      ids.has(entry.id) ||
      typeof entry.createdAt !== "string" ||
      Number.isNaN(Date.parse(entry.createdAt))
    )
      throw new Error("备份中存在重复或无效记录");
    ids.add(entry.id);
    if (entry.paymentId) {
      if (
        paymentIds.has(entry.paymentId) ||
        !data.paymentReceipts?.includes(entry.paymentId)
      )
        throw new Error("备份存在重复付款或缺失付款去重信息");
      paymentIds.add(entry.paymentId);
    }
  }
  for (const [month, amount] of Object.entries(data.budgets)) {
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > 9999999999
    )
      throw new Error("备份中的预算无效");
  }
  if (
    !["hidden", "island", "reduceMotion"].every(
      (key) => typeof data.settings[key] === "boolean",
    )
  )
    throw new Error("备份中的显示设置无效");
  if (
    !Number.isInteger(data.unlockedStage) ||
    data.unlockedStage < 0 ||
    data.unlockedStage > 4
  )
    throw new Error("备份中的小岛进度无效");
  return data;
}
export function loadLedger() {
  try {
    const raw = readRawLedger();
    return {
      data: raw ? validateLedger(JSON.parse(raw)) : createLedger(),
      error: null,
    };
  } catch {
    return {
      data: null,
      error:
        "本地账本暂时无法读取。为保护数据，已暂停写入，请导出原始数据后再处理。",
    };
  }
}
export function saveLedger(data, expected = readRawLedger()) {
  validateLedger(data);
  if (globalThis.XiaozhangAndroid) {
    if (
      !globalThis.XiaozhangAndroid.writeLedger(
        expected ?? "",
        JSON.stringify(data),
      )
    )
      throw new Error("账本已变化或存储失败，请重试");
  } else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
export function downloadFile(name, content, type = "application/json") {
  if (globalThis.XiaozhangAndroid) {
    globalThis.XiaozhangAndroid.exportFile(name, content, type);
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
