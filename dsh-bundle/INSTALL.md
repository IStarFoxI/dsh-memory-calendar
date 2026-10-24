# 安装

## 前置

- DeepSeek Harness `0.2.1-rc.2` 或兼容版本；
- Node.js `>=24`（DSH 自带运行时即可）；
- Windows / macOS / Linux 均可运行，当前主要在 Windows 验证。

## 方式一：本地 bundle

把 `dsh-bundle` 目录放到本机任意位置，然后在 DSH 中安装：

```text
plugin_manager install_bundle
  spec: /absolute/path/to/dsh-bundle
```

或在终端：

```sh
dsh plugin --profile <profile> add /absolute/path/to/dsh-bundle
```

安装后重启 DSH Web。

## 方式二：打包安装

如果拿到的是 zip：

1. 解压；
2. 将 `dsh-bundle` 放到本机；
3. 按方式一安装。

## 配置

默认不需要配置：

```text
<当前工作区>/.memory-calendar
```

要指定其他目录：

```yaml
config:
  storage:
    root: '/path/to/memory-root'
```

## 验证

1. 打开 DSH；
2. 设置 → 记忆；
3. 应看到「记忆日历 Beta 2.0」和包/标签统计；
4. 在对话里说“仔细回忆一下……”验证 `memory_search`。

## 数据与卸载

- 所有数据在 `.memory-calendar`；
- 卸载插件不会删除该目录；
- 删除前请先备份。

## 注意

- 不要在主 profile 安装 `0.2.1-alpha.*` 实验 bundle；
- 本地 HTTP 路由无真正 token 鉴权，建议只在本机使用；
- `memory_expand` 返回未脱敏原始事件，注意隐私。
