(function () {
    'use strict';

    var entries = [];
    var maxEntries = 200;
    var unreadCount = 0;
    var panel;
    var logList;
    var toggleButton;
    var errorDialog;
    var errorMessage;
    var pendingErrorMessage = '';
    var originalConsole = {};
    var levels = ['log', 'info', 'warn', 'error'];

    function pad(value) {
        return value < 10 ? '0' + value : String(value);
    }

    function getTime() {
        var now = new Date();
        return pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    }

    function redact(text) {
        return text
            .replace(/("(?:signature|privateKey|private_key|authorization)"\s*:\s*")[^"]+(")/gi, '$1[REDACTED]$2')
            .replace(/((?:signature|privateKey|private_key|authorization)\s*[=:]\s*)[^\s,;]+/gi, '$1[REDACTED]');
    }

    function stringify(value) {
        if (value instanceof Error) {
            return value.name + ': ' + value.message + (value.stack ? '\n' + value.stack : '');
        }

        if (typeof value === 'string') {
            return value;
        }

        if (typeof value === 'undefined') {
            return 'undefined';
        }

        try {
            return JSON.stringify(value, function (key, item) {
                if (/signature|privateKey|private_key|authorization/i.test(key)) {
                    return '[REDACTED]';
                }
                return item;
            }, 2);
        } catch (error) {
            return String(value);
        }
    }

    function formatArgs(args) {
        var parts = [];
        for (var i = 0; i < args.length; i += 1) {
            parts.push(stringify(args[i]));
        }
        return redact(parts.join(' ')).slice(0, 12000);
    }

    function updateToggle() {
        if (!toggleButton) {
            return;
        }
        toggleButton.textContent = unreadCount > 0 ? '调试 (' + unreadCount + ')' : '调试';
        toggleButton.className = unreadCount > 0 ? 'mobile-debug-toggle has-unread' : 'mobile-debug-toggle';
    }

    function renderEntry(entry) {
        if (!logList) {
            return;
        }

        var item = document.createElement('div');
        var meta = document.createElement('div');
        var message = document.createElement('pre');

        item.className = 'mobile-debug-entry level-' + entry.level;
        meta.className = 'mobile-debug-meta';
        meta.textContent = entry.time + '  ' + entry.level.toUpperCase();
        message.textContent = entry.message;
        item.appendChild(meta);
        item.appendChild(message);
        logList.appendChild(item);
        logList.scrollTop = logList.scrollHeight;
    }

    function showErrorDialog(message) {
        pendingErrorMessage = message;
        if (!errorDialog || !errorMessage) {
            return;
        }
        errorMessage.textContent = message;
        errorDialog.hidden = false;
        pendingErrorMessage = '';
    }

    function addEntry(level, args, options) {
        var message = formatArgs(args);
        var entry = {
            level: level,
            message: message,
            time: getTime()
        };

        entries.push(entry);
        if (entries.length > maxEntries) {
            entries.shift();
            if (logList && logList.firstChild) {
                logList.removeChild(logList.firstChild);
            }
        }

        unreadCount += 1;
        renderEntry(entry);
        updateToggle();

        if (options && options.popup) {
            showErrorDialog(message);
        }
    }

    function getAllLogs() {
        var lines = [];
        for (var i = 0; i < entries.length; i += 1) {
            lines.push('[' + entries[i].time + '] [' + entries[i].level.toUpperCase() + '] ' + entries[i].message);
        }
        return lines.join('\n\n');
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }

        return new Promise(function (resolve, reject) {
            var textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                resolve();
            } catch (error) {
                reject(error);
            }
            document.body.removeChild(textarea);
        });
    }

    function buildUi() {
        var style = document.createElement('style');
        style.textContent =
            '.mobile-debug-toggle{position:fixed;right:12px;bottom:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483645;border:0;border-radius:18px;padding:9px 13px;background:#222;color:#fff;font:13px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.28)}' +
            '.mobile-debug-toggle.has-unread{background:#c62828}' +
            '.mobile-debug-panel{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483646;display:flex;flex-direction:column;background:rgba(15,15,15,.97);color:#eee;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}' +
            '.mobile-debug-panel[hidden],.mobile-debug-dialog[hidden]{display:none}' +
            '.mobile-debug-header{display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid #444}' +
            '.mobile-debug-title{margin-right:auto;font:600 16px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
            '.mobile-debug-action{margin-left:8px;border:1px solid #666;border-radius:6px;padding:7px 10px;background:#292929;color:#fff;font-size:13px}' +
            '.mobile-debug-list{flex:1;overflow:auto;padding:8px 10px;-webkit-overflow-scrolling:touch}' +
            '.mobile-debug-entry{padding:8px 0;border-bottom:1px solid #333}' +
            '.mobile-debug-meta{margin-bottom:4px;color:#8ab4f8;font-size:11px}' +
            '.mobile-debug-entry pre{margin:0;white-space:pre-wrap;word-break:break-word;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}' +
            '.mobile-debug-entry.level-warn pre{color:#ffd866}.mobile-debug-entry.level-error pre{color:#ff7b72}' +
            '.mobile-debug-dialog{box-sizing:border-box;position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62)}' +
            '.mobile-debug-dialog-card{box-sizing:border-box;min-width:0;width:calc(100vw - 40px);max-width:420px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;border-radius:12px;background:#fff;color:#111;box-shadow:0 10px 35px rgba(0,0,0,.35)}' +
            '.mobile-debug-dialog-title{padding:16px 16px 8px;font:700 18px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#c62828}' +
            '.mobile-debug-dialog-message{overflow:auto;margin:0;padding:8px 16px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-all;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}' +
            '.mobile-debug-dialog-actions{display:flex;justify-content:flex-end;padding:12px 16px 16px}' +
            '.mobile-debug-dialog-actions button{flex:1;min-width:0;margin-left:8px;border:0;border-radius:8px;padding:9px 4px;background:#222;color:#fff;font-size:14px}' +
            '.mobile-debug-dialog-actions button:first-child{margin-left:0}';
        document.head.appendChild(style);

        toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'mobile-debug-toggle';
        toggleButton.textContent = '调试';
        toggleButton.addEventListener('click', function () {
            panel.hidden = false;
            unreadCount = 0;
            updateToggle();
            logList.scrollTop = logList.scrollHeight;
        });

        panel = document.createElement('section');
        panel.className = 'mobile-debug-panel';
        panel.hidden = true;
        panel.innerHTML =
            '<div class="mobile-debug-header">' +
                '<strong class="mobile-debug-title">页面调试信息</strong>' +
                '<button type="button" class="mobile-debug-action" data-action="copy">复制</button>' +
                '<button type="button" class="mobile-debug-action" data-action="clear">清空</button>' +
                '<button type="button" class="mobile-debug-action" data-action="close">关闭</button>' +
            '</div>' +
            '<div class="mobile-debug-list"></div>';
        logList = panel.querySelector('.mobile-debug-list');

        panel.addEventListener('click', function (event) {
            var action = event.target.getAttribute('data-action');
            if (action === 'close') {
                panel.hidden = true;
            } else if (action === 'clear') {
                entries = [];
                unreadCount = 0;
                logList.innerHTML = '';
                updateToggle();
            } else if (action === 'copy') {
                copyText(getAllLogs()).then(function () {
                    event.target.textContent = '已复制';
                    setTimeout(function () {
                        event.target.textContent = '复制';
                    }, 1200);
                }).catch(function (error) {
                    addEntry('error', ['复制失败', error], { popup: true });
                });
            }
        });

        errorDialog = document.createElement('div');
        errorDialog.className = 'mobile-debug-dialog';
        errorDialog.hidden = true;
        errorDialog.innerHTML =
            '<div class="mobile-debug-dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="mobile-debug-dialog-title">' +
                '<div class="mobile-debug-dialog-title" id="mobile-debug-dialog-title">页面发生错误</div>' +
                '<pre class="mobile-debug-dialog-message"></pre>' +
                '<div class="mobile-debug-dialog-actions">' +
                    '<button type="button" data-action="details">查看全部</button>' +
                    '<button type="button" data-action="copy-error">复制错误</button>' +
                    '<button type="button" data-action="dismiss">知道了</button>' +
                '</div>' +
            '</div>';
        errorMessage = errorDialog.querySelector('.mobile-debug-dialog-message');

        errorDialog.addEventListener('click', function (event) {
            var action = event.target.getAttribute('data-action');
            if (action === 'dismiss') {
                errorDialog.hidden = true;
            } else if (action === 'details') {
                errorDialog.hidden = true;
                panel.hidden = false;
                unreadCount = 0;
                updateToggle();
            } else if (action === 'copy-error') {
                copyText(errorMessage.textContent);
            }
        });

        document.body.appendChild(toggleButton);
        document.body.appendChild(panel);
        document.body.appendChild(errorDialog);

        for (var i = 0; i < entries.length; i += 1) {
            renderEntry(entries[i]);
        }
        updateToggle();
        if (pendingErrorMessage) {
            showErrorDialog(pendingErrorMessage);
        }
    }

    for (var i = 0; i < levels.length; i += 1) {
        (function (level) {
            if (!window.console || typeof window.console[level] !== 'function') {
                return;
            }
            originalConsole[level] = window.console[level];
            window.console[level] = function () {
                originalConsole[level].apply(window.console, arguments);
                addEntry(level, arguments, { popup: level === 'error' });
            };
        }(levels[i]));
    }

    window.addEventListener('error', function (event) {
        if (event.target && event.target !== window) {
            var source = event.target.src || event.target.href || event.target.currentSrc || event.target.tagName;
            addEntry('error', ['资源加载失败: ' + source], { popup: true });
            return;
        }

        addEntry('error', [
            event.message || '未知脚本错误',
            event.filename ? '\n' + event.filename + ':' + event.lineno + ':' + event.colno : '',
            event.error || ''
        ], { popup: true });
    }, true);

    window.addEventListener('unhandledrejection', function (event) {
        addEntry('error', ['未处理的 Promise 异常:', event.reason], { popup: true });
    });

    if (window.XMLHttpRequest) {
        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this.__mobileDebugMethod = method;
            this.__mobileDebugUrl = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function () {
            var xhr = this;
            xhr.addEventListener('loadend', function () {
                if (xhr.status === 0 || xhr.status >= 400) {
                    addEntry('error', [
                        '请求失败: ' + (xhr.__mobileDebugMethod || 'GET') + ' ' + (xhr.__mobileDebugUrl || ''),
                        'HTTP 状态: ' + xhr.status
                    ], { popup: true });
                }
            });
            return originalSend.apply(this, arguments);
        };
    }

    if (window.fetch) {
        var originalFetch = window.fetch;
        window.fetch = function () {
            var requestArgs = arguments;
            return originalFetch.apply(window, requestArgs).then(function (response) {
                if (!response.ok) {
                    addEntry('error', [
                        '请求失败: ' + response.status + ' ' + response.url
                    ], { popup: true });
                }
                return response;
            }).catch(function (error) {
                addEntry('error', ['Fetch 请求异常:', requestArgs[0], error], { popup: true });
                throw error;
            });
        };
    }

    window.MobileDebug = {
        log: function () {
            addEntry('log', arguments);
        },
        error: function () {
            addEntry('error', arguments, { popup: true });
        },
        open: function () {
            if (panel) {
                panel.hidden = false;
            }
        }
    };

    addEntry('info', [
        '调试器已启动',
        'URL: ' + window.location.href,
        'UA: ' + navigator.userAgent
    ]);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildUi);
    } else {
        buildUi();
    }
}());
