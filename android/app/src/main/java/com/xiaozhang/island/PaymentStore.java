package com.xiaozhang.island;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.provider.Settings;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

final class PaymentStore {
    private static final Object LOCK = new Object();
    private final Context context;
    private final SharedPreferences prefs;
    PaymentStore(Context context) {
        this.context = context.getApplicationContext();
        prefs = this.context.getSharedPreferences("xiaozhang-private", Context.MODE_PRIVATE);
    }
    String readLedger() { synchronized (LOCK) { return prefs.getString("ledger", ""); } }
    boolean authorized() {
        String enabled = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
        String name = new ComponentName(context, PaymentListener.class).flattenToString();
        if (enabled == null) return false;
        for (String item : enabled.split(":")) if (item.equals(name)) return true;
        return false;
    }
    boolean pageAuthorized() {
        android.view.accessibility.AccessibilityManager manager = (android.view.accessibility.AccessibilityManager) context.getSystemService(Context.ACCESSIBILITY_SERVICE);
        if (manager == null) return false;
        for (android.accessibilityservice.AccessibilityServiceInfo info : manager.getEnabledAccessibilityServiceList(android.accessibilityservice.AccessibilityServiceInfo.FEEDBACK_ALL_MASK)) {
            ComponentName component = ComponentName.unflattenFromString(info.getId());
            if (component != null && component.equals(new ComponentName(context, PaymentPageService.class))) return true;
        }
        return false;
    }
    boolean pageEnabled() { synchronized (LOCK) { return prefs.getBoolean("pageEnabled", false) && pageAuthorized(); } }
    void pageStatus(String status) { synchronized (LOCK) {
        if (!status.equals(prefs.getString("pageStatus", ""))) prefs.edit().putString("pageStatus", status).apply();
    } }
    String configurePages(boolean enabled, boolean automatic) {
        synchronized (LOCK) {
            try {
                if (enabled && (!pageAuthorized() || !new JSONObject(readLedger()).optBoolean("started")))
                    return new JSONObject().put("error", "请先开启正式账本，并手动授权付款页面无障碍服务").toString();
                if (!prefs.edit().putBoolean("pageEnabled", enabled).putBoolean("pageAutomatic", enabled && automatic)
                    .putString("pageStatus", enabled ? "已开启，等待微信或支付宝付款成功页面" : "已暂停付款页面识别").commit())
                    return "{\"error\":\"设置保存失败，请重试\"}";
                return "{}";
            } catch (Exception e) { return "{\"error\":\"请先开启正式账本\"}"; }
        }
    }
    boolean writeLedger(String expected, String next) {
        synchronized (LOCK) {
            try {
                if (!readLedger().equals(expected)) return false;
                JSONObject book = new JSONObject(next);
                if (book.getInt("version") != 1 || !(book.get("entries") instanceof JSONArray)) return false;
                JSONArray receipts = book.optJSONArray("paymentReceipts");
                JSONObject seen = seen();
                JSONArray pending = pending();
                Set<String> handled = new HashSet<>();
                if (receipts != null) for (int i = 0; i < receipts.length(); i++) handled.add(receipts.getString(i));
                JSONArray kept = new JSONArray();
                for (int i = 0; i < pending.length(); i++) {
                    JSONObject item = pending.getJSONObject(i);
                    if (handled.contains(item.getString("id"))) seen.put(item.getString("id"), true);
                    else kept.put(item);
                }
                return prefs.edit().putString("ledger", next).putString("pending", kept.toString()).putString("seen", seen.toString()).commit();
            } catch (Exception e) { return false; }
        }
    }
    String configure(boolean enabled, boolean automatic) {
        synchronized (LOCK) {
            try {
                if (enabled && (!authorized() || !new JSONObject(readLedger()).optBoolean("started")))
                    return new JSONObject().put("error", "请先开启正式账本并授予系统通知权限").toString();
                if (!prefs.edit().putBoolean("enabled", enabled).putBoolean("automatic", enabled && automatic).commit())
                    return new JSONObject().put("error", "设置未能保存，请检查存储空间").toString();
                return "{}";
            } catch (Exception e) { return "{\"error\":\"请先开启正式账本\"}"; }
        }
    }
    String state() {
        synchronized (LOCK) {
            try {
                return new JSONObject().put("authorized", authorized()).put("enabled", prefs.getBoolean("enabled", false))
                    .put("automatic", prefs.getBoolean("automatic", false)).put("pending", pending())
                    .put("pageAuthorized", pageAuthorized()).put("pageEnabled", prefs.getBoolean("pageEnabled", false))
                    .put("pageAutomatic", prefs.getBoolean("pageAutomatic", false)).put("pageStatus", prefs.getString("pageStatus", "尚未开启付款页面识别"))
                    .put("lastError", prefs.getString("lastError", "")).toString();
            } catch (Exception e) { return "{}"; }
        }
    }
    void dismiss(String id) {
        synchronized (LOCK) {
            try {
                JSONArray kept = new JSONArray(), pending = pending();
                JSONObject seen = seen();
                for (int i = 0; i < pending.length(); i++) {
                    JSONObject item = pending.getJSONObject(i);
                    if (item.getString("id").equals(id)) seen.put(id, true);
                    else kept.put(item);
                }
                prefs.edit().putString("pending", kept.toString()).putString("seen", seen.toString()).commit();
            } catch (Exception ignored) { /* Keep the original queue on parse failure. */ }
        }
    }
    void receive(String packageName, String key, long timestamp, PaymentParser.Payment payment) {
        receiveInternal(packageName, key, timestamp, payment, false);
    }
    boolean receivePage(String packageName, String key, long timestamp, PaymentParser.Payment payment) {
        synchronized (LOCK) {
            String original = readLedger(), originalPending = prefs.getString("pending", "[]");
            receiveInternal(packageName, key, timestamp, payment, true);
            return !original.equals(readLedger()) || !originalPending.equals(prefs.getString("pending", "[]"));
        }
    }
    private void receiveInternal(String packageName, String key, long timestamp, PaymentParser.Payment payment, boolean page) {
        synchronized (LOCK) {
            if (page ? !pageEnabled() : !prefs.getBoolean("enabled", false) || !authorized()) return;
            if (payment == null || (!"com.tencent.mm".equals(packageName) && !"com.eg.android.AlipayGphone".equals(packageName))) return;
            try {
                JSONObject book = new JSONObject(readLedger());
                if (!book.optBoolean("started")) return;
                String identity = packageName + ":" + (payment.orderId.isEmpty() ? key + ":" + timestamp : payment.orderId);
                String id = digest(identity);
                JSONObject seen = seen();
                if (seen.has(id)) return;
                JSONArray receipts = book.optJSONArray("paymentReceipts");
                if (receipts == null) receipts = new JSONArray();
                for (int i = 0; i < receipts.length(); i++) if (id.equals(receipts.getString(i))) return;
                JSONArray pending = pending();
                for (int i = 0; i < pending.length(); i++) if (id.equals(pending.getJSONObject(i).getString("id"))) return;
                long now = System.currentTimeMillis();
                if (timestamp <= 0 || timestamp > now + 60000 || timestamp < now - 24 * 3600000L) return;
                String date = Instant.ofEpochMilli(timestamp).atZone(ZoneId.of("Asia/Shanghai")).toLocalDate().toString();
                String note = payment.merchant.isEmpty() ? ("wechat".equals(payment.source) ? "微信付款" : "支付宝付款") : payment.merchant;
                JSONArray entries = book.getJSONArray("entries");
                boolean duplicate = false;
                for (int i = 0; i < pending.length(); i++) {
                    JSONObject previous = pending.getJSONObject(i);
                    if (previous.optLong("amount") == payment.amount && date.equals(previous.optString("date"))) duplicate = true;
                }
                for (int i = 0; i < entries.length(); i++) {
                    JSONObject entry = entries.getJSONObject(i);
                    if ("expense".equals(entry.optString("type")) && entry.optLong("amount") == payment.amount && date.equals(entry.optString("date"))) {
                        // Even a manually recorded payment can collide. Require review for equal amounts within 5 minutes.
                        try { if (Math.abs(Instant.parse(entry.getString("createdAt")).toEpochMilli() - timestamp) <= 300000) duplicate = true; }
                        catch (Exception e) { duplicate = true; }
                    }
                }
                JSONObject item = new JSONObject().put("id", id).put("amount", payment.amount).put("category", payment.category)
                    .put("date", date).put("note", note).put("source", payment.source).put("captureMethod", page ? "page" : "notification");
                boolean automatic = prefs.getBoolean(page ? "pageAutomatic" : "automatic", false) && !duplicate && !"other".equals(payment.category) && !payment.merchant.isEmpty()
                    && (!page || !payment.orderId.isEmpty());
                if (automatic) {
                    String instant = Instant.now().toString();
                    JSONObject entry = new JSONObject(item.toString()).put("id", UUID.randomUUID().toString()).put("type", "expense")
                        .put("paymentId", id).put("createdAt", instant).put("updatedAt", instant);
                    entries.put(entry);
                    receipts.put(id);
                    book.put("paymentReceipts", receipts);
                    Set<String> days = new HashSet<>();
                    for (int i = 0; i < entries.length(); i++) days.add(entries.getJSONObject(i).getString("date"));
                    int size = days.size();
                    int stage = size >= 14 ? 4 : size >= 7 ? 3 : size >= 3 ? 2 : size >= 1 ? 1 : 0;
                    book.put("unlockedStage", Math.max(book.optInt("unlockedStage"), stage));
                    seen.put(id, true);
                } else {
                    if (pending.length() >= 200) { prefs.edit().putString("lastError", "待确认通知已达 200 条，请先处理后核对支付平台流水").commit(); return; }
                    item.put("reason", duplicate ? "疑似重复，请核对" : page && payment.orderId.isEmpty() ? "页面未提供交易号，请核对" : "other".equals(payment.category) ? "分类待核对" : "等待确认");
                    pending.put(item);
                }
                if (!prefs.edit().putString("ledger", book.toString()).putString("pending", pending.toString()).putString("seen", seen.toString()).putString("lastError", "").commit())
                    prefs.edit().putString("lastError", "付款记录保存失败，请检查设备存储并核对原始流水").commit();
            } catch (Exception e) {
                prefs.edit().putString("lastError", "付款识别暂不可用，请核对原始流水").commit();
            }
        }
    }
    private JSONArray pending() throws Exception { return new JSONArray(prefs.getString("pending", "[]")); }
    private JSONObject seen() throws Exception { return new JSONObject(prefs.getString("seen", "{}")); }
    private static String digest(String value) throws Exception {
        byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder out = new StringBuilder();
        for (byte b : bytes) out.append(String.format("%02x", b & 255));
        return out.toString();
    }
}
