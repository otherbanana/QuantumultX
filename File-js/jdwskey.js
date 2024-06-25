/*

京东抓取wskey，自用

[rewrite_local]
^https:\/\/api\.m\.jd\.com\/client\.action\?functionId= url script-request-header jdwskey.js
[mitm] 
hostname = api.m.jd.com
