import Icon from "../components/Icon.jsx";
import { EmptyState, MonthPicker } from "../components/ui.jsx";
import { DailyChart, CategoryBreakdown } from "../components/LedgerWidgets.jsx";
import { monthOf } from "../lib/ledger.js";

export default function StatsPage({
  month,
  setMonth,
  summary,
  money,
  entries,
  selectCategory,
}) {
  return (
    <>
      <div className="stats-toolbar">
        <MonthPicker value={month} onChange={setMonth} />
        <span>
          <Icon name="Info" size={14} />
          仅统计已记录的收支
        </span>
      </div>
      <div className="stat-cards">
        {[
          {
            name: "本月支出",
            amount: summary.expense,
            icon: "ArrowUpRight",
            color: "peach",
            detail: `${summary.count} 笔生活记录`,
          },
          {
            name: "本月收入",
            amount: summary.income,
            icon: "ArrowDownLeft",
            color: "sage",
            detail: "认真生活，也有收获",
          },
          {
            name: "收支结余",
            amount: summary.balance,
            icon: "Wallet",
            color: "blue",
            detail: "已记录收入减去支出",
          },
        ].map((item) => (
          <article className="card stat-card" key={item.name}>
            <div>
              <span>{item.name}</span>
              <span className={`icon-badge small ${item.color}`}>
                <Icon name={item.icon} size={18} />
              </span>
            </div>
            <strong>
              <small>¥</small>
              {money(item.amount)}
            </strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
      <section className="stats-detail-grid">
        <article className="card">
          <div className="section-heading">
            <h2>这一周的花销</h2>
            <span className="subtle-label">所选月份最近七天</span>
          </div>
          {entries.some(
            (entry) =>
              monthOf(entry.date) === month && entry.type === "expense",
          ) ? (
            <DailyChart entries={entries} month={month} money={money} />
          ) : (
            <EmptyState
              icon="ChartNoAxesCombined"
              title="等几笔日常，连成生活的曲线"
              text="该月还没有记录支出。"
            />
          )}
        </article>
        <article className="card">
          <div className="section-heading">
            <h2>支出分类</h2>
            <span className="subtle-label">点击查看明细</span>
          </div>
          <CategoryBreakdown
            summary={summary}
            money={money}
            onSelect={selectCategory}
          />
        </article>
      </section>
      <div className="insight-note">
        <Icon name="Leaf" size={19} />
        <p>
          {summary.categories.length ? (
            <>
              这个月，<strong>{summary.categories[0].name}</strong>
              占已记录支出的{" "}
              {Math.round(
                (summary.categories[0].amount / summary.expense) * 100,
              )}
              %。每一笔背后，都是生活的选择。
            </>
          ) : (
            "数字慢慢积累，你会看见属于自己的生活节奏。"
          )}
        </p>
      </div>
    </>
  );
}
