/**
 * 🛠️ CAD 画图工具库
 *
 * 使用方法：
 *   1. 在下面"用户画图区域"写你的绘图代码
 *   2. 运行: node cad_tool.js
 *   3. DXF 文件自动保存到桌面，在 AutoCAD 中打开
 *
 * 支持的操作：
 *   - 直线 line(x1,y1, x2,y2)
 *   - 矩形 rect(x, y, w, h)
 *   - 圆 circle(cx, cy, r)
 *   - 圆弧 arc(cx, cy, r, startAngle, endAngle)
 *   - 多边形 polygon(points)
 *   - 文字 text(x, y, str, height)
 *   - 尺寸标注 dim(x1,y1, x2,y2, offset, text)
 *   - 设置图层 setLayer(name)
 *   - 创建图层 addLayer(name, color, linetype)
 *   - 阵列 array(func, count, spacingX, spacingY)
 *
 * 图层：
 *   - "轮廓" (白色实线) - 默认
 *   - "中心线" (红色点划线)
 *   - "标注" (青色实线)
 *   - "剖面线" (蓝色实线)
 *   - "虚线" (黄色虚线)
 *   - "文字" (绿色实线)
 */

const Drawing = require("dxf-writer");
const fs = require("fs");
const path = require("path");

// ==================== 配置 ====================
const OUTPUT_DIR = "C:\\Users\\LYB\\Desktop";
const FILENAME = process.argv[2] || "CAD图纸.dxf";

// ==================== 图层预设 ====================
const LAYERS = {
  轮廓: { color: Drawing.ACI.WHITE,  lineType: "CONTINUOUS" },
  中心线: { color: Drawing.ACI.RED,    lineType: "CENTER" },
  标注: { color: Drawing.ACI.CYAN,   lineType: "CONTINUOUS" },
  剖面线: { color: Drawing.ACI.BLUE,   lineType: "CONTINUOUS" },
  虚线: { color: Drawing.ACI.YELLOW, lineType: "DASHED" },
  文字: { color: Drawing.ACI.GREEN,  lineType: "CONTINUOUS" },
};

// ==================== 绘图上下文 ====================
const drawing = new Drawing();
let currentLayer = "轮廓";

// 初始化图层
for (const [name, cfg] of Object.entries(LAYERS)) {
  drawing.addLayer(name, cfg.color, cfg.lineType);
}
drawing.setActiveLayer(currentLayer);

// ==================== 绘图函数 ====================

/** 切换当前图层 */
function setLayer(name) {
  if (LAYERS[name]) {
    currentLayer = name;
    drawing.setActiveLayer(name);
  } else {
    console.warn(`⚠️ 图层 "${name}" 不存在，可用: ${Object.keys(LAYERS).join(", ")}`);
  }
}

/** 添加自定义图层 */
function addLayer(name, color, lineType = "CONTINUOUS") {
  LAYERS[name] = { color, lineType };
  drawing.addLayer(name, color, lineType);
}

/** 画直线 */
function line(x1, y1, x2, y2) {
  drawing.drawLine(x1, y1, x2, y2);
}

/** 画矩形 */
function rect(x, y, w, h) {
  drawing.drawLine(x, y, x + w, y);
  drawing.drawLine(x + w, y, x + w, y + h);
  drawing.drawLine(x + w, y + h, x, y + h);
  drawing.drawLine(x, y + h, x, y);
}

/** 画圆角矩形 */
function roundedRect(x, y, w, h, r) {
  const points = [];
  const n = 8; // 每个圆角分段数
  // 左上角圆弧
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI / 2) * (i / n);
    points.push([x + r + r * Math.cos(a), y + r + r * Math.sin(a)]);
  }
  // 右上角
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * 1.5 + (Math.PI / 2) * (i / n);
    points.push([x + w - r + r * Math.cos(a), y + r + r * Math.sin(a)]);
  }
  // 右下角
  for (let i = 0; i <= n; i++) {
    const a = 0 + (Math.PI / 2) * (i / n);
    points.push([x + w - r + r * Math.cos(a), y + h - r + r * Math.sin(a)]);
  }
  // 左下角
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (Math.PI / 2) * (i / n);
    points.push([x + r + r * Math.cos(a), y + h - r + r * Math.sin(a)]);
  }
  polygon(points);
}

/** 画多边形 */
function polygon(points) {
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    line(x1, y1, x2, y2);
  }
}

/** 画圆 */
function circle(cx, cy, r) {
  drawing.drawCircle(cx, cy, r);
}

