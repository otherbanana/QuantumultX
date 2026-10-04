/*
华住会签到 — Quantumult X
根据 2026-10-05 的 APP-IOS 抓包更新，仅适用于 Quantumult X。

把下面两处 SCRIPT_URL 换成此文件的实际脚本地址（或 QX 支持的本地路径）。

[rewrite_local]
^https?:\/\/appgw\.huazhu\.com\/game\/ url script-request-header https://raw.githubusercontent.com/otherbanana/QuantumultX/refs/heads/main/File-js/hzh.js

[task_local]
1 0 * * * https://raw.githubusercontent.com/otherbanana/QuantumultX/refs/heads/main/File-js/hzh.js, tag=华住会, enabled=true

[mitm]
hostname = appgw.huazhu.com

启用重写和 MITM 后，在华住会 APP 中进入签到页面。
看到“获取签到凭据成功”通知后，即可运行定时任务。
重写会从 /game/ 请求中保存含 userToken 的 Cookie，不修改 APP 请求。
凭据仅写入 QX 本地存储；本文件不包含抓包中的真实凭据。
旧脚本获取的 HZH_Token 不作为新接口的已验证凭据。
先调用 /game/sign_in 签到，再调用 /game/sign_header 查询总积分及今日状态。
总积分对应 memberPoint；activityPoints 单独显示为活动积分。
*/

const HZH_NAME = "华住会";
const HZH_COOKIE_KEY = "HZH_Cookie_V2";
const HZH_HEADERS_KEY = "HZH_Headers_V2";

(async function () {
  try {
    if (typeof $request !== "undefined") {
      captureCredentials();
    } else {
      await signIn();
    }
  } catch (_) {
    $notify(HZH_NAME, "脚本执行失败", "请检查 QX 配置，或重新进入 APP 获取签到凭据。");
  } finally {
    $done({});
  }
})();

function readHeader(headers, name) {
  const target = name.toLowerCase();
  const key = Object.keys(headers || {}).find(k => k.toLowerCase() === target);
  return key ? headers[key] : "";
}

function hasUserToken(cookie) {
  return typeof cookie === "string" && /(?:^|;)\s*userToken=[^;\s]+/i.test(cookie);
}

