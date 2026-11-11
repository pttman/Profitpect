import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon.jsx";

const MODES = [
  {
    id: "manual",
    label: "手动记账",
    hint: "输入金额，快速记一笔",
    icon: "Pencil",
    color: "orange",
  },
  {
    id: "ai",
    label: "AI 记账",
    hint: "说一句，自动生成草稿",
    icon: "Sparkles",
    color: "violet",
  },
  {
    id: "payment",
    label: "付款识别",
    hint: "识别付款页面，轻松记录",
    icon: "ShieldCheck",
    color: "cyan",
  },
];

export default function QuickEntry({
  onManual,
  onAI,
  onPayment,
  disabled = false,
}) {
  const [mode, setMode] = useState("manual");
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const held = useRef(false);
  const origin = useRef(null);
  const wrapper = useRef(null);
  const toggle = useRef(null);
  const id = useId();
  const selected = MODES.find((item) => item.id === mode);
  const actions = { manual: onManual, ai: onAI, payment: onPayment };
  function cancelHold() {
    clearTimeout(timer.current);
    timer.current = null;
  }
  useEffect(() => {
    if (disabled) {
      cancelHold();
      setOpen(false);
    }
    return cancelHold;
  }, [disabled]);
  useEffect(() => {
    if (!open) return;
    function outside(event) {
      if (!wrapper.current?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      className={`quick-entry ${open ? "is-open" : ""}`}
      ref={wrapper}
      hidden={disabled}
    >
      {open && (
        <div
          className="entry-methods"
          id={id}
          role="group"
          aria-label="选择记账方式"
        >
          <div className="entry-methods-heading">
            <span>这次，怎么记？</span>
            <small>选好后，轻点悬浮按钮开始</small>
          </div>
          {MODES.map((item) => (
            <button
              className={`entry-method ${item.color} ${mode === item.id ? "selected" : ""}`}
              key={item.id}
              aria-pressed={mode === item.id}
              onClick={() => {
                setMode(item.id);
                setOpen(false);
                toggle.current?.focus();
              }}
            >
              <span className="method-icon">
                <Icon name={item.icon} size={24} />
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
              {mode === item.id && <Icon name="Check" size={19} />}
            </button>
          ))}
          <button
            className="entry-method-close"
            onClick={() => {
              setOpen(false);
              toggle.current?.focus();
            }}
          >
            收起
            <Icon name="ChevronDown" size={14} />
          </button>
        </div>
      )}
      <div className="quick-entry-dock">
        <div className="quick-entry-caption" aria-live="polite">
          <strong>{selected.label}</strong>
          <span>轻点记账 · 长按切换</span>
        </div>
        <button
          className={`entry-orb ${selected.color}`}
          aria-label={`开始${selected.label}，长按切换记账方式`}
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            held.current = false;
            origin.current = [event.clientX, event.clientY];
            cancelHold();
            timer.current = setTimeout(() => {
              held.current = true;
              setOpen(true);
            }, 480);
          }}
          onPointerMove={(event) => {
            if (
              origin.current &&
              Math.hypot(
                event.clientX - origin.current[0],
                event.clientY - origin.current[1],
              ) > 12
            ) {
              cancelHold();
              held.current = true;
            }
          }}
          onPointerUp={cancelHold}
          onPointerCancel={() => {
            cancelHold();
            held.current = true;
          }}
          onPointerLeave={cancelHold}
          onContextMenu={(event) => event.preventDefault()}
          onClick={() => {
            if (held.current) {
              held.current = false;
              return;
            }
            setOpen(false);
            actions[mode]();
          }}
        >
          <span className="orb-shine" />
          <Icon name={selected.icon} size={29} strokeWidth={2.3} />
          <span className="orb-plus">+</span>
        </button>
        <button
          className="entry-mode-toggle"
          ref={toggle}
          aria-label="切换记账方式"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? "X" : "ChevronDown"} size={15} />
        </button>
      </div>
    </div>
  );
}
