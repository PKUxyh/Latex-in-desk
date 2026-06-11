# LaTeX Formula Desk

一个本地 Electron LaTeX 公式编辑器，支持：

- MathJax 实时 SVG 预览
- 常用数学符号点击插入
- LaTeX 命令自动提示和 `Ctrl + Space` 补全
- 3 倍分辨率 PNG 导出
- PowerPoint 可直接插入的 SVG 矢量公式导出

## 运行

```powershell
npm install
npm start
```

应用依赖安装完成后，编辑和渲染均可离线使用。

仅在浏览器中预览界面时可运行 `npm run preview`，然后访问 `http://127.0.0.1:4173`。浏览器预览不包含系统文件保存对话框。

## PowerPoint 使用

点击“保存为 PPT 公式”生成 `.svg` 文件，然后在 PowerPoint 中选择“插入 > 图片”或直接拖入幻灯片。SVG 可以无损缩放；在新版 PowerPoint 中还可以转换为形状后进一步编辑。
