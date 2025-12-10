const fs = require('fs');
const path = require('path');

// 读取icons.json文件
const iconsJsonPath = path.join(__dirname, 'app', 'data', 'icons.json');
const iconsData = JSON.parse(fs.readFileSync(iconsJsonPath, 'utf8'));

// 遍历所有heroicons图标
const heroiconsDir = path.join(__dirname, 'node_modules', '@heroicons', 'react', '24', 'outline');
const heroiconFiles = fs.readdirSync(heroiconsDir);

// 创建heroicon名称到SVG的映射
const heroiconSvgMap = {};

heroiconFiles.forEach(file => {
  if (file.endsWith('Icon.js')) {
    // 从文件名中提取图标名称
    const iconName = file.replace('Icon.js', '');
    // 读取文件内容
    const fileContent = fs.readFileSync(path.join(heroiconsDir, file), 'utf8');
    // 提取SVG路径
    const pathMatch = fileContent.match(/strokeLinejoin.*?d:(.+?)(?:\)|,)/s);
    if (pathMatch) {
      let svgPath = pathMatch[1].trim().replace(/\n/g, '');
      // 移除路径数据周围的引号
      svgPath = svgPath.replace(/^["'](.+?)["']$/, '$1');
      // 构建完整的SVG字符串
      const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${svgPath}"></path></svg>`;
      heroiconSvgMap[iconName] = fullSvg;
    }
  }
});

// 更新icons.json中的heroicons数据
let updatedCount = 0;

iconsData.forEach(icon => {
  if (icon.library === 'heroicons') {
    // 转换图标名称格式
    const heroiconName = icon.name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
    // 如果找到了对应的SVG数据，更新它
    if (heroiconSvgMap[heroiconName]) {
      icon.svg = heroiconSvgMap[heroiconName];
      updatedCount++;
    }
  }
});

// 保存更新后的icons.json文件
fs.writeFileSync(iconsJsonPath, JSON.stringify(iconsData, null, 2), 'utf8');

console.log(`Updated ${updatedCount} heroicons with SVG data.`);
