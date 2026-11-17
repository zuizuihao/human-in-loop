# zuizuihao.github.io

Sam Peng 的中英双语技术博客 · https://zuizuihao.github.io

基于 [Hugo](https://gohugo.io/) + [PaperMod](https://github.com/adityatelange/hugo-PaperMod)，push 到 `main` 后由 GitHub Actions 自动部署。

## 目录

```
content/zh/   中文内容  → https://zuizuihao.github.io/
content/en/   英文内容  → https://zuizuihao.github.io/en/
hugo.yaml     站点配置（菜单、多语言、主页介绍）
themes/PaperMod  主题（git submodule）
```

## 本地预览

```bash
git clone --recurse-submodules https://github.com/zuizuihao/zuizuihao.github.io.git
hugo server -D        # http://localhost:1313 ，-D 包含草稿
```

## 首页视觉

首页 Hero 使用 [独立 SVG 资源](static/images/hero-3d.svg)，由
[首页模板](layouts/home.html) 内联加载以跟随站点明暗主题。
[首页样式](assets/css/extended/home.css) 控制布局、背景及移动端适配；
Hero 与文章列表共用首页内容宽度，动画背景渐隐融入页面，不影响文章内页的阅读宽度。
Hero 仅保留介绍和交互球体；主题导航与文章、标签数量位于“最新文章”区域。
首页按发布日期倒序最多展示 10 篇，不分页；“查看全部文章”进入当前语言的完整文章列表，保留其分页。
完整文章列表使用 [独立目录模板](layouts/posts/section.html)，页头与年份保持紧凑；文章条目采用较大的标题、两行摘要和下置主题链接，兼顾阅读与浏览。
SVG 内部控制球体、轨道节点和卡片动画，系统开启“减少动态效果”时会停用动效。
Agent、RAG、LLM 卡片可点击跳转到当前语言的对应标签页；悬停或键盘聚焦时暂停卡片浮动并高亮边框。
SVG 中的默认标签链接由首页模板通过 Hugo 标签页的 `RelPermalink` 替换。

## 写文章（纯 Markdown）

每篇文章是一个目录（page bundle），图片和正文放在一起：

```
content/zh/posts/my-post/
├── index.md
└── arch.png
content/en/posts/my-post/
└── index.md          # 同名目录 = 互为翻译，页面自动出现「中文 / English」切换
```

```bash
hugo new content/zh/posts/my-post/index.md
```

**只使用标准 Markdown（GFM），不使用 Hugo shortcode**，这样文章在 GitHub、VS Code 预览、Obsidian/Typora 中显示一致，将来迁移到任何工具都无需修改：

| 需求 | 写法 |
| ---- | ---- |
| 图片 | `![说明](./arch.png)` |
| 文章互链 | `[另一篇](../other-post/index.md)` |
| 代码 | ```` ```csharp ```` 围栏代码块 |
| 提示块 | `> [!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]` |
| 表格、任务列表、脚注 | GFM 标准语法 |

front matter 只用通用字段：`title`、`date`、`draft`、`tags`、`description`。
写完把 `draft: true` 改为 `false`，然后 `git push`。

## 更新主题

```bash
git submodule update --remote themes/PaperMod
```
