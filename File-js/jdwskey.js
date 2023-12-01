var header = $request.headers;
if (header.Cookie !== undefined) {
  var cookies = header.Cookie;
  var options = {
    "update-pasteboard": cookies,
    "open-url": "shortcuts://run-shortcut?name=获取京东wskey"
  };
  console.log(cookies);
  $notify("京东最新wskey", "获取成功🎉🎉🎉", "点击复制并跳转快捷指令", options);
}
$done();
