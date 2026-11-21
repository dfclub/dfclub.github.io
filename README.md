# 我们的官网 · 站点入口（dfclub.github.io 根站）

站内所有线上地址的**统一入口页**，托管在 GitHub Pages，占用用户站根地址 <https://dfclub.github.io/>。
页面本身是纯静态 HTML（单文件、无外部依赖），内容由本地脚本从一份网址清单生成。

## 在线地址

| 用途 | 地址 |
| --- | --- |
| **根地址（本仓库）** | <https://dfclub.github.io/> |
| 三角洲站（子路径） | <https://dfclub.github.io/delta/> |
| 我的世界站（子路径） | <https://dfclub.github.io/mc/> |

## 仓库信息

- 仓库：`dfclub/dfclub.github.io`（Public，默认分支 `main`）
- 发布方式：Settings → Pages → Deploy from a branch → `main` → 目录 `/(root)`
- 仓库名必须是 `dfclub.github.io`，这是 GitHub Pages 用户站的命名规则，只有这个名字才会占用 `https://dfclub.github.io/` 根地址
- `.nojekyll` 存在，关闭 Jekyll 处理

## 目录结构

| 路径 | 内容 |
| --- | --- |
| `index.html` | 入口页全部内容（版式、样式、脚本均内联在这一个文件里） |
| `.nojekyll` | 空文件，关闭 Jekyll |

页面里每个版块（官网 / 三角洲 / MC / MC后台 / 团队成员）都有一对标记：

```html
<!-- LINKS:XXX:start · 本区块由 网址清单.txt 生成，手改会被覆盖 -->
...
<!-- LINKS:XXX:end -->
```

**标记之间的内容每次部署都会被脚本重写，手改 HTML 会被覆盖。**

## 更新流程

数据源都在本机 `D:\三角洲官网\`：

| 文件 | 作用 |
| --- | --- |
| `版块表.txt` | 登记有哪些版块（标记 \| 版块名 \| 复制按钮读屏前缀） |
| `网址清单.txt` | 每行一条：`版块 \| 名称 \| 网址 \| 备注 \| 状态 \| 信号` |
| `官网入口.html` | 页面模板，含各版块的 LINKS 标记 |
| `build-hub.ps1` | 读上面三份，重写 `官网入口.html` 的 LINKS 区块，并把页脚日期改成今天 |
| `update-hub.ps1` | 把 `官网入口.html` 复制到本仓库 `index.html`，commit + push |
| `一键部署官网.bat` | 依次跑上面两个脚本，成功后自动打开线上页 |

### 一条命令发布

双击 `D:\三角洲官网\一键部署官网.bat`，约 30 秒后线上生效。

### 手动等价写法

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:\三角洲官网\build-hub.ps1'
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:\三角洲官网\update-hub.ps1'
```

### 加一条网址

照 `网址清单.txt` 最后一行复制一份，改成本站需要的，保存后双击 `一键部署官网.bat`。
想加新版块，双击 `添加版块.bat`（会先登记 `版块表.txt`，再在清单里补一行）。

列表字段规则：

- **状态**：`ok` = 稳定、`limit` = 限时、`bad` = 极不稳定、`wait` = 审核中
- **信号**：0–3，3 最稳；填 0 不显示信号格
- **网址留空** = 纯文字条目（团队成员名片），没有链接、复制按钮和状态标签
- 以 `#` 开头的行是说明，空行自动跳过

## 注意事项

- 清单写错（版块名不在 `版块表.txt`、网址没有 `http(s)://` 开头、状态不是四个关键字）时，`build-hub.ps1` 会列出问题行并 **拒绝发布**，页面不动。
- `LINKS:XXX` 标记缺失会跳过该区块；同一版块标记重复出现会直接报错退出。
- 不要直接改本仓库的 `index.html`——下次部署会被 `官网入口.html` 覆盖。
- 想改版式、配色、字体：改 `官网入口.html` 的样式段，再双击 `一键部署官网.bat`。
- 推送失败（国内直连 GitHub 被重置）时，`update-hub.ps1` 会自动读系统代理再推；仍失败就重跑一次。
- 页面本身没有敏感信息，可安全公开。

## 变更记录

| 日期 | 内容 |
| --- | --- |
| 2026-11-21 | README 首次加入，说明数据源与发布链路 |
