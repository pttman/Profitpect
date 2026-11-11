package com.xiaozhang.island;

import android.accessibilityservice.AccessibilityService;
import android.os.Handler;
import android.os.Looper;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Read-only service: no clicks, gestures, input, screenshots, network, or notification access. */
public final class PaymentPageService extends AccessibilityService {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String activeFingerprint = "";
    private final Runnable inspect = this::inspectPage;
    @Override protected void onServiceConnected() {
        new PaymentStore(this).pageStatus("服务已连接，等待付款成功页面");
    }
    @Override public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;
        String name = event.getPackageName().toString();
        if (!allowed(name)) return;
        PaymentStore store = new PaymentStore(this);
        if (!store.pageEnabled()) return;
        handler.removeCallbacks(inspect);
        handler.postDelayed(inspect, 400);
    }
    private void inspectPage() {
        PaymentStore store = new PaymentStore(this);
        if (!store.pageEnabled()) return;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) { store.pageStatus("当前页面未提供可读取文字，暂无法识别"); return; }
        try {
            String name = root.getPackageName() == null ? "" : root.getPackageName().toString();
            if (!allowed(name)) return;
            List<String> nodes = new ArrayList<>();
            boolean[] editable = { false }, overflow = { false };
            collect(root, nodes, editable, overflow, new int[] { 0 }, 0);
            if (editable[0] || overflow[0]) return;
            PaymentParser.Payment payment = PaymentPageParser.parse(name, nodes, editable[0]);
            if (payment == null) {
                // Only rearm after a visible, non-terminal screen. Transient empty trees keep the latch.
                if (!nodes.isEmpty() && !nodes.contains("支付成功") && !nodes.contains("付款成功")) activeFingerprint = "";
                store.pageStatus(nodes.isEmpty() ? "当前页面未提供可读取文字，暂无法识别" : "等待明确的付款成功页面；账单详情与聊天页面不处理");
                return;
            }
            String fingerprint = name + ":" + payment.amount + ":" + payment.merchant + ":" + payment.orderId;
            if (fingerprint.equals(activeFingerprint)) return;
            activeFingerprint = fingerprint;
            boolean saved = store.receivePage(name, "page-" + UUID.randomUUID(), System.currentTimeMillis(), payment);
            if (saved) store.pageStatus("已识别付款页面，请返回小账岛查看记录或核对待确认项");
        } finally { root.recycle(); }
    }
    private void collect(AccessibilityNodeInfo node, List<String> output, boolean[] editable, boolean[] overflow, int[] visited, int depth) {
        if (++visited[0] > 600 || depth > 35 || output.size() > 250) { overflow[0] = true; return; }
        if (!node.isVisibleToUser()) return;
        if (node.isEditable() || node.isPassword()) { editable[0] = true; return; }
        CharSequence text = node.getText();
        if ((text == null || text.length() == 0) && node.getChildCount() == 0) text = node.getContentDescription();
        if (text != null && text.length() > 0 && text.length() <= 500) output.add(text.toString());
        for (int i = 0; i < node.getChildCount() && !editable[0] && !overflow[0]; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) { try { collect(child, output, editable, overflow, visited, depth + 1); } finally { child.recycle(); } }
        }
    }
    private static boolean allowed(String name) { return "com.tencent.mm".equals(name) || "com.eg.android.AlipayGphone".equals(name); }
    @Override public void onInterrupt() { handler.removeCallbacks(inspect); }
    @Override public void onDestroy() { handler.removeCallbacks(inspect); super.onDestroy(); }
}
