# 记忆日历 Beta 2.0

- 版本：`1.0.0-beta.2`
- 日期：2026-10-24

## 包含

- `memory_expand`：从包回到原始 session log 事件；
- 显式 pin；
- 关闭本工作区记忆；
- 自动检查点 + 顶部提示；
- 工作区抽屉、可见会话节点；
- 会话勾选/拖拽排序；
- 标签/包搜索；
- 精确重复计数 `duplicateCount`；
- 20 题召回验收：20/20 相关命中，负题 2/2 正确 `noHit`。

## 安全与数据保护

- 新工作区首次检查点可正常建立索引；
- `brains.json` / `pins.json` 损坏时备份并 fail-closed；
- 索引/配置文件使用唯一临时文件 + 原子替换；
- 大脑 root 只允许 `.memory-calendar` 目录，删除数据前校验；
- HTTP 路由限制 loopback Host，降低 DNS rebinding 读取风险；
- 孤儿包只移到 `.trash`，不永久删除；
- 只读大脑不再接收检查点/pin 写入。

## 已知限制

- 完整原始归档（完整保存）未完成，Beta 3.0 目标；
- 文本包只含 user / assistant 文本；
- 附件文件本体不保存；
- `memory_expand` 依赖 DSH session log 存在；
- 70% / 85% 检查点仍在观察；
- 本地 HTTP 路由无真正 token 鉴权；
- 无 Windows 系统通知、云同步、语义向量检索。