function captureCredentials() {
  if (String($request.method || "GET").toUpperCase() === "OPTIONS") return;
  if (!/^https?:\/\/appgw\.huazhu\.com\/game\//i.test($request.url || "")) return;
  const cookie = readHeader($request.headers, "Cookie");
  if (!hasUserToken(cookie)) return;

  const headers = {};
  ["Client-Platform", "User-Agent", "Origin", "Referer", "Accept-Language"].forEach(name => {
    const value = readHeader($request.headers, name);
    if (value) headers[name] = value;
  });
  const previousCookie = $prefs.valueForKey(HZH_COOKIE_KEY);
  const previousHeaders = $prefs.valueForKey(HZH_HEADERS_KEY);
  const serializedHeaders = JSON.stringify(headers);
  const cookieSaved = $prefs.setValueForKey(cookie, HZH_COOKIE_KEY);
  const headersSaved = $prefs.setValueForKey(serializedHeaders, HZH_HEADERS_KEY);
  if (!cookieSaved || !headersSaved) {
    $notify(HZH_NAME, "保存失败", "请检查 QX 本地存储。");
    return;
  }
  if (cookie !== previousCookie || serializedHeaders !== previousHeaders) {
    $notify(HZH_NAME, "获取签到凭据成功", "已保存至 QX，可运行签到任务。");
  }
}

async function signIn() {
  const cookie = $prefs.valueForKey(HZH_COOKIE_KEY);
  if (!hasUserToken(cookie)) {
    $notify(HZH_NAME, "缺少签到凭据", "请启用重写和 MITM，在 APP 中进入签到页面获取凭据。");
    return;
  }

  let capturedHeaders = {};
  try {
    const parsed = JSON.parse($prefs.valueForKey(HZH_HEADERS_KEY) || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) capturedHeaders = parsed;
  } catch (_) {}
  const headers = {
    "Accept": "application/json, text/plain, */*",
    "Client-Platform": "APP-IOS",
    "Origin": "https://cdn.huazhu.com",
    "Referer": "https://cdn.huazhu.com/",
    "User-Agent": "HUAZHU/ios/iPhone/27.0/9.46.0/RNWEBVIEW",
    "Accept-Language": "zh-CN,zh-Hans;q=0.9"
  };
  ["Client-Platform", "User-Agent", "Origin", "Referer", "Accept-Language"].forEach(name => {
    if (typeof capturedHeaders[name] === "string" && capturedHeaders[name]) headers[name] = capturedHeaders[name];
  });
  headers.Cookie = cookie;

  const sign = await fetchContent(
    "https://appgw.huazhu.com/game/sign_in?date=" + Math.floor(Date.now() / 1000), headers
  );
  const status = await fetchContent("https://appgw.huazhu.com/game/sign_header?", headers);
  const signedNow = sign.ok && sign.content.signResult === true;
  const signedToday = status.ok && status.content.signToday === true;
  const lines = [];
  let title = "签到状态待确认";
  if (signedNow) {
    title = "签到成功";
    if (sign.content.point != null) lines.push("本次积分：" + sign.content.point);
  } else if (signedToday) {
    // 查询接口明确确认今日已签到；不把未成功的签到请求计作新增积分。
    title = "今日已签到";
  } else {
    title = sign.ok ? "签到状态待确认" : "签到失败";
    if (sign.ok) lines.push("接口未确认本次签到成功，请在 APP 查看今日签到状态。");
  }
  if (!sign.ok) lines.push("签到请求：" + sign.error);

  if (status.ok) {
    if (status.content.memberPoint != null) {
      lines.push("总积分：" + status.content.memberPoint);
    } else {
      lines.push("总积分查询：响应缺少 memberPoint 字段。");
    }
  } else {
    lines.push("总积分查询失败：" + status.error);
  }
  // 优先展示签到后查询到的数值；查询失败时保留签到响应中的数值。
  ["activityPoints", "yearSignInCount"].forEach((key, index) => {
    const value = status.ok && status.content[key] != null ? status.content[key]
      : sign.ok ? sign.content[key] : null;
    if (value != null) lines.push((index === 0 ? "活动积分：" : "年度签到次数：") + value);
  });
  $notify(HZH_NAME, title, lines.join("\n"));
}

async function fetchContent(url, headers) {
  let response;
  try {
    response = await $task.fetch({
      url: url,
      method: "GET",
      headers: headers,
      opts: { redirection: false }
    });
  } catch (_) {
    return { ok: false, error: "网络请求未完成，请检查网络后重试。" };
  }

  const httpStatus = Number(response.statusCode);
  if (httpStatus < 200 || httpStatus >= 300 || !Number.isFinite(httpStatus)) {
    return { ok: false, error: "HTTP " + (response.statusCode || "未知") + "，请检查网络或重新获取凭据。" };
  }
  let result;
  try {
    result = JSON.parse(response.body);
  } catch (_) {
    return { ok: false, error: "接口未返回有效 JSON，请检查网络或重新获取凭据。" };
  }
  if (!result || typeof result !== "object") {
    return { ok: false, error: "接口返回内容异常。" };
  }
  const businessOK = String(result.businessCode) === "1000";
  const codeOK = result.code == null || String(result.code) === "200";
  if (!businessOK || !codeOK) {
    const detail = result.message || result.responseDes || "请重新进入 APP 获取凭据。";
    return { ok: false, error: String(detail) + "（业务码：" + String(result.businessCode == null ? result.code : result.businessCode) + "）" };
  }

  if (!result.content || typeof result.content !== "object" || Array.isArray(result.content)) {
    return { ok: false, error: "接口未返回有效 content 数据。" };
  }
  return { ok: true, content: result.content };
}
