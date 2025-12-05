/**
 * @fileoverview Example of HTTP rewrite of response header.
 *
 * @supported Quantumult X (v1.0.5-build183)
 *
 * [rewrite_local]
 * ^http://example\.com/resource8/ url script-response-header response-header.js
 */

// $request.scheme, $request.method, $request.url, $request.path, $request.headers
// $response.statusCode, $response.headers

var modifiedHeaders = $response.headers;

// 直接删除指定的字段
delete modifiedHeaders['Subscription-Userinfo'];

// 结束修改，只返回处理后的 Headers，保持原有的 Status Code 不变
$done({headers : modifiedHeaders});
