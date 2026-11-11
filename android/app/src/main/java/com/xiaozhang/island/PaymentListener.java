package com.xiaozhang.island;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public final class PaymentListener extends NotificationListenerService {
    @Override public void onNotificationPosted(StatusBarNotification event) {
        String source = event.getPackageName();
        if (!"com.tencent.mm".equals(source) && !"com.eg.android.AlipayGphone".equals(source)) return;
        Notification notification = event.getNotification();
        if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
        Bundle extras = notification.extras;
        CharSequence body = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if (body == null || body.length() == 0) body = extras.getCharSequence(Notification.EXTRA_TEXT);
        String title = String.valueOf(extras.getCharSequence(Notification.EXTRA_TITLE, ""));
        // Ordinary chat messages can contain payment-like text; only inspect payment-service titles.
        if ("com.tencent.mm".equals(source) && !title.matches("微信支付|微信支付凭证|微信支付助手")) return;
        if ("com.eg.android.AlipayGphone".equals(source) && !title.matches("支付宝|支付宝通知|支付助手|支付宝支付|支付宝支付助手|支付成功|付款成功")) return;
        String text = title + "\n" + (body == null ? "" : body.toString());
        PaymentParser.Payment payment = PaymentParser.parse(source, text);
        if (payment == null) return;
        long timestamp = notification.when > 0 ? notification.when : event.getPostTime();
        new PaymentStore(this).receive(source, event.getKey(), timestamp, payment);
    }
}
