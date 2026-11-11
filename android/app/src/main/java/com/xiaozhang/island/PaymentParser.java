package com.xiaozhang.island;

import java.math.BigDecimal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** No Android dependencies: the notification rules can be tested on the JVM. */
public final class PaymentParser {
    public static final class Payment {
        public final long amount;
        public final String category, merchant, source, orderId;
        Payment(long amount, String category, String merchant, String source, String orderId) {
            this.amount = amount; this.category = category; this.merchant = merchant;
            this.source = source; this.orderId = orderId;
        }
    }
    private static final Pattern AMOUNT = Pattern.compile(
        "[¥￥]\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)|([0-9][0-9,]*(?:\\.[0-9]+)?)\\s*元");
    private static final String[][] CATEGORIES = {
        {"food", "餐|饭|奶茶|咖啡|外卖|麦当劳|肯德基|瑞幸|星巴克|食堂"},
        {"transport", "地铁|公交|打车|滴滴|车费|火车|高铁|机票|加油|停车"},
        {"home", "房租|租金"}, {"daily", "水费|电费|燃气|话费|超市|便利店|日用"},
        {"health", "药|医院|挂号|诊疗|体检"}, {"learn", "书店|课程|学费|培训"},
        {"fun", "电影|游戏|会员|演出|音乐"}, {"shopping", "淘宝|京东|衣服|鞋|拼多多|网购"}
    };
    public static Payment parse(String packageName, String text) {
        String source;
        if ("com.tencent.mm".equals(packageName)) source = "wechat";
        else if ("com.eg.android.AlipayGphone".equals(packageName)) source = "alipay";
        else return null;
        if (text == null || text.length() > 4000) return null;
        // Direction must be explicit. Never turn refunds, transfers or receipts into expenses.
        if (Pattern.compile("退款|退回|转账|收款成功|收款通知|收钱|收到|向你付款|到账|收入|待支付|待付款|失败|取消|红包|还款|借款|代扣提醒|账单汇总|美元|港币|美金|USD|HKD|EUR|€|\\$|(?<![0-9])[-−]\\s*[¥￥]?\\s*[0-9]|[¥￥]\\s*[-−]", Pattern.CASE_INSENSITIVE).matcher(text).find()) return null;
        if (!Pattern.compile("支付成功|付款成功|成功付款|成功支付|已付款|已支付|完成付款|完成支付").matcher(text).find()) return null;
        Matcher amounts = AMOUNT.matcher(text);
        String token = null;
        int count = 0;
        while (amounts.find()) { token = amounts.group(1) != null ? amounts.group(1) : amounts.group(2); count++; }
        if (count != 1) return null;
        long cents;
        try {
            if (!token.matches("(?:[0-9]{1,8}|[0-9]{1,3}(?:,[0-9]{3})+)(?:\\.[0-9]{1,2})?")) return null;
            cents = new BigDecimal(token.replace(",", "")).movePointRight(2).longValueExact();
            if (cents <= 0 || cents > 9999999999L) return null;
        } catch (ArithmeticException | NumberFormatException e) { return null; }
        String merchant = "";
        Matcher named = Pattern.compile("(?:商户|商家|收款方|商品)\\s*[:：]\\s*([^\\n，,；;¥￥]{1,60})").matcher(text);
        if (named.find()) merchant = named.group(1).split("支付金额|付款金额|交易时间|实付|订单号")[0].trim();
        else {
            Matcher toward = Pattern.compile("向([^\\n，,；;]{1,40}?)(?:付款|支付)").matcher(text);
            if (toward.find()) merchant = toward.group(1).trim();
        }
        String category = "other";
        for (String[] rule : CATEGORIES) {
            if (Pattern.compile(rule[1]).matcher(merchant).find()) { category = rule[0]; break; }
        }
        String order = "";
        Matcher orderMatch = Pattern.compile("(?:订单号|交易单号|交易号)\\s*[:：]\\s*([A-Za-z0-9]{6,64})(?![A-Za-z0-9])").matcher(text);
        if (orderMatch.find()) order = orderMatch.group(1);
        return new Payment(cents, category, merchant, source, order);
    }
    private PaymentParser() {}
}
