# 小账岛 · Profitpect

慢慢记，好好生活。钱途无量，从一笔小账开始。

一款面向日常收支的中文个人记账应用，支持 Web 与 Android。通过手工录入、自然语言草稿和经授权的付款识别，记录消费、查看预算与趋势，让小岛随记账天数成长。

[![Build and test](https://github.com/pttman/Profitpect/actions/workflows/ci.yml/badge.svg)](https://github.com/pttman/Profitpect/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-0.3.0%20beta-orange)
![Android](https://img.shields.io/badge/Android-8.0%2B-3DDC84?logo=android&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Storage](https://img.shields.io/badge/storage-local--first-228B67)

**[下载 APK](https://github.com/pttman/Profitpect/releases/download/v0.3.0-beta.1/xiaozhang-island-0.3.0.apk)** · [版本说明](https://github.com/pttman/Profitpect/releases/tag/v0.3.0-beta.1) · [安卓接入说明](android/README.md) · [更新记录](CHANGELOG.md) · [反馈问题](https://github.com/pttman/Profitpect/issues)

> 当前为 0.3.0 测试版。真实微信、支付宝付款页面端到端识别尚未完成验证；部分 vivo / Android 17 设备会撤销无障碍授权。付款识别用于辅助记账，覆盖范围与已知问题见下文。

## 功能一览

| 功能 | 当前支持 |
| --- | --- |
| 日常记账 | 收入、支出、分类、日期、备注；新增、修改、删除、连续记账和撤销 |
| 自然语言草稿 | 输入“午餐 28 元”“昨天坐地铁 6 元”，生成可编辑草稿，核对后保存 |
| 可选云端 AI | 自行配置后端后启用；默认使用无需联网的本机规则，界面区分两种方式 |
| 安卓付款通知 | 经通知使用权授权后，匹配微信、支付宝付款成功通知；支持待确认和可选自动入账 |
| 安卓付款页面 · 实验性 | 经无障碍授权后，匹配前台付款成功页的可访问文字；与通知识别独立开关 |
| 账单浏览 | 按月份浏览、搜索备注、按类型与分类筛选，展示付款来源 |
| 收支洞察 | 当月预算、分类支出、七日趋势和规则生成的月度故事 |
| 小岛成长 | 按累计记账日解锁五种画面，无须连续打卡 |
| 视觉与操作 | 高饱和多彩图标、移动端适配、右下角悬浮入口，长按切换记账方式 |
| 数据管理 | 无需账号，设备本地保存；JSON 备份与恢复、CSV 明细导出 |
| 个性偏好 | 金额隐藏、小岛显示开关、减少动画与键盘操作 |

应用有四个页面：**我的小岛、账单手记、收支洞察、我的口袋**。插画使用项目内 SVG，无需外部图片和字体服务。

## 安装与开始使用

### Android 安装

1. 在手机上下载 [xiaozhang-island-0.3.0.apk](https://github.com/pttman/Profitpect/releases/download/v0.3.0-beta.1/xiaozhang-island-0.3.0.apk)，需要 Android 8.0（API 26）或以上。
2. 按系统提示允许当前下载来源安装，完成后打开“小账岛”。现有用户先导出 JSON 备份；同签名 APK 可覆盖升级。
3. 首次进入为独立示例模式。点击首页“开启我的账本”，开始空白正式账本，示例数据不会复制进去。
4. 点击右下角悬浮按钮记账；长按约 480 毫秒选择手动、AI 或付款识别，也可点击旁边的小箭头切换。
5. 换设备、卸载或清理应用数据前，在“我的口袋”导出备份。网页版账本需通过 JSON 导出、恢复到安卓端。

这是 debug 签名测试包，未配置云端 AI 后端；本机规则记账可以离线使用。自行构建产生不同签名时，不能直接覆盖现有安装，详见[安卓构建说明](android/README.md)。

### Web 本地运行

安装 Node.js 22.13 或以上版本：

```sh
git clone https://github.com/pttman/Profitpect.git
cd Profitpect
npm ci
npm run dev
```

打开 `http://127.0.0.1:5173`。网页支持手动记账、自然语言草稿、统计和备份；手机付款通知与页面识别需要安装安卓包。

### 开启安卓付款识别

先开启正式账本，再进入“我的口袋 → 安卓付款记账”，或从悬浮按钮切换到付款识别。

| 识别方式 | 系统授权 | 应用内设置 | 识别结果 |
| --- | --- | --- | --- |
| 付款通知 | “小账岛付款识别”的通知使用权 | 开启“收集付款通知” | 默认待确认；信息明确且不疑似重复时可选自动入账 |
| 付款页面 | “小账岛付款页面识别”的无障碍服务 | 开启“自动识别付款成功页” | 默认待确认；自动入账额外要求交易号与明确分类 |

系统权限由你阅读说明后手动授予。快捷浮窗是系统服务开关，出现浮窗不代表服务持续开启，也不替代应用内的识别开关。识别方式、权限往返和模板限制详见[安卓说明](android/README.md)。

## 数据与隐私

- 无需注册。Web 账本使用当前浏览器的 `localStorage`，Android 使用应用私有存储；两个账本通过备份手动迁移，不会自动同步。
- 默认本机规则无需联网。主动选择云端 AI 时，只发送当前输入的单笔描述，不发送历史账本或付款通知，API 密钥只保存在服务端。
- 付款通知与页面文字在本机解析，原始内容不持久化。页面服务不点击、不输入、不操作支付、不截屏、不上传页面内容。
- 页面服务仅读取微信、支付宝白名单前台页面的可访问文字，但系统无障碍授权本身是系统级能力，授权范围需以系统说明为准。
- JSON 备份未加密；CSV 用于查看明细，完整恢复需要 JSON。卸载、清理数据或更换浏览器前应导出备份。

## 配置可选云端 AI

复制 `.env.example` 为 `.env`，填写服务端 `OPENAI_API_KEY` 和支持结构化输出的 `OPENAI_MODEL`：

```sh
npm run build
npm run serve
```

打开 `http://127.0.0.1:8787`。开发时可另开 `npm run dev`，Vite 将 `/api` 转发到本地服务。实现使用 Responses 结构化输出与 `store: false`，模型输出仍需通过本地账务校验；当前未使用真实密钥完成云端联调。

Node 服务默认只监听本机，包含请求大小、超时和基本限流。公开部署需要用户鉴权、按用户限额、HTTPS、反向代理访问控制和 `PUBLIC_ORIGIN`。安卓构建还需设置 `VITE_AI_ENDPOINT=https://你的域名/api/recognize`；API 密钥不得放入任何 `VITE_` 变量或提交到仓库。

## 开发、构建与验证

技术栈：React 19、Vite 7、Lucide React、Node.js HTTP 服务；Android 为 Java 原生 WebView、通知监听与无障碍服务。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 Web 开发环境 |
| `npm test` | 校验金额、日期、备份和自然语言识别 |
| `npm run build` | 生成 `dist/` 生产资源 |
| `npm run preview` | 在本地查看生产构建 |
| `npm run serve` | 启动可选 AI 后端并提供生产网页 |
| `npm run android:build` | 在 Windows 构建、签名和校验测试 APK |

安卓构建需要 JDK、Android SDK platform 35、build-tools 35 或以上，并设置 `ANDROID_HOME`。输出为 `android/build/xiaozhang-debug.apk`，详见[构建与安装](android/README.md#构建与安装)。

截至 0.3.0 测试版发布，已通过 Web 13 项测试、通知解析 25 项断言、页面解析 18 项断言和生产构建；此前 34 项真机断言覆盖 WebView、桥接、隔离账本保存、通知入账逻辑、去重和进程恢复。页面存储真机测试因授权失效未通过，真实微信、支付宝通知与页面端到端覆盖仍待验证。GitHub Actions 自动执行网页测试、网页构建及 Java 解析测试。

```text
src/pages/              首页、账单、统计与偏好
src/components/         录入面板、AI 草稿、付款设置、悬浮入口与插画
src/lib/                账务规则、自然语言识别、日期与持久化
server/                 可选云端 AI 接口
android/app/src/main/   安卓原生桥接、付款服务、解析与存储
android/tests/          Java 付款解析测试
android/device-tests/   使用隔离账本的真机测试
tests/                  Web 账务与识别测试
docs/产品需求文档.md     产品方向与后续范围
```

## 已知问题与后续方向

- **vivo 授权持续性**：Android 17 真机出现无障碍服务开启后被系统撤销，触发策略仍在排查。
- **付款覆盖范围**：页面识别为实验功能，仅处理明确的付款成功模板；受保护或无可访问文字的页面无法识别，无 OCR 回退。平台模板、通知设置与厂商后台策略可能影响识别。
- **核对与去重**：页面无交易号、分类不明或疑似重复时需核对。服务重建或重复打开旧结果页仍可能产生待确认项，不应作为完整支付流水。
- **账户范围**：目前只有期初余额为零的“日常账户”，账面余额不代表银行余额；多账户、转账、关联退款、自定义分类、常用模板与预算沿用尚未实现。
- **持久化范围**：暂不提供云同步与离线 PWA 安装，Web 尚未迁移至 IndexedDB；大数据量、容量与复杂并发场景仍需验证。安卓包可离线加载本地界面。

产品规划见[产品需求文档](docs/产品需求文档.md)。反馈请到 [GitHub Issues](https://github.com/pttman/Profitpect/issues)，描述版本、手机型号、Android 版本、复现步骤、预期与实际结果。涉及付款时请隐藏个人信息、交易号和联系人，无须提交真实账本或完整通知正文。
