import Icon from "../components/Icon.jsx";
import PaymentSettings from "../components/PaymentSettings.jsx";

export default function PocketPage({
  money,
  entries,
  setAboutOpen,
  book,
  toggleSetting,
  exportBackup,
  importRef,
  exportCSV,
  onDraft,
}) {
  return (
    <>
      <section className="wallet-grid">
        <article className="card account-card">
          <div className="section-heading">
            <h2>我的日常账户</h2>
            <Icon name="Wallet" size={22} />
          </div>
          <span className="subtle-label">手工账面余额 · 期初为 ¥0.00</span>
          <strong className="account-balance">
            <small>¥</small>
            {money(
              entries.reduce(
                (sum, entry) =>
                  sum +
                  (entry.type === "income" ? entry.amount : -entry.amount),
                0,
              ),
            )}
          </strong>
          <div className="account-foot">
            <span>
              <i />
              日常账户
            </span>
            <small>可能与实际余额不同</small>
          </div>
        </article>
        <article className="card privacy-card">
          <span className="privacy-icon">
            <Icon name="ShieldCheck" size={29} />
          </span>
          <h2>你的小账本，只属于你</h2>
          <p>
            无需登录，账本保存在当前设备。
            <br />
            换设备、卸载或清理数据前，记得带走备份。
          </p>
          <button className="text-button" onClick={() => setAboutOpen(true)}>
            了解这个小岛
            <Icon name="ArrowRight" size={15} />
          </button>
        </article>
      </section>
      <PaymentSettings onDraft={onDraft} money={money} started={book.started} />
      <section className="settings-grid">
        <article className="card">
          <div className="section-heading">
            <h2>按你喜欢的样子</h2>
            <Icon name="Settings2" size={18} />
          </div>
          {[
            {
              key: "hidden",
              icon: "EyeOff",
              title: "把金额藏起来",
              text: "首页、账单和统计同步隐藏金额",
            },
            {
              key: "island",
              icon: "Sprout",
              title: "让小岛陪着你",
              text: "显示小岛成长，关闭后仍可完整记账",
            },
            {
              key: "reduceMotion",
              icon: "Waves",
              title: "让画面安静一点",
              text: "减少页面动效，让记录更专注",
            },
          ].map((setting) => (
            <div className="setting-row" key={setting.key}>
              <Icon name={setting.icon} size={19} />
              <span>
                <strong>{setting.title}</strong>
                <small>{setting.text}</small>
              </span>
              <button
                className={`switch ${book.settings[setting.key] ? "on" : ""}`}
                role="switch"
                aria-checked={book.settings[setting.key]}
                aria-label={setting.title}
                onClick={() => toggleSetting(setting.key)}
              >
                <span />
              </button>
            </div>
          ))}
        </article>
        <article className="card">
          <div className="section-heading">
            <h2>把记录好好留住</h2>
            <Icon name="FileJson" size={18} />
          </div>
          <button className="data-action" onClick={exportBackup}>
            <span className="icon-badge small sage">
              <Icon name="Download" size={18} />
            </span>
            <span>
              <strong>导出完整备份</strong>
              <small>JSON 格式，可恢复账单和设置</small>
            </span>
            <Icon name="ChevronRight" size={17} />
          </button>
          <button
            className="data-action"
            onClick={() => importRef.current.click()}
          >
            <span className="icon-badge small blue">
              <Icon name="ArrowUpFromLine" size={18} />
            </span>
            <span>
              <strong>从备份找回小岛</strong>
              <small>校验后替换，需要先保存现有备份</small>
            </span>
            <Icon name="ChevronRight" size={17} />
          </button>
          <button className="data-action" onClick={exportCSV}>
            <span className="icon-badge small sand">
              <Icon name="ReceiptText" size={18} />
            </span>
            <span>
              <strong>导出账单表格</strong>
              <small>CSV 格式，适合自己整理与查看</small>
            </span>
            <Icon name="ChevronRight" size={17} />
          </button>
          <p className="backup-note">
            <Icon name="Info" size={13} />
            备份包含账务信息，文件未加密，请妥善保管。
          </p>
        </article>
      </section>
      <div className="version-note">
        <Icon name="Leaf" size={15} />
        小账岛 · 智能记账版 0.3<span>从简单的日常收支，慢慢开始。</span>
      </div>
    </>
  );
}
