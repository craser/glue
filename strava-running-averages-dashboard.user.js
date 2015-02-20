// ==UserScript==
// @name       Strava Running Averages Dashboard
// @namespace  https://www.strava.com/dashboard
// @version    14
// @description  Displays some cumulative data on your Strava dashboard.
// @match      https://*.strava.com/dashboard*
// @copyright  2012+, You
// ==/UserScript==
(function() {
    var NUM_DAYS = 7;
    var RECOVERY_RATE = 24; // 130 "suffering points" per week leaves me fresh every Monday.
    
    var log = function() {
        if (true) console.log.apply(console, arguments);
    }

    var formatNumber = function(n, p) {
        var s = n.toFixed(p);
        s = s.replace(/(\d)(\d\d\d(\.|$))/, "$1,$2"); // Total hack that relies on typical number ranges for Strava.
        return s;
    }

    var formatSparkSummary = function(summary) {
        var ls = [];
        for (var t in summary.totals) {
            var totals = summary.totals[t];
            ls = ls.concat(totals.daysSince);
        }
        return formatSparkline(ls, summary.days);
    }

    var formatSparkline = function(ls, m) {
        //var qtys = "▁▂▃▄▅▆▇█"; // 0-9
        var qtys = "▁▃▆█"; // 0-3

        var spark = "";
        for (var i = 0; i <= m; i++) {
            var c = 0;
            for (var j = 0; j < ls.length; j++) {
                if (i == ls[j]) c++;
            }
            var q = Math.min(c, (qtys.length - 1));
            spark += qtys.charAt(q);
        }
        return spark;        
    };

    var format = function(s, vals) {
        return s.replace(/\{(\w+)\}/g, function(m, v) {
            return deref(vals, v, m);
        });
    }

    var deref = function(o, props, d) {
        props = props.split(".");
        while (props.length) {
            var p = props.shift();
            //if (o[p]) {
            if (p in o) {
                o = o[p];
            }
            else {
                return d;
            }
        }
        return o;
    };

    var get = function(url, k) {
        var req = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        req.onreadystatechange = function() {
            if (req.readyState == 4 && req.status == 200) {
                k(req.responseText);
            }
        };
        req.open("GET", url, true);
        req.send();
    };

    var combine = function() {
        var o = {};
        for (i in arguments) {
            var a = arguments[i];
            for (p in a) {
                o[p] = a[p];
            }
        }
        return o;
    }

    var getElementByClass = function(t, c) {
        var ls = window.parent.document.getElementsByTagName(t);
        for (var i = 0; i < ls.length; i++) {
            if (ls[i].className.indexOf(c) != -1) return ls[i];
        }
        return null;
    }

    var buildDash = function(summary, preferredOrder) {
        debugger;
        var dash = document.createElement("div");
        dash.className = "section";

        var title = format('<div style="float: right">{spark}</div><h3>{days}-Day Totals</h3>', {
            spark: formatSparkSummary(summary),
            days: summary.days
        });

        var overall = '<div style="margin-top: 10px">'
            + '<div class="achievement segment-goal-accomplished" style="float: left"></div>'
            + '<div style="margin-left: 40px; border-left: 1px solid #eee; padding-left: 10px">'
            + '<div>Current Fatigue: <b>{fatigue}</b></div>'
            + '</div>';

        var sectionTemplate = '<div style="margin-top: 10px;">'
            + '<div class="sprite type" style="float: left; background-position: {spritePosition};">rides</div>'
            + '<div style="float: right">{spark}</div>'
            + '<div style="margin-left: 40px; border-left: 1px solid #eee; padding-left: 10px;">'
            + '<div>{type}s: <b>{activities}</b></div>'
            + '{activityMetrics}'
            + '</div>'
            + '</div>';

        var html = title; // We'll add to this later.
        for (var t in summary.totals) {
            if (preferredOrder.indexOf(t) < 0) preferredOrder.push(t);
        }

        html += format(overall, summary);

        for (var t in preferredOrder) {
            var type = preferredOrder[t];
            if (type in summary.totals) {
                var totals = summary.totals[type];
                debugger;
                var vals = combine(totals, {
                    spritePosition: getSpritePosition(totals.type),
                });
                vals.distance = formatNumber(totals.distance, 2);
                vals.elevation = formatNumber(totals.elevation, 0);

                var t = format(sectionTemplate, {activityMetrics: getMetricsTemplate(type)});
                var sectionHtml = format(t, vals);
                html += sectionHtml;
            }
        }

        dash.innerHTML = html;

        return dash;
    };

    function getSpritePosition(type) {
        var p = {
            Workout: "0px -31px",
            Ride: "-30px -31px",
            Hike: "-60px -31px",
            Walk: "-60px -31px",
            Run: "-60px -31px"
        };
        return p[type] || p.Workout;
    }

    function getMetricsTemplate(type) {
        switch (type) {
        case "Ride":
            return '<div>Time: <b>{time}</b> / 4:00:00</div>'
                //+ '<div>Distance: <b>{distance}</b>mi</div>'
                + '<div>Climbing: <b>{elevation}</b>ft / 5,000ft.</div>'
                + '<div>Suffering: <b>{suffer}</b> / 130</div>';
        case "Hike":
            return '<div>Distance: <b>{distance}</b>mi</div>'
                + '<div>Climbing: <b>{elevation}</b>ft</div>';
        case "Run":
        case "Walk":
            return '<div>Distance: <b>{distance}</b>mi</div>';
        default:
            return "⚙";
        }
    }

    function Time(s) {
        var m = s.match(/((\d+):)?(\d+):(\d\d)/);
        this.h = (m[2] && parseInt(m[2])) || 0;
        this.m = (m[3] && parseInt(m[3])) || 0;
        this.s = (m[4] && parseInt(m[4])) || 0;
        this.add = function(d) {
            this.s += d.s;
            while (this.s >= 60) {
                this.s -= 60;
                this.m += 1;
            }
            this.m += d.m;
            while (this.m >= 60) {
                this.m -= 60;
                this.h += 1;
            }
            this.h += d.h                
        };
        this.toString = function() {
            function pad(n) { return (n < 10) ? "0" + n : n; }
            return this.h + ":" + pad(this.m) + ":" + pad(this.s);
        };
    };

    function Activity(type, date) {
        this.type = type;
        this.date = date;
        this.days = daysSince(date);
        this.name = null;
        this.id = null;
        this.distance = 0;
        this.elevation = 0;
        this.suffer = 0;             // Populated in getActivityDetails
        this.time = new Time("0:00"); // Populated in getActivityDetails
        this.toString = function() {
            return "Activity[n: '" + this.name + "', t: " + this.type + ", d: " + this.distance + ", e: " + this.elevation + "]";
        };
    };




    var getActivityDetails = function(activities, k) {
        var numPopulated = 0;
        for (i in activities) {
            var a = activities[i];
            if (a.type != "Ride") {      // Only get details for Rides.
                numPopulated++;
                continue;
            }
            (function(a) { // scope
                var url = "https://" + window.location.host + "/activities/" + a.id;
                get(url, function(html) {
                    parseActivityDetails(a, html);
                    if (++numPopulated >= activities.length) {
                        k(activities);
                    }
                });
            }(a));
        }
    };

    var parseActivityDetails = function(a, html) {
        // <li class="suffer-score">
        // <strong>
        // <a href="/activities/218356949/heartrate">16</a>
        // </strong>
        // <div class="label">
        // <span class="glossary-link new-version" data-glossary-term="definition-suffer-score">
        // Suffer Score
        // </span>
        // </div>
        // </li>
        var patterns = {
            suffer: {
                pattern: /<li class='suffer-score'[^>]*>\s*<strong>\s*<a[^>]+heartrate'>(\d+)<\/a>/,
                process: function(m, suffer) {
                    a.suffer = parseInt(suffer);
                }
            },
            time: {
                pattern: /<li>\s*<strong>(\d*:?\d?\d:\d\d)<\/strong>/,
                process: function(m, time) {
                    a.time = new Time(time);
                }
            }
        };

        var masterPattern = compositePattern(patterns);
        html.replace(masterPattern, function(m) {
            try {
                for (i in patterns) {
                    var p = patterns[i];
                    if (p.pattern.test(m)) {
                        m.replace(p.pattern, p.process);
                        return;
                    }
                }
            } catch (e) {
                log(e);
            }
        });

        return a;
    };

    var buildActivityList = function(html) {
        var day = new Date();
        var rides = [];
        var ride = null;

        /* We need 4 fields:
         *     - Date
         *     - Activity Type
         *     - Distance
         *     - Elevation
         * 
         * Maintaining a giant regexp and if/else series to deal with
         * all this got insane. This might not be any better.
         */
        var patterns = {
            date: {
                pattern: /<time class='day'>([^<]+)<\/time>/,            // $1 is the date
                process: function(m, d) {
                    if (!d.match(/\d?\d:\d\d(am|pm)/)) {
                        day = new Date(d);
                        if (!d.match(/[\b\s]('\d{2}|\d{4})\b/)) {
                            var year = new Date().getFullYear();
                            day.setYear(year); // Assumes that all events happened in the last 2 years.
                        }
                    }
                }
            },
            type: {
                pattern: /<div class='[^']*?\btype\b[^']*?' title='(\w*)'[^>]*?>/, // $1 is the type
                process: function(m, type) {
                    if (!!ride) {
                        rides.push(ride);
                    }
                    ride = new Activity(type, day);
                }
            },
            name_id: {
                pattern: /<h3[^>]+class='entry-title[^>]+>\s*<a href="\/activities\/(\d+)" [^>]+>([^<]+)<\/a>/,
                process: function(m, id, name) {
                    if (!ride) return;
                    ride.id = id;
                    ride.name = name;
                }                    
            },
            distance: {
                pattern: /<li title='Distance'>([\d\.]+)/,           // $1 is the distance
                process: function(m, n) {
                    if (!ride) return;
                    ride.distance = parseFloat(n);
                }
            },
            elevation: {
                pattern: /<li title='Elevation Gain'>([\d\.,]+)/,     // $1 is the elevation
                process: function(m, n) {
                    if (!ride) return;
                    n = n.replace(/,/, "");
                    ride.elevation = parseInt(n);
                }
            }
        };

        // Now composite all of the above into a "master" pattern that
        // we can use to iterate through the HTML string returned from
        // the AJAX call.
        var masterPattern = compositePattern(patterns);

        html.replace(masterPattern, function(m) {
            try {
                for (i in patterns) {
                    var p = patterns[i];
                    if (p.pattern.test(m)) {
                        m.replace(p.pattern, p.process);
                        return;
                    }
                }
            } catch (e) {
                log(e);
            }
        });
        if (!!ride) {
            rides.push(ride);
        }

        // Only include rides that are within our time frame.
        rides = rides.filter(function(ride) {
            return ride.days < NUM_DAYS;
        });

        return rides;
    };

    /**
     * THIS WILL FAIL IF THE INPUT PATTERNS CONTAIN FLAGS! IT WILL STRIP THEM!
     */
    var compositePattern = function(patterns) {
        var masterPattern = "";
        for (i in patterns) {
            var s = patterns[i].pattern.toString();
            var p = s.replace(/^\/(.*)\/\w*$/, "$1");       // Strip off the leading and trailing / characters.
            masterPattern += p + "|"            
        }
        masterPattern = masterPattern.substring(0, masterPattern.length - 1); // Strip the last |
        masterPattern = new RegExp(masterPattern, "g");     // Note the g flag!
        return masterPattern;
    };        

    var daysSince = function(d) {
        var sec = 1000;
        var min = sec * 60;
        var hr = min * 60;
        var day = hr * 24;
        var now = new Date(); // today
        var time = (now.getHours() * hr) + (now.getMinutes() * min) + (now.getSeconds() * sec) + now.getMilliseconds();
        var mid = now.getTime() - time;
        var days = Math.ceil(Math.abs((mid - d.getTime()) / day));
        return days;
    };

    var getTypes = function(acts) {
        var types = new Array();
        for (var i = 0; i < acts.length; i++) {
            var type = acts[i].type;
            if (types.indexOf(type) < 0) {
                types.unshift(type);
            }
        }
        return types;
    }
    var getSummary = function(acts) {
        var types = getTypes(acts);
        var summary = {
            days: 0,
            totals: {},
            fatigue: accumulateFatigue(acts)
        };

        for (var a = 0; a < acts.length; a++) {
            var act = acts[a];
            summary.days = Math.min(NUM_DAYS, Math.max(summary.days, act.days));
        }

        for (var a = 0; a < acts.length; a++) {
            var act = acts[a];
            var totals = summary.totals[act.type] || {
                type: act.type,
                activities: 0,
                elevation: 0,
                distance: 0,
                suffer: 0,
                time: new Time("0:00:00"),
                spark: "",
                daysSince: []
            };
            if (act.days >= NUM_DAYS) continue;
            totals.elevation += act.elevation;
            totals.distance += act.distance;
            totals.suffer += act.suffer;
            totals.time.add(act.time);
            totals.daysSince.push(act.days);
            totals.activities++;
            totals.spark = formatSparkline(totals.daysSince, summary.days);
            summary.totals[act.type] = totals;
        }

        return summary;
    };

    var accumulateFatigue = function(acts) {
        var suffering = [0, 0, 0, 0, 0, 0, 0];
        acts.map(function(act) {
            if (act.days < NUM_DAYS) {
                var s = (act.type == "Ride") ? act.suffer : 15;
                suffering[6 - act.days] += s;
            }
        });
        var fatigue = suffering.reduce(function(a, s) {
            return Math.max(s, (a - RECOVERY_RATE + s));
        }, 0);

        return fatigue;
    };

    get("https://" + window.location.host + "/dashboard?feed_type=my_activity", function(html) {
        debugger;
        var activities = buildActivityList(html);
        getActivityDetails(activities, function(activities) {
            var summary = getSummary(activities);
            var sidebar = getElementByClass("div", "sidebar");
            debugger;
            var dash = buildDash(summary, ["Ride", "Run"]);
            sidebar.insertBefore(dash, sidebar.childNodes[0]);
        });
    });
})();

