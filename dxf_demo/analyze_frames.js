/**
 * DXF 图框分析器 v3 - 通过 INSERT(块引用) 找到所有图框
 * 图框通常以块的形式插入，每个块引用有不同的位置和缩放
 */
const fs = require('fs');
const path = require('path');

// 优先检查的文件
const files = [
  'C:/Users/LYB/Desktop/Drawing1.dxf',
  'C:/Users/LYB/Desktop/111.dxf',
  'C:/Users/LYB/Desktop/新建文件夹 (3)/模板.dxf',
];

function parseDXFFull(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  const sections = {};
  let currentSection = null;
  let currentSub = null;
  let i = 0;

  while (i < lines.length) {
    const code = lines[i].trim();
    const value = (lines[i + 1] || '').trim();
    i += 2;

    if (code === '0' && value === 'SECTION') continue;
    if (code === '0' && value === 'ENDSEC') { currentSection = null; currentSub = null; continue; }

    if (code === '2' && currentSection === null) {
      currentSection = value;
      sections[currentSection] = sections[currentSection] || { entities: [], blocks: {} };
      continue;
    }

    if (code === '0' && value === 'BLOCK' && currentSection === 'BLOCKS') {
      currentSub = { name: '', entities: [], basePoint: { x: 0, y: 0 } };
      continue;
    }
    if (code === '0' && value === 'ENDBLK' && currentSub) {
      sections.BLOCKS.blocks[currentSub.name] = currentSub;
      currentSub = null;
      continue;
    }

    if (currentSub) {
      if (code === '2') currentSub.name = value;
      else if (code === '10') currentSub.basePoint.x = parseFloat(value);
      else if (code === '20') currentSub.basePoint.y = parseFloat(value);
      else if (code === '0') {
        // 子实体
        const entityType = value;
        const entity = { type: entityType, data: {} };
        while (i < lines.length) {
          const ecode = lines[i].trim();
          if (ecode === '0') break;
          const evalue = (lines[i + 1] || '').trim();
          entity.data[parseInt(ecode)] = isNaN(parseFloat(evalue)) ? evalue : parseFloat(evalue);
          i += 2;
        }
        currentSub.entities.push(entity);
      }
    }

    // 收集 ENTITIES section
    if (code === '0' && currentSection === 'ENTITIES') {
      const entityType = value;
      const entity = { type: entityType, data: {} };
      while (i < lines.length) {
        const ecode = lines[i].trim();
        if (ecode === '0') break;
        const evalue = (lines[i + 1] || '').trim();
        const ncode = parseInt(ecode);
        entity.data[ncode] = isNaN(parseFloat(evalue)) ? evalue : parseFloat(evalue);
        i += 2;
      }
      sections.ENTITIES.entities.push(entity);
    }
  }

  return sections;
}

// 分析 INSERT 实体来找图框
function analyzeInserts(entities, blocks) {
  const inserts = entities.filter(e => e.type === 'INSERT');

  console.log(`   总 INSERT 数: ${inserts.length}`);

  // 按块名分组
  const byBlock = {};
  inserts.forEach(ins => {
    const name = ins.data[2] || '(unnamed)';
    if (!byBlock[name]) byBlock[name] = [];
    byBlock[name].push({
      x: ins.data[10] || 0,
      y: ins.data[20] || 0,
      z: ins.data[30] || 0,
      sx: ins.data[41] || 1,  // X scale
      sy: ins.data[42] || 1,  // Y scale
      sz: ins.data[43] || 1,  // Z scale
      rot: ins.data[50] || 0, // rotation
      cols: ins.data[70] || 1,
      rows: ins.data[71] || 1,
    });
  });

  // 找可能作为图框的块（矩形形状）
  const frameBlocks = [];
  for (const [name, instances] of Object.entries(byBlock)) {
    if (instances.length === 0) continue;

    // 如果该块被插入多次且有不同缩放，很可能是图框
    const scales = [...new Set(instances.map(i => `${i.sx.toFixed(2)},${i.sy.toFixed(2)}`))];
    const positions = instances.map(i => `${i.x.toFixed(0)},${i.y.toFixed(0)}`);

    // 检查块定义中是否包含矩形
    const blockDef = blocks[name];
    let blockSize = null;
    if (blockDef && blockDef.entities.length > 0) {
      const xs = [], ys = [];
      blockDef.entities.forEach(e => {
        if (e.type === 'LINE') {
          if (e.data[10] !== undefined) { xs.push(e.data[10]); ys.push(e.data[20] || 0); }
          if (e.data[11] !== undefined) { xs.push(e.data[11]); ys.push(e.data[21] || 0); }
        } else if (e.type === 'LWPOLYLINE') {
          // 简化处理
          if (e.data[10] !== undefined) xs.push(e.data[10]);
          if (e.data[20] !== undefined) ys.push(e.data[20]);
        }
      });
      if (xs.length > 2) {
        blockSize = {
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
        };
      }
    }

    frameBlocks.push({
      name,
      count: instances.length,
      scales,
      positions: positions.slice(0, 5), // 前5个位置
      blockSize,
      instances,
    });
  }

  // 排序：数量多的在前面
  frameBlocks.sort((a, b) => b.count - a.count);

  return { byBlock, frameBlocks };
}

