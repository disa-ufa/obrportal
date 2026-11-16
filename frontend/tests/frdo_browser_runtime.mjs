import {existsSync} from 'node:fs';

export function chromiumFromModule(namespace) {
  const value=namespace?.chromium ?? namespace?.default?.chromium;
  if(typeof value?.launch!=='function' || typeof value?.executablePath!=='function')
    throw Error('Playwright module does not export a usable chromium browser type');
  return value;
}
export function selectBrowserPath(browser,platform,override) {
  return override || (platform==='win32'
    ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
    : browser.executablePath());
}
// Package import selects the ESM entry point. Explicit CJS overrides are normalized too.
export const chromium=chromiumFromModule(await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core'));
export const browserPath=selectBrowserPath(chromium,process.platform,process.env.UI_BROWSER_PATH);
if(!existsSync(browserPath))throw Error('Browser missing: install pinned playwright-core chromium or set UI_BROWSER_PATH');
