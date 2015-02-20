// ==UserScript==
// @name       Floating DMG Login
// @namespace  http://dreadedmonkeygod.net
// @version    3
// @description  Displays floating login form.
// @match      http://dreadedmonkeygod.net/home/
// @match      http://dreadedmonkeygod.net/home
// @copyright  2014+ Christopher Raser
// ==/UserScript==

/*********************************************************************************
 * Creates an invisible floating login form on my blog so I can just
 * hit Cmd-\ to log in instead of having to actually go to the
 * sooper-seekrit login page.
 */
(function() {
    var formHtml = '<form name="loginForm" method="post" action="/home/Login.do"><table><tr><td class="inputlabel">Username:</td><td><input type="text" name="username" size="10" value=""></td></tr><tr><td class="inputlabel">Password:</td><td><input type="password" name="password" size="10" value=""></td></tr><tr><td colspan="2"><input type="submit" value="login" title="login"></td></tr></table></form>';

    var div = document.createElement("div");
    div.style.position = "fixed";
    div.style.opacity = 0;
    div.style.height = "1px";
    div.style.width = "1px";
    div.style.top = "0px";
    div.style.right = "0px";
    div.innerHTML = formHtml;

    document.body.appendChild(div);
})();
