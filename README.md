# 记忆日历 · Memory Calendar

> 为 DeepSeek Harness（DSH）提供低开销的本地持久记忆方案。  
> 数据可自行备份，不承诺永久保存。

## 这是什么

DSH 的本地长期记忆插件：

- 把过去的对话整理成本地文本包；
- 需要时按需检索，不把整段记忆塞回每一轮对话；
- 命中后可以回到原始 session log 事件；
- 全部保存在本机，不上传、不云同步；
- 用「大脑 + 工作区 + 图谱」管理不同上下文的读写边界。

当前版本：`1.0.0-beta.2`（Beta 2.0）。

## 能做什么

- `memory_search`：按关键词、日期、标签找包；
- `memory_timeline`：按天/周查看时间线；
- `memory_read`：读取包内文本；
- `memory_expand`：从包回到原始 session log 事件；
- `memory_pin / memory_pins / memory_unpin`：显式逐字记住；
- 自动检查点：上下文压力较高时保存记忆，压缩后补包；
- 多个大脑、工作区连接、只读参考；
- 设置页：工作区抽屉、可见会话、标签/包搜索、大脑图谱。

## 安装

### 方式一：网盘离线包（推荐，GitHub 打不开时）

下载：

- 链接：<https://pan.xunlei.com/s/VP4hbDSEigAzdxOl93f1LJMtA1?pwd=5tha>
- 提取码：`5tha`
- 文件：`DSH记忆插件-Beta2.0-本地安装包.zip`
- SHA256：`8C8575A9F78114C507B805425A78559FFCDE7A38B770BD22460376D50F747A8E`

步骤：

1. 下载并解压；
2. DSH → Plugins → `+ Add plugin`；
3. 选择「试试其他方式」→ 本地文件夹；
4. 选解压后包含 `package.json` 的文件夹；
5. 重启 DSH。

### 方式二：GitHub

```text
https://github.com/IStarFoxI/dsh-memory-calendar
```

安装说明见 [dsh-bundle/INSTALL.md](dsh-bundle/INSTALL.md)。

### 方式三：手动 bundle

1. 拿到 `dsh-bundle`；
2. 在 DSH 中安装该目录；
3. 重启 DSH；
4. 打开「设置 → 记忆」。

## 数据与隐私

默认数据目录：

```text
<工作区>/.memory-calendar
```

- 不上传、不联网同步；
- 文本包只含 user / assistant 文本；
- 不保存 reasoning、工具完整输出、图片/附件文件本体；
- 会尽力脱敏常见密钥格式，但不保证覆盖全部；
- `memory_expand` 返回原始事件，可能包含未脱敏内容；
- 升级或迁移前，请自行备份 `.memory-calendar`；
- 大脑 root 是**真实目录**：删除大脑并勾选“同时删除数据”会递归删除该目录，不可恢复；不要把 root 指向系统目录或无关项目。

## 当前限制

- 完整原始归档（完整保存）尚未实现，是 **Beta 3.0** 目标；
- 图片/视频只可能保留引用，不保证文件本体；
- 本地 HTTP 路由没有真正的 token 鉴权，建议只在本机使用；
- 没有 Windows 系统通知；
- 没有云同步、多人共享、语义向量检索；
- 70% / 85% 检查点仍在观察。

## 文档

- [用户说明书](docs/用户说明书.md)
- [Beta 2.0 发布说明](docs/RELEASE-NOTES.md)
- [安装说明](dsh-bundle/INSTALL.md)

## 开发

- Node.js `>=24`；
- 插件分 Host / Client / Packager 三个入口；
- 详见 `dsh-bundle` 内代码与说明。

## 许可

MIT License，见 [LICENSE](LICENSE)。
