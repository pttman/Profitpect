package com.xiaozhang.island;

public final class PaymentParserTest {
    private static int passed;
    private static void check(boolean ok, String label) { if (!ok) throw new AssertionError(label); passed++; }
    public static void main(String[] args) {
        String wx = "com.tencent.mm", ali = "com.eg.android.AlipayGphone";
        PaymentParser.Payment p = PaymentParser.parse(wx, "微信支付\n支付成功\n商户：瑞幸咖啡\n支付金额：￥18.50\n交易单号：1234567890");
        check(p != null && p.amount == 1850 && p.category.equals("food") && p.orderId.equals("1234567890"), "wechat payment");
        p = PaymentParser.parse(ali, "付款成功\n收款方：滴滴出行\n实付 26.80元");
        check(p != null && p.amount == 2680 && p.category.equals("transport"), "alipay direction and merchant");
        p = PaymentParser.parse(wx, "向瑞幸咖啡付款成功 18元");
        check(p != null && p.merchant.equals("瑞幸咖啡"), "merchant in sentence");
        p = PaymentParser.parse(ali, "支付成功 ￥1,234.56 商户：京东");
        check(p != null && p.amount == 123456, "grouped amount");
        p = PaymentParser.parse(wx, "付款成功 18元");
        check(p != null && p.category.equals("other"), "unknown merchant requires review");
        for (String invalid : new String[] {
            "支付失败 18元", "待付款 18元", "退款成功 18元", "转账成功 18元", "收款成功 18元", "收到18元 支付成功", "支付成功 0元", "支付成功 -18元", "支付成功 ￥-18", "支付成功 1.001元", "支付成功 ￥1,00", "支付成功 100000000元", "支付成功 18美元", "支付成功 USD18", "支付成功 $18", "付款成功 原价30元 实付18元", "付款成功 18元 余额99元", "微信支付 新优惠18元", "支付成功 没有金额"
        }) check(PaymentParser.parse(wx, invalid) == null, "reject: " + invalid);
        check(PaymentParser.parse("untrusted.app", "支付成功 18元") == null, "package allowlist");
        System.out.println("PaymentParser: " + passed + " assertions passed");
    }
}
