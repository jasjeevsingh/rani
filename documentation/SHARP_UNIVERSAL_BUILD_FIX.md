# Sharp Universal Build Fix

## Problem

When building a universal macOS binary (x64 + ARM64) with `electron-builder`, the build fails with:

```
⨯ ENOENT: no such file or directory, scandir '/path/to/node_modules/@img/sharp-darwin-arm64'
```

This occurs because:
1. Sharp requires platform-specific native binaries
2. On an Intel (x64) Mac, npm refuses to install ARM64 binaries due to platform checks (`EBADPLATFORM`)
3. Universal builds need both x64 AND ARM64 binaries present
4. Using `--force` flag doesn't bypass the platform checks for optional dependencies

## Solution

Manually download and extract the ARM64 sharp packages using npm pack, which bypasses platform restrictions.

### Step-by-Step Fix

1. **Download ARM64 sharp package**:
```bash
cd /tmp
npm pack @img/sharp-darwin-arm64@0.34.5 --force
```

2. **Extract to node_modules**:
```bash
cd /path/to/your/project/node_modules/@img
tar -xzf /tmp/img-sharp-darwin-arm64-0.34.5.tgz
mv package sharp-darwin-arm64
```

3. **Download ARM64 libvips package**:
```bash
cd /tmp
npm pack @img/sharp-libvips-darwin-arm64@1.0.0 --force
```

4. **Extract libvips to node_modules**:
```bash
cd /path/to/your/project/node_modules/@img
tar -xzf /tmp/img-sharp-libvips-darwin-arm64-1.0.0.tgz
mv package sharp-libvips-darwin-arm64
```

5. **Verify all packages are present**:
```bash
ls -la node_modules/@img/ | grep sharp
```

You should see:
- `sharp-darwin-arm64`
- `sharp-darwin-x64`
- `sharp-libvips-darwin-arm64`
- `sharp-libvips-darwin-x64`

6. **Run universal build**:
```bash
npm run build:mac
```

## Quick Script

For convenience, you can run this one-liner from your project root:

```bash
cd /tmp && \
npm pack @img/sharp-darwin-arm64@0.34.5 --force && \
npm pack @img/sharp-libvips-darwin-arm64@1.0.0 --force && \
cd - && \
cd node_modules/@img && \
tar -xzf /tmp/img-sharp-darwin-arm64-0.34.5.tgz && mv package sharp-darwin-arm64 && \
tar -xzf /tmp/img-sharp-libvips-darwin-arm64-1.0.0.tgz && mv package sharp-libvips-darwin-arm64 && \
cd ../.. && \
echo "✅ ARM64 sharp packages installed"
```

## Why This Happens

- **Platform Checks**: npm's optional dependency system respects `os` and `cpu` fields in package.json
- **Current Platform**: On Intel Mac, `process.platform=darwin` and `process.arch=x64`
- **ARM64 Packages**: Require `darwin` + `arm64`, which doesn't match current architecture
- **Universal Build**: electron-builder needs BOTH architectures present to create universal binary
- **npm pack**: Downloads the tarball without running install scripts or platform checks

## Alternative Approaches That Don't Work

❌ **Using --force flag**: `npm install --force @img/sharp-darwin-arm64`
- Still respects platform checks for optional dependencies

❌ **Removing sharp from package.json**: 
- Other dependencies (like pickleglass_web) require sharp
- Build will fail with different errors

❌ **Building x64-only**: 
- Won't work on Apple Silicon Macs without Rosetta
- Not truly universal

## Version Notes

- This fix is confirmed working with:
  - sharp@0.34.5
  - @img/sharp-darwin-arm64@0.34.5
  - @img/sharp-libvips-darwin-arm64@1.0.0
  - electron-builder@26.0.12

- If upgrading sharp, adjust version numbers in the commands above

## Long-term Fix

Consider one of these approaches for future builds:

1. **Build on ARM64 Mac**: Run builds on Apple Silicon hardware where both architectures install naturally
2. **Use CI/CD**: GitHub Actions supports both x64 and ARM64 runners
3. **Sharp v0.35+**: Future versions may handle this better (check sharp release notes)
4. **Pre-build Hook**: Add a prebuild script in package.json that runs the extraction automatically

## Related Issues

- electron-builder universal builds: https://github.com/electron-userland/electron-builder/issues
- sharp platform binaries: https://github.com/lovell/sharp/issues
