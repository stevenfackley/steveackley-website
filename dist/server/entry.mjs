import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_8No2g_og.mjs';
import { manifest } from './manifest_CYnutW30.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/_actions/_---path_.astro.mjs');
const _page2 = () => import('./pages/admin/dashboard.astro.mjs');
const _page3 = () => import('./pages/admin/login.astro.mjs');
const _page4 = () => import('./pages/admin/posts/new.astro.mjs');
const _page5 = () => import('./pages/admin/posts/_id_/edit.astro.mjs');
const _page6 = () => import('./pages/api/auth/_---all_.astro.mjs');
const _page7 = () => import('./pages/api/fetch-metadata.astro.mjs');
const _page8 = () => import('./pages/api/upload.astro.mjs');
const _page9 = () => import('./pages/blog/_slug_.astro.mjs');
const _page10 = () => import('./pages/blog.astro.mjs');
const _page11 = () => import('./pages/resume/print.astro.mjs');
const _page12 = () => import('./pages/resume.astro.mjs');
const _page13 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/node.js", _page0],
    ["node_modules/astro/dist/actions/runtime/route.js", _page1],
    ["src/pages/admin/dashboard.astro", _page2],
    ["src/pages/admin/login.astro", _page3],
    ["src/pages/admin/posts/new.astro", _page4],
    ["src/pages/admin/posts/[id]/edit.astro", _page5],
    ["src/pages/api/auth/[...all].ts", _page6],
    ["src/pages/api/fetch-metadata.ts", _page7],
    ["src/pages/api/upload.ts", _page8],
    ["src/pages/blog/[slug].astro", _page9],
    ["src/pages/blog/index.astro", _page10],
    ["src/pages/resume/print.astro", _page11],
    ["src/pages/resume/index.astro", _page12],
    ["src/pages/index.astro", _page13]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./entrypoint.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = {
    "mode": "standalone",
    "client": "file:///C:/Users/steve/projects/steveackleyorg/dist/client/",
    "server": "file:///C:/Users/steve/projects/steveackleyorg/dist/server/",
    "host": "0.0.0.0",
    "port": 3000,
    "assets": "_astro",
    "experimentalStaticHeaders": false
};
const _exports = createExports(_manifest, _args);
const handler = _exports['handler'];
const startServer = _exports['startServer'];
const options = _exports['options'];
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { handler, options, pageMap, startServer };
