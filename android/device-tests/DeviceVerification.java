package com.xiaozhang.island;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Context;
import android.content.ContextWrapper;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.WebView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.lang.reflect.Field;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Uses a separate preference namespace; never saves synthetic entries to the user's ledger. */
public final class DeviceVerification extends Instrumentation {
    private Bundle arguments;
    private int assertions;
    private WebView web;
    private static final String PREFIX = "device-verification-";
    @Override public void onCreate(Bundle args) { arguments = args; start(); }
    private void check(boolean value, String name) {
        if (!value) throw new AssertionError(name);
        assertions++;
        Bundle status = new Bundle(); status.putString("stream", "PASS " + name + "\n"); sendStatus(0, status);
    }
    private Context isolatedContext() {
        return new ContextWrapper(getTargetContext()) {
            @Override public Context getApplicationContext() { return this; }
            @Override public SharedPreferences getSharedPreferences(String name, int mode) { return getBaseContext().getSharedPreferences(PREFIX + name, mode); }
        };
    }
    @Override public void onStart() {
        Bundle result = new Bundle();
        try {
            Context isolated = isolatedContext();
            PaymentStore store = new PaymentStore(isolated);
            SharedPreferences prefs = isolated.getSharedPreferences("xiaozhang-private", Context.MODE_PRIVATE);
            if ("page".equals(arguments.getString("phase"))) {
                verifyPageStore(store, prefs);
            } else if ("persistence".equals(arguments.getString("phase"))) {
                JSONObject restored = new JSONObject(store.readLedger());
                check("persisted-on-phone".equals(restored.optString("verification")), "ledger survived target process restart");
                check(restored.getJSONArray("entries").length() == 2, "saved entries survived process restart");
                check(restored.getJSONArray("paymentReceipts").length() == 2, "receipt deduplication survived process restart");
                check(new JSONObject(store.state()).getJSONArray("pending").length() == 1, "pending queue survived process restart");
                check(prefs.edit().clear().commit(), "removed isolated verification fixtures");
            } else {
                check(prefs.edit().clear().commit(), "initialized isolated verification namespace");
                JSONObject book = new JSONObject().put("version", 1).put("started", true).put("entries", new JSONArray()).put("budgets", new JSONObject())
                    .put("settings", new JSONObject().put("hidden", false).put("island", true).put("reduceMotion", false)).put("paymentReceipts", new JSONArray()).put("unlockedStage", 0);
                check(store.writeLedger("", book.toString()), "atomic initial ledger save");
                check(!store.writeLedger("outdated", book.toString()), "rejected stale snapshot");
                check(store.authorized(), "notification permission is granted by user");
                check(!new JSONObject(store.configure(true, false)).has("error"), "enabled review mode in isolated namespace");
                long timestamp = System.currentTimeMillis();
                PaymentParser.Payment coffee = PaymentParser.parse("com.tencent.mm", "支付成功 商户：瑞幸咖啡\n金额：18.50元\n订单号：VERIFY100001");
                check(coffee != null, "parsed payment-success fixture on device");
                store.receive("com.tencent.mm", "fixture-1", timestamp, coffee);
                JSONObject state = new JSONObject(store.state());
                check(state.getJSONArray("pending").length() == 1, "review mode queued payment");
                check(new JSONObject(store.readLedger()).getJSONArray("entries").length() == 0, "review mode did not auto-save");
                store.receive("com.tencent.mm", "fixture-1", timestamp, coffee);
                check(new JSONObject(store.state()).getJSONArray("pending").length() == 1, "deduplicated repeated pending notification");
                JSONObject pending = state.getJSONArray("pending").getJSONObject(0);
                book = new JSONObject(store.readLedger());
                String receipt = pending.getString("id"), instant = Instant.now().toString();
                JSONObject entry = new JSONObject(pending.toString()).put("id", "fixture-manual").put("type", "expense").put("paymentId", receipt).put("createdAt", instant).put("updatedAt", instant);
                book.getJSONArray("entries").put(entry);
                book.getJSONArray("paymentReceipts").put(receipt);
                check(store.writeLedger(store.readLedger(), book.toString()), "confirmed queued payment atomically");
                check(new JSONObject(store.state()).getJSONArray("pending").length() == 0, "confirmation cleared pending item");
                store.receive("com.tencent.mm", "fixture-1", timestamp, coffee);
                check(new JSONObject(store.readLedger()).getJSONArray("entries").length() == 1, "confirmed notification was not imported again");
                check(!new JSONObject(store.configure(true, true)).has("error"), "enabled automatic mode in isolated namespace");
                String stale = store.readLedger();
                PaymentParser.Payment ride = PaymentParser.parse("com.eg.android.AlipayGphone", "付款成功 收款方：滴滴出行\n金额：26.80元\n订单号：VERIFY100002");
                store.receive("com.eg.android.AlipayGphone", "fixture-2", timestamp + 1, ride);
                book = new JSONObject(store.readLedger());
                check(book.getJSONArray("entries").length() == 2, "recognized payment auto-saved");
                check(book.getInt("unlockedStage") == 1, "automatic entry updated island progress");
                check(!store.writeLedger(stale, stale), "foreground stale save cannot overwrite background payment");
                PaymentParser.Payment secondRide = PaymentParser.parse("com.eg.android.AlipayGphone", "付款成功 收款方：滴滴出行\n金额：26.80元\n订单号：VERIFY100003");
                store.receive("com.eg.android.AlipayGphone", "fixture-3", timestamp + 2, secondRide);
                state = new JSONObject(store.state());
                check(state.getJSONArray("pending").length() == 1 && state.getJSONArray("pending").getJSONObject(0).getString("reason").contains("重复"), "possible manual duplicate requires review");
                store.dismiss(state.getJSONArray("pending").getJSONObject(0).getString("id"));
                store.receive("com.eg.android.AlipayGphone", "fixture-3", timestamp + 2, secondRide);
                check(new JSONObject(store.state()).getJSONArray("pending").length() == 0, "dismissed notification stays dismissed on replay");
                PaymentParser.Payment unknown = PaymentParser.parse("com.tencent.mm", "付款成功 9.99元 订单号：VERIFY100004");
                store.receive("com.tencent.mm", "fixture-4", timestamp + 3, unknown);
                check(new JSONObject(store.state()).getJSONArray("pending").length() == 1, "unknown category queued instead of auto-saving");
                store.configure(false, false);
                PaymentParser.Payment paused = PaymentParser.parse("com.tencent.mm", "支付成功 商户：瑞幸咖啡\n金额：20元\n订单号：VERIFY100005");
                store.receive("com.tencent.mm", "fixture-5", timestamp + 4, paused);
                check(new JSONObject(store.state()).getJSONArray("pending").length() == 1 && new JSONObject(store.readLedger()).getJSONArray("entries").length() == 2, "disabled collection ignored payment");
                book = new JSONObject(store.readLedger()).put("verification", "persisted-on-phone");
                check(store.writeLedger(store.readLedger(), book.toString()), "saved restart verification marker");
                check(store.readLedger().equals(new PaymentStore(isolatedContext()).readLedger()), "new store instance loaded identical ledger");
                verifyWebUI();
            }
            result.putString("stream", "DeviceVerification: " + assertions + " assertions passed\n");
            finish(Activity.RESULT_OK, result);
        } catch (Throwable error) {
            result.putString("stream", "FAILED after " + assertions + " assertions: " + error.toString() + "\n");
            finish(Activity.RESULT_CANCELED, result);
        }
    }
    private String js(String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> output = new AtomicReference<>();
        runOnMainSync(() -> web.evaluateJavascript(script, value -> { output.set(value); latch.countDown(); }));
        if (!latch.await(8, TimeUnit.SECONDS)) throw new AssertionError("WebView script timed out");
        return output.get();
    }
    private void verifyPageStore(PaymentStore store, SharedPreferences prefs) throws Exception {
        String actualLedger = new PaymentStore(getTargetContext()).readLedger();
        check(store.pageAuthorized(), "user-granted page accessibility authorization is active");
        check(prefs.edit().clear().commit(), "initialized isolated page fixtures");
        JSONObject book = new JSONObject().put("version", 1).put("started", true).put("entries", new JSONArray()).put("budgets", new JSONObject())
            .put("settings", new JSONObject().put("hidden", false).put("island", true).put("reduceMotion", false)).put("paymentReceipts", new JSONArray()).put("unlockedStage", 0);
        check(store.writeLedger("", book.toString()), "created isolated page ledger");
        PaymentParser.Payment payment = PaymentPageParser.parse("com.tencent.mm", java.util.Arrays.asList("支付成功", "￥", "18.50", "商户", "瑞幸咖啡", "订单号", "PAGEVERIFY001", "完成"), false);
        long now = System.currentTimeMillis();
        check(!store.receivePage("com.tencent.mm", "page-fixture-1", now, payment), "page collection disabled by default");
        check(!new JSONObject(store.configurePages(true, false)).has("error"), "enabled isolated page review mode");
        check(store.receivePage("com.tencent.mm", "page-fixture-1", now, payment), "page result queued with notification collection disabled");
        JSONObject state = new JSONObject(store.state());
        check(state.getJSONArray("pending").length() == 1 && "page".equals(state.getJSONArray("pending").getJSONObject(0).getString("captureMethod")), "page result retained source metadata");
        check(new JSONObject(store.readLedger()).getJSONArray("entries").length() == 0, "page review mode did not save an unconfirmed entry");
        check(!store.receivePage("com.tencent.mm", "page-fixture-replay", now + 1, payment), "order number deduplicated replay");
        store.configure(true, true);
        store.receive("com.tencent.mm", "notification-same-order", now + 2, payment);
        check(new JSONObject(store.state()).getJSONArray("pending").length() == 1 && new JSONObject(store.readLedger()).getJSONArray("entries").length() == 0, "page and notification shared order deduplication");
        check(!new JSONObject(store.configurePages(true, true)).has("error"), "enabled isolated page automatic mode");
        PaymentParser.Payment ride = PaymentPageParser.parse("com.eg.android.AlipayGphone", java.util.Arrays.asList("付款成功", "26.80元", "收款方", "滴滴出行", "交易号", "PAGEVERIFY002", "返回商家"), false);
        check(store.receivePage("com.eg.android.AlipayGphone", "page-ride", now + 3, ride), "page automatic mode processed valid result");
        check(new JSONObject(store.readLedger()).getJSONArray("entries").length() == 1, "page with order and known category auto-saved");
        PaymentParser.Payment noOrder = PaymentPageParser.parse("com.tencent.mm", java.util.Arrays.asList("支付成功", "20元", "商户", "瑞幸咖啡", "完成"), false);
        store.receivePage("com.tencent.mm", "page-without-order", now + 4, noOrder);
        check(new JSONObject(store.readLedger()).getJSONArray("entries").length() == 1 && new JSONObject(store.state()).getJSONArray("pending").length() == 2, "page without transaction number always requires review");
        store.configurePages(false, false);
        check(!store.receivePage("com.tencent.mm", "paused", now + 5, noOrder), "pausing page recognition prevented processing");
        check(actualLedger.equals(new PaymentStore(getTargetContext()).readLedger()), "page tests left actual ledger unchanged");
        check(prefs.edit().clear().commit(), "removed isolated page test fixtures");
        PaymentStore actual = new PaymentStore(getTargetContext());
        JSONObject actualState = new JSONObject(actual.state());
        Bundle diagnostic = new Bundle();
        diagnostic.putString("stream", "PAGE_STATE authorized=" + actualState.optBoolean("pageAuthorized") + ", enabled=" + actualState.optBoolean("pageEnabled") + ", started=" + (!actual.readLedger().isEmpty() && new JSONObject(actual.readLedger()).optBoolean("started")) + "\n");
        sendStatus(0, diagnostic);
    }
    private void waitUntil(String condition) throws Exception {
        long deadline = System.currentTimeMillis() + 12000;
        do { if ("true".equals(js(condition))) return; Thread.sleep(120); } while (System.currentTimeMillis() < deadline);
        throw new AssertionError("UI condition timed out: " + condition);
    }
    private void verifyWebUI() throws Exception {
        Activity activity = startActivitySync(new Intent().setClassName("com.xiaozhang.island", "com.xiaozhang.island.MainActivity").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        Field field = MainActivity.class.getDeclaredField("web"); field.setAccessible(true); web = (WebView) field.get(activity);
        waitUntil("!!document.querySelector('.entry-orb')");
        check("true".equals(js("document.body.innerText.includes('慢慢记')")), "bundled React application rendered on real WebView");
        check("true".equals(js("document.documentElement.scrollWidth <= document.documentElement.clientWidth")), "no horizontal overflow on phone");
        check("true".equals(js("JSON.parse(XiaozhangAndroid.paymentState()).authorized")), "WebView bridge reported actual notification authorization");
        String original = js("XiaozhangAndroid.readLedger()");
        js("document.querySelector('.entry-mode-toggle').click()");
        waitUntil("document.querySelectorAll('.entry-method').length === 3");
        check(true, "floating button exposed three recording modes");
        js("document.querySelectorAll('.entry-method')[1].click()");
        waitUntil("document.querySelector('.entry-orb').getAttribute('aria-label').includes('AI')");
        js("document.querySelector('.entry-orb').click()");
        waitUntil("!!document.querySelector('#smart-text')");
        js("document.querySelectorAll('.smart-examples button')[1].click()");
        waitUntil("document.querySelector('#smart-text').value.includes('地铁')");
        js("document.querySelector('.modal form').requestSubmit()");
        waitUntil("!!document.querySelector('#entry-amount')");
        check("true".equals(js("document.querySelector('#entry-amount').value === '6.00'")), "natural language draft recognized exact cents");
        check("true".equals(js("Array.from(document.querySelectorAll('.category-option')).some(x => x.getAttribute('aria-pressed') === 'true' && x.innerText.includes('交通'))")), "natural language draft selected transport category");
        check(original.equals(js("XiaozhangAndroid.readLedger()")), "UI draft tests did not modify user's real ledger");
        runOnMainSync(() -> activity.finish());
    }
}
