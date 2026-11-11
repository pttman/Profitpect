import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";

export default function PaymentSettings({ onDraft, money, started }) {
  const native = globalThis.XiaozhangAndroid;
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  function refresh() {
    if (!native) return;
    try {
      setState(JSON.parse(native.paymentState()));
    } catch {
      setError("暂时无法读取安卓授权状态，请重新打开应用");
    }
  }
  useEffect(() => {
    refresh();
    if (!native) return;
    const timer = setInterval(refresh, 2000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  function configure(enabled, automatic) {
    try {
      const result = JSON.parse(native.configurePayments(enabled, automatic));
      if (result.error) throw new Error(result.error);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }
  function configurePages(enabled, automatic) {
    try {
      const result = JSON.parse(
        native.configurePagePayments(enabled, automatic),
      );
      if (result.error) throw new Error(result.error);
      setError("");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <article className="card payment-card" id="payment-settings">
      <div className="section-heading">
        <h2>
          <Icon name="ShieldCheck" size={19} /> 安卓付款记账
        </h2>
        <span className="smart-tag">
          {native
            ? state?.authorized
              ? "通知权限已授权"
              : "等待授权"
            : "需要安卓安装包"}
        </span>
      </div>
      <p className="field-hint">
        识别微信、支付宝的付款成功页面，也可保留通知识别。商户、金额在本机提取，退款、转账和收款不会自动记为支出。
      </p>
      {!native ? (
        <p className="payment-status">
          当前为网页版，无法读取手机付款页面或通知。安装安卓包后，在这里开启授权。
        </p>
      ) : (
        <>
          <div className="page-recognition-panel">
            {!started && (
              <p className="payment-status">
                当前仍是示例账本。请先回首页点击“开启我的账本”，再打开下面的页面识别开关。
              </p>
            )}
            <div className="section-heading">
              <h3>付款页面自动识别</h3>
              <span className="smart-tag">
                {state?.pageAuthorized ? "无障碍权限已授权" : "需要无障碍授权"}
              </span>
            </div>
            <p className="field-hint">
              主动开启后，微信、支付宝在前台显示明确的付款成功页时，读取可访问文字并识别。不会点击、输入或操作付款，不截屏，不上传页面；聊天、历史账单与密码输入页不处理。受保护或未提供文字的页面可能无法识别。
            </p>
            <div className="payment-controls">
              <button
                className="button outline"
                onClick={() => native.openPageRecognitionSettings()}
              >
                管理付款页面授权
                <Icon name="ArrowUpRight" size={16} />
              </button>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={state?.pageEnabled ?? false}
                  disabled={!started || !state?.pageAuthorized}
                  onChange={(e) => configurePages(e.target.checked, false)}
                />
                自动识别付款成功页
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={state?.pageAutomatic ?? false}
                  disabled={!state?.pageEnabled || !state?.pageAuthorized}
                  onChange={(e) => configurePages(true, e.target.checked)}
                />
                带交易号且信息明确时自动入账
              </label>
            </div>
            <p className="payment-status">
              {!state?.pageAuthorized
                ? "尚未授权，不会读取付款页面。"
                : !state?.pageEnabled
                  ? "页面识别已暂停。"
                  : state?.pageStatus}{" "}
              没有交易号、分类不明或疑似重复时需核对。历史支付结果不要作为新交易重复打开。
            </p>
          </div>
          <h3>付款通知识别 · 可选</h3>
          <div className="payment-controls">
            <button
              className="button outline"
              onClick={() => native.openNotificationSettings()}
            >
              管理系统通知授权
              <Icon name="ArrowUpRight" size={16} />
            </button>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={state?.enabled ?? false}
                disabled={!started || !state?.authorized}
                onChange={(e) => configure(e.target.checked, false)}
              />
              收集付款通知
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={state?.automatic ?? false}
                disabled={!state?.enabled || !state?.authorized}
                onChange={(e) => configure(true, e.target.checked)}
              />
              明确且分类可识别时自动入账
            </label>
          </div>
          {!started && (
            <p className="field-hint">请先开启正式账本，再启用通知收集。</p>
          )}
          <p className="payment-status">
            {!state?.authorized
              ? "尚未授权，不会读取通知。"
              : !state?.enabled
                ? "已暂停收集，可随时重新开启。"
                : state?.automatic
                  ? "已开启自动入账；可识别但分类不明或疑似重复时等待核对。"
                  : "付款通知进入下方待确认列表，核对后才会入账。"}{" "}
            金额无法确定、手机未发出通知或系统停止服务时无法记录，请定期核对原始流水。
          </p>
          <div className="section-heading">
            <h3>待确认付款</h3>
            <span>{state?.pending?.length ?? 0} 笔</span>
          </div>
          {state?.pending?.length ? (
            state.pending.map((item) => (
              <div className="payment-pending" key={item.id}>
                <div>
                  <strong>{item.note || "付款记录"}</strong>
                  <small>
                    {item.date} · {item.source === "wechat" ? "微信" : "支付宝"}{" "}
                    · {item.captureMethod === "page" ? "付款页面" : "付款通知"}{" "}
                    · {item.reason}
                  </small>
                </div>
                <strong>¥ {money(item.amount)}</strong>
                <button
                  className="text-button"
                  onClick={() =>
                    onDraft({
                      type: "expense",
                      amount: item.amount,
                      category: item.category,
                      date: item.date,
                      note: item.note,
                      paymentId: item.id,
                      source: item.source,
                      captureMethod: item.captureMethod,
                    })
                  }
                >
                  核对
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    native.dismissPayment(item.id);
                    refresh();
                  }}
                >
                  忽略
                </button>
              </div>
            ))
          ) : (
            <p className="field-hint">暂时没有待确认的付款记录。</p>
          )}
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {state?.lastError && (
        <p className="form-error" role="alert">
          {state.lastError}
        </p>
      )}
    </article>
  );
}
