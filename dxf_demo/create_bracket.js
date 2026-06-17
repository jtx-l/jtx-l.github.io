/**
 * 机械支架示例 - 生成 DXF 文件
 * 用 Node.js + dxf-writer 画一个带孔的 L 形支架
 * 保存到桌面，双击即可在 AutoCAD 中打开
 */

const Drawing = require("dxf-writer");
const fs = require("fs");
const path = require("path");

// 桌面路径（根据你的记忆设置）
const OUTPUT_DIR = "C:\\Users\\LYB\\Desktop";
const FILENAME = "机械支架示例.dxf";

// --- 创建图纸 ---
const d = new Drawing();

// 图层设置
d.addLayer("中心线", Drawing.ACI.RED, "CENTER");
d.addLayer("轮廓", Drawing.ACI.WHITE, "CONTINUOUS");
d.addLayer("标注", Drawing.ACI.CYAN, "CONTINUOUS");
d.addLayer("剖面线", Drawing.ACI.BLUE, "CONTINUOUS");

d.setActiveLayer("轮廓");

// ===== 绘制 L 形支架（单位：毫米）=====

// 主体外轮廓
const outline = [
  [0, 0],
  [100, 0],
  [100, 20],
  [60, 20],
  [60, 80],
  [40, 80],
  [40, 20],
  [0, 20],
];

// 画外轮廓（折线）
for (let i = 0; i < outline.length; i++) {
  const [x1, y1] = outline[i];
  const [x2, y2] = outline[(i + 1) % outline.length];
  d.drawLine(x1, y1, x2, y2);
}

// 顶部圆孔 1（直径10mm，圆心在 30, 70）
d.drawCircle(30, 70, 5); // 外圈
d.setActiveLayer("中心线");
d.drawLine(20, 70, 40, 70); // 水平中心线
d.drawLine(30, 60, 30, 80); // 垂直中心线

// 顶部圆孔 2（直径10mm，圆心在 70, 10）
d.setActiveLayer("轮廓");
d.drawCircle(70, 10, 5);

d.setActiveLayer("中心线");
d.drawLine(60, 10, 80, 10);
d.drawLine(70, 0, 70, 20);

// 底部安装孔（直径8mm，圆心在 15, 10）
d.setActiveLayer("轮廓");
d.drawCircle(15, 10, 4);

d.setActiveLayer("中心线");
d.drawLine(7, 10, 23, 10);
d.drawLine(15, 2, 15, 18);

// ===== 右视图（简单表示）=====
const OFFSET_X = 150;

d.setActiveLayer("轮廓");
// 侧板厚度
d.drawLine(OFFSET_X, 0, OFFSET_X, 80);
d.drawLine(OFFSET_X + 15, 0, OFFSET_X + 15, 80);
d.drawLine(OFFSET_X, 80, OFFSET_X + 15, 80);
d.drawLine(OFFSET_X, 0, OFFSET_X + 15, 0);

// 底部凸台
d.drawLine(OFFSET_X, 0, OFFSET_X, -10);
d.drawLine(OFFSET_X + 15, 0, OFFSET_X + 15, -10);
d.drawLine(OFFSET_X, -10, OFFSET_X + 15, -10);

// 侧板上的孔（虚线表示）
d.drawLine(OFFSET_X - 2, 70, OFFSET_X + 17, 70);
d.drawLine(OFFSET_X - 2, 10, OFFSET_X + 17, 10);

// 保存文件
const outputPath = path.join(OUTPUT_DIR, FILENAME);
fs.writeFileSync(outputPath, d.toDxfString(), "utf-8");

console.log(`✅ DXF 文件已生成: ${outputPath}`);
console.log(`📐 图纸内容: L形机械支架（二视图）`);
console.log(`📏 尺寸: 100×80mm，包含3个安装孔`);
console.log(`\n双击该文件即可在 AutoCAD 中打开！`);
