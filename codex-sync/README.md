# Codex 双机同步说明

这份目录用于在两台 Mac 之间同步“安全的 Codex 本地配置”和项目代码。

## 已确认的事实

- Codex 本机配置目录是 `~/.codex`。
- `~/.codex/auth.json` 是登录凭据，不能提交到任何云端代码库。
- `~/.codex/*.sqlite*`、`sessions/`、`logs`、`cache/`、`.tmp/` 等是本机运行状态或会话数据库，不适合用 Git 双机同步。
- Codex 云端代码库连接的官方入口是 `https://chatgpt.com/codex`，目前官方文档明确支持连接 GitHub。

## 推荐同步结构

1. 代码项目：用 GitHub 私有仓库或 Azure Repos 仓库同步。
2. Codex 云端任务/代码库连接：两台电脑登录同一个 ChatGPT/Codex 账号，并在 `https://chatgpt.com/codex` 连接 GitHub。
3. Codex 本地配置：只同步本目录脚本导出的安全配置包。

## 导出本机 Codex 安全配置

在这台笔记本运行：

```zsh
./codex-sync/export-codex-safe.sh
```

导出结果会放在：

```text
codex-sync/safe-config/
```

导出脚本会把本机用户目录替换为 `__HOME__`，iMac 导入时会自动换成 iMac 的 `$HOME`。脚本会跳过 Codex 自带的 `.system` 技能，只同步你自己的自定义技能。然后可以把 `codex-sync/` 放进你的私有 GitHub 仓库。

## 在 iMac 导入

在 iMac 上克隆同一个仓库后运行：

```zsh
./codex-sync/import-codex-safe.sh
```

导入脚本会先备份 iMac 现有的 `~/.codex/config.toml`、`rules/`、`skills/`，再复制安全配置。

## 不要同步这些文件

不要把下面内容提交到 GitHub/Azure Repos：

```text
~/.codex/auth.json
~/.codex/*.sqlite*
~/.codex/*-wal
~/.codex/*-shm
~/.codex/cache/
~/.codex/.tmp/
~/.codex/tmp/
~/.codex/sessions/
~/.codex/shell_snapshots/
~/.codex/computer-use/
```

这些文件包含登录态、会话记录、缓存或本机专属路径。

## GitHub/Codex 云端连接

打开：

```text
https://chatgpt.com/codex
```

登录 ChatGPT 后，根据页面提示连接 GitHub，并选择允许 Codex 访问的仓库。这个连接是账号级的，完成后两台电脑只要登录同一个账号，就能看到对应云端能力。

如果你说的“微软云端代码库”是 Azure DevOps/Azure Repos，请准备一个仓库 HTTPS 地址，例如：

```text
https://dev.azure.com/{org}/{project}/_git/{repo}
```

我可以继续把本机项目配置成这个远程仓库。
