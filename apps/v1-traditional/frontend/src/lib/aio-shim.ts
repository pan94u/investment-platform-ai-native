/**
 * @haier/aio + @haier/i18n shim — 内网外替代模块
 * 在内网环境中这些包从 nexus 安装，此 shim 不会被使用
 */
export const externalGlobalAccessToken = '';
export function createContext() { return {}; }
export function getLanguage() { return 'cn'; }
const shim = { externalGlobalAccessToken: '', createContext, getLanguage };
export default shim;
