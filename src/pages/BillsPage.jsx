import Icon from "../components/Icon.jsx";
import { EmptyState, MonthPicker } from "../components/ui.jsx";
import { EntryRow } from "../components/LedgerWidgets.jsx";
import { CATEGORIES, INCOME_CATEGORIES } from "../lib/ledger.js";
import { dateTitle, dayOfWeek } from "../lib/dates.js";

export default function BillsPage({
  month,
  setMonth,
  query,
  setQuery,
  filtersOpen,
  setFiltersOpen,
  summary,
  money,
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
  groups,
  setDetail,
  setEditor,
}) {
  return (
    <section className="card bills-card">
      <div className="bills-toolbar">
        <MonthPicker value={month} onChange={setMonth} />
        <div className="bill-tools">
          <label className="search-box">
            <Icon name="Search" size={17} />
            <input
              aria-label="搜索账单"
              placeholder="搜搜生活里的某一笔"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                className="icon-button"
                onClick={() => setQuery("")}
                aria-label="清除搜索"
              >
                <Icon name="X" size={14} />
              </button>
            )}
          </label>
          <button
            className={`button outline filter-button ${filtersOpen ? "selected" : ""}`}
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
          >
            <Icon name="SlidersHorizontal" size={17} />
            筛选
          </button>
        </div>
      </div>
      <div className="bill-summary">
        <span>
          本月支出<strong>¥ {money(summary.expense)}</strong>
        </span>
        <span>
          本月收入<strong className="income">¥ {money(summary.income)}</strong>
        </span>
        <span>
          记录<strong>{summary.count} 笔</strong>
        </span>
      </div>
      {(filtersOpen || categoryFilter !== "all" || typeFilter !== "all") && (
        <div className="filter-panel">
          <div className="filter-chips">
            {[
              ["all", "全部类型"],
              ["expense", "支出"],
              ["income", "收入"],
            ].map(([value, text]) => (
              <button
                key={value}
                className={typeFilter === value ? "active" : ""}
                onClick={() => {
                  setTypeFilter(value);
                  setCategoryFilter("all");
                }}
              >
                {text}
              </button>
            ))}
          </div>
          <label>
            分类
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">全部分类</option>
              {(typeFilter === "income"
                ? INCOME_CATEGORIES
                : typeFilter === "expense"
                  ? CATEGORIES
                  : [...CATEGORIES, ...INCOME_CATEGORIES]
              ).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="text-button"
            onClick={() => {
              setCategoryFilter("all");
              setTypeFilter("all");
              setQuery("");
            }}
          >
            重置条件
          </button>
        </div>
      )}
      {groups.length ? (
        groups.map(([date, rows]) => (
          <div className="bill-group" key={date}>
            <div className="bill-group-heading">
              <h3>
                {dateTitle(date)}
                <span>
                  {date.slice(5).replace("-", ".")} · {dayOfWeek(date)}
                </span>
              </h3>
              <span>
                支出 ¥{" "}
                {money(
                  rows
                    .filter((entry) => entry.type === "expense")
                    .reduce((sum, entry) => sum + entry.amount, 0),
                )}
              </span>
            </div>
            {rows.map((entry) => (
              <EntryRow
                entry={entry}
                key={entry.id}
                onClick={setDetail}
                money={money}
              />
            ))}
          </div>
        ))
      ) : (
        <EmptyState
          icon="ReceiptText"
          title={
            query || categoryFilter !== "all"
              ? "没有找到这一笔"
              : "这一页，等你慢慢填写"
          }
          text={
            query || categoryFilter !== "all"
              ? "换个关键词，或清除筛选条件试试。"
              : "没有记录不代表没有生活，想起来就记一笔吧。"
          }
          action={() =>
            query || categoryFilter !== "all"
              ? (setQuery(""), setCategoryFilter("all"), setTypeFilter("all"))
              : setEditor({})
          }
          label={query || categoryFilter !== "all" ? "清除筛选" : "记下第一笔"}
        />
      )}
    </section>
  );
}
