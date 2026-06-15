// 甲天下美墅 - 表单提交 & 查看（一体化函数）
// GET  ?key=JTMX2026 → 查看提交列表
// GET  ?key=JTMX2026&id=xxx → 查看提交详情
// POST → 提交表单数据
// 数据存储在函数实例内存中（Netlify 保持函数 warm，数据持久数小时）

const ADMIN_KEY = 'JTMX2026';

// 模块级缓存 - 函数实例保持活跃期间数据持久
let submissions = [];
let submissionDetails = {};

exports.handler = async function(event, context) {

  // ============ GET: 查看提交 ============
  if (event.httpMethod === 'GET') {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const key = params.get('key') || '';

    if (key !== ADMIN_KEY) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: loginPage()
      };
    }

    const viewId = params.get('id');
    if (viewId && submissionDetails[viewId]) {
      return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: detailPage(viewId, submissionDetails[viewId], key) };
    }

    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: listPage(submissions, key) };
  }

  // ============ POST: 提交表单 ============
  if (event.httpMethod === 'POST') {
    try {
      const params = new URLSearchParams(event.body);
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      const now = new Date().toISOString();

      const entry = {
        id, time: now,
        客户姓名: params.get('customerName') || '',
        联系电话: params.get('customerPhone') || '',
        建筑地点: params.get('buildLocation') || '',
        房屋面宽_米: params.get('houseWidth') || '',
        房屋进深_米: params.get('houseDepth') || '',
        建筑层数: params.get('floors') || '',
        宅基地面宽_米: params.get('plotWidth') || '',
        宅基地进深_米: params.get('plotDepth') || '',
        前院面宽_米: params.get('frontYardWidth') || '',
        前院进深_米: params.get('frontYardDepth') || '',
        后院面宽_米: params.get('backYardWidth') || '',
        后院进深_米: params.get('backYardDepth') || '',
        东侧院面宽_米: params.get('eastYardWidth') || '',
        东侧院进深_米: params.get('eastYardDepth') || '',
        西侧院面宽_米: params.get('westYardWidth') || '',
        西侧院进深_米: params.get('westYardDepth') || '',
        前南面窗户离地高度_cm: params.get('windowFrontHeight') || '',
        后北面窗户离地高度_cm: params.get('windowBackHeight') || '',
        东面窗户离地高度_cm: params.get('windowEastHeight') || '',
        西面窗户离地高度_cm: params.get('windowWestHeight') || '',
        不留窗的面: params.get('noWindowSides') || '',
        东面情况: params.get('dirEast') || '',
        南面情况: params.get('dirSouth') || '',
        西面情况: params.get('dirWest') || '',
        北面情况: params.get('dirNorth') || '',
        建筑风格偏好: params.get('style') || '',
        预算范围: params.get('budget') || '',
        预计开工时间: params.get('startDate') || '',
        其他特殊要求: params.get('specialReq') || '',
        平面草图文件名: params.get('sketchFileName') || ''
      };

      submissionDetails[id] = entry;
      submissions.unshift({ id, time: now, name: entry['客户姓名'], phone: entry['联系电话'], location: entry['建筑地点'] });

      // 限制内存使用，保留最新200条
      if (submissions.length > 200) {
        const removed = submissions.splice(200);
        removed.forEach(r => delete submissionDetails[r.id]);
      }

      console.log('✅ 新提交:', id, entry['客户姓名'], entry['联系电话']);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, id })
      };
    } catch (e) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: false, error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};

// ============ HTML 页面 ============

function loginPage() {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>甲天下美墅 - 管理登录</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600;700;900&family=Noto+Sans+SC:wght@300;400&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans SC',sans-serif;background:#FAF8F5;display:flex;align-items:center;justify-content:center;min-height:100vh;background-image:linear-gradient(rgba(26,58,92,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(26,58,92,.03) 1px,transparent 1px);background-size:40px 40px}.card{background:#fff;text-align:center;padding:48px 40px;max-width:400px;width:100%;margin:24px;border:1px solid #E8E4DC}.icon{font-size:3rem;margin-bottom:16px;display:block}h1{font-family:'Noto Serif SC',serif;font-size:1.4rem;font-weight:900;letter-spacing:4px;color:#1a1a1a;margin-bottom:8px}p{color:#888;font-size:.85rem;margin-bottom:24px}input{width:100%;padding:14px 16px;border:1px solid #D4CFC6;font-size:1rem;text-align:center;font-family:'Noto Sans SC',sans-serif;outline:none;margin-bottom:16px}input:focus{border-color:#1A3A5C}button{width:100%;padding:14px;background:#1a1a1a;color:#fff;border:none;font-family:'Noto Serif SC',serif;font-size:1rem;font-weight:700;letter-spacing:4px;cursor:pointer}button:hover{background:#1A3A5C}</style></head><body><div class="card"><span class="icon">🔐</span><h1>甲天下美墅</h1><p>请输入管理密钥查看客户提交</p><form method="GET"><input type="password" name="key" placeholder="请输入管理密钥" autofocus><button type="submit">查看提交记录</button></form></div></body></html>`;
}

