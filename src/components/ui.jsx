import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import { monthLabel, shiftMonth } from "../lib/ledger.js";

export function IconBadge({ category, small = false }) {
  return (
    <span className={`icon-badge ${category.color} ${small ? "small" : ""}`}>
      <Icon name={category.icon} size={small ? 18 : 21} />
    </span>
  );
}
export function EmptyState({
  icon = "Sprout",
  title = "这里还留着一点空白",
  text = "记下第一笔，让生活慢慢有迹可循。",
  action,
  label = "记下第一笔",
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={31} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="button secondary" onClick={action}>
          <Icon name="Plus" size={17} />
          {label}
        </button>
      )}
    </div>
  );
}
export function MonthPicker({ value, onChange }) {
  return (
    <div className="month-picker">
      <button
        className="icon-button"
        aria-label="上个月"
        onClick={() => onChange(shiftMonth(value, -1))}
      >
        <Icon name="ChevronLeft" size={17} />
      </button>
      <span>
        {value.slice(0, 4)} 年 {monthLabel(value)}
      </span>
      <button
        className="icon-button"
        aria-label="下个月"
        onClick={() => onChange(shiftMonth(value, 1))}
      >
        <Icon name="ChevronRight" size={17} />
      </button>
    </div>
  );
}
export function Modal({
  title,
  description,
  onClose,
  children,
  className = "",
}) {
  const ref = useRef(null);
  const titleId = useRef(`dialog-${globalThis.crypto.randomUUID()}`);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      if (dialog.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={titleId.current}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = ref.current.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <div>
          <h2 id={titleId.current}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button
          className="icon-button close-modal"
          onClick={onClose}
          aria-label="关闭"
        >
          <Icon name="X" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
