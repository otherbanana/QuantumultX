/*
美团抓取token，自用
*/

[rewrite_local]
^https:\/\/lx0\.meituan\.com\/ url script-request-header mttoken.js
[mitm] 
hostname = lx0.meituan.com

