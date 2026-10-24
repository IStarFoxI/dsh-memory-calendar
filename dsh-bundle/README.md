# dsh-memory-calendar

Local-first long-term memory for DeepSeek Harness (DSH).

- 本地保存文本包，不上传；
- 按需回忆，不把整段记忆塞进每一轮对话；
- 支持 `memory_search` / `memory_timeline` / `memory_read` / `memory_expand`；
- 支持多个大脑、工作区连接、只读参考；
- 设置页含工作区抽屉、可见会话、标签/包搜索、检查点提示。

## 安装

当前为 Beta 包，随压缩包分发。安装步骤见 [INSTALL.md](INSTALL.md)。

安装后在 DSH 中打开：

> 设置 → 记忆 → 记忆说明

## 数据位置

默认：

```text
<工作区>/.memory-calendar
```

也可以配置：

```yaml
config:
  storage:
    root: ''   # 空 = 当前默认工作区，再回落 $DSH_HOME/memory-calendar
```

## 工具

- `memory_search({ query, intensity?, deep?, from?, to?, limit? })`
- `memory_timeline({ from?, to?, granularity? })`
- `memory_read({ packageId, chars? })`
- `memory_expand({ packageId, maxEvents?, maxChars? })`
- `memory_pin({ text, tags? })`
- `memory_pins({ query?, limit? })`
- `memory_unpin({ id })`

## 限制

- 文本包只含 user / assistant 文本，不含 reasoning、工具完整输出、附件原文件；
- 完整原始归档是 Beta 3.0 目标；
- 本地 HTTP 路由没有真正的 token 鉴权，建议只在本机使用；
- 没有 Windows 系统通知、云同步、语义向量检索。

## 隐私

- 不上传、不联网同步；
- 会尽力脱敏常见密钥格式，但不保证覆盖全部；
- `memory_expand` 返回原始事件，可能包含未脱敏内容；
- 升级前建议备份 `.memory-calendar`。
