package com.xiaozhang.island;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/** Extracts a terminal merchant payment page, never a chat message or a payment entry form. */
public final class PaymentPageParser {
    public static PaymentParser.Payment parse(String packageName, List<String> nodes, boolean hasEditable) {
        if (hasEditable || nodes == null || nodes.size() > 250) return null;
        if (!"com.tencent.mm".equals(packageName) && !"com.eg.android.AlipayGphone".equals(packageName)) return null;
        List<String> lines = new ArrayList<>();
        for (String node : nodes) {
            if (node == null) continue;
            for (String line : node.replace('\u00a0', ' ').split("\\n")) {
                String value = line.trim();
                if (!value.isEmpty()) lines.add(value);
            }
        }
        String text = String.join("\n", lines);
        if (text.length() > 4000) return null;
        // Require an independent status node; quoted payment messages are not status headings.
        if (!lines.contains("支付成功") && !lines.contains("付款成功")) return null;
        if (Pattern.compile("按住.*说话|发送消息|聊天记录|聊天详情|发消息|支付密码|输入密码|验证码|交易记录|历史账单|账单详情|交易详情|退款|转账|收款成功|待支付|支付失败|付款失败").matcher(text).find()) return null;
        // A terminal action plus merchant information distinguishes a result from an ordinary chat.
        boolean terminal = false, merchantLabel = false;
        for (String value : lines) {
            if (value.matches("完成|返回商家|返回商户|返回首页|完成并返回|查看账单|查看订单|进入商家")) terminal = true;
            if (value.matches("(?:商户|商家|收款方|收款商户|商品|商品名称)(?:[：:].*)?")) merchantLabel = true;
        }
        if (!terminal || !merchantLabel) return null;
        List<String> normalized = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) {
            String value = lines.get(i);
            if (value.matches("商户|商家|收款方|收款商户|商品|商品名称|订单号|交易单号|交易号") && i + 1 < lines.size()) {
                String label = value.equals("收款商户") ? "商户" : value.equals("商品名称") ? "商品" : value;
                normalized.add(label + "：" + lines.get(++i));
            } else if (value.matches("[¥￥]") && i + 1 < lines.size() && lines.get(i + 1).matches("[0-9][0-9,]*(?:\\.[0-9]+)?")) {
                normalized.add(value + lines.get(++i));
            } else if (value.matches("(?:实付|实际付款|实付金额|支付金额|付款金额)[：:]?") && i + 1 < lines.size()
                && lines.get(i + 1).matches("[0-9][0-9,]*(?:\\.[0-9]+)?")) {
                normalized.add(lines.get(++i) + "元");
            } else normalized.add(value.replaceFirst("^收款商户[：:]", "商户：").replaceFirst("^商品名称[：:]", "商品："));
        }
        PaymentParser.Payment payment = PaymentParser.parse(packageName, String.join("\n", normalized));
        if (payment == null || payment.merchant.isEmpty() || payment.merchant.matches("完成|支付成功|付款成功|返回.*")) return null;
        return payment;
    }
    private PaymentPageParser() {}
}
