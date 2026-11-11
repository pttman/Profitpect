import HomePage from "./pages/HomePage.jsx";
import BillsPage from "./pages/BillsPage.jsx";
import StatsPage from "./pages/StatsPage.jsx";
import PocketPage from "./pages/PocketPage.jsx";
import { dayOfWeek } from "./lib/dates.js";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./components/Icon.jsx";
import EntryDialog from "./components/EntryDialog.jsx";
import SmartEntry from "./components/SmartEntry.jsx";
import QuickEntry from "./components/QuickEntry.jsx";
import { EmptyState, IconBadge, Modal } from "./components/ui.jsx";
import {
  categoryOf,
  formatMoney,
  groupEntries,
  monthLabel,
  monthOf,
  parseAmount,
  summarize,
  today,
  validateEntry,
} from "./lib/ledger.js";
import {
  createLedger,
  downloadFile,
  loadLedger,
  saveLedger,
  STORAGE_KEY,
  validateLedger,
  readRawLedger,
} from "./lib/storage.js";
import { demoEntries } from "./lib/demo.js";

const NAV = [
  { id: "home", label: "我的小岛", icon: "House", hint: "今天，也好好生活" },
  {
    id: "bills",
    label: "账单手记",
    icon: "ReceiptText",
    hint: "每一笔，都有迹可循",
  },
  {
    id: "stats",
    label: "收支洞察",
    icon: "ChartNoAxesCombined",
    hint: "慢慢看懂钱的去处",
  },
  { id: "wallet", label: "我的口袋", icon: "Wallet", hint: "把日常收拾妥帖" },
];
function BudgetDialog({ value, onSave, onClose, demo }) {
  const [amount, setAmount] = useState(value ? (value / 100).toFixed(2) : "");
  const [error, setError] = useState("");
  return (
    <Modal
      title="给这个月留一点余地"
      description={
        demo
          ? "设置后开启你的空白账本，示例数据不会带入。"
          : "预算是温柔的参考，不是生活的标准答案。"
      }
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSave(parseAmount(amount));
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <label className="field-label" htmlFor="budget-input">
          本月总预算（元）
        </label>
        <input
          className="text-input large"
          id="budget-input"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="例如 6000"
          autoFocus
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="field-hint">本框架仅设置当前月预算，历史月份保持不变。</p>
        <button className="button primary full-width" type="submit">
          保存预算
          <Icon name="Check" size={18} />
        </button>
      </form>
    </Modal>
  );
}

