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
cd wordforge
pnpm install
pnpm tauri dev          # 第一次会编译 Rust，可能 5-10 分钟
```

热更新：前端改 → 自动 HMR；Rust 改 → 进程重启。

## 9.3 本地构建产物

```sh
cd wordforge
pnpm tauri build
```

输出：
- macOS: `src-tauri/target/release/bundle/dmg/Wordforge_x.y.z_aarch64.dmg`
- Windows: `src-tauri/target/release/bundle/msi/Wordforge_x.y.z_x64_en-US.msi`

## 9.4 GitHub Actions

### `.github/workflows/ci.yml`（push 到 `main` / PR）

- Runner：`windows-latest`
- 步骤：
  1. checkout
  2. setup pnpm 9 + node 20（缓存 `wordforge/pnpm-lock.yaml`）
  3. 在 `wordforge/` 执行 `pnpm install --frozen-lockfile`
  4. 在 `wordforge/` 执行 `pnpm lint`、`pnpm build`
  5. setup Rust stable
  6. 在 `wordforge/src-tauri/` 执行 `cargo fmt --check`、`cargo clippy --all-targets -- -D warnings`

### `.github/workflows/release.yml`（push tag `v*`）

- 矩阵：`macos-latest` + `windows-latest`
- macOS 构建使用 `--target universal-apple-darwin`，并安装 `aarch64-apple-darwin` / `x86_64-apple-darwin` targets。
- Windows 构建使用默认 target。
- 使用 `tauri-apps/tauri-action@v0`
- 自动创建 GitHub draft Release，附 `.dmg` / `.msi` 等 bundle 产物。

当前实现：
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
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - uses: dtolnay/rust-toolchain@stable
      - run: pnpm install --frozen-lockfile
        working-directory: wordforge
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          projectPath: wordforge
          args: ${{ matrix.args }}
          tagName: ${{ github.ref_name }}
          releaseName: 'Wordforge ${{ github.ref_name }}'
          releaseDraft: true
          prerelease: false
```

## 9.5 发布流程

1. `main` 通过 CI
2. 更新 `wordforge/package.json` 与 `wordforge/src-tauri/tauri.conf.json` 中的 version
3. 更新 `CHANGELOG.md`
4. `git tag v0.1.0 && git push origin v0.1.0`
5. Actions 完成后到 Releases 页确认 → 把 draft 改为 publish

## 9.6 代码签名（v0.2 计划）

- macOS：Apple Developer ID 证书 + notarytool 公证；签名后用户可双击直接安装。
- Windows：EV/OV 代码签名证书；可去除 SmartScreen 警告。
- 在拿到证书前，发布页 README 提示用户:
  - macOS: `xattr -cr /Applications/Wordforge.app`
  - Windows: 在 SmartScreen 弹窗点 "更多信息 → 仍要运行"
