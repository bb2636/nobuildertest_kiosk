package com.example.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

import java.net.URISyntaxException;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            // 결제 앱 등 intent:// 등 커스텀 스킴만 처리. 나머지(https://localhost 등)는 브리지에 위임해 앱 번들 로드 유지
            final WebViewClient bridgeClient = webView.getWebViewClient();
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    if (bridgeClient != null) {
                        return bridgeClient.shouldInterceptRequest(view, request);
                    }
                    return null;
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String url = request.getUrl().toString();
                    if (url.startsWith("http://") || url.startsWith("https://")
                            || url.startsWith("file://") || url.startsWith("capacitor://")
                            || url.startsWith("about:blank")) {
                        if (bridgeClient != null) {
                            return bridgeClient.shouldOverrideUrlLoading(view, request);
                        }
                        return false;
                    }
                    try {
                        if (url.startsWith("intent://")) {
                            Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                            intent.addCategory(Intent.CATEGORY_BROWSABLE);
                            startActivity(intent);
                        } else {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            intent.addCategory(Intent.CATEGORY_BROWSABLE);
                            startActivity(intent);
                        }
                        return true;
                    } catch (ActivityNotFoundException | URISyntaxException e) {
                        return false;
                    }
                }
            });
        }
    }
}

