# dsh-python-runtime

用于 DSH 自动加载和定位 Python 的极简插件。按 DSH 插件标准（`dsh.bundle.patch` + Host 插件）实现，通过 `dsh-shell-env` 的贡献者机制，在**每次模型 shell 调用**中注入发现好的 Python 路径，而不是只靠提示词提醒。

## 它做什么

插件注册一个 `shellEnv` 贡献者，在每次 shell 调用时暴露：

| 变量 | 含义 |
|---|---|
| `DSH_PYTHON_ENV` | DSH Python 环境根目录的绝对路径；未发现时缺席 |
| `DSH_PYTHON` | `DSH_PYTHON_ENV` 内解释器的绝对路径（Windows 为 `Scripts\python.exe`，POSIX 为 `bin/python`） |
| `DSH_UV` | PATH 上找到的 `uv` 绝对路径；存在时优先使用 uv 模式 |

### 解析顺序（命中即停）

1. **环境事实** — 进程环境中的 `DSH_PYTHON_ENV`（`$DSH_HOME/.env` 机器级默认值会在启动时载入进程环境）。
2. **配置回退** — 上一步未命中时，加载配置：读取 `$DSH_HOME/.env` 中匹配 `DSH_PYTHON_ENV` 的那一行。
3. **报告不可用** — 两步都落空则不贡献任何值，模型按配套 skill 报告 DSH Python 环境不可用，绝不静默改用系统 `python`。

配套 skill（[python-runtime/SKILL.md](python-runtime/SKILL.md)）指示模型：优先 uv 模式（`uv pip install --python ...` / `uv run --python`），`DSH_PYTHON_ENV` 缺失时报告不可用。

## 脱敏

- 只读取配置文件中匹配 `DSH_PYTHON_ENV` 的那一行；其他行、密钥与凭据文件一律不读、不回显。
- 不向 shell 调用注入除这三个 `DSH_*` 键以外的任何环境内容。

## 安装

### 方式一：作为 DSH bundle 安装（推荐）

在任意会话中使用插件管理器：

```
plugin_manager: { action: "install_bundle", target: "<本仓库检出目录的绝对路径>" }
```

或用 CLI 初始化/管理：`dsh plugin`。安装后每次 shell 调用即带 `DSH_PYTHON_ENV` / `DSH_PYTHON` / `DSH_UV`。

### 方式二：只安装配套 skill

把 `python-runtime/SKILL.md` 复制到 `%DSH_HOME%\skills\python-runtime\SKILL.md`。注意 frontmatter 必须以独立的 `---` 行闭合——之前该位置不工作的原因正是 `description:` 后缺失闭合分隔符，坏 YAML 会被 skill 提供方跳过。

## 配置

在 `$DSH_HOME/.env` 中写一行即可指定环境：

```
DSH_PYTHON_ENV=C:\path\to\.venv
```

## 文件

| 文件 | 角色 |
|---|---|
| `index.js` | Host 插件：注册 `shellEnv` 贡献者，解析与脱敏逻辑 |
| `cordis.patch.yml` | bundle patch：插入 `python-runtime` 插件行 |
| `package.json` | bundle 清单：声明 `dsh.bundle.patch` |
| `python-runtime/SKILL.md` | 配套 skill：指示模型优先 uv、缺失时报不可用 |