/** 画圆弧 */
function arc(cx, cy, r, startAngleDeg, endAngleDeg) {
  const startRad = (startAngleDeg * Math.PI) / 180;
  const endRad = (endAngleDeg * Math.PI) / 180;
  const segments = Math.max(8, Math.ceil(Math.abs(endAngleDeg - startAngleDeg) / 5));
  let prevX = cx + r * Math.cos(startRad);
  let prevY = cy + r * Math.sin(startRad);
  for (let i = 1; i <= segments; i++) {
    const a = startRad + (endRad - startRad) * (i / segments);
    const nx = cx + r * Math.cos(a);
    const ny = cy + r * Math.sin(a);
    line(prevX, prevY, nx, ny);
    prevX = nx;
    prevY = ny;
  }
}

/** 画带中心线的圆孔 */
function hole(cx, cy, r) {
  setLayer("轮廓");
  circle(cx, cy, r);
  setLayer("中心线");
  const ext = r * 1.5;
  line(cx - ext, cy, cx + ext, cy);
  line(cx, cy - ext, cx, cy + ext);
  setLayer("轮廓");
}

/** 画中心线十字 */
function centerMark(cx, cy, halfLen) {
  setLayer("中心线");
  line(cx - halfLen, cy, cx + halfLen, cy);
  line(cx, cy - halfLen, cx, cy + halfLen);
  setLayer("轮廓");
}

/** 添加文字 */
function text(x, y, str, height = 5, rotation = 0) {
  setLayer("文字");
  drawing.drawText(x, y, height, 0, rotation, str);
  setLayer("轮廓");
}

/** 线性尺寸标注（简化版） */
function dim(x1, y1, x2, y2, offset = 10, overrideText = null) {
  setLayer("标注");
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len, ny = dx / len; // 法线方向

  const ox1 = x1 + nx * offset, oy1 = y1 + ny * offset;
  const ox2 = x2 + nx * offset, oy2 = y2 + ny * offset;

  // 延伸线
  line(x1, y1, ox1, oy1);
  line(x2, y2, ox2, oy2);
  // 尺寸线
  line(ox1, oy1, ox2, oy2);
  // 箭头（简化：短线）
  const arrLen = 3;
  line(ox1, oy1, ox1 + nx * arrLen + dx / len * arrLen, oy1 + ny * arrLen + dy / len * arrLen);
  line(ox1, oy1, ox1 + nx * arrLen - dx / len * arrLen, oy1 + ny * arrLen - dy / len * arrLen);
  line(ox2, oy2, ox2 + nx * arrLen - dx / len * arrLen, oy2 + ny * arrLen - dy / len * arrLen);
  line(ox2, oy2, ox2 + nx * arrLen + dx / len * arrLen, oy2 + ny * arrLen + dy / len * arrLen);

  // 文字
  const mx = (ox1 + ox2) / 2, my = (oy1 + oy2) / 2;
  text(mx - 5, my + 3, overrideText || `${Math.round(len)}`, 3.5);

  setLayer("轮廓");
}

/** 竖直尺寸标注 */
function dimV(x1, y1, x2, y2, offset = 10, overrideText = null) {
  dim(x1, y1, x2, y2, offset, overrideText);
}

/** 矩形阵列 */
function array(func, countX, countY, spacingX, spacingY) {
  for (let i = 0; i < countX; i++) {
    for (let j = 0; j < countY; j++) {
      func(i * spacingX, j * spacingY, i, j);
    }
  }
}

/** 保存 DXF 文件 */
function save(filename) {
  const outputPath = path.join(OUTPUT_DIR, filename || FILENAME);
  fs.writeFileSync(outputPath, drawing.toDxfString(), "utf-8");
  console.log(`✅ 已保存: ${outputPath}`);
  console.log(`📂 双击文件即可在 AutoCAD 中打开！`);
}

// ==================== 🎨 用户画图区域 ====================
// 在这里编写你的绘图代码！

function draw() {

  // ---- 示例：一个简单的零件图 ----

  // 底板 100×15
  rect(0, 0, 100, 15);

  // 两个安装孔
  hole(15, 7.5, 4);
  hole(85, 7.5, 4);

  // 竖板 15×60
  rect(30, 15, 15, 60);

  // 顶部通孔
  hole(37.5, 60, 6);

  // 加强筋（三角形）
  polygon([
    [30, 15],
    [45, 15],
    [30, 35],
  ]);

  // 尺寸标注
  dim(0, -5, 100, -5, 8, "100");     // 底板宽度
  dim(-8, 0, -8, 75, 8, "75");       // 总高度
  dim(30, -5, 45, -5, 15, "15");     // 竖板厚度

  // 标题文字
  text(20, 85, "支架零件图", 6);
  text(15, 78, "材料: Q235  比例 1:1  单位: mm", 3.5);
}

// ==================== 执行 ====================
draw();
save(FILENAME);
