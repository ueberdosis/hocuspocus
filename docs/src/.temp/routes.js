const c1 = () => import(/* webpackChunkName: "page--src--templates--doc-page--index-vue" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/templates/DocPage/index.vue")
const c2 = () => import(/* webpackChunkName: "page--node-modules--gridsome--app--pages--404-vue" */ "/Users/hanspagel/Documents/Websites/hocuspocus/node_modules/gridsome/app/pages/404.vue")

export default [
  {
    path: "/usage/tiptap/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--usage--tiptap-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/usage/tiptap.md")
    }
  },
  {
    path: "/knowledge/yjs/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--knowledge--yjs-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/knowledge/yjs.md")
    }
  },
  {
    path: "/guide/scale/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--guide--scale-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/guide/scale.md")
    }
  },
  {
    path: "/guide/persistence/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--guide--persistence-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/guide/persistence.md")
    }
  },
  {
    path: "/knowledge/crdt/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--knowledge--crdt-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/knowledge/crdt.md")
    }
  },
  {
    path: "/guide/export/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--guide--export-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/guide/export.md")
    }
  },
  {
    path: "/guide/documents/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--guide--documents-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/guide/documents.md")
    }
  },
  {
    path: "/guide/authentication/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--guide--authentication-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/guide/authentication.md")
    }
  },
  {
    path: "/guide/authorization/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--guide--authorization-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/guide/authorization.md")
    }
  },
  {
    path: "/license/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--license-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/license.md")
    }
  },
  {
    path: "/installation/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--installation-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/installation.md")
    }
  },
  {
    name: "404",
    path: "/404/",
    component: c2
  },
  {
    path: "/",
    component: c1,
    meta: {
      $vueRemark: () => import(/* webpackChunkName: "vue-remark--src--doc-pages--introduction-md" */ "/Users/hanspagel/Documents/Websites/hocuspocus/docs/src/docPages/introduction.md")
    }
  },
  {
    name: "*",
    path: "*",
    component: c2
  }
]
