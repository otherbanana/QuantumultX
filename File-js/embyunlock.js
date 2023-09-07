/*
Quantumult X 脚本:
[rewrite_local]
#Unlocks
^https:\/\/mb3admin\.com\/admin\/service\/registration\/validateDevice url script-response-body https://raw.githubusercontent.com/otherbanana/Script/master/QuantumultX/Files-JS/embyunlock.js
[mitm]
hostname = mb3admin.com,
*/

var modifiedHeaders = $response.headers;
modifiedHeaders['Pragma'] = 'No-cache';

var modifiedStatus = 'HTTP/1.1 200 OK';


var obj= JSON.parse($response.body);
obj= {
  'cacheExpirationDays': 233,
  'message': 'Device Valid',
  'resultCode': 'GOOD'
};

$done({body: JSON.stringify(obj), status: modifiedStatus, headers : modifiedHeaders});
