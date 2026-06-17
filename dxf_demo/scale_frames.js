/**
 * 缩放 111.dxf 中的小图框 (_Frame65266026)
 * 将 scale=0.054 的实例改为 scale=0.074，与其余 7 个保持一致
 */
const fs = require('fs');

const INPUT = 'C:/Users/LYB/Desktop/111.dxf';
const OUTPUT = 'C:/Users/LYB/Desktop/111_已缩放.dxf';

console.log('🔍 读取 111.dxf ...');
const content = fs.readFileSync(INPUT, 'utf-8');
const lines = content.split(/\r?\n/);

console.log(`   文件共 ${lines.length} 行`);

// DXF 结构: group code 行 + value 行交替
// 查找 INSERT 实体并识别 _Frame65266026 + scale=0.054

let inEntities = false;
let currentEntity = null;
let entityStart = -1;
let entityEnd = -1;

const frameInstances = []; // 收集所有 _Frame65266026 实例

for (let i = 0; i < lines.length; i++) {
  const code = lines[i].trim();
  const value = (lines[i + 1] || '').trim();

  if (code === '2' && value === 'ENTITIES') {
    inEntities = true;
    continue;
  }
  if (code === '0' && value === 'ENDSEC' && inEntities) {
    inEntities = false;
    if (currentEntity) {
      entityEnd = i;
      frameInstances.push({ ...currentEntity, start: entityStart, end: entityEnd });
    }
    continue;
  }

  if (code === '0' && inEntities) {
    // 遇到新实体，先保存上一个
    if (currentEntity && currentEntity.type === 'INSERT' && currentEntity.name === '_Frame65266026') {
      entityEnd = i;
      frameInstances.push({ ...currentEntity, start: entityStart, end: entityEnd });
    }

    currentEntity = { type: value, name: null, sx: 1, sy: 1, sz: 1, x: 0, y: 0, z: 0 };
    entityStart = i;
    continue;
  }

  if (currentEntity) {
    if (code === '2') currentEntity.name = value;       // 块名
    if (code === '10') currentEntity.x = parseFloat(value);  // 插入点 X
    if (code === '20') currentEntity.y = parseFloat(value);  // 插入点 Y
    if (code === '30') currentEntity.z = parseFloat(value);  // 插入点 Z
    if (code === '41') currentEntity.sx = parseFloat(value); // X 缩放
    if (code === '42') currentEntity.sy = parseFloat(value); // Y 缩放
    if (code === '43') currentEntity.sz = parseFloat(value); // Z 缩放
    if (code === '50') currentEntity.rot = parseFloat(value); // 旋转
  }
}

// 保存最后一个
if (currentEntity && currentEntity.type === 'INSERT' && currentEntity.name === '_Frame65266026') {
  frameInstances.push({ ...currentEntity, start: entityStart, end: lines.length });
}

console.log(`\n📦 _Frame65266026 图框实例: ${frameInstances.length} 个\n`);
console.log('  序号  缩放X    缩放Y    实际宽度    实际高度    位置(X,Y)');
console.log('  ' + '-'.repeat(62));

const BLOCK_W = 426720;
const BLOCK_H = 301752;

let smallCount = 0;
let largeCount = 0;
// 从大图框获取精确缩放值
const targetScale = frameInstances.find(f => f.sx > 0.06 && f.sx < 0.99)?.sx || 0.0738;
console.log(`   目标缩放比例: ${targetScale}`);

frameInstances.forEach((f, idx) => {
  const actualW = BLOCK_W * f.sx;
  const actualH = BLOCK_H * f.sy;
  const marker = f.sx < 0.06 ? ' ⚠️ 偏小→需缩放' : ' ✅';
  console.log(`  ${idx + 1}     ${f.sx.toFixed(4)}   ${f.sy.toFixed(4)}   ${actualW.toFixed(0)}    ${actualH.toFixed(0)}    (${f.x.toFixed(0)}, ${f.y.toFixed(0)})${marker}`);

  if (f.sx < 0.06) smallCount++; else largeCount++;
});

console.log(`\n📊 统计: ${largeCount} 个大图框(scale≈0.074), ${smallCount} 个小图框(scale≈0.054)`);

// ===== 执行修改 =====
if (smallCount === 0) {
  console.log('\n✅ 所有图框已经一样大，无需修改！');
  process.exit(0);
}

console.log(`\n🔧 将小图框从 scale=0.054 改为 scale=${targetScale} ...`);

// 重新扫描文件，修改小图框的 scale
const outputLines = [...lines];
let modified = 0;

for (const inst of frameInstances) {
  if (inst.sx > 0.06) continue; // 只处理小图框
  if (inst.sx < 0.01) continue; // 太小的不是

  // 在这个 INSERT 实体的行范围内查找并修改 scale
  for (let i = inst.start; i < inst.end; i++) {
    const code = lines[i].trim();
    // 修改 X scale (code 41)
    if (code === '41' && Math.abs(parseFloat(lines[i + 1]) - inst.sx) < 0.01) {
      outputLines[i + 1] = lines[i + 1].replace(/[\d.]+/, targetScale.toString());
      modified++;
    }
    // 修改 Y scale (code 42)
    if (code === '42' && Math.abs(parseFloat(lines[i + 1]) - inst.sy) < 0.01) {
      outputLines[i + 1] = lines[i + 1].replace(/[\d.]+/, targetScale.toString());
      modified++;
    }
  }
}

console.log(`   修改了 ${modified} 个 scale 值`);

// 保存
fs.writeFileSync(OUTPUT, outputLines.join('\n'), 'utf-8');
console.log(`\n✅ 已保存: ${OUTPUT}`);
console.log(`📂 双击即可在 AutoCAD 中打开查看！`);

// 验证
console.log(`\n🔍 验证修改结果...`);
const newContent = fs.readFileSync(OUTPUT, 'utf-8');
const newLines = newContent.split(/\r?\n/);

// 简单搜索 _Frame65266026 附近的 scale
let verifyCount = 0;
let newSmallCount = 0;
for (let i = 0; i < newLines.length; i++) {
  if (newLines[i].trim() === 'INSERT') {
    let name = '', sx = 1, sy = 1;
    for (let j = i; j < Math.min(i + 50, newLines.length); j++) {
      if (newLines[j].trim() === '2' && newLines[j + 1]?.trim() === '_Frame65266026') name = '_Frame65266026';
      if (newLines[j].trim() === '41') sx = parseFloat(newLines[j + 1]);
      if (newLines[j].trim() === '42') sy = parseFloat(newLines[j + 1]);
      if (newLines[j].trim() === '0' && j > i) break;
    }
    if (name === '_Frame65266026') {
      verifyCount++;
      if (sx < 0.06) {
        newSmallCount++;
        console.log(`   ⚠️ 仍有小图框: sx=${sx}`);
      }
    }
  }
}

console.log(`   图框总数: ${verifyCount}, 小图框剩余: ${newSmallCount}`);
if (newSmallCount === 0) {
  console.log(`   ✅ 全部图框已统一为 scale=${targetScale}！`);
}
