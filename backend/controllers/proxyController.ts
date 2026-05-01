import { Request, Response } from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";

export const proxyRequest = async (req: Request, res: Response) => {
  let targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send("URL is required");
  }

  // Add protocol if missing
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        Referer: targetUrl,
      },
      maxRedirects: 10,
      timeout: 25000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      responseType: "arraybuffer",
      validateStatus: () => true,
    });

    // Handle redirects
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      const redirectUrl = new URL(response.headers.location, targetUrl).href;
      return res.redirect(`/api/proxy?url=${encodeURIComponent(redirectUrl)}`);
    }

    if (response.status >= 400) {
      throw new Error(`Target site returned ${response.status} ${response.statusText}`);
    }

    const contentType = (response.headers["content-type"] as string) || "";

    // If it's not HTML, return as-is
    if (!contentType.includes("text/html")) {
      res.setHeader("Content-Type", contentType);
      if (response.headers["cache-control"]) res.setHeader("Cache-Control", response.headers["cache-control"] as string);
      return res.send(response.data);
    }

    // Process HTML
    const html = Buffer.from(response.data).toString("utf-8");
    const $ = cheerio.load(html);

    const finalUrl = (response.request as any)?.res?.responseUrl || targetUrl;

    // Use the full final URL as the base
    $("base").remove();
    $("head").prepend(`<base href="${finalUrl}">`);

    // Strip security meta tags
    $('meta[http-equiv="Content-Security-Policy"]').remove();
    $('meta[http-equiv="X-Frame-Options"]').remove();
    $('meta[http-equiv="content-security-policy"]').remove();
    $('meta[http-equiv="x-frame-options"]').remove();

    // Rewrite links to go through proxy and force same-tab navigation
    const attrs = ["src", "href", "data-src", "data-href"];
    const srcsetAttrs = ["srcset", "data-srcset"];

    $("*").each((_i, el) => {
      const $el = $(el);

      // Force links to stay in the iframe
      if ($el.is('a')) {
        $el.attr('target', '_self');
      }

      attrs.forEach((attr) => {
        const val = $el.attr(attr);
        if (val && !val.startsWith("data:") && !val.startsWith("#") && !val.startsWith("javascript:") && !val.startsWith("blob:")) {
          try {
            const absoluteUrl = new URL(val, finalUrl).href;
            const skipCORS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "unpkg.com", "cdn.jsdelivr.net"];
            const parsedUrl = new URL(absoluteUrl);
            if (!skipCORS.includes(parsedUrl.hostname)) {
              $el.attr(attr, `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`);
            } else {
              $el.attr(attr, absoluteUrl);
            }
          } catch (_e) { /* ignore invalid URLs */ }
        }
      });

      srcsetAttrs.forEach((attr) => {
        const val = $el.attr(attr);
        if (val) {
          const parts = val.split(",");
          const rewrittenParts = parts.map((part) => {
            const trimmed = part.trim();
            const subParts = trimmed.split(/\s+/);
            const url = subParts[0];
            const descriptor = subParts.slice(1).join(" ");
            if (url && !url.startsWith("data:")) {
              try {
                const absoluteUrl = new URL(url, finalUrl).href;
                return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}${descriptor ? " " + descriptor : ""}`;
              } catch (_e) {
                return part;
              }
            }
            return part;
          });
          $el.attr(attr, rewrittenParts.join(", "));
        }
      });
    });

    // Inject interaction and CORS bypass script at end of body
    const scriptToInject = `
      <script>
        (function() {
          // --- CORS Bypass: Intercept fetch and XHR ---
          var originalFetch = window.fetch;
          window.fetch = function() {
            var args = Array.prototype.slice.call(arguments);
            var resource = args[0];
            if (typeof resource === 'string' && !resource.startsWith('data:') && !resource.startsWith('blob:') && !resource.startsWith('/api/proxy')) {
              try {
                var abs = new URL(resource, document.baseURI || window.location.href).href;
                if (abs.startsWith('http') && !abs.startsWith(window.location.origin)) {
                  args[0] = '/api/proxy?url=' + encodeURIComponent(abs);
                }
              } catch(e) {}
            }
            return originalFetch.apply(this, args);
          };

          var origXhrOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function() {
            var args = Array.prototype.slice.call(arguments);
            var url = args[1];
            if (typeof url === 'string' && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('/api/proxy')) {
              try {
                var abs = new URL(url, document.baseURI || window.location.href).href;
                if (abs.startsWith('http') && !abs.startsWith(window.location.origin)) {
                  args[1] = '/api/proxy?url=' + encodeURIComponent(abs);
                }
              } catch(e) {}
            }
            return origXhrOpen.apply(this, args);
          };

          // --- SPA History Interceptor ---
          var origPushState = history.pushState;
          var origReplaceState = history.replaceState;
          history.pushState = function() {
            origPushState.apply(this, arguments);
            handleSpaNavigation(arguments[2]);
          };
          history.replaceState = function() {
            origReplaceState.apply(this, arguments);
          };
          window.addEventListener('popstate', function() {
            handleSpaNavigation(window.location.href);
          });

          function handleSpaNavigation(url) {
            // Notify parent about SPA navigation so pin positions can be recalculated
            setTimeout(function() {
              sendHeight();
              sendPinPositions();
            }, 500);
          }

          // --- MetaMark Comment System ---
          var mode = 'comment';
          var registeredPins = [];

          function getSelector(el) {
            if (!el || el === document.body || el === document.documentElement) return 'body';
            var parts = [];
            var current = el;
            while (current && current !== document.body && current !== document.documentElement) {
              var selector = current.tagName.toLowerCase();
              if (current.id) {
                selector += '#' + CSS.escape(current.id);
                parts.unshift(selector);
                break;
              } else {
                var parent = current.parentElement;
                if (parent) {
                  var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === current.tagName; });
                  if (siblings.length > 1) {
                    var idx = siblings.indexOf(current) + 1;
                    selector += ':nth-of-type(' + idx + ')';
                  }
                }
                parts.unshift(selector);
              }
              current = current.parentElement;
            }
            return parts.join(' > ');
          }

          function getPinPosition(selector, offsetXPct, offsetYPct) {
            try {
              var el = document.querySelector(selector);
              if (!el) return null;
              var rect = el.getBoundingClientRect();
              var scrollX = window.pageXOffset || document.documentElement.scrollLeft;
              var scrollY = window.pageYOffset || document.documentElement.scrollTop;
              return {
                x: rect.left + scrollX + (rect.width * offsetXPct / 100),
                y: rect.top + scrollY + (rect.height * offsetYPct / 100)
              };
            } catch(e) { return null; }
          }

          function sendPinPositions() {
            if (registeredPins.length === 0) return;
            var positions = [];
            registeredPins.forEach(function(pin) {
              var pos = getPinPosition(pin.selector, pin.offsetXPct, pin.offsetYPct);
              if (pos) positions.push({ id: pin.id, x: pos.x, y: pos.y });
            });
            window.parent.postMessage({ action: 'PIN_POSITIONS_UPDATE', message: { positions: positions } }, '*');
          }

          function sendHeight() {
            var height = Math.max(
              document.body ? document.body.scrollHeight : 0,
              document.documentElement ? document.documentElement.scrollHeight : 0,
              document.body ? document.body.offsetHeight : 0,
              document.documentElement ? document.documentElement.offsetHeight : 0,
              window.innerHeight
            );
            var width = Math.max(
              document.body ? document.body.scrollWidth : 0,
              document.documentElement ? document.documentElement.scrollWidth : 0,
              window.innerWidth
            );
            window.parent.postMessage({
              action: 'blipEvent:RESIZE',
              message: { height: height, width: width },
              trackingProperties: { id: Date.now() }
            }, '*');
            sendPinPositions();
          }

          window.addEventListener('message', function(event) {
            if (!event.data || !event.data.action) return;
            if (event.data.action === 'SET_MODE') {
              mode = event.data.mode;
              if (document.body) {
                document.body.style.cursor = mode === 'comment' ? 'crosshair' : 'default';
              }
            }
            if (event.data.action === 'REGISTER_PINS') {
              registeredPins = event.data.pins || [];
              sendPinPositions();
            }
          });

          document.addEventListener('click', function(e) {
            if (mode === 'browse') return;
            var target = e.target.closest ? e.target.closest('a') : null;
            if (target) {
              var href = target.getAttribute('href');
              if (href && !href.startsWith('#')) e.preventDefault();
            }
          }, true);

          document.addEventListener('mouseover', function(e) {
            if (window.parent === window || mode !== 'comment') return;
            var el = e.target;
            if (!el || el === document.body || el === document.documentElement) return;
            el.style.outline = '2px solid #3b82f6';
            el.style.outlineOffset = '-2px';
          });

          document.addEventListener('mouseout', function(e) {
            var el = e.target;
            if (el && el.style) el.style.outline = '';
          });

          document.addEventListener('click', function(e) {
            if (window.parent === window || mode !== 'comment') return;
            e.preventDefault();
            e.stopPropagation();

            var el = e.target;
            var selector = getSelector(el);
            var rect = el.getBoundingClientRect();
            var scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            var scrollY = window.pageYOffset || document.documentElement.scrollTop;

            var offsetXPct = rect.width > 0 ? ((e.clientX - rect.left) / rect.width) * 100 : 50;
            var offsetYPct = rect.height > 0 ? ((e.clientY - rect.top) / rect.height) * 100 : 50;

            var absX = rect.left + scrollX + (rect.width * offsetXPct / 100);
            var absY = rect.top + scrollY + (rect.height * offsetYPct / 100);

            window.parent.postMessage({
              action: 'blipEvent:ELEMENT_CLICKED',
              message: {
                x: absX, y: absY,
                selector: selector, offsetXPct: offsetXPct, offsetYPct: offsetYPct,
                containerWidth: Math.max(document.body ? document.body.scrollWidth : 0, document.documentElement ? document.documentElement.scrollWidth : 0),
                containerHeight: Math.max(document.body ? document.body.scrollHeight : 0, document.documentElement ? document.documentElement.scrollHeight : 0),
                elementInfo: { tagName: el.tagName, id: el.id, className: el.className }
              },
              trackingProperties: { id: Date.now() }
            }, '*');
          }, true);

          window.addEventListener('load', function() { sendHeight(); sendPinPositions(); });
          window.addEventListener('resize', function() { sendHeight(); sendPinPositions(); });

          // ResizeObserver — wait for body to exist
          function setupResizeObserver() {
            if (window.ResizeObserver && document.body) {
              var ro = new ResizeObserver(function() { sendHeight(); sendPinPositions(); });
              ro.observe(document.body);
            }
          }
          if (document.body) {
            setupResizeObserver();
          } else {
            window.addEventListener('DOMContentLoaded', setupResizeObserver);
          }

          setInterval(function() { sendHeight(); }, 3000);
        })();
      </script>
    `;

    // Inject at end of body (or head if no body)
    if ($("body").length) {
      $("body").append(scriptToInject);
    } else {
      $("head").append(scriptToInject);
    }

    res.setHeader("Content-Type", "text/html");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.send($.html());
  } catch (error: any) {
    console.error("Proxy error for URL:", targetUrl, error.message);
    res.status(500).send(`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; text-align: center; color: #374151; background: #f9fafb; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 480px; width: 100%;">
          <div style="width: 48px; height: 48px; background: #fee2e2; color: #ef4444; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #111827;">Unable to Load Preview</h1>
          <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.5;">We couldn't load <strong style="word-break: break-all;">${targetUrl}</strong>. This usually happens because the site blocks automated access or has strict security policies.</p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; text-align: left; margin-bottom: 24px; color: #4b5563; word-break: break-all;">
            ${error.message}
          </div>
          <a href="${targetUrl}" target="_blank" style="display: block; width: 100%; background: #3b82f6; color: white; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: 600; text-align: center; box-sizing: border-box;">
            Open in New Tab →
          </a>
          <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
            Tip: Sites like Google, Twitter/X, and some SPAs block proxy embedding by design.
          </p>
        </div>
      </div>
    `);
  }
};
