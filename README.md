# OpenCLI Upload Lab

基于 **OpenCLI Browser Bridge 1.0.24** 的非官方文件上传修补项目，解决已复现的 `Page.fileChooserOpened not received within 5s` 超时。只改文件上传函数，不重写 OpenCLI，也不修改命令行 CLI。

上游：[jackwener/opencli](https://github.com/jackwener/opencli)。本项目与上游维护者无隶属关系，不代表官方版本。

## 普通用户：下载 ZIP 即可安装

打包版无需 Node.js、Python 或自行编译。下载 `opencli-upload-lab-1.0.24.1.zip`，解压后打开 `chrome://extensions`，启用开发者模式，停用旧版，再“加载已解压的扩展程序”，选择含 `manifest.json` 的文件夹。详见 [安装说明](INSTALL.md)。OpenCLI CLI 仍需自行安装。

当前已配置 GitHub Actions 打包，但首次线上运行须等工作流推送到远程后。Actions 页对应运行的 Artifacts 中会包含扩展 ZIP 和 `SHA256SUMS.txt`；下载可能需要登录 GitHub，并解压外层 artifact ZIP。当前尚无已发布的 Release 下载，不要把源码 ZIP 当扩展包。

## 版本与优势

| 项目 | 说明 |
| --- | --- |
| 项目版本 | 0.1.0，源码及工具包版本 |
| 扩展版本 | 1.0.24.1，本地自定义修补标识 |
| 上游基线 | Browser Bridge 1.0.24 |
| 已实测 CLI | OpenCLI 1.8.8，未修改 |

- 文件输入点击增加 `userGesture:true`，沿用官方文件选择器拦截与 `backendNodeId` 上传路径。
- 必要时临时显示隐藏输入，在 `finally` 中恢复原内联样式并关闭文件选择器拦截。
- 拒绝非文件输入、禁用输入及歧义选择器，减少误选目标。
- 不增加扩展权限，不扩大 CDP 方法白名单；原有 `debugger`、网页访问等权限仍然存在。
- 独立加载，保留官方安装，便于回滚。
- 提供无第三方依赖的构建脚本和模拟 CDP 回归测试。

## 环境与测试

需要 Node.js 20.18.1 或以上、Chrome，以及自行安装的官方 Browser Bridge 1.0.24。无需 `npm install`。

```sh
npm test
```

测试覆盖：基线在模拟条件下超时、可见及隐藏输入上传、跨页事件过滤、写入失败后的监听器与拦截清理、隐藏样式恢复。测试不会连接浏览器或上传文件。

## 构建与安装

在仓库目录执行，参数为官方扩展目录，目录内应有 `manifest.json`、`dist/background.js`、`icons` 和弹窗文件：

```sh
node scripts/build.mjs "<官方扩展目录>"
```

脚本核对版本及原上传函数与测试基线一致后，生成 `dist/extension`；输出目录已存在时拒绝覆盖，请先自行移走旧输出。原安装目录保持不变。构建记录只包含版本、哈希和改动范围，不记录本机绝对路径。

1. 打开 `chrome://extensions`，启用开发者模式。
2. 暂停官方 OpenCLI 扩展，保留安装。
3. 点击“加载已解压的扩展程序”，选择 `dist/extension`。
4. 使用官方 CLI 的 `opencli doctor` 与 profile 列表确认连接。多扩展在线时，显式选择修补版 profile；不要复用旧页签标识。
5. 先在本地测试页验证，再操作目标网站。每次重新确认文件输入选择器唯一、准确。

仍使用官方 CLI 的 upload/setFileInput 接口，具体参数以所安装 CLI 的帮助为准。接口成功不能代替网站传输完成、媒体时长和封面实际应用的检查。

## 验证与限制

2026-10-10，开发环境中已完成真实 Chrome 可见／隐藏文件输入验证，包括文件内容、大小、单次 change 事件及样式恢复；也完成抖音视频与横竖双封面自动上传、应用及目视验收。公开仓库不包含账号、后台截图、媒体或浏览器资料。

本仓库重新整理的构建入口已通过本地构建、背景脚本语法、权限一致性及原安装未改动检查；用户重新加载本仓库生成的扩展后，可见／隐藏输入的真实本机上传测试通过，见 [真实验收记录](tests/LIVE_VALIDATION.md)。抖音验收来自原项目同一修补函数，未针对本仓库重新操作平台。模拟测试不等于所有网站验收。视频上传验收不代表草稿保存恢复或公开发布成功。

## GitHub Actions 打包

[工作流](.github/workflows/package.yml) 支持 main 分支 push、PR 与手动运行。仅使用仓库读取权限，不执行 GitHub Release 发布。

流程：测试 → 下载固定官方 1.0.24 ZIP → 核对 `upstream.json` 中 SHA256 → 核对上传函数基线 → 独立构建 → 语法检查 → 校验权限和 ZIP 文件范围 → 生成安装 ZIP 与校验文件 → 保存 artifact 30天。

开发者可在已安装 Node.js、Python 的 PowerShell 环境运行同一打包入口：

```powershell
./scripts/package.ps1
```

输出位于 `dist/`，构建中间产物是 `dist/package-extension`。此目录已存在时会拒绝覆盖，重复运行前需自行移走。构建及下载目录均不纳入 Git。

组合修补有效，但尚未单独测量用户手势与隐藏显示的各自贡献。没有验证所有网站、Chrome 版本、iframe 或 shadow DOM 场景。动态页面替换输入节点可能影响样式恢复；CSS 选择器需要现场核对。当前基线固定为 1.0.24，不能承诺兼容后续上游版本。

## 更新与回滚

生成的扩展删除固定 `key` 和商店 `update_url`，使用独立名称及版本，通过开发者模式加载，需手动维护。GitHub 源码发布不等于 Chrome 商店发布。

回滚：停用或移除 Upload Lab，重新启用官方扩展，再重新观测 profile 和页签。

## 公开文件与许可证

源码仓库只包含修补函数、构建工具、测试基线、文档与许可声明。`dist/`、媒体、日志、密钥及 `.env` 不纳入 Git；发布前仍需人工检查暂存文件，不能只依赖 `.gitignore`。

采用 Apache-2.0，见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)。保留上游归属，修改文件有变更说明。若再分发生成扩展，应保留所携带的许可证与适用上游声明。
