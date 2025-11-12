const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

exports.default = async function adHocSign(context) {
    if (context.electronPlatformName !== 'darwin' || process.platform !== 'darwin') {
        return;
    }

    // During universal builds electron-builder creates temporary arch-specific folders
    // that end with "-temp". Signing those intermediate apps produces different
    // _CodeSignature/CodeResources files for each arch which then breaks the merge step.
    if (context.appOutDir && context.appOutDir.endsWith('-temp')) {
        console.log(`[adhoc-sign] Skipping intermediate universal build at ${context.appOutDir}`);
        return;
    }

    const appName = context.packager.appInfo.productFilename;
    const appPath = path.join(context.appOutDir, `${appName}.app`);
    const entitlementsPath = path.join(__dirname, 'entitlements.plist');

    console.log(`[adhoc-sign] Signing ${appPath} with ad-hoc identity`);

    await execFileAsync('codesign', [
        '--force',
        '--deep',
        '--options',
        'runtime',
        '--entitlements',
        entitlementsPath,
        '--sign',
        '-',
        appPath
    ]);

    await execFileAsync('codesign', ['--verify', '--deep', '--strict', appPath]);

    console.log('[adhoc-sign] Ad-hoc signing complete');
};
