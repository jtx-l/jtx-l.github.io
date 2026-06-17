/**
 * DXF 图框分析器 v2 - 正确解析 DXF group codes
 * 找出所有矩形框(图框)，确定最大尺寸，生成缩放后新文件
 */
const fs = require('fs');
const path = require('path');

// 用户当前打开的图纸 - 优先检查
const files = [
  'C:/Users/LYB/Desktop/Drawing1.dxf',
  'C:/Users/LYB/Desktop/111.dxf',
  'C:/Users/LYB/Desktop/新建文件夹 (3)/模板.dxf',
];

function parseDXF(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  // DXF 每个条目占两行: group_code, value
  // 但 value 可能有前导空格
  const pairs = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '' || trimmed === 'EOF') continue;
    const code = parseInt(trimmed);
    if (isNaN(code)) continue; // 不是 group code
    const value = lines[i + 1] ? lines[i + 1].trim() : '';
    pairs.push({ code, value: isNaN(parseFloat(value)) ? value : parseFloat(value) });
    i++; // 跳过 value 行
  }

  // 找到 ENTITIES section
  let inEntities = false;
  let inBlock = false;
  const entities = [];
  let currentEntity = null;

  for (let i = 0; i < pairs.length; i++) {
    const { code, value } = pairs[i];

    if (code === 0 && value === 'SECTION') continue;
    if (code === 2 && value === 'ENTITIES') { inEntities = true; continue; }
    if (code === 2 && value === 'BLOCK_RECORD') { inBlock = true; continue; }
    if (code === 0 && value === 'ENDSEC') { inEntities = false; inBlock = false; continue; }

    if (code === 0 && inEntities) {
      if (currentEntity) entities.push(currentEntity);
      currentEntity = { type: value, data: {} };
      continue;
    }

    if (currentEntity && code !== 0) {
      // 处理重复 code (如多个 10/20 对表示顶点)
      if (code === 10 || code === 20 || code === 30 || code === 11 || code === 21 || code === 31) {
        if (!currentEntity.data[`_${code}`]) currentEntity.data[`_${code}`] = [];
        currentEntity.data[`_${code}`].push(value);
      }
      currentEntity.data[code] = value;
    }
  }
  if (currentEntity) entities.push(currentEntity);

  return entities;
}