// 分析所有 LWPOLYLINE 来找矩形
function findPolyRects(entities) {
  const rects = [];
  entities.filter(e => e.type === 'LWPOLYLINE').forEach(e => {
    const closed = (e.data[70] & 1) === 1;
    if (!closed) return;

    // LWPOLYLINE 的顶点坐标通过重复的 10/20 code 存储
    // 这需要特殊解析
    const nVerts = e.data[90] || 0;
    if (nVerts !== 4) return;

    // 需要重新从原始数据读取顶点...
    // 这个简化版本可能有局限性
    rects.push({
      x: 0, y: 0, w: 0, h: 0,
      rawData: JSON.stringify(e.data).slice(0, 200),
    });
  });
  return rects;
}

// ===== 主程序 =====
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`\n⚠️  文件不存在: ${path.basename(file)}`);
    continue;
  }

  const stat = fs.statSync(file);
  console.log('\n' + '='.repeat(70));
  console.log(`📄 ${path.basename(file)}  (${(stat.size / 1024).toFixed(1)} KB)`);
  console.log('='.repeat(70));

  try {
    const sections = parseDXFFull(file);
    const entities = sections.ENTITIES?.entities || [];
    const blocks = sections.BLOCKS?.blocks || {};

    console.log(`实体数: ${entities.length}, 块定义数: ${Object.keys(blocks).length}`);

    const { frameBlocks } = analyzeInserts(entities, blocks);

    // 显示前20个块引用
    console.log(`\n📦 块引用分析 (按使用频率排序):`);
    console.log('-'.repeat(60));

    let shown = 0;
    for (const fb of frameBlocks) {
      if (shown >= 25) {
        console.log(`   ... 还有 ${frameBlocks.length - 25} 个块`);
        break;
      }
      shown++;

      const sizeInfo = fb.blockSize
        ? ` 定义尺寸:${fb.blockSize.w.toFixed(0)}×${fb.blockSize.h.toFixed(0)}`
        : '';

      console.log(`\n  ${shown}. "${fb.name}" ×${fb.count}次${sizeInfo}`);

      // 显示不同缩放
      const scaleGroups = {};
      fb.instances.forEach(ins => {
        const key = `sx=${ins.sx.toFixed(3)} sy=${ins.sy.toFixed(3)}`;
        if (!scaleGroups[key]) scaleGroups[key] = [];
        scaleGroups[key].push(ins);
      });

      for (const [skey, sins] of Object.entries(scaleGroups)) {
        const actualW = fb.blockSize ? (fb.blockSize.w * sins[0].sx).toFixed(0) : '?';
        const actualH = fb.blockSize ? (fb.blockSize.h * sins[0].sy).toFixed(0) : '?';
        console.log(`     ${skey} → 实际尺寸: ${actualW}×${actualH} (${sins.length}个)`);
      }
    }
  } catch (e) {
    console.log(`❌ 错误: ${e.message}`);
  }
}
