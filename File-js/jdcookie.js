/*

京东抓取pt_key，自用

[rewrite_local]
^https:\/\/mars\.jd\.com\/log\/sdk\/v2 -url script-request-header https://raw.githubusercontent.com/otherbanana/QuantumultX/main/File-js/jdcookie.js

[mitm] 
hostname = mars.jd.com

**/

var header = $request.headers;
if (header.Cookie !== undefined) {
  var cookies = header.Cookie;
  var options = {
    "update-pasteboard": cookies,
    "open-url": "shortcuts://run-shortcut?name=获取京东cookie"
  };
  console.log(cookies);
  $notify("京东最新pt_key", "获取成功🎉🎉🎉", "点击复制并跳转快捷指令", options);
}
$done();
