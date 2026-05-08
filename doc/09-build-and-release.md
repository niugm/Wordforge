# 09 · 构建与发布

## 9.1 本地开发环境

### 必备工具

| 工具 | 版本 | 用途 |
|---|---|---|
| Node.js | ≥ 20 LTS | 前端运行时 |
| pnpm | ≥ 9 | 包管理器 |
| Rust | stable（rustup） | Tauri 后端 |
| Git | ≥ 2.40 | 版本控制 |
| WebView2 | 最新（Win 11 自带） | Windows runtime |
| Xcode CLT | 最新（仅 macOS） | macOS 编译 |
| MSVC Build Tools | 最新（仅 Windows） | Windows 编译 |

### Windows 一次性配置

```pwsh
# 1) Node.js  (建议用 fnm)
winget install Schniz.fnm
fnm install 20 && fnm use 20

# 2) pnpm
npm i -g pnpm

# 3) Rust
winget install Rustlang.Rustup
rustup default stable

# 4) MSVC（如未装）
winget install Microsoft.VisualStudio.2022.BuildTools `
  --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

### macOS 一次性配置

```sh
brew install node pnpm rustup-init
rustup-init -y
xcode-select --install
```

## 9.2 启动开发

```sh
pnpm install
pnpm tauri dev          # 第一次会编译 Rust，可能 5-10 分钟
```

热更新：前端改 → 自动 HMR；Rust 改 → 进程重启。

## 9.3 本地构建产物

```sh
pnpm tauri build
```

输出：
- macOS: `src-tauri/target/release/bundle/dmg/Wordforge_x.y.z_aarch64.dmg`
- Windows: `src-tauri/target/release/bundle/msi/Wordforge_x.y.z_x64_en-US.msi`

## 9.4 GitHub Actions

### `.github/workflows/ci.yml`（每次 push / PR）

- 矩阵：`ubuntu-latest` (lint only)
- 步骤：
  1. checkout
  2. setup node 20 + pnpm
  3. `pnpm install --frozen-lockfile`
  4. `pnpm lint`、`pnpm typecheck`
  5. setup rust toolchain
  6. `cargo fmt --check`、`cargo clippy --all-targets -- -D warnings`

### `.github/workflows/release.yml`（push tag `v*`）

- 矩阵：`macos-latest` + `windows-latest`
- 使用 `tauri-apps/tauri-action@v0`
- 自动创建 GitHub Release，附 `.dmg` / `.msi`

伪代码：
```yaml
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - uses: dtolnay/rust-toolchain@stable
      - run: pnpm install --frozen-lockfile
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Wordforge ${{ github.ref_name }}'
          releaseDraft: true
          prerelease: false
```

## 9.5 发布流程

1. `main` 通过 CI
2. 更新 `package.json` 与 `src-tauri/tauri.conf.json` 中的 version
3. 更新 `CHANGELOG.md`
4. `git tag v0.1.0 && git push origin v0.1.0`
5. Actions 完成后到 Releases 页确认 → 把 draft 改为 publish

## 9.6 代码签名（v0.2 计划）

- macOS：Apple Developer ID 证书 + notarytool 公证；签名后用户可双击直接安装。
- Windows：EV/OV 代码签名证书；可去除 SmartScreen 警告。
- 在拿到证书前，发布页 README 提示用户:
  - macOS: `xattr -cr /Applications/Wordforge.app`
  - Windows: 在 SmartScreen 弹窗点 "更多信息 → 仍要运行"
