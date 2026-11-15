# dsh-our-free-model-quota

这是 `dsh-our-free-model@2.1.0`（MIT）的兼容性补丁分支，保留原包名
`dsh-our-free-model`，可直接替换现有 profile 中的同名包。

## 补丁内容

- `src/catalog.js`：为免密免费车道增加 `quota` 元数据，记录额度作用域、
  429 风险与长任务建议；Kilo 车道增加 `免费池` 元数据。
- `src/core/runtime.js`：把实时 availability 快照暴露给适配器。
- `src/adapter.js`：
  - 模型选择器名称追加紧凑徽标：`· 免费额度`、`· 限流`、`· 地区限制`、
    `· 不可用`；
  - `description` 增加额度说明、当前探测状态，以及
    `contextWindow - maxOutput` 后的可用输入预算。
- `src/probe.js`：新增 `probeKiloModel`，用最小流式请求探测 Kilo 免费池；
  `src/core/runtime.js` 将 Kilo 条目纳入同一轮探测；`index.js` 不再把
  Kilo 当作“未探测即可用”。上游只给出可用/429/retry-after，不给出精确
  剩余额度数字，因此界面显示状态而不是伪造百分比。
- `scripts/patch-acp-window.mjs`：修复 `billion-context` 未注入
  `llm` / `agentDefaultModel` 导致的窗口回退（200K），并让缺失窗口的缓存
  自动重试解析；首个请求等待窗口解析完成；没有 initiator 归属的模型请求
  通过 `dsh-unattributed` 回退会话继续走 ACP，而不是直接绕过去压缩。
  另外，缓存中已有窗口但尚未上报给 proxy 时，会在 proxy origin 可用后补报一次
  runtime-info，避免“解析到了 1M、proxy 仍用 200K 回退”的竞态。
- `scripts/redact-vendor-oauth.mjs`：移除上游 vendored channel pack 中打包的
  Google OAuth 默认 client id/secret，避免把凭据推送到公开仓库。Gemini
  OAuth 需要通过 `CMDC_PAK_GOOGLE_CLIENT_ID` /
  `CMDC_PAK_GOOGLE_CLIENT_SECRET` 提供自己的客户端凭据。
- `scripts/configure-acp-model-window.mjs`：读取插件的 `catalog.json`，
  在 `billion-context.json` 中为全部免密车道模型（`https://opencode.ai`）
  和全部 Kilo 车道模型（`https://api.kilo.ai/api/gateway`）写入
  `context`/`output`，包括 `kilo-auto/free` 的 `256000`/`32768`。
  这是 runtime-info 未及时上报时的确定性兜底。

## 为什么徽标放在 name

DSH 当前的原生 composer 模型选择器只渲染 `model.name`，不渲染
`model.description`。因此只在 `description` 写额度说明，用户在选择器里看不到；
本补丁把最关键的状态放进 name，完整说明仍保留在 description 和插件设置页。

## 验证

```bash
node scripts/check-quota-annotation.mjs
node scripts/redact-vendor-oauth.mjs vendor/channel-pack/pack.js
node scripts/configure-acp-model-window.mjs
node --check src/adapter.js
node --check src/catalog.js
node --check src/core/runtime.js
```

## ACP 窗口上报补丁

先确认目标文件，再运行：

```bash
node scripts/patch-acp-window.mjs \
  "$DSH_HOME/profiles/web/node_modules/billion-context/dist/agent/dsh-native.js"
```

脚本会备份原文件，并执行 `node --check`。补丁后重启 DSH/工作台，使插件重新加载。

## 来源与许可

基于 `dsh-our-free-model` 2.1.0 的已安装包；上游版权与 MIT 许可见
`LICENSE`。本分支不是上游官方发布。
