# 普通用户安装

使用打包好的 ZIP 时，不需要 Node.js、Python 或编译。OpenCLI CLI 仍需自行安装。

1. 下载 `opencli-upload-lab-1.0.24.1.zip`，解压到一个长期保留的文件夹。不要选 GitHub 的源码 ZIP。
2. 打开 Chrome，地址栏输入 `chrome://extensions`，开启右上角“开发者模式”。
3. 若已安装官方 OpenCLI 或旧 Upload Lab，先停用它们，保留安装以便回滚。
4. 点击“加载已解压的扩展程序”，选择直接含 `manifest.json` 的解压目录。
5. 确认卡片显示 OpenCLI Upload Lab 1.0.24.1，再运行官方 CLI 的 `opencli doctor` 检查连接；多 profile 在线时显式指定修补版。

不要删除或移动解压目录。更换版本后需重新加载并重新观测 profile 和页签。

这是非官方修补版，不通过 Chrome 商店自动更新。GitHub Actions 的 Artifacts 下载可能要求登录 GitHub，且下载到外层 artifact ZIP；先解压外层，再解压其中真正的扩展 ZIP。将来发布到 Releases 后可直接下载扩展 ZIP；当前不自动创建 Release。

回滚：停用／移除 Upload Lab，重新启用官方扩展。扩展沿用原有权限，包含 debugger 和网页访问权限。
