// ==UserScript==
// @name       Email-to-Self-Khaaann
// @namespace  http://*
// @version    2
// @description  Binds Keystrokes
// @match      *://*/*
// @grant      GM_openInTab
// @copyright  2012+, Christopher Raser
// ==/UserScript==
(function() {
    console.log("Initializing email-to-self shortcuts.");
    var spec = "";
    new Keystroke("Ctrl+s").bind(window, sendMail('chris@dreadedmonkeygod.net'));
    new Keystroke("Shift+Ctrl+s").bind(window, sendMail('REDACTED'));

    function sendMail(email) {
        return function() {
	        try {
		        function scrub(s) {
			        s = s.trim();
			        s = s.replace(/\s/g, "\n");				// standardize whitespace
			        s = s.replace(/([^\n])\n{1,3}([^\n])/g, "$1 $2");	// 1 to 3 is a space
			        s = s.replace(/([^\n])\n{1,3}([^\n])/g, "$1 $2");	// hack around overlapping matches
			        s = s.replace(/\n{4,}/g, "\n\n");		        // 4 or more is a paragraph break
			        return s;
		        }

		        function getSelectionText() {
			        var text = "";
			        if (typeof window.getSelection != "undefined") {
				        var sel = window.getSelection();
				        if (sel.rangeCount) {
					        var container = document.createElement("div");
					        for (var i = 0, len = sel.rangeCount; i < len; ++i) {
						        container.appendChild(sel.getRangeAt(i).cloneContents());
					        }
					        text = container.textContent;
				        }
			        } else if (typeof document.selection != "undefined") {
				        if (document.selection.type == "Text") {
					        text = document.selection.createRange().textContent;
				        }
			        }
			        return text;
		        }

		        var body = scrub(getSelectionText()) + '\n\n→ ' + document.location;
		        var url = 'http://mail.google.com/mail/?view=cm&fs=1&tf=1'
			        + '&to=' + encodeURIComponent(email)
			        + '&su=' + encodeURIComponent(document.title)
			        + '&body=' + encodeURIComponent(body)
		        // var w = unsafeWindow.open(url,'addwindow','status=no,toolbar=no,width=575,height=545,resizable=yes');
		        var w = GM_openInTab(url);
		        setTimeout(function() { w.focus(); }, 250);
	        }
	        catch (e) { log(e); }
        };
    }

    function Keystroke(spec) {
        var self = this;
        var meta = false;
        var alt = false;
        var ctrl = false;
        var shift = false;
        var key = null;
        var charCode = null;

        spec.toLowerCase().replace(/(meta|alt|ctrl|shift|\w)/g, function(m) {
            switch (m) {
            case "meta":
                meta = true;
                break;
            case "alt":
                alt = true;
                break;
            case "ctrl":
                ctrl = true;
                break;
            case "shift":
                shift = true;
                if (key) {
                    key = key.toUpperCase();
                    charCode = key.charCodeAt(0);
                }
                break;
            default:
                key = (shift ? m.toUpperCase() : m);
                charCode = key.charCodeAt(0);
                break;
            }
        });

        function eventToString(e) {
            return (e.metaKey ? "Meta+" : "")
                + (e.altKey ? "Alt+" : "")
                + (e.ctrlKey ? "Ctrl+" : "")
                + (e.shiftKey ? "Shift+" : "")
                + e.charCode;
        };

        function log() {
            //console.log.apply(console, arguments);
        }

        this.toString = function() {
            return (meta ? "Meta+" : "")
                + (alt ? "Alt+" : "")
                + (ctrl ? "Ctrl+" : "")
                + (shift ? "Shift+" : "")
                + String.fromCharCode(charCode)
                + " (" + charCode + ")";
        };

        this.match = function(event) {
            log("match()");
            var m = (event.metaKey == meta)
                && (event.altKey == alt)
                && (event.ctrlKey == ctrl)
                && (event.shiftKey == shift)
                && (event.charCode == charCode);
            log("matched: " + m);
            return m;
        };

        this.bind = function(node, f) {
            log("bind()");
            log("node:");
            log(node);
            log("f:");
            log(f);
            node.addEventListener("keypress", function(e) {
                log("keypress handler!");
                try {
                    if (self.match(e)) {
                        log("Matched: " + self + " == " + eventToString(e));
                        e.preventDefault();
                        f();
                    }
                    else {
                        log("NOT matched: " + self + " != " + eventToString(e));
                    }
                }
                catch (e) {
                    log(e);
                    log("self:");
                    log(self);
                }
            });
        };
    }

}());