export default function App() {
  const initial = useMemo(() => loadLedger(), []);
  const [book, setBook] = useState(initial.data ?? createLedger());
  const [storageError, setStorageError] = useState(initial.error);
  const baseRef = useRef(null);
  const [page, setPage] = useState("home");
  const [month, setMonth] = useState(monthOf(today()));
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editor, setEditor] = useState(null);
  const [smartOpen, setSmartOpen] = useState(false);
  const [paymentSetupRequested, setPaymentSetupRequested] = useState(false);
  const [detail, setDetail] = useState(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [restore, setRestore] = useState(null);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [restoreBackedUp, setRestoreBackedUp] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const importRef = useRef(null);
  const demo = !book.started;
  const entries = useMemo(
    () => (demo ? demoEntries() : book.entries),
    [demo, book.entries],
  );
  const currentMonth = monthOf(today());
  const summary = useMemo(
    () => summarize(entries, page === "home" ? currentMonth : month),
    [entries, page, month, currentMonth],
  );
  const currentSummary = useMemo(
    () => summarize(entries, currentMonth),
    [entries, currentMonth],
  );
  const budget = demo ? 600000 : (book.budgets[currentMonth] ?? 0);
  const allDays = new Set(entries.map((entry) => entry.date)).size;
  const stage = demo ? 3 : book.unlockedStage;
  const money = (cents) => (book.settings.hidden ? "••••" : formatMoney(cents));
  const filtered = entries.filter(
    (entry) =>
      monthOf(entry.date) === month &&
      (typeFilter === "all" || entry.type === typeFilter) &&
      (categoryFilter === "all" || entry.category === categoryFilter) &&
      (!query ||
        `${entry.note} ${categoryOf(entry.category).name} 日常账户`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const groups = groupEntries(filtered);

  useEffect(() => {
    try {
      baseRef.current = readRawLedger();
    } catch {
      setStorageError(
        "当前浏览器无法读写本地存储，请更换浏览器或退出隐私模式后再记账。",
      );
    }
    function sync(event) {
      if (event.key !== STORAGE_KEY) return;
      const loaded = loadLedger();
      if (loaded.error) {
        setStorageError(loaded.error);
        return;
      }
      baseRef.current = event.newValue;
      setBook(loaded.data);
      setToast({
        text: globalThis.XiaozhangAndroid
          ? "已同步付款记账结果"
          : "已更新另一页面的账本变化",
        kind: "info",
      });
    }
    window.addEventListener("storage", sync);
    const nativeTimer = globalThis.XiaozhangAndroid
      ? setInterval(() => {
          const raw = readRawLedger();
          if (raw !== baseRef.current)
            sync({ key: STORAGE_KEY, newValue: raw });
        }, 1500)
      : null;
    return () => {
      window.removeEventListener("storage", sync);
      clearTimeout(toastTimer.current);
      clearInterval(nativeTimer);
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduce-motion",
      book.settings.reduceMotion,
    );
  }, [book.settings.reduceMotion]);
  useEffect(() => {
    if (page === "wallet" && paymentSetupRequested) {
      document
        .getElementById("payment-settings")
        ?.scrollIntoView({ block: "start" });
      setPaymentSetupRequested(false);
    }
  }, [page, paymentSetupRequested]);

  function notify(text, undo) {
    clearTimeout(toastTimer.current);
    setToast({ text, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 10000 : 4500);
  }
  function commit(next, text, undoable = false) {
    if (storageError) {
      notify("本地账本暂不可写，请先处理存储异常");
      return false;
    }
    try {
      if (readRawLedger() !== baseRef.current) {
        const loaded = loadLedger();
        if (loaded.error) {
          setStorageError(loaded.error);
          return false;
        }
        setBook(loaded.data);
        baseRef.current = readRawLedger();
        notify("另一页面刚刚修改了账本，已更新，请重试");
        return false;
      }
      const previous = book;
      saveLedger(next, baseRef.current);
      const savedRaw = JSON.stringify(next);
      baseRef.current = savedRaw;
      setBook(next);
      if (text)
        notify(
          text,
          undoable
            ? () => {
                if (readRawLedger() !== savedRaw) {
                  notify("账本已有后续变化，无法撤销这一笔");
                  return;
                }
                try {
                  saveLedger(previous, savedRaw);
                  baseRef.current = JSON.stringify(previous);
                  setBook(previous);
                  notify("已撤销，账本已恢复");
                } catch {
                  notify("撤销失败，请检查存储空间后重试");
                }
              }
            : undefined,
        );
      return true;
    } catch {
      notify("保存失败，请检查设备存储空间。你的输入仍保留。");
      return false;
    }
  }
  function startBook() {
    commit(
      { ...createLedger(), started: true, settings: book.settings },
      "你的小岛准备好了，从第一笔开始吧",
    );
  }
  function saveEntry(candidate, continueAdding) {
    try {
      validateEntry(candidate);
      if (
        candidate.paymentId &&
        !candidate.id &&
        (book.paymentReceipts ?? []).includes(candidate.paymentId)
      ) {
        notify("这笔付款已经处理，无需重复记账");
        return false;
      }
      if (candidate.id) {
        const existing = book.entries.find((item) => item.id === candidate.id);
        if (!existing || existing.updatedAt !== candidate.updatedAt) {
          notify("这笔记录已在其他位置变化，请关闭后重新打开");
          return false;
        }
      }
      const entry = {
        ...candidate,
        id: candidate.id ?? crypto.randomUUID(),
        createdAt: candidate.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const nextEntries = candidate.id
        ? book.entries.map((item) => (item.id === candidate.id ? entry : item))
        : [...book.entries, entry];
      const days = new Set(nextEntries.map((item) => item.date)).size;
      const newStage =
        days >= 14 ? 4 : days >= 7 ? 3 : days >= 3 ? 2 : days >= 1 ? 1 : 0;
      const next = {
        ...book,
        started: true,
        entries: nextEntries,
        unlockedStage: Math.max(book.unlockedStage, newStage),
        paymentReceipts: candidate.paymentId
          ? [...new Set([...(book.paymentReceipts ?? []), candidate.paymentId])]
          : (book.paymentReceipts ?? []),
      };
      if (
        !commit(
          next,
          `${candidate.id ? "已修改" : "已记下"} ¥${money(entry.amount)} · ${categoryOf(entry.category).name}`,
          true,
        )
      )
        return false;
      if (!continueAdding) setEditor(null);
      return true;
    } catch (err) {
      notify(err.message);
      return false;
    }
  }
  function deleteEntry(entry) {
    if (
      !window.confirm(
        `删除 ${entry.date} 的这笔 ${formatMoney(entry.amount)} 元记录？`,
      )
    )
      return;
    if (
      commit(
        {
          ...book,
          entries: book.entries.filter((item) => item.id !== entry.id),
        },
        "已删除这笔记录",
        true,
      )
    )
      setDetail(null);
  }
  function toggleSetting(key) {
    commit({
      ...book,
      settings: { ...book.settings, [key]: !book.settings[key] },
    });
  }
  function selectCategory(category) {
    setMonth(page === "home" ? currentMonth : month);
    setCategoryFilter(category);
    setTypeFilter("expense");
    setQuery("");
    setPage("bills");
  }
  function exportBackup() {
    downloadFile(
      `小账岛-完整备份-${today()}.json`,
      JSON.stringify(book, null, 2),
    );
    notify("备份已生成，请妥善保存到账本以外的位置");
  }
  function exportCSV() {
    const cell = (value) => {
      let text = String(value);
      if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const rows = [
      ["记录ID", "发生日期", "类型", "金额（元）", "分类", "账户", "备注"],
      ...book.entries.map((entry) => [
        entry.id,
        entry.date,
        entry.type === "expense" ? "支出" : "收入",
        (entry.amount / 100).toFixed(2),
        categoryOf(entry.category).name,
        "日常账户",
        entry.note,
      ]),
    ];
    downloadFile(
      `小账岛-全部明细-${today()}.csv`,
      "\ufeff" + rows.map((row) => row.map(cell).join(",")).join("\r\n"),
      "text/csv;charset=utf-8",
    );
    notify("已导出你的全部正式账单，示例未包含在内");
  }
  async function readBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notify("备份文件超过 5 MB，当前框架暂不支持");
      return;
    }
    try {
      const data = validateLedger(JSON.parse(await file.text()));
      setRestore(data);
      setBackupConfirmed(false);
      setRestoreBackedUp(false);
    } catch (err) {
      notify(
        `未恢复：${err instanceof SyntaxError ? "文件不是有效的 JSON 备份" : err.message}`,
      );
    }
  }

  function openDraft(draft) {
    setSmartOpen(false);
    setEditor({ draft });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            setPage("home");
          }}
        >
          <span className="brand-mark">
            <Icon name="Leaf" size={26} />
          </span>
          <span>
            <strong>
              小账岛<span className="brand-dot">.</span>
            </strong>
            <small>慢慢记，好好生活</small>
          </span>
        </a>
        <span className="nav-caption">你的生活小账本</span>
        <nav aria-label="主导航">
          {NAV.map((nav) => (
            <button
              key={nav.id}
              className={`nav-item ${page === nav.id ? "active" : ""}`}
              aria-current={page === nav.id ? "page" : undefined}
              onClick={() => setPage(nav.id)}
            >
              <Icon name={nav.icon} size={21} />
              <span>{nav.label}</span>
              {page === nav.id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-drawing">
            <Icon name="Sprout" size={35} strokeWidth={1.3} />
            <span />
          </span>
          <p>
            生活不是一道算术题，
            <br />
            每一份小确幸都算数。
          </p>
          <small>take it slow, let it grow.</small>
        </div>
        <div className="sidebar-bottom">
          <span className="local-dot" />
          <span>只在本机，安心记录</span>
          <button
            className="icon-button"
            aria-label="关于小账岛"
            onClick={() => setAboutOpen(true)}
          >
            <Icon name="CircleHelp" size={16} />
          </button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>我的生活</span>
            <Icon name="ChevronRight" size={13} />
            <strong>{NAV.find((item) => item.id === page).label}</strong>
          </div>
          <div className="topbar-actions">
            <span className="weather">
              <Icon name="CloudSun" size={20} />
              宜记录，宜好好生活
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label={book.settings.hidden ? "显示金额" : "隐藏金额"}
              onClick={() => toggleSetting("hidden")}
            >
              <Icon name={book.settings.hidden ? "EyeOff" : "Eye"} size={19} />
            </button>
            <button
              className="avatar"
              aria-label="打开我的口袋"
              onClick={() => setPage("wallet")}
            >
              <Icon name="Sprout" size={19} />
            </button>
          </div>
        </header>
        <main id="main-content">
          {storageError && (
            <div className="storage-alert" role="alert">
              <Icon name="Info" />
              <span>{storageError}</span>
              <button
                className="text-button"
                onClick={() => {
                  try {
                    downloadFile(
                      `小账岛-原始数据-${today()}.txt`,
                      readRawLedger() ?? "",
                    );
                  } catch {
                    notify("当前浏览器无法访问存储");
                  }
                }}
              >
                导出原始数据
              </button>
            </div>
          )}
          {demo && (
            <div className="demo-banner">
              <span>
                <Icon name="Sparkles" size={16} />
                <strong>小岛初遇</strong>
                <span>你正在浏览示例账本，记录属于你的第一笔吧。</span>
              </span>
              <button onClick={startBook}>
                开启我的账本
                <Icon name="ArrowRight" size={15} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {page === "home"
                  ? `${today().slice(0, 4)} 年 ${Number(today().slice(5, 7))} 月 ${Number(today().slice(8))} 日 · ${dayOfWeek(today())}`
                  : NAV.find((item) => item.id === page).hint}
              </span>
              <h1>
                {page === "home" ? (
                  <>
                    慢慢记，<span>好好生活。</span>
                  </>
                ) : page === "bills" ? (
                  "每一笔，都是生活。"
                ) : page === "stats" ? (
                  "看见生活的轮廓。"
                ) : (
                  "把日常，收拾妥帖。"
                )}
              </h1>
              <p>
                {page === "home"
                  ? "钱有去处，日子有回响。今天也从一笔小记录开始。"
                  : page === "bills"
                    ? "一杯咖啡，一段路，都是你认真生活的痕迹。"
                    : page === "stats"
                      ? "数字不评价生活，只帮你多了解自己一点。"
                      : "小小的口袋，装着属于你的安心。"}
              </p>
            </div>
          </div>

          {page === "home" && (
            <section className="smart-banner" aria-label="智能记账">
              <span className="smart-symbol">
                <Icon name="Sparkles" size={25} />
              </span>
              <div>
                <span className="smart-tag">少输入一点，多记住一点</span>
                <h2>一句话记账，付款也能自动记</h2>
                <p>
                  描述收支生成草稿，或识别安卓付款成功页面，让日常记录更轻松。
                </p>
              </div>
              <div className="smart-actions">
                <span className="smart-entry-hint">
                  右下角长按，切换记账方式
                  <Icon name="ArrowDownLeft" size={17} />
                </span>
                <button
                  className="text-button"
                  onClick={() => {
                    setPage("wallet");
                    setPaymentSetupRequested(true);
                  }}
                >
                  设置付款识别
                  <Icon name="ArrowRight" size={16} />
                </button>
              </div>
            </section>
          )}

          {page === "home" && (
            <HomePage
              book={book}
              currentMonth={currentMonth}
              currentSummary={currentSummary}
              money={money}
              budget={budget}
              setBudgetOpen={setBudgetOpen}
              stage={stage}
              allDays={allDays}
              entries={entries}
              setDetail={setDetail}
              setEditor={setEditor}
              setMonth={setMonth}
              setCategoryFilter={setCategoryFilter}
              setTypeFilter={setTypeFilter}
              setQuery={setQuery}
              setPage={setPage}
              selectCategory={selectCategory}
              setStoryOpen={setStoryOpen}
            />
          )}

          {page === "bills" && (
            <BillsPage
              month={month}
              setMonth={setMonth}
              query={query}
              setQuery={setQuery}
              filtersOpen={filtersOpen}
              setFiltersOpen={setFiltersOpen}
              summary={summary}
              money={money}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              groups={groups}
              setDetail={setDetail}
              setEditor={setEditor}
            />
          )}

          {page === "stats" && (
            <StatsPage
              month={month}
              setMonth={setMonth}
              summary={summary}
              money={money}
              entries={entries}
              selectCategory={selectCategory}
            />
          )}

          {page === "wallet" && (
            <PocketPage
              money={money}
              entries={entries}
              setAboutOpen={setAboutOpen}
              book={book}
              toggleSetting={toggleSetting}
              exportBackup={exportBackup}
              importRef={importRef}
              exportCSV={exportCSV}
              onDraft={openDraft}
            />
          )}

          <footer className="page-footer">
            <span>
              <Icon name="Leaf" size={13} />
              每一笔认真，都在让生活变好一点。
            </span>
            <span>小账岛 · 愿你从容</span>
          </footer>
        </main>
      </div>

      <QuickEntry
        onManual={() => setEditor({})}
        onAI={() => setSmartOpen(true)}
        onPayment={() => {
          setPage("wallet");
          setPaymentSetupRequested(true);
        }}
        disabled={
          !!editor ||
          smartOpen ||
          !!detail ||
          budgetOpen ||
          storyOpen ||
          aboutOpen ||
          !!restore
        }
      />
      <nav className="mobile-nav" aria-label="移动主导航">
        {NAV.map((item) => (
          <button
            className={page === item.id ? "active" : ""}
            key={item.id}
            aria-current={page === item.id ? "page" : undefined}
            onClick={() => setPage(item.id)}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <input
        ref={importRef}
        className="sr-only"
        type="file"
        accept=".json,application/json"
        onChange={readBackup}
        aria-label="选择小账岛备份文件"
      />
      {editor && (
        <EntryDialog
          key={editor.id ?? (editor.draft ? "draft" : "new")}
          entry={editor.id ? editor : undefined}
          draft={editor.draft}
          onSave={saveEntry}
          onClose={() => setEditor(null)}
          demo={demo}
        />
      )}
      {smartOpen && (
        <SmartEntry onClose={() => setSmartOpen(false)} onDraft={openDraft} />
      )}
      {budgetOpen && (
        <BudgetDialog
          demo={demo}
          value={demo ? 0 : budget}
          onClose={() => setBudgetOpen(false)}
          onSave={(value) => {
            if (
              commit(
                {
                  ...book,
                  started: true,
                  budgets: { ...book.budgets, [currentMonth]: value },
                },
                "预算已设置，给生活留一点从容",
              )
            )
              setBudgetOpen(false);
          }}
        />
      )}
      {detail && (
        <Modal
          title={demo ? "示例里的生活小记" : "生活里的一笔"}
          description={`${detail.date} · ${dayOfWeek(detail.date)}`}
          onClose={() => setDetail(null)}
        >
          <div className="entry-detail">
            <IconBadge category={categoryOf(detail.category)} />
            <h3>{detail.note || categoryOf(detail.category).name}</h3>
            <strong className={detail.type === "income" ? "income" : ""}>
              {detail.type === "income" ? "+" : "−"} ¥ {money(detail.amount)}
            </strong>
            <dl>
              <div>
                <dt>类型</dt>
                <dd>{detail.type === "income" ? "收入" : "支出"}</dd>
              </div>
              <div>
                <dt>分类</dt>
                <dd>{categoryOf(detail.category).name}</dd>
              </div>
              <div>
                <dt>账户</dt>
                <dd>日常账户</dd>
              </div>
              {detail.paymentId && (
                <div>
                  <dt>记录来源</dt>
                  <dd>
                    {detail.source === "wechat" ? "微信" : "支付宝"}
                    {detail.captureMethod === "page" ? "付款页面" : "付款通知"}
                  </dd>
                </div>
              )}
            </dl>
          </div>
          {demo ? (
            <>
              <p className="field-hint">这是示例记录，不会进入你的正式账本。</p>
              <button
                className="button primary full-width"
                onClick={() => {
                  startBook();
                  setDetail(null);
                }}
              >
                开启我的账本
                <Icon name="ArrowRight" size={17} />
              </button>
            </>
          ) : (
            <div className="detail-actions">
              <button
                className="button danger"
                onClick={() => deleteEntry(detail)}
              >
                <Icon name="Trash2" size={16} />
                删除
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setEditor(detail);
                  setDetail(null);
                }}
              >
                <Icon name="Pencil" size={16} />
                修改这一笔
              </button>
            </div>
          )}
        </Modal>
      )}
      {storyOpen && (
        <Modal
          title={`${monthLabel(currentMonth)}，生活有自己的节奏`}
          description="本月进行中 · 只讲述你已记录的日常"
          onClose={() => setStoryOpen(false)}
          className="story-modal"
        >
          <div className="story-art">
            <Icon name="BookOpen" size={44} strokeWidth={1} />
            <Icon name="Sparkles" size={20} />
          </div>
          {currentSummary.count ? (
            <>
              <p className="story-prose">
                这个月，你留下了 <strong>{currentSummary.days} 天</strong>
                的记录，
                <br />
                收好了 <strong>{currentSummary.count} 笔</strong>生活里的小事。
              </p>
              <p className="story-prose">
                支出 <strong>¥ {money(currentSummary.expense)}</strong>，<br />
                {currentSummary.categories.length ? (
                  <>
                    <strong>{currentSummary.categories[0].name}</strong>
                    是支出最多的分类。
                  </>
                ) : (
                  "这个月暂时还没有支出记录。"
                )}
              </p>
              <p className="story-ending">
                不必追赶谁的步调，
                <br />
                认真过的每一天，都自有回响。
              </p>
            </>
          ) : (
            <EmptyState
              title="故事，就从第一笔开始"
              text="这里会慢慢收集你的生活轨迹。"
              action={() => {
                setStoryOpen(false);
                setEditor({});
              }}
            />
          )}
        </Modal>
      )}
      {aboutOpen && (
        <Modal
          title="欢迎来到小账岛"
          description="慢慢记，好好生活。"
          onClose={() => setAboutOpen(false)}
        >
          <div className="about-copy">
            <p>
              这是一份轻量的日常收支手记。你可以记下收入与支出，看看预算和分类，让小岛随着记录慢慢生长。
            </p>
            <p>
              当前是可运行的首版框架，支持单账户手工记账。转账、退款、多账户、离线安装与云同步仍在准备中，请先保留自己的完整原始流水。
            </p>
            <p>
              账本保存在当前设备：网页版使用浏览器存储，安卓包使用应用本地存储。清理数据、卸载应用或更换设备可能导致数据无法保留，请定期导出完整备份。
            </p>
            <p className="about-signature">
              <Icon name="Leaf" size={18} />
              不催促，不评判。回来，就有新的生长。
            </p>
          </div>
        </Modal>
      )}
      {restore && (
        <Modal
          title="把小岛从备份带回来"
          description="恢复将替换当前账本，无法使用单笔撤销。"
          onClose={() => setRestore(null)}
        >
          <div className="restore-summary">
            <Icon name="FileJson" size={27} />
            <span>
              <strong>已校验 {restore.entries.length} 笔记录</strong>
              <small>包含预算、显示设置与小岛进度</small>
            </span>
          </div>
          <p className="field-hint">
            先导出现有账本并保存好，再确认替换。备份未完成时，请取消本次恢复。
          </p>
          <button
            className="button outline full-width"
            onClick={() => {
              exportBackup();
              setRestoreBackedUp(true);
            }}
          >
            <Icon name="Download" size={18} />
            下载现有账本的安全备份
          </button>
          <label className="checkbox-label restore-check">
            <input
              type="checkbox"
              disabled={!restoreBackedUp}
              checked={backupConfirmed}
              onChange={(event) => setBackupConfirmed(event.target.checked)}
            />
            我已保存安全备份，理解恢复会替换当前数据
          </label>
          <button
            className="button primary full-width"
            disabled={!backupConfirmed}
            onClick={() => {
              if (commit(restore, "小岛回来了，备份已完整恢复")) {
                setRestore(null);
                setToast({ text: "小岛回来了，备份已完整恢复" });
              }
            }}
          >
            确认替换并恢复
          </button>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Icon name="Check" size={15} />
          </span>
          <span>{toast.text}</span>
          {toast.undo && (
            <button onClick={toast.undo}>
              <Icon name="RotateCcw" size={14} />
              撤销
            </button>
          )}
          <button
            className="toast-close"
            aria-label="关闭提示"
            onClick={() => setToast(null)}
          >
            <Icon name="X" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
