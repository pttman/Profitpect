import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { Modal } from "./ui.jsx";
import { recognizeLocally, recognizeWithAI } from "../lib/recognition.js";

export default function SmartEntry({ onClose, onDraft }) {
  const [text, setText] = useState("");
  const [cloud, setCloud] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function recognize(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    controller.current = new AbortController();
    const timer = setTimeout(() => controller.current?.abort(), 25000);
    try {
      const draft = cloud
        ? await recognizeWithAI(text, { signal: controller.current.signal })
        : recognizeLocally(text);
      onDraft(draft);
    } catch (err) {
      setError(
        err.name === "AbortError"
          ? "识别超时，可重试或使用本机识别"
          : err.message,
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="说一句，就记下"
      description="描述一笔收支，识别后可以修改并确认。"
      onClose={onClose}
    >
      <form onSubmit={recognize}>
        <label className="field-label" htmlFor="smart-text">
          这笔钱用在哪里了？
        </label>
        <textarea
          id="smart-text"
          className="smart-textarea"
          placeholder="例如：昨天在瑞幸买咖啡花了 18.5 元"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          required
          autoFocus
        />
        <div className="smart-examples">
          {["午餐 28 元", "昨天坐地铁 6 元", "工资收入 8000 元"].map(
            (example) => (
              <button
                type="button"
                key={example}
                onClick={() => setText(example)}
              >
                {example}
              </button>
            ),
          )}
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={cloud}
            onChange={(e) => setCloud(e.target.checked)}
          />
          使用云端 AI，仅发送上面这段文字
        </label>
        <p className="field-hint">
          {cloud
            ? "需要已配置的 AI 服务；不发送历史账本和付款通知。"
            : "当前为本机规则识别，无需联网；复杂描述可选云端 AI。"}
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button primary full-width"
          disabled={busy || !text.trim()}
        >
          <Icon name="Sparkles" size={18} />
          {busy ? "正在识别…" : "识别并核对"}
        </button>
      </form>
    </Modal>
  );
}
