import { useState } from "react";
import Icon from "./Icon.jsx";
import { Modal } from "./ui.jsx";
import {
  CATEGORIES,
  INCOME_CATEGORIES,
  parseAmount,
  today,
} from "../lib/ledger.js";

export default function EntryDialog({ entry, draft, onSave, onClose, demo }) {
  const initial = entry ?? draft;
  const [type, setType] = useState(initial?.type ?? "expense");
  const [amount, setAmount] = useState(
    initial ? (initial.amount / 100).toFixed(2) : "",
  );
  const [category, setCategory] = useState(initial?.category ?? "");
  const [date, setDate] = useState(initial?.date ?? today());
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [continueAdding, setContinueAdding] = useState(false);
  const [dirty, setDirty] = useState(!!draft);
  const categories = type === "expense" ? CATEGORIES : INCOME_CATEGORIES;
  const close = () => {
    if (dirty && !window.confirm("这一笔还没有保存，确定放弃吗？")) return;
    onClose();
  };
  function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    try {
      const cents = parseAmount(amount);
      if (!category) throw new Error("给这笔记录选一个分类吧");
      if (!date || date > today()) throw new Error("请选择今天或过去的日期");
      setBusy(true);
      const ok = onSave(
        { ...initial, type, amount: cents, category, date, note: note.trim() },
        continueAdding && !entry && !draft?.paymentId,
      );
      if (ok && continueAdding && !entry && !draft?.paymentId) {
        setAmount("");
        setCategory("");
        setNote("");
        setDirty(false);
        requestAnimationFrame(() =>
          document.getElementById("entry-amount")?.focus(),
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={entry ? "修改这一笔" : draft ? "核对识别结果" : "记下生活的一笔"}
      description={
        demo
          ? "保存后开启你的空白账本，示例数据不会带入。"
          : "有迹可循的小日子，值得被温柔记录。"
      }
      onClose={close}
      className="entry-modal"
    >
      <form onSubmit={submit} onChange={() => setDirty(true)}>
        <div className="type-tabs" role="group" aria-label="记录类型">
          {["expense", "income"].map((value) => (
            <button
              key={value}
              type="button"
              className={type === value ? "active" : ""}
              disabled={!!entry && entry.type !== value}
              onClick={() => {
                setType(value);
                setCategory("");
                setDirty(true);
              }}
            >
              <Icon
                name={value === "expense" ? "ArrowUpRight" : "ArrowDownLeft"}
                size={17}
              />
              {value === "expense" ? "支出" : "收入"}
            </button>
          ))}
        </div>
        <label className="amount-input-label" htmlFor="entry-amount">
          这笔{type === "expense" ? "花了" : "收了"}多少
        </label>
        <div className="amount-input-wrap">
          <span>¥</span>
          <input
            id="entry-amount"
            aria-describedby={error ? "entry-error" : undefined}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            autoFocus
            autoComplete="off"
            maxLength={11}
          />
        </div>
        <fieldset className="category-field">
          <legend>选个分类</legend>
          <div className="category-options">
            {categories.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={category === item.id}
                className={`category-option ${category === item.id ? "selected" : ""}`}
                onClick={() => {
                  setCategory(item.id);
                  setDirty(true);
                }}
              >
                <span className={`icon-badge ${item.color}`}>
                  <Icon name={item.icon} size={21} />
                </span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="entry-extra">
          <label>
            <span>
              <Icon name="CalendarDays" size={17} />
              发生日期
            </span>
            <input
              aria-label="发生日期"
              type="date"
              value={date}
              max={today()}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <div className="account-label">
            <span>
              <Icon name="Wallet" size={17} />
              记入账户
            </span>
            <strong>日常账户</strong>
          </div>
        </div>
        <label className="note-label">
          <span>
            留一句小记 <small>选填</small>
          </span>
          <input
            placeholder="比如：和朋友好好吃了一顿饭"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
          />
        </label>
        {error && (
          <p id="entry-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        {!entry && !draft?.paymentId && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={continueAdding}
              onChange={(event) => setContinueAdding(event.target.checked)}
            />
            保存后继续记一笔
          </label>
        )}
        <button
          type="submit"
          className="button primary full-width"
          disabled={busy}
        >
          <Icon name="Check" size={18} />
          {busy ? "正在保存…" : entry ? "保存修改" : "记好了"}
        </button>
        <p className="form-footnote">
          <Icon name="ShieldCheck" size={13} />
          账本保存在这台设备，安心记下每一天
        </p>
      </form>
    </Modal>
  );
}