function findRects(entities) {
  // 方法：收集所有 LINE 和 LWPOLYLINE，找到矩形
  const lines_h = []; // 水平线
  const lines_v = []; // 竖直线

  for (const ent of entities) {
    if (ent.type === 'LINE') {
      const x1 = ent.data[10], y1 = ent.data[20];
      const x2 = ent.data[11], y2 = ent.data[21];
      if (x1 === undefined || x2 === undefined) continue;

      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      if (dx < 0.001 && dy < 0.001) continue; // 零长度

      if (dx >= dy) {
        lines_h.push({ x1: Math.min(x1, x2), y1: (y1 + y2) / 2, x2: Math.max(x1, x2), y2: (y1 + y2) / 2, len: dx });
      }
      if (dy >= dx) {
        lines_v.push({ x1: (x1 + x2) / 2, y1: Math.min(y1, y2), x2: (x1 + x2) / 2, y2: Math.max(y1, y2), len: dy });
      }
    } else if (ent.type === 'LWPOLYLINE') {
      const xs = ent.data._10 || [ent.data[10]].filter(Boolean);
      const ys = ent.data._20 || [ent.data[20]].filter(Boolean);
      const closed = (ent.data[70] & 1) === 1;

      if (xs.length === 4 && ys.length === 4 && closed) {
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const w = maxX - minX;
        const h = maxY - minY;
        if (w > 10 && h > 10) {
          // 直接返回这个矩形 - LWPOLYLINE 矩形
          return [{ type: 'lwpolyline', x: minX, y: minY, width: w, height: h, area: w * h }];
        }
      }

      // 多段线各段
      for (let j = 0; j < xs.length; j++) {
        const x1 = xs[j], y1 = ys[j] || 0;
        const x2 = xs[(j + 1) % xs.length] || x1, y2 = ys[(j + 1) % ys.length] || y1;
        if (closed || j < xs.length - 1) {
          const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
          if (dx >= dy) lines_h.push({ x1: Math.min(x1, x2), y1: (y1 + y2) / 2, x2: Math.max(x1, x2), y2: (y1 + y2) / 2, len: dx });
          if (dy >= dx) lines_v.push({ x1: (x1 + x2) / 2, y1: Math.min(y1, y2), x2: (x1 + x2) / 2, y2: Math.max(y1, y2), len: dy });
        }
      }
    } else if (ent.type === 'INSERT') {
      // 块引用 - 检查是否看起来像图框
      const x = ent.data[10] || 0;
      const y = ent.data[20] || 0;
      const sx = ent.data[41] || 1; // X scale
      const sy = ent.data[42] || 1; // Y scale
      const name = ent.data[2] || '?';
      if (sx !== 1 || sy !== 1) {
        // 缩放的 INSERT 可能是一个缩放后的图框
        // 暂时记录但不处理
      }
    }
  }

  // 从水平线+竖直线匹配矩形
  const rects = [];
  const TOL = 1.0;

  // 按长度分组找匹配的水平线对
  for (let i = 0; i < lines_h.length; i++) {
    for (let j = i + 1; j < lines_h.length; j++) {
      const h1 = lines_h[i], h2 = lines_h[j];
      if (h1.len < 50 || Math.abs(h1.len - h2.len) < TOL === false) continue;
      if (Math.abs(h1.len - h2.len) > TOL) continue;
      if (Math.abs(h1.x1 - h2.x1) > TOL || Math.abs(h1.x2 - h2.x2) > TOL) continue;

      const top = Math.min(h1.y1, h2.y1);
      const bottom = Math.max(h1.y1, h2.y1);
      const h = bottom - top;
      if (h < 30) continue;

      const left = Math.min(h1.x1, h1.x2);
      const right = Math.max(h1.x1, h1.x2);
      const w = right - left;
      const area = w * h;

      // 去重
      const dup = rects.find(r =>
        Math.abs(r.x - left) < TOL && Math.abs(r.y - top) < TOL &&
        Math.abs(r.width - w) < TOL && Math.abs(r.height - h) < TOL
      );
      if (!dup) rects.push({ type: 'line-rect', x: left, y: top, width: w, height: h, area });
    }
  }

  return rects;
}

// ===== 主程序 =====
console.log('='.repeat(70));
console.log('DXF 图框分析');
console.log('='.repeat(70));

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`\n⚠️  文件不存在: ${path.basename(file)}`);
    continue;
  }

  const stat = fs.statSync(file);
  console.log(`\n📄 ${path.basename(file)}  (${(stat.size / 1024).toFixed(1)} KB)`);

  try {
    const entities = parseDXF(file);
    console.log(`   实体总数: ${entities.length}`);

    // 统计类型
    const types = {};
    entities.forEach(e => { types[e.type] = (types[e.type] || 0) + 1; });
    console.log(`   实体类型: ${JSON.stringify(types)}`);

    const rects = findRects(entities);
    console.log(`   矩形图框: ${rects.length} 个`);

    if (rects.length > 0) {
      const sorted = rects.sort((a, b) => b.area - a.area);
      sorted.forEach((r, i) => {
        const label = i === 0 ? ' 👑 最大' : `   #${i + 1}`;
        console.log(`  ${label} (${r.type}) 位置(${r.x.toFixed(1)},${r.y.toFixed(1)}) ${r.width.toFixed(1)}×${r.height.toFixed(1)} 面积=${r.area.toFixed(0)}`);
      });

      // 计算缩放比例
      const maxR = sorted[0];
      console.log(`\n  📏 以最大图框 (${maxR.width.toFixed(0)}×${maxR.height.toFixed(0)}) 为基准:`);
      sorted.slice(1).forEach((r, i) => {
        const scaleW = maxR.width / r.width;
        const scaleH = maxR.height / r.height;
        const scale = Math.min(scaleW, scaleH); // 等比例缩放，取较小值确保不超出
        console.log(`    图框#${i + 2}: 缩放比例 = ${scale.toFixed(4)} (${(scale * 100).toFixed(2)}%)`);
      });
    }
  } catch (e) {
    console.log(`   ❌ 错误: ${e.message}`);
    console.log(e.stack);
  }
}
console.log('\n' + '='.repeat(70));