function listPage(list, key) {
  const rows = list.map((item, i) => `
    <tr>
      <td>${list.length - i}</td>
      <td>${item.time ? new Date(item.time).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}) : '-'}</td>
      <td><strong>${esc(item.name) || '-'}</strong></td>
      <td>${esc(item.phone) || '-'}</td>
      <td>${esc(item.location) || '-'}</td>
      <td><a href="?key=${key}&id=${item.id}" style="color:#B89B5E;">详情</a></td>
    </tr>`).join('');

  const empty = list.length === 0
    ? '<div style="text-align:center;padding:60px;background:#fff;border:1px solid #E8E4DC;"><p style="color:#B8B0A6;font-size:1.1rem;">📭 暂无提交记录</p><p style="color:#ccc;font-size:.85rem;margin-top:8px;">客户扫码填写表单后，提交将显示在此处</p></div>'
    : `<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #E8E4DC;"><thead><tr><th style="background:#F5F0EA;padding:14px 16px;text-align:left;font-family:'Noto Serif SC',serif;font-size:.82rem;letter-spacing:1px;color:#666;border-bottom:2px solid #E8E4DC;">#</th><th style="background:#F5F0EA;padding:14px 16px;text-align:left;font-family:'Noto Serif SC',serif;font-size:.82rem;letter-spacing:1px;color:#666;border-bottom:2px solid #E8E4DC;">提交时间</th><th style="background:#F5F0EA;padding:14px 16px;text-align:left;font-family:'Noto Serif SC',serif;font-size:.82rem;letter-spacing:1px;color:#666;border-bottom:2px solid #E8E4DC;">客户姓名</th><th style="background:#F5F0EA;padding:14px 16px;text-align:left;font-family:'Noto Serif SC',serif;font-size:.82rem;letter-spacing:1px;color:#666;border-bottom:2px solid #E8E4DC;">电话</th><th style="background:#F5F0EA;padding:14px 16px;text-align:left;font-family:'Noto Serif SC',serif;font-size:.82rem;letter-spacing:1px;color:#666;border-bottom:2px solid #E8E4DC;">地址</th><th style="background:#F5F0EA;padding:14px 16px;text-align:left;font-family:'Noto Serif SC',serif;font-size:.82rem;letter-spacing:1px;color:#666;border-bottom:2px solid #E8E4DC;">操作</th></tr></thead><tbody>${rows}</tbody></table>`;

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>客户提交记录 - 甲天下美墅</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600;700;900&family=Noto+Sans+SC:wght@300;400;500&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans SC',sans-serif;background:#FAF8F5;padding:40px 24px;min-height:100vh;background-image:linear-gradient(rgba(26,58,92,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(26,58,92,.03) 1px,transparent 1px);background-size:40px 40px}.container{max-width:1000px;margin:0 auto}.header{background:#1a1a1a;color:#fff;padding:28px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}.header h1{font-family:'Noto Serif SC',serif;font-size:1.3rem;letter-spacing:4px;font-weight:900}.header .count{font-size:.85rem;opacity:.5}td{padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:.85rem}tr:hover td{background:#FAF8F5}.footer{text-align:center;padding:24px;color:#B8B0A6;font-size:.78rem;letter-spacing:1px}a{color:#1A3A5C}</style></head><body><div class="container"><div class="header"><h1>🏗 甲天下美墅 · 客户提交记录</h1><span class="count">共 ${list.length} 条提交</span></div>${empty}<div class="footer"><p style="margin-top:12px">甲天下美墅 · JIATIANXIA MANSION</p><p style="font-size:.7rem;color:#ccc;margin-top:4px">管理密钥：JTMX2026</p></div></div></body></html>`;
}

function detailPage(id, entry, key) {
  const fields = Object.entries(entry).filter(([k]) => k !== 'id');
  const rows = fields.map(([k,v]) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#888;white-space:nowrap;font-size:.85rem;font-weight:500">${esc(k)}</td><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">${esc(v) || '-'}</td></tr>`).join('');
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>提交详情 - 甲天下美墅</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600;700;900&family=Noto+Sans+SC:wght@300;400;500&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans SC',sans-serif;background:#FAF8F5;padding:40px 24px;min-height:100vh;background-image:linear-gradient(rgba(26,58,92,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(26,58,92,.03) 1px,transparent 1px);background-size:40px 40px}.container{max-width:700px;margin:0 auto}.card{background:#fff;border:1px solid #E8E4DC;padding:32px}.header{background:#1a1a1a;color:#fff;padding:24px 32px;margin-bottom:0}.header h1{font-family:'Noto Serif SC',serif;font-size:1.2rem;letter-spacing:4px;font-weight:900}a{color:#B89B5E;text-decoration:none;display:inline-block;margin-top:20px}</style></head><body><div class="container"><div class="header"><h1>📋 提交详情</h1><p style="font-size:.78rem;opacity:.5;margin-top:4px">${entry.time ? new Date(entry.time).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}) : ''}</p></div><div class="card"><table style="width:100%;border-collapse:collapse">${rows}</table><a href="?key=${key}">← 返回列表</a></div></div></body></html>`;
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
