// 表单提交 → Gitee Issues API (国内可用)
const GITEE_TOKEN = '4f83abd765411dc176cc2556c913446d';
const GITEE_REPO = 'jtx888/jiatianxia';

async function submitToGitee(formData) {
  const fields = ['customerName','customerPhone','buildLocation','plotWidth','plotDepth','houseWidth','houseDepth','floors',
    'yardPosition','frontYardWidth','frontYardDepth','backYardWidth','backYardDepth','eastYardWidth','eastYardDepth','westYardWidth','westYardDepth',
    'windowFrontHeight','windowFrontWinWidth','windowFrontWinHeight','windowBackHeight','windowBackWinWidth','windowBackWinHeight','windowEastHeight','windowEastWinWidth','windowEastWinHeight','windowWestHeight','windowWestWinWidth','windowWestWinHeight','noWindowSides',
    'dirEast','dirSouth','dirWest','dirNorth','style','budget','startDate','specialReq','sketchFileName'];
  
  let body = '## 客户需求提交\n\n| 字段 | 内容 |\n|------|------|\n';
  let titleName = '未填写';
  fields.forEach(f => {
    const v = formData.get(f);
    if (v) {
      body += '| ' + f + ' | ' + v + ' |\n';
      if (f === 'customerName') titleName = v;
    }
  });
  
  body += '\n---\n提交时间: ' + new Date().toLocaleString('zh-CN');
  
  try {
    const resp = await fetch('https://gitee.com/api/v5/repos/' + GITEE_REPO + '/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: GITEE_TOKEN,
        title: '🏠 ' + titleName + ' - 建筑设计需求',
        body: body,
        labels: '客户需求'
      })
    });
    const data = await resp.json();
    return data.number ? { success: true, issue: data.number } : { success: false };
  } catch(e) {
    return { success: false, error: e.message };
  }
}
