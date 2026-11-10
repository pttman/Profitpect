import Icon from "../components/Icon.jsx";
import Island from "../components/Island.jsx";
import { EmptyState } from "../components/ui.jsx";
import { EntryRow, CategoryBreakdown } from "../components/LedgerWidgets.jsx";
import { groupEntries, monthLabel, monthOf } from "../lib/ledger.js";
import { dateTitle } from "../lib/dates.js";

export default function HomePage({
  book,
  currentMonth,
  currentSummary,
  money,
  budget,
  setBudgetOpen,
  stage,
  allDays,
  entries,
  setDetail,
  setEditor,
  setMonth,
  setCategoryFilter,
  setTypeFilter,
  setQuery,
  setPage,
  selectCategory,
  setStoryOpen,
}) {
  return (
    <>
      <section
        className={`hero-grid ${!book.settings.island ? "no-island" : ""}`}
        aria-label="本月概况"
      >
        <article className="card overview-card">
          <div className="card-topline">
            <span className="section-kicker">
              <Icon name="Wallet" size={17} />
              这个月的生活账本
            </span>
            <span className="month-tag">
              <Icon name="CalendarDays" size={14} />
              {monthLabel(currentMonth)}
            </span>
          </div>
          <div className="expense-label">
            本月支出<span>人民币 · CNY</span>
          </div>
          <div className="hero-amount">
            <span>¥</span>
            {money(currentSummary.expense)}
          </div>
          <div className="income-summary">
            <span>
              <span className="tiny-icon">
                <Icon name="ArrowDownLeft" size={14} />
              </span>
              本月收入<strong>¥ {money(currentSummary.income)}</strong>
            </span>
            <span>
              <span className="tiny-icon neutral">
                <Icon name="Wallet" size={13} />
              </span>
              本月结余<strong>¥ {money(currentSummary.balance)}</strong>
            </span>
          </div>
          <div className="budget-block">
            <div className="budget-top">
              <span>
                {budget ? (
                  <>
                    <i className="budget-dot" />
                    本月预算 <strong>¥ {money(budget)}</strong>
                  </>
                ) : (
                  "给花销定一个温柔的边界"
                )}
              </span>
              <button
                className="text-button"
                onClick={() => setBudgetOpen(true)}
              >
                {budget ? "调整预算" : "设置预算"}
                <Icon name="ChevronRight" size={13} />
              </button>
            </div>
            <div className="budget-track">
              <span
                className={
                  currentSummary.expense > budget && budget ? "over" : ""
                }
                style={{
                  width: budget
                    ? `${Math.min((currentSummary.expense / budget) * 100, 100)}%`
                    : "0%",
                }}
              />
            </div>
            <div className="budget-bottom">
              <span>
                {budget
                  ? currentSummary.expense > budget
                    ? `本月比预算多 ¥ ${money(currentSummary.expense - budget)}`
                    : `还可以从容安排 ¥ ${money(budget - currentSummary.expense)}`
                  : "随时可设置，不影响记账"}
              </span>
              <strong>
                {budget
                  ? book.settings.hidden
                    ? "••%"
                    : `${Math.round((currentSummary.expense / budget) * 100)}%`
                  : "慢慢来就好"}
              </strong>
            </div>
          </div>
        </article>
        {book.settings.island && (
          <article className="island-card">
            <div className="island-heading">
              <span>
                <Icon name="Sprout" size={17} />
                生活在悄悄生长
              </span>
              <span className="island-badge">
                <span />
                {
                  [
                    "初见小岛",
                    "第一株植物",
                    "路边的长椅",
                    "树下的好时光",
                    "小灯塔亮了",
                  ][stage]
                }
              </span>
            </div>
            <Island stage={stage} />
            <div className="island-caption">
              <div>
                <h3>
                  {allDays
                    ? `已经留下 ${allDays} 天的小美好`
                    : "第一株植物，等你种下"}
                  <Icon name="Flower2" size={16} />
                </h3>
                <p>
                  {stage === 4
                    ? "灯塔亮了，生活还在继续。"
                    : "不必每天连续，回来就有新的生长。"}
                </p>
              </div>
              <div
                className="growth-dots"
                aria-label={`小岛成长阶段 ${stage} / 4`}
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <i className={index <= stage ? "lit" : ""} key={index} />
                ))}
              </div>
            </div>
          </article>
        )}
      </section>

      <section className="home-content-grid">
        <article className="card recent-card">
          <div className="section-heading">
            <h2>
              最近的生活记录
              <span className="count-chip">{currentSummary.count}</span>
            </h2>
            <button
              className="text-button"
              onClick={() => {
                setMonth(currentMonth);
                setCategoryFilter("all");
                setTypeFilter("all");
                setQuery("");
                setPage("bills");
              }}
            >
              全部账单
              <Icon name="ArrowRight" size={15} />
            </button>
          </div>
          {currentSummary.count ? (
            <>
              <div className="list-date">
                <span>
                  {dateTitle(
                    groupEntries(
                      entries.filter(
                        (entry) => monthOf(entry.date) === currentMonth,
                      ),
                    )[0][0],
                  )}
                </span>
                <small>日常里的小小片段</small>
              </div>
              <div className="entry-list">
                {groupEntries(
                  entries.filter(
                    (entry) => monthOf(entry.date) === currentMonth,
                  ),
                )
                  .flatMap(([, rows]) => rows)
                  .slice(0, 4)
                  .map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onClick={setDetail}
                      money={money}
                    />
                  ))}
              </div>
              <button className="continue-button" onClick={() => setEditor({})}>
                <Icon name="Plus" size={17} />
                再添一笔生活
              </button>
            </>
          ) : (
            <EmptyState action={() => setEditor({})} />
          )}
        </article>
        <article className="card category-card">
          <div className="section-heading">
            <h2>钱都去了哪里</h2>
            <span className="subtle-label">本月支出</span>
          </div>
          <CategoryBreakdown
            summary={currentSummary}
            money={money}
            onSelect={selectCategory}
            compact
          />
          {currentSummary.categories.length > 0 && (
            <button
              className="category-footer"
              onClick={() => {
                setMonth(currentMonth);
                setPage("stats");
              }}
            >
              看看完整的生活轮廓
              <Icon name="ArrowUpRight" size={16} />
            </button>
          )}
        </article>
      </section>
      <button className="story-banner" onClick={() => setStoryOpen(true)}>
        <span className="story-symbol">
          <Icon name="BookOpen" size={27} strokeWidth={1.3} />
          <i />
        </span>
        <span>
          <strong>{monthLabel(currentMonth)}的生活，有自己的小故事</strong>
          <small>
            {currentSummary.count
              ? "把零散的记录，拼成一份温暖的月度手记。"
              : "故事不必精彩，认真记下的日常就很好。"}
          </small>
        </span>
        <span className="story-link">
          翻开这页
          <Icon name="ArrowRight" size={17} />
        </span>
      </button>
    </>
  );
}
