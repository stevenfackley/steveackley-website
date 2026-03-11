import { a as auth } from '../../../chunks/auth_DmKPFpWl.mjs';
export { renderers } from '../../../renderers.mjs';

const ALL = async (context) => {
  return auth.handler(context.request);
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  ALL
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
