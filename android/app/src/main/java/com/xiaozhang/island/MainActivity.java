package com.xiaozhang.island;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.widget.Toast;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://app.xiaozhang.local";
    private PaymentStore store;
    private WebView web;
    private byte[] exportBytes;
    private ValueCallback<Uri[]> fileCallback;
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        store = new PaymentStore(this);
        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new Bridge(), "XiaozhangAndroid");
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*"), 102);
                return true;
            }
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton("确认", (d, w) -> result.confirm()).setNegativeButton("取消", (d, w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel()).show();
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !trusted(request.getUrl());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!trusted(uri)) return null;
                String name = uri.getPath();
                if (name == null || name.equals("/")) name = "/index.html";
                if (name.contains("..")) return missing();
                String mime = name.endsWith(".html") ? "text/html" : name.endsWith(".js") ? "application/javascript" : name.endsWith(".css") ? "text/css" : name.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream";
                try {
                    java.util.Map<String, String> headers = new java.util.HashMap<>();
                    headers.put("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; img-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'none'");
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, getAssets().open("web" + name));
                }
                catch (Exception e) { return missing(); }
            }
        });
        FrameLayout content = new FrameLayout(this);
        content.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            content.setOnApplyWindowInsetsListener((view, insets) -> {
            android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
            });
            android.view.WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) controller.setSystemBarsAppearance(
                android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
        }
        setContentView(content);
        content.requestApplyInsets();
        web.loadUrl(ORIGIN + "/");
    }
    private boolean trusted(Uri uri) { return "https".equals(uri.getScheme()) && "app.xiaozhang.local".equals(uri.getHost()) && uri.getPort() == -1; }
    private WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0]));
    }
    private final class Bridge {
        @JavascriptInterface public String readLedger() { return store.readLedger(); }
        @JavascriptInterface public boolean writeLedger(String expected, String next) { return next.length() < 8 * 1024 * 1024 && store.writeLedger(expected, next); }
        @JavascriptInterface public String paymentState() { return store.state(); }
        @JavascriptInterface public String configurePayments(boolean enabled, boolean automatic) { return store.configure(enabled, automatic); }
        @JavascriptInterface public String configurePagePayments(boolean enabled, boolean automatic) { return store.configurePages(enabled, automatic); }
        @JavascriptInterface public void openPageRecognitionSettings() {
            runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this)
                .setTitle("授权付款页面识别")
                .setMessage("开启后，小账岛会读取微信、支付宝前台页面的可访问文字，仅匹配明确的付款成功结果，并在本机提取商户和金额。系统无障碍授权允许读取页面，请理解后再授权。不会点击、输入、操作支付或上传页面。你可以随时暂停或在系统撤销；受保护页面可能无法识别。")
                .setNegativeButton("暂不开启", null)
                .setPositiveButton("了解，前往系统设置", (dialog, which) -> startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)))
                .show());
        }
        @JavascriptInterface public void dismissPayment(String id) { store.dismiss(id); }
        @JavascriptInterface public void openNotificationSettings() {
            runOnUiThread(() -> startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        }
        @JavascriptInterface public void exportFile(String name, String content, String mime) {
            if (content.length() > 8 * 1024 * 1024) return;
            runOnUiThread(() -> {
                if (exportBytes != null) return;
                exportBytes = content.getBytes(StandardCharsets.UTF_8);
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType(mime.startsWith("text/csv") ? "text/csv" : "application/json")
                    .putExtra(Intent.EXTRA_TITLE, name.replaceAll("[/\\\\]", "_"));
                startActivityForResult(intent, 101);
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == 102) {
            if (fileCallback != null) { fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[] { data.getData() } : null); fileCallback = null; }
            return;
        }
        if (request != 101) return;
        byte[] bytes = exportBytes; exportBytes = null;
        if (result != RESULT_OK || data == null || data.getData() == null || bytes == null) return;
        try (OutputStream stream = getContentResolver().openOutputStream(data.getData())) {
            if (stream == null) throw new IllegalStateException();
            stream.write(bytes);
            Toast.makeText(this, "备份已保存", Toast.LENGTH_SHORT).show();
        } catch (Exception e) { Toast.makeText(this, "文件未能保存，请重试", Toast.LENGTH_LONG).show(); }
    }
    @Override protected void onDestroy() { if (fileCallback != null) fileCallback.onReceiveValue(null); if (web != null) { web.removeJavascriptInterface("XiaozhangAndroid"); web.destroy(); } super.onDestroy(); }
}
