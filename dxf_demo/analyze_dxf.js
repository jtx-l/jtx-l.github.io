/**
 * 分析 DXF 文件中的图框（矩形），找出所有矩形框及其尺寸
 */
const fs = require('fs');
const path = require('path');

const files = [
  'C:/Users/LYB/Desktop/111.dxf',
  'C:/Users/LYB/Desktop/新建文件夹 (3)/模板.dxf',
  'C:/Users/LYB/Desktop/Drawing1.dxf',
];

function findRectsInDXF(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  // 收集所有 LINE 实体
  const hLines = []; // 水平线 (y1 ≈ y2)
  const vLines = []; // 竖直线 (x1 ≈ x2)
  const circles = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === 'LINE') {
      // 读取 LINE 的 group codes
      let x1, y1, x2, y2;
      while (i < lines.length && lines[i].trim() !== 'ENDSEC') {
        const code = lines[i].trim();
        const val = parseFloat(lines[i + 1]?.trim());
        if (code === '10') x1 = val;
        if (code === '20') y1 = val;
        if (code === '11') x2 = val;
        if (code === '21') y2 = val;
        if (code === '0' && i > 0) break;
        i += 2;
      }
      if (x1 !== undefined && x2 !== undefined) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        if (dx > dy * 10) {
          hLines.push({ x1, y1: (y1 + y2) / 2, x2, length: dx, y: (y1 + y2) / 2 });
        } else if (dy > dx * 10) {
          vLines.push({ y1, x1: (x1 + x2) / 2, y2, length: dy, x: (x1 + x2) / 2 });
        }
        // 斜线忽略（对于图框分析）
      }
    } else if (line === 'LWPOLYLINE') {
      // LWPOLYLINE - 读取顶点
      let vertices = [];
      let closed = false;
      while (i < lines.length && lines[i].trim() !== 'ENDSEC') {
        const code = lines[i].trim();
        if (code === '70') closed = (parseInt(lines[i + 1]) & 1) === 1;
        if (code === '90') {
          const nVerts = parseInt(lines[i + 1]);
          // 跳过到顶点数据
        }
        if (code === '10') vertices.push({ x: parseFloat(lines[i + 1]) });
        if (code === '20') {
          if (vertices.length > 0 && vertices[vertices.length - 1].y === undefined) {
            vertices[vertices.length - 1].y = parseFloat(lines[i + 1]);
          }
        }
        if (code === '0' && i > 0) break;
        i += 2;
      }
      // 过滤有效顶点（有 x 和 y）
      vertices = vertices.filter(v => v.x !== undefined && v.y !== undefined);
      if (vertices.length === 4 && closed) {
        // 4 个顶点的闭合多段线 → 可能是矩形
        const xs = vertices.map(v => v.x);
        const ys = vertices.map(v => v.y);
        const w = Math.max(...xs) - Math.min(...xs);
        const h = Math.max(...ys) - Math.min(...ys);
        const area = w * h;
        return [{
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: w,
          height: h,
          area: area,
        }];
      }
    } else if (line === 'CIRCLE') {
      let cx, cy, r;
      while (i < lines.length && lines[i].trim() !== 'ENDSEC') {
        const code = lines[i].trim();
        if (code === '10') cx = parseFloat(lines[i + 1]);
        if (code === '20') cy = parseFloat(lines[i + 1]);
        if (code === '40') r = parseFloat(lines[i + 1]);
        if (code === '0' && i > 0) break;
        i += 2;
      }
      if (cx !== undefined) circles.push({ cx, cy, r });
    } else if (line === 'INSERT' || line === 'BLOCK' || line === 'ENDBLK') {
      i += 2; continue;
    } else if (line === '0') {
      i += 2; continue;
    } else {
      i += 2; continue;
    }
  }

  // 从水平线和竖直线中找出矩形（图框）
  // 匹配：两条水平线(同一 y) + 两条竖直线(同一 x)且端点匹配
  const rects = [];
  const tolerance = 1.0; // 容差

  // 按长度分组水平线（图框通常有长边）
  const longHLines = hLines.filter(l => l.length > 50);

  for (let i = 0; i < longHLines.length; i++) {
    for (let j = i + 1; j < longHLines.length; j++) {
      const h1 = longHLines[i];
      const h2 = longHLines[j];
      const hDist = Math.abs(h1.y - h2.y);
      if (hDist < 10) continue; // 两条水平线太近，不是图框对边
      if (Math.abs(h1.length - h2.length) > tolerance) continue; // 长度不同
      if (Math.abs(h1.x1 - h2.x1) > tolerance || Math.abs(h1.x2 - h2.x2) > tolerance) continue;

      // 找到了匹配的水平对边，检查是否有对应的竖直线
      const top = Math.min(h1.y, h2.y);
      const bottom = Math.max(h1.y, h2.y);
      const left = Math.min(h1.x1, h1.x2);
      const right = Math.max(h1.x1, h1.x2);
      const w = right - left;
      const h = bottom - top;
      const area = w * h;

      // 检查是否已存在相似的矩形
      const isDuplicate = rects.some(
        r => Math.abs(r.x - left) < tolerance &&
             Math.abs(r.y - top) < tolerance &&
             Math.abs(r.width - w) < tolerance &&
             Math.abs(r.height - h) < tolerance
      );

      if (!isDuplicate && w > 10 && h > 10) {
        rects.push({ x: left, y: top, width: w, height: h, area });
      }
    }
  }

  // 按面积从大到小排序
  rects.sort((a, b) => b.area - a.area);

  return {
    rects,
    totalLines: hLines.length + vLines.length,
    hCount: hLines.length,
    vCount: vLines.length,
    circles: circles.length,
  };
}

// 分析所有文件
console.log('='.repeat(70));
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`\n⚠️  文件不存在: ${path.basename(file)}`);
    continue;
  }

  const stat = fs.statSync(file);
  console.log(`\n📄 ${path.basename(file)}  (${(stat.size / 1024).toFixed(1)} KB)`);

  try {
    const result = findRectsInDXF(file);
    console.log(`   线段总数: ${result.totalLines} (水平:${result.hCount}, 垂直:${result.vCount}), 圆:${result.circles}`);
    console.log(`   检测到 ${result.rects.length} 个矩形图框:`);

    if (result.rects.length === 0) {
      console.log('   (未检测到矩形)');
    } else {
      result.rects.forEach((r, idx) => {
        console.log(`   [${idx + 1}] 位置(${r.x.toFixed(1)}, ${r.y.toFixed(1)})  尺寸: ${r.width.toFixed(1)} × ${r.height.toFixed(1)}  面积: ${r.area.toFixed(0)}`);
      });
    }
  } catch (e) {
    console.log(`   ❌ 解析失败: ${e.message}`);
  }
}
console.log('\n' + '='.repeat(70));
