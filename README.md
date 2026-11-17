# aitip.tech

Sam Peng 的中英双语技术博客 · https://aitip.tech

基于 [Hugo](https://gohugo.io/) + [PaperMod](https://github.com/adityatelange/hugo-PaperMod)，push 到 `main` 后由 GitHub Actions 构建并发布到 GitHub Pages，自定义域名 `aitip.tech`。

## 目录

```
content/zh/   中文内容  → https://aitip.tech/
content/en/   英文内容  → https://aitip.tech/en/
hugo.yaml     站点配置（菜单、多语言、主页介绍）
themes/PaperMod  主题（git submodule）
scripts/      本地构建 + 部署到 OSS 的脚本
```

## 本地预览

```bash
git clone --recurse-submodules https://github.com/zuizuihao/human-in-loop.git
hugo server -D        # http://localhost:1313 ，-D 包含草稿
```

## 部署（GitHub Pages）

站点是纯静态产物，托管在 GitHub Pages，自定义域名 `aitip.tech`。

- 仓库必须是 **public**（private 仓库需要 GitHub Pro 才能开 Pages）
- `static/CNAME` 固定写入 `aitip.tech`，Hugo 会把它复制到 `public/`
- `hugo.yaml` 的 `baseURL` 必须是 `https://aitip.tech/`
- push 到 `main` 触发 [deploy.yml](.github/workflows/deploy.yml)：安装 Hugo → `hugo --minify` → 上传 artifact → 发布 Pages

### 自定义域名解析（阿里云云解析）

| 记录 | 类型 | 值 |
|---|---|---|
| `@` | A | `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153` |
| `@` | AAAA | `2606:50c0:8000::153`、`2606:50c0:8001::153`、`2606:50c0:8002::153`、`2606:50c0:8003::153` |
| `www` | CNAME | `zuizuihao.github.io`（用户站点域名，不是仓库名） |

首次部署后在仓库 Settings → Pages 确认 Custom domain 为 `aitip.tech` 并勾选 **Enforce HTTPS**。

## 可选：迁移到阿里云 OSS（备案后）

站点体量小、无后端，备案完成后可以迁到 OSS + CDN，大陆访问更快、单价比 Pages 友好：

- 一次性初始化：[scripts/oss-setup.sh](scripts/oss-setup.sh)（建 Bucket、公共读、静态托管、防盗链）
- 本地部署：[scripts/oss-deploy.sh](scripts/oss-deploy.sh)
- CI 部署：[deploy-oss.yml](.github/workflows/deploy-oss.yml)（手动触发，需配置 `SITE_HOST` / `OSS_BUCKET` / `OSS_ENDPOINT` 变量与 `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET` 密钥）

> 大陆地域绑定自定义域名需要 ICP 备案；未备案只能用香港/海外地域。缓存策略：HTML 300 秒，其余资源 1 天。

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
