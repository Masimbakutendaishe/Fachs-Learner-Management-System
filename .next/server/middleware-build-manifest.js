self.__BUILD_MANIFEST = {
  "polyfillFiles": [
    "static/chunks/polyfills.js"
  ],
  "devFiles": [
    "static/chunks/react-refresh.js"
  ],
  "ampDevFiles": [],
  "lowPriorityFiles": [],
  "rootMainFiles": [],
  "rootMainFilesTree": {},
  "pages": {
    "/_app": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js"
    ],
    "/_error": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_error.js"
    ],
    "/reset-password": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/reset-password.js"
    ],
    "/superadmin": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/superadmin.js"
    ],
    "/superadmin/institutions/[id]": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/superadmin/institutions/[id].js"
    ],
    "/superadmin/plans": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/superadmin/plans.js"
    ],
    "/superadmin/users": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/superadmin/users.js"
    ]
  },
  "ampFirstPages": []
};
self.__BUILD_MANIFEST.lowPriorityFiles = [
"/static/" + process.env.__NEXT_BUILD_ID + "/_buildManifest.js",
,"/static/" + process.env.__NEXT_BUILD_ID + "/_ssgManifest.js",

];