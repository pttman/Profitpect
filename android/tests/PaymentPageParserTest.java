package com.xiaozhang.island;
import java.util.Arrays;
import java.util.List;
public final class PaymentPageParserTest {
    private static int passed;
    private static void check(boolean ok, String label) { if (!ok) throw new AssertionError(label); passed++; }
    private static PaymentParser.Payment parse(String... lines) { return PaymentPageParser.parse("com.tencent.mm", Arrays.asList(lines), false); }
    public static void main(String[] args) {
        PaymentParser.Payment p = parse("支付成功", "￥", "18.50", "商户", "瑞幸咖啡", "订单号", "PAGE100001", "完成");
        check(p != null && p.amount == 1850 && p.merchant.equals("瑞幸咖啡") && p.category.equals("food") && p.orderId.equals("PAGE100001"), "split-node payment result");
        p = PaymentPageParser.parse("com.eg.android.AlipayGphone", Arrays.asList("付款成功", "26.80元", "收款商户", "滴滴出行", "返回商家"), false);
        check(p != null && p.amount == 2680 && p.category.equals("transport"), "alipay merchant result");
        p = parse("支付成功", "实付金额", "28.00", "商品名称", "午餐", "完成");
        check(p != null && p.amount == 2800, "labelled actual amount");
        check(parse("有人发来 支付成功", "18元", "商户：咖啡", "完成") == null, "quoted success is not a status node");
        check(parse("支付成功", "18元", "商户：咖啡") == null, "missing terminal action");
        check(parse("支付成功", "18元", "完成") == null, "missing merchant information");
        check(parse("支付成功", "18元", "商户：咖啡", "按住 说话", "完成") == null, "chat content rejected");
        check(parse("支付成功", "18元", "商户：咖啡", "账单详情", "完成") == null, "history details rejected");
        check(parse("支付成功", "18元", "商户：咖啡", "输入密码", "完成") == null, "credential page rejected");
        check(parse("支付成功", "18元", "商户：咖啡", "原价28元", "完成") == null, "ambiguous amounts rejected");
        check(parse("支付成功", "-18元", "商户：咖啡", "完成") == null, "negative amount rejected");
        check(parse("退款成功", "18元", "商户：咖啡", "完成") == null, "refund rejected");
        check(parse("支付成功", "18元", "转账", "商户：咖啡", "完成") == null, "transfer rejected");
        check(parse("支付成功", "18美元", "商户：咖啡", "完成") == null, "foreign currency rejected");
        check(parse("支付成功", "1.001元", "商户：咖啡", "完成") == null, "fractional cents rejected");
        List<String> valid = Arrays.asList("支付成功", "18元", "商户：咖啡", "完成");
        check(PaymentPageParser.parse("unknown.app", valid, false) == null, "package allowlist");
        check(PaymentPageParser.parse("com.tencent.mm", valid, true) == null, "editable page rejected");
        check(PaymentPageParser.parse("com.tencent.mm", null, false) == null, "missing tree");
        System.out.println("PaymentPageParser: " + passed + " assertions passed");
    }
}
