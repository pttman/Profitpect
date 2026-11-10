import Icon from "./Icon.jsx";
import { EmptyState, IconBadge } from "./ui.jsx";
import { categoryOf, monthOf, today, lastSevenDays } from "../lib/ledger.js";

export function EntryRow({ entry, onClick, money }) {
  const category = categoryOf(entry.category);
  return (
    <button className="entry-row" onClick={() => onClick(entry)}>
      <IconBadge category={category} />
      <span className="entry-description">
        <strong>{entry.note || category.name}</strong>
        <span>
          {category.name}
          <i />
          日常账户
        </span>
      </span>
      <span
        className={`entry-amount ${entry.type === "income" ? "income" : ""}`}
      >
        {entry.type === "income" ? "+" : "−"}
        {money(entry.amount)}
        <small>{entry.date.slice(5).replace("-", ".")}</small>
      </span>
      <Icon name="ChevronRight" size={16} className="entry-chevron" />
    </button>
  );
}

export function CategoryBreakdown({
  summary,
  money,
  onSelect,
  compact = false,
}) {
  if (!summary.categories.length)
    return (
      <EmptyState
        icon="ChartNoAxesCombined"
        title="生活的轮廓，慢慢浮现"
        text="记下支出后，就能看见钱花在哪里。"
      />
    );
  return (
    <div className={`category-breakdown ${compact ? "compact" : ""}`}>
      {summary.categories.slice(0, compact ? 4 : 10).map((category) => (
        <button
          className="breakdown-item"
          key={category.id}
          onClick={() => onSelect(category.id)}
        >
          <IconBadge category={category} small />
          <span className="breakdown-info">
            <span>
              <strong>{category.name}</strong>
              <small>
                {Math.round((category.amount / summary.expense) * 100)}%
              </small>
            </span>
            <span className={`mini-track ${category.color}`}>
              <span
                style={{
                  width: `${(category.amount / summary.expense) * 100}%`,
                }}
              />
            </span>
          </span>
          <span className="breakdown-amount">¥{money(category.amount)}</span>
        </button>
      ))}
    </div>
  );
}

export function DailyChart({ entries, month, money }) {
  const anchor =
    month === monthOf(today())
      ? today()
      : `${month}-${new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()}`;
  const days = lastSevenDays(anchor);
  const amounts = days.map((day) =>
    entries
      .filter(
        (entry) =>
          entry.date === day &&
          monthOf(entry.date) === month &&
          entry.type === "expense",
      )
      .reduce((sum, entry) => sum + entry.amount, 0),
  );
  const max = Math.max(...amounts, 10000);
  return (
    <div className="daily-chart">
      <div className="chart-legend">
        <span>
          <i />
          每日支出
        </span>
        <small>
          {days[0].slice(5).replace("-", ".")} —{" "}
          {days.at(-1).slice(5).replace("-", ".")}
        </small>
      </div>
      <svg
        viewBox="0 0 640 235"
        role="img"
        aria-label={days
          .map((day, index) => `${day} 支出 ${money(amounts[index])} 元`)
          .join("；")}
      >
        {[0, 1, 2, 3].map((step) => (
          <g key={step}>
            <line
              x1="60"
              x2="625"
              y1={25 + step * 50}
              y2={25 + step * 50}
              stroke="#e9ede6"
              strokeDasharray="4 5"
            />
            <text x="48" y={30 + step * 50} textAnchor="end">
              {money(Math.round((max * (3 - step)) / 3))}
            </text>
          </g>
        ))}
        {days.map((day, index) => (
          <g key={day}>
            <rect
              x={85 + index * 78}
              y={175 - (amounts[index] / max) * 145}
              width="26"
              height={Math.max((amounts[index] / max) * 145, 2)}
              rx="6"
              fill={index === 6 ? "#4d816e" : "#c8d9bd"}
            />
            <text x={98 + index * 78} y="209" textAnchor="middle">
              {day.slice(5).replace("-", ".")}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
