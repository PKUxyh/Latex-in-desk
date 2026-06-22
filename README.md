# LaTeX Formula Desk

一个本地 Electron LaTeX 公式编辑器，支持：

- MathJax 实时 SVG 预览
- 常用数学符号点击插入
- LaTeX 命令自动提示和 `Ctrl + Space` 补全
- PowerPoint 原生公式一键复制，粘贴后仍可编辑
- 复制 PPT 原生公式时可选择字体大小（pt）
- 始终置顶的迷你输入窗口，实时预览并按 `Enter` 复制 PPT 原生公式
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

点击“复制 PPT 公式”，然后直接在 PowerPoint 中粘贴。应用会写入 Office 识别的 `MathML` 与 `MathML Presentation` 剪贴板格式，PowerPoint 会将其转换为原生可编辑公式，而不是普通字符或图片。复制前可以在字体大小选择框中设置公式字号（pt）。

点击“迷你输入窗”会在屏幕顶部打开一个始终置顶的长条窗口。左侧输入 LaTeX，右侧实时显示浅色公式预览；输入反斜杠命令时最多显示 3 条代码提示，可用方向键选择并按 `Tab` 补全。语法正确时按 `Enter` 即可复制为 PowerPoint 原生可编辑公式。复制后输入内容会被选中，可直接键入下一条公式；按 `Esc` 或右侧关闭按钮可隐藏窗口。

点击“保存为 SVG”生成 `.svg` 文件，然后在 PowerPoint 中选择“插入 > 图片”或直接拖入幻灯片。SVG 可以无损缩放；在新版 PowerPoint 中还可以转换为形状后进一步编辑。
