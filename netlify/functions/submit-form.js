exports.handler = async function(event, context) {

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
  }

  if (event.httpMethod === 'GET') {
    var params = new URLSearchParams(event.queryStringParameters || {});
    var key = params.get('key') || '';
    if (key !== 'jtx888') {
      return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: '<!DOCTYPE html><html lang=zh-CN><head><meta charset=UTF-8><meta name=viewport content=width=device-width,initial-scale=1.0><title>甲天下美墅</title><style>body{font-family:sans-serif;background:#FAF8F5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.card{background:#fff;padding:48px;text-align:center;border:1px solid #E8E4DC;max-width:360px;width:100%}input{width:100%;padding:14px;border:1px solid #D4CFC6;font-size:1rem;text-align:center;margin-bottom:16px;outline:none}button{width:100%;padding:14px;background:#1a1a1a;color:#fff;border:none;font-size:1rem;cursor:pointer}p{color:#888}</style></head><body><div class=card><h2>甲天下美墅</h2><p>请输入管理密码</p><form method=GET><input type=password name=key placeholder=请输入密码 autofocus><button type=submit>查看提交</button></form></div></body></html>' };
    }
    // Return issues as JSON proxy
    try {
      var resp = await fetch('https://api.github.com/repos/jtx-l/jiatianxia/issues?labels=' + encodeURIComponent('客户需求') + '&state=open&per_page=50', {
        headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN }
      });
      var data = await resp.json();
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) };
    } catch(e) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({error: e.message}) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      var params = new URLSearchParams(event.body);
      var fieldMap = {customerName:'客户姓名',customerPhone:'电话',buildLocation:'地址',houseWidth:'房屋面宽',houseDepth:'房屋进深',floors:'楼层',plotWidth:'宅基地面宽',plotDepth:'宅基地进深',yardPosition:'院子位置',frontYardWidth:'前院面宽',frontYardDepth:'前院进深',backYardWidth:'后院面宽',backYardDepth:'后院进深',eastYardWidth:'东侧院面宽',eastYardDepth:'东侧院进深',westYardWidth:'西侧院面宽',westYardDepth:'西侧院进深',windowFrontHeight:'前窗离地',windowFrontWinWidth:'前窗宽度',windowFrontWinHeight:'前窗高度',windowBackHeight:'后窗离地',windowBackWinWidth:'后窗宽度',windowBackWinHeight:'后窗高度',windowEastHeight:'东窗离地',windowEastWinWidth:'东窗宽度',windowEastWinHeight:'东窗高度',windowWestHeight:'西窗离地',windowWestWinWidth:'西窗宽度',windowWestWinHeight:'西窗高度',noWindowSides:'不留窗面',dirEast:'东面',dirSouth:'南面',dirWest:'西面',dirNorth:'北面',style:'风格',budget:'预算',startDate:'开工',specialReq:'特殊需求',sketchFileName:'平面草图'};
      var body = '';
      var title = '客户';
      params.forEach(function(v, k) {
        if (v && fieldMap[k]) body += '- **' + fieldMap[k] + '**：' + v + '\n';
        if (k === 'customerName') title = v || '客户';
      });
      var resp = await fetch('https://api.github.com/repos/jtx-l/jiatianxia/issues', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '🏠 ' + title + ' - 建房需求', body: body, labels: ['客户需求'] })
      });
      var data = await resp.json();
      if (data.number) {
        return { statusCode: 302, headers: { Location: 'https://jtx-l.github.io/success.html', 'Access-Control-Allow-Origin': '*' }, body: '' };
      }
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: false, error: data.message || 'API error' }) };
    } catch (e) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: false, error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
