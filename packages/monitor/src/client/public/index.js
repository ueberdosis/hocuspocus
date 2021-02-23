// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  const previousRequire = typeof parcelRequire === 'function' && parcelRequire
  const nodeRequire = typeof require === 'function' && require

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        const currentRequire = typeof parcelRequire === 'function' && parcelRequire
        if (!jumped && currentRequire) {
          return currentRequire(name, true)
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true)
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name)
        }

        const err = new Error(`Cannot find module '${name}'`)
        err.code = 'MODULE_NOT_FOUND'
        throw err
      }

      localRequire.resolve = resolve
      localRequire.cache = {}

      const module = cache[name] = new newRequire.Module(name)

      modules[name][0].call(module.exports, localRequire, module, module.exports, this)
    }

    return cache[name].exports

    function localRequire(x) {
      return newRequire(localRequire.resolve(x))
    }

    function resolve(x) {
      return modules[name][1][x] || x
    }
  }

  function Module(moduleName) {
    this.id = moduleName
    this.bundle = newRequire
    this.exports = {}
  }

  newRequire.isParcelRequire = true
  newRequire.Module = Module
  newRequire.modules = modules
  newRequire.cache = cache
  newRequire.parent = previousRequire
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports
    }, {}]
  }

  let error
  for (let i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i])
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    const mainExports = newRequire(entry[entry.length - 1])

    // CommonJS
    if (typeof exports === 'object' && typeof module !== 'undefined') {
      module.exports = mainExports

    // RequireJS
    } else if (typeof define === 'function' && define.amd) {
      define(() => {
        return mainExports
      })

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error
  }

  return newRequire
}({
  '../../../../node_modules/vue/dist/vue.runtime.esm.js': [function (require, module, exports) {
    const global = arguments[3]
    'use strict'

    Object.defineProperty(exports, '__esModule', {
      value: true,
    })
    exports.default = void 0

    /*!
 * Vue.js v2.6.12
 * (c) 2014-2020 Evan You
 * Released under the MIT License.
 */

    /*  */
    const emptyObject = Object.freeze({}) // These helpers produce better VM code in JS engines due to their
    // explicitness and function inlining.

    function isUndef(v) {
      return v === undefined || v === null
    }

    function isDef(v) {
      return v !== undefined && v !== null
    }

    function isTrue(v) {
      return v === true
    }

    function isFalse(v) {
      return v === false
    }
    /**
 * Check if value is primitive.
 */

    function isPrimitive(value) {
      return typeof value === 'string' || typeof value === 'number' // $flow-disable-line
  || typeof value === 'symbol' || typeof value === 'boolean'
    }
    /**
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 */

    function isObject(obj) {
      return obj !== null && typeof obj === 'object'
    }
    /**
 * Get the raw type string of a value, e.g., [object Object].
 */

    const _toString = Object.prototype.toString

    function toRawType(value) {
      return _toString.call(value).slice(8, -1)
    }
    /**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */

    function isPlainObject(obj) {
      return _toString.call(obj) === '[object Object]'
    }

    function isRegExp(v) {
      return _toString.call(v) === '[object RegExp]'
    }
    /**
 * Check if val is a valid array index.
 */

    function isValidArrayIndex(val) {
      const n = parseFloat(String(val))
      return n >= 0 && Math.floor(n) === n && isFinite(val)
    }

    function isPromise(val) {
      return isDef(val) && typeof val.then === 'function' && typeof val.catch === 'function'
    }
    /**
 * Convert a value to a string that is actually rendered.
 */

    function toString(val) {
      return val == null ? '' : Array.isArray(val) || isPlainObject(val) && val.toString === _toString ? JSON.stringify(val, null, 2) : String(val)
    }
    /**
 * Convert an input value to a number for persistence.
 * If the conversion fails, return original string.
 */

    function toNumber(val) {
      const n = parseFloat(val)
      return isNaN(n) ? val : n
    }
    /**
 * Make a map and return a function for checking if a key
 * is in that map.
 */

    function makeMap(str, expectsLowerCase) {
      const map = Object.create(null)
      const list = str.split(',')

      for (let i = 0; i < list.length; i++) {
        map[list[i]] = true
      }

      return expectsLowerCase ? function (val) {
        return map[val.toLowerCase()]
      } : function (val) {
        return map[val]
      }
    }
    /**
 * Check if a tag is a built-in tag.
 */

    const isBuiltInTag = makeMap('slot,component', true)
    /**
 * Check if an attribute is a reserved attribute.
 */

    const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is')
    /**
 * Remove an item from an array.
 */

    function remove(arr, item) {
      if (arr.length) {
        const index = arr.indexOf(item)

        if (index > -1) {
          return arr.splice(index, 1)
        }
      }
    }
    /**
 * Check whether an object has the property.
 */

    const { hasOwnProperty } = Object.prototype

    function hasOwn(obj, key) {
      return hasOwnProperty.call(obj, key)
    }
    /**
 * Create a cached version of a pure function.
 */

    function cached(fn) {
      const cache = Object.create(null)
      return function cachedFn(str) {
        const hit = cache[str]
        return hit || (cache[str] = fn(str))
      }
    }
    /**
 * Camelize a hyphen-delimited string.
 */

    const camelizeRE = /-(\w)/g
    const camelize = cached(str => {
      return str.replace(camelizeRE, (_, c) => {
        return c ? c.toUpperCase() : ''
      })
    })
    /**
 * Capitalize a string.
 */

    const capitalize = cached(str => {
      return str.charAt(0).toUpperCase() + str.slice(1)
    })
    /**
 * Hyphenate a camelCase string.
 */

    const hyphenateRE = /\B([A-Z])/g
    const hyphenate = cached(str => {
      return str.replace(hyphenateRE, '-$1').toLowerCase()
    })
    /**
 * Simple bind polyfill for environments that do not support it,
 * e.g., PhantomJS 1.x. Technically, we don't need this anymore
 * since native bind is now performant enough in most browsers.
 * But removing it would mean breaking code that was able to run in
 * PhantomJS 1.x, so this must be kept for backward compatibility.
 */

    /* istanbul ignore next */

    function polyfillBind(fn, ctx) {
      function boundFn(a) {
        const l = arguments.length
        return l ? l > 1 ? fn.apply(ctx, arguments) : fn.call(ctx, a) : fn.call(ctx)
      }

      boundFn._length = fn.length
      return boundFn
    }

    function nativeBind(fn, ctx) {
      return fn.bind(ctx)
    }

    const bind = Function.prototype.bind ? nativeBind : polyfillBind
    /**
 * Convert an Array-like object to a real Array.
 */

    function toArray(list, start) {
      start = start || 0
      let i = list.length - start
      const ret = new Array(i)

      while (i--) {
        ret[i] = list[i + start]
      }

      return ret
    }
    /**
 * Mix properties into target object.
 */

    function extend(to, _from) {
      for (const key in _from) {
        to[key] = _from[key]
      }

      return to
    }
    /**
 * Merge an Array of Objects into a single Object.
 */

    function toObject(arr) {
      const res = {}

      for (let i = 0; i < arr.length; i++) {
        if (arr[i]) {
          extend(res, arr[i])
        }
      }

      return res
    }
    /* eslint-disable no-unused-vars */

    /**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
 */

    function noop(a, b, c) {}
    /**
 * Always return false.
 */

    const no = function (a, b, c) {
      return false
    }
    /* eslint-enable no-unused-vars */

    /**
 * Return the same value.
 */

    const identity = function (_) {
      return _
    }
    /**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */

    function looseEqual(a, b) {
      if (a === b) {
        return true
      }

      const isObjectA = isObject(a)
      const isObjectB = isObject(b)

      if (isObjectA && isObjectB) {
        try {
          const isArrayA = Array.isArray(a)
          const isArrayB = Array.isArray(b)

          if (isArrayA && isArrayB) {
            return a.length === b.length && a.every((e, i) => {
              return looseEqual(e, b[i])
            })
          } if (a instanceof Date && b instanceof Date) {
            return a.getTime() === b.getTime()
          } if (!isArrayA && !isArrayB) {
            const keysA = Object.keys(a)
            const keysB = Object.keys(b)
            return keysA.length === keysB.length && keysA.every(key => {
              return looseEqual(a[key], b[key])
            })
          }
          /* istanbul ignore next */
          return false

        } catch (e) {
          /* istanbul ignore next */
          return false
        }
      } else if (!isObjectA && !isObjectB) {
        return String(a) === String(b)
      } else {
        return false
      }
    }
    /**
 * Return the first index at which a loosely equal value can be
 * found in the array (if value is a plain object, the array must
 * contain an object of the same shape), or -1 if it is not present.
 */

    function looseIndexOf(arr, val) {
      for (let i = 0; i < arr.length; i++) {
        if (looseEqual(arr[i], val)) {
          return i
        }
      }

      return -1
    }
    /**
 * Ensure a function is called only once.
 */

    function once(fn) {
      let called = false
      return function () {
        if (!called) {
          called = true
          fn.apply(this, arguments)
        }
      }
    }

    const SSR_ATTR = 'data-server-rendered'
    const ASSET_TYPES = ['component', 'directive', 'filter']
    const LIFECYCLE_HOOKS = ['beforeCreate', 'created', 'beforeMount', 'mounted', 'beforeUpdate', 'updated', 'beforeDestroy', 'destroyed', 'activated', 'deactivated', 'errorCaptured', 'serverPrefetch']
    /*  */

    const config = {
      /**
   * Option merge strategies (used in core/util/options)
   */
      // $flow-disable-line
      optionMergeStrategies: Object.create(null),

      /**
   * Whether to suppress warnings.
   */
      silent: false,

      /**
   * Show production mode tip message on boot?
   */
      productionTip: 'development' !== 'production',

      /**
   * Whether to enable devtools
   */
      devtools: 'development' !== 'production',

      /**
   * Whether to record perf
   */
      performance: false,

      /**
   * Error handler for watcher errors
   */
      errorHandler: null,

      /**
   * Warn handler for watcher warns
   */
      warnHandler: null,

      /**
   * Ignore certain custom elements
   */
      ignoredElements: [],

      /**
   * Custom user key aliases for v-on
   */
      // $flow-disable-line
      keyCodes: Object.create(null),

      /**
   * Check if a tag is reserved so that it cannot be registered as a
   * component. This is platform-dependent and may be overwritten.
   */
      isReservedTag: no,

      /**
   * Check if an attribute is reserved so that it cannot be used as a component
   * prop. This is platform-dependent and may be overwritten.
   */
      isReservedAttr: no,

      /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   */
      isUnknownElement: no,

      /**
   * Get the namespace of an element
   */
      getTagNamespace: noop,

      /**
   * Parse the real tag name for the specific platform.
   */
      parsePlatformTagName: identity,

      /**
   * Check if an attribute must be bound using property, e.g. value
   * Platform-dependent.
   */
      mustUseProp: no,

      /**
   * Perform updates asynchronously. Intended to be used by Vue Test Utils
   * This will significantly reduce performance if set to false.
   */
      async: true,

      /**
   * Exposed for legacy reasons
   */
      _lifecycleHooks: LIFECYCLE_HOOKS,
    }
    /*  */

    /**
 * unicode letters used for parsing html tags, component names and property paths.
 * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
 * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
 */

    const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/
    /**
 * Check if a string starts with $ or _
 */

    function isReserved(str) {
      const c = (`${str}`).charCodeAt(0)
      return c === 0x24 || c === 0x5F
    }
    /**
 * Define a property.
 */

    function def(obj, key, val, enumerable) {
      Object.defineProperty(obj, key, {
        value: val,
        enumerable: !!enumerable,
        writable: true,
        configurable: true,
      })
    }
    /**
 * Parse simple path.
 */

    const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`)

    function parsePath(path) {
      if (bailRE.test(path)) {
        return
      }

      const segments = path.split('.')
      return function (obj) {
        for (let i = 0; i < segments.length; i++) {
          if (!obj) {
            return
          }

          obj = obj[segments[i]]
        }

        return obj
      }
    }
    /*  */
    // can we use __proto__?

    const hasProto = ('__proto__' in {}) // Browser environment sniffing

    const inBrowser = typeof window !== 'undefined'
    const inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform
    const weexPlatform = inWeex && WXEnvironment.platform.toLowerCase()
    const UA = inBrowser && window.navigator.userAgent.toLowerCase()
    const isIE = UA && /msie|trident/.test(UA)
    const isIE9 = UA && UA.indexOf('msie 9.0') > 0
    const isEdge = UA && UA.indexOf('edge/') > 0
    const isAndroid = UA && UA.indexOf('android') > 0 || weexPlatform === 'android'
    const isIOS = UA && /iphone|ipad|ipod|ios/.test(UA) || weexPlatform === 'ios'
    const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge
    const isPhantomJS = UA && /phantomjs/.test(UA)
    const isFF = UA && UA.match(/firefox\/(\d+)/) // Firefox has a "watch" function on Object.prototype...

    const nativeWatch = {}.watch
    let supportsPassive = false

    if (inBrowser) {
      try {
        const opts = {}
        Object.defineProperty(opts, 'passive', {
          get: function get() {
            /* istanbul ignore next */
            supportsPassive = true
          },
        }) // https://github.com/facebook/flow/issues/285

        window.addEventListener('test-passive', null, opts)
      } catch (e) {}
    } // this needs to be lazy-evaled because vue may be required before
    // vue-server-renderer can set VUE_ENV

    let _isServer

    const isServerRendering = function () {
      if (_isServer === undefined) {
        /* istanbul ignore if */
        if (!inBrowser && !inWeex && typeof global !== 'undefined') {
          // detect presence of vue-server-renderer and avoid
          // Webpack shimming the process
          _isServer = global.process && global.process.env.VUE_ENV === 'server'
        } else {
          _isServer = false
        }
      }

      return _isServer
    } // detect devtools

    const devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__
    /* istanbul ignore next */

    function isNative(Ctor) {
      return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
    }

    const hasSymbol = typeof Symbol !== 'undefined' && isNative(Symbol) && typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys)

    let _Set
    /* istanbul ignore if */
    // $flow-disable-line

    if (typeof Set !== 'undefined' && isNative(Set)) {
      // use native Set when available.
      _Set = Set
    } else {
      // a non-standard Set polyfill that only works with primitive keys.
      _Set = /* @__PURE__ */(function () {
        function Set() {
          this.set = Object.create(null)
        }

        Set.prototype.has = function has(key) {
          return this.set[key] === true
        }

        Set.prototype.add = function add(key) {
          this.set[key] = true
        }

        Set.prototype.clear = function clear() {
          this.set = Object.create(null)
        }

        return Set
      }())
    }
    /*  */

    let warn = noop
    let tip = noop
    let generateComponentTrace = noop // work around flow check

    let formatComponentName = noop

    if ('development' !== 'production') {
      const hasConsole = typeof console !== 'undefined'
      const classifyRE = /(?:^|[-_])(\w)/g

      const classify = function (str) {
        return str.replace(classifyRE, c => {
          return c.toUpperCase()
        }).replace(/[-_]/g, '')
      }

      warn = function (msg, vm) {
        const trace = vm ? generateComponentTrace(vm) : ''

        if (config.warnHandler) {
          config.warnHandler.call(null, msg, vm, trace)
        } else if (hasConsole && !config.silent) {
          console.error(`[Vue warn]: ${msg}${trace}`)
        }
      }

      tip = function (msg, vm) {
        if (hasConsole && !config.silent) {
          console.warn(`[Vue tip]: ${msg}${vm ? generateComponentTrace(vm) : ''}`)
        }
      }

      formatComponentName = function (vm, includeFile) {
        if (vm.$root === vm) {
          return '<Root>'
        }

        const options = typeof vm === 'function' && vm.cid != null ? vm.options : vm._isVue ? vm.$options || vm.constructor.options : vm
        let name = options.name || options._componentTag
        const file = options.__file

        if (!name && file) {
          const match = file.match(/([^/\\]+)\.vue$/)
          name = match && match[1]
        }

        return (name ? `<${classify(name)}>` : '<Anonymous>') + (file && includeFile !== false ? ` at ${file}` : '')
      }

      const repeat = function (str, n) {
        let res = ''

        while (n) {
          if (n % 2 === 1) {
            res += str
          }

          if (n > 1) {
            str += str
          }

          n >>= 1
        }

        return res
      }

      generateComponentTrace = function (vm) {
        if (vm._isVue && vm.$parent) {
          const tree = []
          let currentRecursiveSequence = 0

          while (vm) {
            if (tree.length > 0) {
              const last = tree[tree.length - 1]

              if (last.constructor === vm.constructor) {
                currentRecursiveSequence++
                vm = vm.$parent
                continue
              } else if (currentRecursiveSequence > 0) {
                tree[tree.length - 1] = [last, currentRecursiveSequence]
                currentRecursiveSequence = 0
              }
            }

            tree.push(vm)
            vm = vm.$parent
          }

          return `\n\nfound in\n\n${tree.map((vm, i) => {
            return `${i === 0 ? '---> ' : repeat(' ', 5 + i * 2)}${Array.isArray(vm) ? `${formatComponentName(vm[0])}... (${vm[1]} recursive calls)` : formatComponentName(vm)}`
          }).join('\n')}`
        }
        return `\n\n(found in ${formatComponentName(vm)})`

      }
    }
    /*  */

    let uid = 0
    /**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */

    const Dep = function Dep() {
      this.id = uid++
      this.subs = []
    }

    Dep.prototype.addSub = function addSub(sub) {
      this.subs.push(sub)
    }

    Dep.prototype.removeSub = function removeSub(sub) {
      remove(this.subs, sub)
    }

    Dep.prototype.depend = function depend() {
      if (Dep.target) {
        Dep.target.addDep(this)
      }
    }

    Dep.prototype.notify = function notify() {
      // stabilize the subscriber list first
      const subs = this.subs.slice()

      if ('development' !== 'production' && !config.async) {
        // subs aren't sorted in scheduler if not running async
        // we need to sort them now to make sure they fire in correct
        // order
        subs.sort((a, b) => {
          return a.id - b.id
        })
      }

      for (let i = 0, l = subs.length; i < l; i++) {
        subs[i].update()
      }
    } // The current target watcher being evaluated.
    // This is globally unique because only one watcher
    // can be evaluated at a time.

    Dep.target = null
    const targetStack = []

    function pushTarget(target) {
      targetStack.push(target)
      Dep.target = target
    }

    function popTarget() {
      targetStack.pop()
      Dep.target = targetStack[targetStack.length - 1]
    }
    /*  */

    const VNode = function VNode(tag, data, children, text, elm, context, componentOptions, asyncFactory) {
      this.tag = tag
      this.data = data
      this.children = children
      this.text = text
      this.elm = elm
      this.ns = undefined
      this.context = context
      this.fnContext = undefined
      this.fnOptions = undefined
      this.fnScopeId = undefined
      this.key = data && data.key
      this.componentOptions = componentOptions
      this.componentInstance = undefined
      this.parent = undefined
      this.raw = false
      this.isStatic = false
      this.isRootInsert = true
      this.isComment = false
      this.isCloned = false
      this.isOnce = false
      this.asyncFactory = asyncFactory
      this.asyncMeta = undefined
      this.isAsyncPlaceholder = false
    }

    const prototypeAccessors = {
      child: {
        configurable: true,
      },
    } // DEPRECATED: alias for componentInstance for backwards compat.

    /* istanbul ignore next */

    prototypeAccessors.child.get = function () {
      return this.componentInstance
    }

    Object.defineProperties(VNode.prototype, prototypeAccessors)

    const createEmptyVNode = function (text) {
      if (text === void 0) text = ''
      const node = new VNode()
      node.text = text
      node.isComment = true
      return node
    }

    function createTextVNode(val) {
      return new VNode(undefined, undefined, undefined, String(val))
    } // optimized shallow clone
    // used for static nodes and slot nodes because they may be reused across
    // multiple renders, cloning them avoids errors when DOM manipulations rely
    // on their elm reference.

    function cloneVNode(vnode) {
      const cloned = new VNode(vnode.tag, vnode.data, // #7975
      // clone children array to avoid mutating original in case of cloning
      // a child.
        vnode.children && vnode.children.slice(), vnode.text, vnode.elm, vnode.context, vnode.componentOptions, vnode.asyncFactory)
      cloned.ns = vnode.ns
      cloned.isStatic = vnode.isStatic
      cloned.key = vnode.key
      cloned.isComment = vnode.isComment
      cloned.fnContext = vnode.fnContext
      cloned.fnOptions = vnode.fnOptions
      cloned.fnScopeId = vnode.fnScopeId
      cloned.asyncMeta = vnode.asyncMeta
      cloned.isCloned = true
      return cloned
    }
    /*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

    const arrayProto = Array.prototype
    const arrayMethods = Object.create(arrayProto)
    const methodsToPatch = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
    /**
 * Intercept mutating methods and emit events
 */

    methodsToPatch.forEach(method => {
      // cache original method
      const original = arrayProto[method]
      def(arrayMethods, method, function mutator() {
        const args = []
        let len = arguments.length

        while (len--) args[len] = arguments[len]

        const result = original.apply(this, args)
        const ob = this.__ob__
        let inserted

        switch (method) {
          case 'push':
          case 'unshift':
            inserted = args
            break

          case 'splice':
            inserted = args.slice(2)
            break
        }

        if (inserted) {
          ob.observeArray(inserted)
        } // notify change

        ob.dep.notify()
        return result
      })
    })
    /*  */

    const arrayKeys = Object.getOwnPropertyNames(arrayMethods)
    /**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */

    let shouldObserve = true

    function toggleObserving(value) {
      shouldObserve = value
    }
    /**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */

    const Observer = function Observer(value) {
      this.value = value
      this.dep = new Dep()
      this.vmCount = 0
      def(value, '__ob__', this)

      if (Array.isArray(value)) {
        if (hasProto) {
          protoAugment(value, arrayMethods)
        } else {
          copyAugment(value, arrayMethods, arrayKeys)
        }

        this.observeArray(value)
      } else {
        this.walk(value)
      }
    }
    /**
 * Walk through all properties and convert them into
 * getter/setters. This method should only be called when
 * value type is Object.
 */

    Observer.prototype.walk = function walk(obj) {
      const keys = Object.keys(obj)

      for (let i = 0; i < keys.length; i++) {
        defineReactive$$1(obj, keys[i])
      }
    }
    /**
 * Observe a list of Array items.
 */

    Observer.prototype.observeArray = function observeArray(items) {
      for (let i = 0, l = items.length; i < l; i++) {
        observe(items[i])
      }
    } // helpers

    /**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */

    function protoAugment(target, src) {
      /* eslint-disable no-proto */
      target.__proto__ = src
      /* eslint-enable no-proto */
    }
    /**
 * Augment a target Object or Array by defining
 * hidden properties.
 */

    /* istanbul ignore next */

    function copyAugment(target, src, keys) {
      for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i]
        def(target, key, src[key])
      }
    }
    /**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */

    function observe(value, asRootData) {
      if (!isObject(value) || value instanceof VNode) {
        return
      }

      let ob

      if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
        ob = value.__ob__
      } else if (shouldObserve && !isServerRendering() && (Array.isArray(value) || isPlainObject(value)) && Object.isExtensible(value) && !value._isVue) {
        ob = new Observer(value)
      }

      if (asRootData && ob) {
        ob.vmCount++
      }

      return ob
    }
    /**
 * Define a reactive property on an Object.
 */

    function defineReactive$$1(obj, key, val, customSetter, shallow) {
      const dep = new Dep()
      const property = Object.getOwnPropertyDescriptor(obj, key)

      if (property && property.configurable === false) {
        return
      } // cater for pre-defined getter/setters

      const getter = property && property.get
      const setter = property && property.set

      if ((!getter || setter) && arguments.length === 2) {
        val = obj[key]
      }

      let childOb = !shallow && observe(val)
      Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: function reactiveGetter() {
          const value = getter ? getter.call(obj) : val

          if (Dep.target) {
            dep.depend()

            if (childOb) {
              childOb.dep.depend()

              if (Array.isArray(value)) {
                dependArray(value)
              }
            }
          }

          return value
        },
        set: function reactiveSetter(newVal) {
          const value = getter ? getter.call(obj) : val
          /* eslint-disable no-self-compare */

          if (newVal === value || newVal !== newVal && value !== value) {
            return
          }
          /* eslint-enable no-self-compare */

          if ('development' !== 'production' && customSetter) {
            customSetter()
          } // #7981: for accessor properties without setter

          if (getter && !setter) {
            return
          }

          if (setter) {
            setter.call(obj, newVal)
          } else {
            val = newVal
          }

          childOb = !shallow && observe(newVal)
          dep.notify()
        },
      })
    }
    /**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */

    function set(target, key, val) {
      if ('development' !== 'production' && (isUndef(target) || isPrimitive(target))) {
        warn(`Cannot set reactive property on undefined, null, or primitive value: ${target}`)
      }

      if (Array.isArray(target) && isValidArrayIndex(key)) {
        target.length = Math.max(target.length, key)
        target.splice(key, 1, val)
        return val
      }

      if (key in target && !(key in Object.prototype)) {
        target[key] = val
        return val
      }

      const ob = target.__ob__

      if (target._isVue || ob && ob.vmCount) {
        'development' !== 'production' && warn('Avoid adding reactive properties to a Vue instance or its root $data ' + 'at runtime - declare it upfront in the data option.')
        return val
      }

      if (!ob) {
        target[key] = val
        return val
      }

      defineReactive$$1(ob.value, key, val)
      ob.dep.notify()
      return val
    }
    /**
 * Delete a property and trigger change if necessary.
 */

    function del(target, key) {
      if ('development' !== 'production' && (isUndef(target) || isPrimitive(target))) {
        warn(`Cannot delete reactive property on undefined, null, or primitive value: ${target}`)
      }

      if (Array.isArray(target) && isValidArrayIndex(key)) {
        target.splice(key, 1)
        return
      }

      const ob = target.__ob__

      if (target._isVue || ob && ob.vmCount) {
        'development' !== 'production' && warn('Avoid deleting properties on a Vue instance or its root $data ' + '- just set it to null.')
        return
      }

      if (!hasOwn(target, key)) {
        return
      }

      delete target[key]

      if (!ob) {
        return
      }

      ob.dep.notify()
    }
    /**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */

    function dependArray(value) {
      for (let e = void 0, i = 0, l = value.length; i < l; i++) {
        e = value[i]
        e && e.__ob__ && e.__ob__.dep.depend()

        if (Array.isArray(e)) {
          dependArray(e)
        }
      }
    }
    /*  */

    /**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */

    const strats = config.optionMergeStrategies
    /**
 * Options with restrictions
 */

    if ('development' !== 'production') {
      strats.el = strats.propsData = function (parent, child, vm, key) {
        if (!vm) {
          warn(`option "${key}" can only be used during instance ` + 'creation with the `new` keyword.')
        }

        return defaultStrat(parent, child)
      }
    }
    /**
 * Helper that recursively merges two data objects together.
 */

    function mergeData(to, from) {
      if (!from) {
        return to
      }

      let key; let toVal; let
        fromVal
      const keys = hasSymbol ? Reflect.ownKeys(from) : Object.keys(from)

      for (let i = 0; i < keys.length; i++) {
        key = keys[i] // in case the object is already observed...

        if (key === '__ob__') {
          continue
        }

        toVal = to[key]
        fromVal = from[key]

        if (!hasOwn(to, key)) {
          set(to, key, fromVal)
        } else if (toVal !== fromVal && isPlainObject(toVal) && isPlainObject(fromVal)) {
          mergeData(toVal, fromVal)
        }
      }

      return to
    }
    /**
 * Data
 */

    function mergeDataOrFn(parentVal, childVal, vm) {
      if (!vm) {
        // in a Vue.extend merge, both should be functions
        if (!childVal) {
          return parentVal
        }

        if (!parentVal) {
          return childVal
        } // when parentVal & childVal are both present,
        // we need to return a function that returns the
        // merged result of both functions... no need to
        // check if parentVal is a function here because
        // it has to be a function to pass previous merges.

        return function mergedDataFn() {
          return mergeData(typeof childVal === 'function' ? childVal.call(this, this) : childVal, typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal)
        }
      }
      return function mergedInstanceDataFn() {
      // instance merge
        const instanceData = typeof childVal === 'function' ? childVal.call(vm, vm) : childVal
        const defaultData = typeof parentVal === 'function' ? parentVal.call(vm, vm) : parentVal

        if (instanceData) {
          return mergeData(instanceData, defaultData)
        }
        return defaultData

      }

    }

    strats.data = function (parentVal, childVal, vm) {
      if (!vm) {
        if (childVal && typeof childVal !== 'function') {
          'development' !== 'production' && warn('The "data" option should be a function ' + 'that returns a per-instance value in component ' + 'definitions.', vm)
          return parentVal
        }

        return mergeDataOrFn(parentVal, childVal)
      }

      return mergeDataOrFn(parentVal, childVal, vm)
    }
    /**
 * Hooks and props are merged as arrays.
 */

    function mergeHook(parentVal, childVal) {
      const res = childVal ? parentVal ? parentVal.concat(childVal) : Array.isArray(childVal) ? childVal : [childVal] : parentVal
      return res ? dedupeHooks(res) : res
    }

    function dedupeHooks(hooks) {
      const res = []

      for (let i = 0; i < hooks.length; i++) {
        if (res.indexOf(hooks[i]) === -1) {
          res.push(hooks[i])
        }
      }

      return res
    }

    LIFECYCLE_HOOKS.forEach(hook => {
      strats[hook] = mergeHook
    })
    /**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */

    function mergeAssets(parentVal, childVal, vm, key) {
      const res = Object.create(parentVal || null)

      if (childVal) {
        'development' !== 'production' && assertObjectType(key, childVal, vm)
        return extend(res, childVal)
      }
      return res

    }

    ASSET_TYPES.forEach(type => {
      strats[`${type}s`] = mergeAssets
    })
    /**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */

    strats.watch = function (parentVal, childVal, vm, key) {
      // work around Firefox's Object.prototype.watch...
      if (parentVal === nativeWatch) {
        parentVal = undefined
      }

      if (childVal === nativeWatch) {
        childVal = undefined
      }
      /* istanbul ignore if */

      if (!childVal) {
        return Object.create(parentVal || null)
      }

      if ('development' !== 'production') {
        assertObjectType(key, childVal, vm)
      }

      if (!parentVal) {
        return childVal
      }

      const ret = {}
      extend(ret, parentVal)

      for (const key$1 in childVal) {
        let parent = ret[key$1]
        const child = childVal[key$1]

        if (parent && !Array.isArray(parent)) {
          parent = [parent]
        }

        ret[key$1] = parent ? parent.concat(child) : Array.isArray(child) ? child : [child]
      }

      return ret
    }
    /**
 * Other object hashes.
 */

    strats.props = strats.methods = strats.inject = strats.computed = function (parentVal, childVal, vm, key) {
      if (childVal && 'development' !== 'production') {
        assertObjectType(key, childVal, vm)
      }

      if (!parentVal) {
        return childVal
      }

      const ret = Object.create(null)
      extend(ret, parentVal)

      if (childVal) {
        extend(ret, childVal)
      }

      return ret
    }

    strats.provide = mergeDataOrFn
    /**
 * Default strategy.
 */

    var defaultStrat = function (parentVal, childVal) {
      return childVal === undefined ? parentVal : childVal
    }
    /**
 * Validate component names
 */

    function checkComponents(options) {
      for (const key in options.components) {
        validateComponentName(key)
      }
    }

    function validateComponentName(name) {
      if (!new RegExp(`^[a-zA-Z][\\-\\.0-9_${unicodeRegExp.source}]*$`).test(name)) {
        warn(`Invalid component name: "${name}". Component names ` + 'should conform to valid custom element name in html5 specification.')
      }

      if (isBuiltInTag(name) || config.isReservedTag(name)) {
        warn(`${'Do not use built-in or reserved HTML elements as component ' + 'id: '}${name}`)
      }
    }
    /**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */

    function normalizeProps(options, vm) {
      const { props } = options

      if (!props) {
        return
      }

      const res = {}
      let i; let val; let
        name

      if (Array.isArray(props)) {
        i = props.length

        while (i--) {
          val = props[i]

          if (typeof val === 'string') {
            name = camelize(val)
            res[name] = {
              type: null,
            }
          } else if ('development' !== 'production') {
            warn('props must be strings when using array syntax.')
          }
        }
      } else if (isPlainObject(props)) {
        for (const key in props) {
          val = props[key]
          name = camelize(key)
          res[name] = isPlainObject(val) ? val : {
            type: val,
          }
        }
      } else if ('development' !== 'production') {
        warn(`${'Invalid value for option "props": expected an Array or an Object, ' + 'but got '}${toRawType(props)}.`, vm)
      }

      options.props = res
    }
    /**
 * Normalize all injections into Object-based format
 */

    function normalizeInject(options, vm) {
      const { inject } = options

      if (!inject) {
        return
      }

      const normalized = options.inject = {}

      if (Array.isArray(inject)) {
        for (let i = 0; i < inject.length; i++) {
          normalized[inject[i]] = {
            from: inject[i],
          }
        }
      } else if (isPlainObject(inject)) {
        for (const key in inject) {
          const val = inject[key]
          normalized[key] = isPlainObject(val) ? extend({
            from: key,
          }, val) : {
            from: val,
          }
        }
      } else if ('development' !== 'production') {
        warn(`${'Invalid value for option "inject": expected an Array or an Object, ' + 'but got '}${toRawType(inject)}.`, vm)
      }
    }
    /**
 * Normalize raw function directives into object format.
 */

    function normalizeDirectives(options) {
      const dirs = options.directives

      if (dirs) {
        for (const key in dirs) {
          const def$$1 = dirs[key]

          if (typeof def$$1 === 'function') {
            dirs[key] = {
              bind: def$$1,
              update: def$$1,
            }
          }
        }
      }
    }

    function assertObjectType(name, value, vm) {
      if (!isPlainObject(value)) {
        warn(`Invalid value for option "${name}": expected an Object, ` + `but got ${toRawType(value)}.`, vm)
      }
    }
    /**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */

    function mergeOptions(parent, child, vm) {
      if ('development' !== 'production') {
        checkComponents(child)
      }

      if (typeof child === 'function') {
        child = child.options
      }

      normalizeProps(child, vm)
      normalizeInject(child, vm)
      normalizeDirectives(child) // Apply extends and mixins on the child options,
      // but only if it is a raw options object that isn't
      // the result of another mergeOptions call.
      // Only merged options has the _base property.

      if (!child._base) {
        if (child.extends) {
          parent = mergeOptions(parent, child.extends, vm)
        }

        if (child.mixins) {
          for (let i = 0, l = child.mixins.length; i < l; i++) {
            parent = mergeOptions(parent, child.mixins[i], vm)
          }
        }
      }

      const options = {}
      let key

      for (key in parent) {
        mergeField(key)
      }

      for (key in child) {
        if (!hasOwn(parent, key)) {
          mergeField(key)
        }
      }

      function mergeField(key) {
        const strat = strats[key] || defaultStrat
        options[key] = strat(parent[key], child[key], vm, key)
      }

      return options
    }
    /**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */

    function resolveAsset(options, type, id, warnMissing) {
      /* istanbul ignore if */
      if (typeof id !== 'string') {
        return
      }

      const assets = options[type] // check local registration variations first

      if (hasOwn(assets, id)) {
        return assets[id]
      }

      const camelizedId = camelize(id)

      if (hasOwn(assets, camelizedId)) {
        return assets[camelizedId]
      }

      const PascalCaseId = capitalize(camelizedId)

      if (hasOwn(assets, PascalCaseId)) {
        return assets[PascalCaseId]
      } // fallback to prototype chain

      const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]

      if ('development' !== 'production' && warnMissing && !res) {
        warn(`Failed to resolve ${type.slice(0, -1)}: ${id}`, options)
      }

      return res
    }
    /*  */

    function validateProp(key, propOptions, propsData, vm) {
      const prop = propOptions[key]
      const absent = !hasOwn(propsData, key)
      let value = propsData[key] // boolean casting

      const booleanIndex = getTypeIndex(Boolean, prop.type)

      if (booleanIndex > -1) {
        if (absent && !hasOwn(prop, 'default')) {
          value = false
        } else if (value === '' || value === hyphenate(key)) {
          // only cast empty string / same name to boolean if
          // boolean has higher priority
          const stringIndex = getTypeIndex(String, prop.type)

          if (stringIndex < 0 || booleanIndex < stringIndex) {
            value = true
          }
        }
      } // check default value

      if (value === undefined) {
        value = getPropDefaultValue(vm, prop, key) // since the default value is a fresh copy,
        // make sure to observe it.

        const prevShouldObserve = shouldObserve
        toggleObserving(true)
        observe(value)
        toggleObserving(prevShouldObserve)
      }

      if ('development' !== 'production' // skip validation for weex recycle-list child component props
  && !false) {
        assertProp(prop, key, value, vm, absent)
      }

      return value
    }
    /**
 * Get the default value of a prop.
 */

    function getPropDefaultValue(vm, prop, key) {
      // no default, return undefined
      if (!hasOwn(prop, 'default')) {
        return undefined
      }

      const def = prop.default // warn against non-factory defaults for Object & Array

      if ('development' !== 'production' && isObject(def)) {
        warn(`Invalid default value for prop "${key}": ` + 'Props with type Object/Array must use a factory function ' + 'to return the default value.', vm)
      } // the raw prop value was also undefined from previous render,
      // return previous default value to avoid unnecessary watcher trigger

      if (vm && vm.$options.propsData && vm.$options.propsData[key] === undefined && vm._props[key] !== undefined) {
        return vm._props[key]
      } // call factory function for non-Function types
      // a value is Function if its prototype is function even across different execution context

      return typeof def === 'function' && getType(prop.type) !== 'Function' ? def.call(vm) : def
    }
    /**
 * Assert whether a prop is valid.
 */

    function assertProp(prop, name, value, vm, absent) {
      if (prop.required && absent) {
        warn(`Missing required prop: "${name}"`, vm)
        return
      }

      if (value == null && !prop.required) {
        return
      }

      let { type } = prop
      let valid = !type || type === true
      const expectedTypes = []

      if (type) {
        if (!Array.isArray(type)) {
          type = [type]
        }

        for (let i = 0; i < type.length && !valid; i++) {
          const assertedType = assertType(value, type[i])
          expectedTypes.push(assertedType.expectedType || '')
          valid = assertedType.valid
        }
      }

      if (!valid) {
        warn(getInvalidTypeMessage(name, value, expectedTypes), vm)
        return
      }

      const { validator } = prop

      if (validator) {
        if (!validator(value)) {
          warn(`Invalid prop: custom validator check failed for prop "${name}".`, vm)
        }
      }
    }

    const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/

    function assertType(value, type) {
      let valid
      const expectedType = getType(type)

      if (simpleCheckRE.test(expectedType)) {
        const t = typeof value
        valid = t === expectedType.toLowerCase() // for primitive wrapper objects

        if (!valid && t === 'object') {
          valid = value instanceof type
        }
      } else if (expectedType === 'Object') {
        valid = isPlainObject(value)
      } else if (expectedType === 'Array') {
        valid = Array.isArray(value)
      } else {
        valid = value instanceof type
      }

      return {
        valid,
        expectedType,
      }
    }
    /**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */

    function getType(fn) {
      const match = fn && fn.toString().match(/^\s*function (\w+)/)
      return match ? match[1] : ''
    }

    function isSameType(a, b) {
      return getType(a) === getType(b)
    }

    function getTypeIndex(type, expectedTypes) {
      if (!Array.isArray(expectedTypes)) {
        return isSameType(expectedTypes, type) ? 0 : -1
      }

      for (let i = 0, len = expectedTypes.length; i < len; i++) {
        if (isSameType(expectedTypes[i], type)) {
          return i
        }
      }

      return -1
    }

    function getInvalidTypeMessage(name, value, expectedTypes) {
      let message = `Invalid prop: type check failed for prop "${name}".` + ` Expected ${expectedTypes.map(capitalize).join(', ')}`
      const expectedType = expectedTypes[0]
      const receivedType = toRawType(value)
      const expectedValue = styleValue(value, expectedType)
      const receivedValue = styleValue(value, receivedType) // check if we need to specify expected value

      if (expectedTypes.length === 1 && isExplicable(expectedType) && !isBoolean(expectedType, receivedType)) {
        message += ` with value ${expectedValue}`
      }

      message += `, got ${receivedType} ` // check if we need to specify received value

      if (isExplicable(receivedType)) {
        message += `with value ${receivedValue}.`
      }

      return message
    }

    function styleValue(value, type) {
      if (type === 'String') {
        return `"${value}"`
      } if (type === 'Number') {
        return `${Number(value)}`
      }
      return `${value}`

    }

    function isExplicable(value) {
      const explicitTypes = ['string', 'number', 'boolean']
      return explicitTypes.some(elem => {
        return value.toLowerCase() === elem
      })
    }

    function isBoolean() {
      const args = []
      let len = arguments.length

      while (len--) args[len] = arguments[len]

      return args.some(elem => {
        return elem.toLowerCase() === 'boolean'
      })
    }
    /*  */

    function handleError(err, vm, info) {
      // Deactivate deps tracking while processing error handler to avoid possible infinite rendering.
      // See: https://github.com/vuejs/vuex/issues/1505
      pushTarget()

      try {
        if (vm) {
          let cur = vm

          while (cur = cur.$parent) {
            const hooks = cur.$options.errorCaptured

            if (hooks) {
              for (let i = 0; i < hooks.length; i++) {
                try {
                  const capture = hooks[i].call(cur, err, vm, info) === false

                  if (capture) {
                    return
                  }
                } catch (e) {
                  globalHandleError(e, cur, 'errorCaptured hook')
                }
              }
            }
          }
        }

        globalHandleError(err, vm, info)
      } finally {
        popTarget()
      }
    }

    function invokeWithErrorHandling(handler, context, args, vm, info) {
      let res

      try {
        res = args ? handler.apply(context, args) : handler.call(context)

        if (res && !res._isVue && isPromise(res) && !res._handled) {
          res.catch(e => {
            return handleError(e, vm, `${info} (Promise/async)`)
          }) // issue #9511
          // avoid catch triggering multiple times when nested calls

          res._handled = true
        }
      } catch (e) {
        handleError(e, vm, info)
      }

      return res
    }

    function globalHandleError(err, vm, info) {
      if (config.errorHandler) {
        try {
          return config.errorHandler.call(null, err, vm, info)
        } catch (e) {
          // if the user intentionally throws the original error in the handler,
          // do not log it twice
          if (e !== err) {
            logError(e, null, 'config.errorHandler')
          }
        }
      }

      logError(err, vm, info)
    }

    function logError(err, vm, info) {
      if ('development' !== 'production') {
        warn(`Error in ${info}: "${err.toString()}"`, vm)
      }
      /* istanbul ignore else */

      if ((inBrowser || inWeex) && typeof console !== 'undefined') {
        console.error(err)
      } else {
        throw err
      }
    }
    /*  */

    let isUsingMicroTask = false
    const callbacks = []
    let pending = false

    function flushCallbacks() {
      pending = false
      const copies = callbacks.slice(0)
      callbacks.length = 0

      for (let i = 0; i < copies.length; i++) {
        copies[i]()
      }
    } // Here we have async deferring wrappers using microtasks.
    // In 2.5 we used (macro) tasks (in combination with microtasks).
    // However, it has subtle problems when state is changed right before repaint
    // (e.g. #6813, out-in transitions).
    // Also, using (macro) tasks in event handler would cause some weird behaviors
    // that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
    // So we now use microtasks everywhere, again.
    // A major drawback of this tradeoff is that there are some scenarios
    // where microtasks have too high a priority and fire in between supposedly
    // sequential events (e.g. #4521, #6690, which have workarounds)
    // or even between bubbling of the same event (#6566).

    let timerFunc // The nextTick behavior leverages the microtask queue, which can be accessed
    // via either native Promise.then or MutationObserver.
    // MutationObserver has wider support, however it is seriously bugged in
    // UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
    // completely stops working after triggering a few times... so, if native
    // Promise is available, we will use it:

    /* istanbul ignore next, $flow-disable-line */

    if (typeof Promise !== 'undefined' && isNative(Promise)) {
      const p = Promise.resolve()

      timerFunc = function () {
        p.then(flushCallbacks) // In problematic UIWebViews, Promise.then doesn't completely break, but
        // it can get stuck in a weird state where callbacks are pushed into the
        // microtask queue but the queue isn't being flushed, until the browser
        // needs to do some other work, e.g. handle a timer. Therefore we can
        // "force" the microtask queue to be flushed by adding an empty timer.

        if (isIOS) {
          setTimeout(noop)
        }
      }

      isUsingMicroTask = true
    } else if (!isIE && typeof MutationObserver !== 'undefined' && (isNative(MutationObserver) // PhantomJS and iOS 7.x
|| MutationObserver.toString() === '[object MutationObserverConstructor]')) {
      // Use MutationObserver where native Promise is not available,
      // e.g. PhantomJS, iOS7, Android 4.4
      // (#6466 MutationObserver is unreliable in IE11)
      let counter = 1
      const observer = new MutationObserver(flushCallbacks)
      const textNode = document.createTextNode(String(counter))
      observer.observe(textNode, {
        characterData: true,
      })

      timerFunc = function () {
        counter = (counter + 1) % 2
        textNode.data = String(counter)
      }

      isUsingMicroTask = true
    } else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
      // Fallback to setImmediate.
      // Technically it leverages the (macro) task queue,
      // but it is still a better choice than setTimeout.
      timerFunc = function () {
        setImmediate(flushCallbacks)
      }
    } else {
      // Fallback to setTimeout.
      timerFunc = function () {
        setTimeout(flushCallbacks, 0)
      }
    }

    function nextTick(cb, ctx) {
      let _resolve

      callbacks.push(() => {
        if (cb) {
          try {
            cb.call(ctx)
          } catch (e) {
            handleError(e, ctx, 'nextTick')
          }
        } else if (_resolve) {
          _resolve(ctx)
        }
      })

      if (!pending) {
        pending = true
        timerFunc()
      } // $flow-disable-line

      if (!cb && typeof Promise !== 'undefined') {
        return new Promise(resolve => {
          _resolve = resolve
        })
      }
    }
    /*  */

    /* not type checking this file because flow doesn't play well with Proxy */

    let initProxy

    if ('development' !== 'production') {
      const allowedGlobals = makeMap('Infinity,undefined,NaN,isFinite,isNaN,' + 'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' + 'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' + 'require', // for Webpack/Browserify
      )

      const warnNonPresent = function (target, key) {
        warn(`Property or method "${key}" is not defined on the instance but ` + 'referenced during render. Make sure that this property is reactive, ' + 'either in the data option, or for class-based components, by ' + 'initializing the property. ' + 'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.', target)
      }

      const warnReservedPrefix = function (target, key) {
        warn(`Property "${key}" must be accessed with "$data.${key}" because ` + 'properties starting with "$" or "_" are not proxied in the Vue instance to ' + 'prevent conflicts with Vue internals. ' + 'See: https://vuejs.org/v2/api/#data', target)
      }

      const hasProxy = typeof Proxy !== 'undefined' && isNative(Proxy)

      if (hasProxy) {
        const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
        config.keyCodes = new Proxy(config.keyCodes, {
          set: function set(target, key, value) {
            if (isBuiltInModifier(key)) {
              warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
              return false
            }
            target[key] = value
            return true

          },
        })
      }

      const hasHandler = {
        has: function has(target, key) {
          const has = (key in target)
          const isAllowed = allowedGlobals(key) || typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data)

          if (!has && !isAllowed) {
            if (key in target.$data) {
              warnReservedPrefix(target, key)
            } else {
              warnNonPresent(target, key)
            }
          }

          return has || !isAllowed
        },
      }
      const getHandler = {
        get: function get(target, key) {
          if (typeof key === 'string' && !(key in target)) {
            if (key in target.$data) {
              warnReservedPrefix(target, key)
            } else {
              warnNonPresent(target, key)
            }
          }

          return target[key]
        },
      }

      initProxy = function initProxy(vm) {
        if (hasProxy) {
          // determine which proxy handler to use
          const options = vm.$options
          const handlers = options.render && options.render._withStripped ? getHandler : hasHandler
          vm._renderProxy = new Proxy(vm, handlers)
        } else {
          vm._renderProxy = vm
        }
      }
    }
    /*  */

    const seenObjects = new _Set()
    /**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */

    function traverse(val) {
      _traverse(val, seenObjects)

      seenObjects.clear()
    }

    function _traverse(val, seen) {
      let i; let
        keys
      const isA = Array.isArray(val)

      if (!isA && !isObject(val) || Object.isFrozen(val) || val instanceof VNode) {
        return
      }

      if (val.__ob__) {
        const depId = val.__ob__.dep.id

        if (seen.has(depId)) {
          return
        }

        seen.add(depId)
      }

      if (isA) {
        i = val.length

        while (i--) {
          _traverse(val[i], seen)
        }
      } else {
        keys = Object.keys(val)
        i = keys.length

        while (i--) {
          _traverse(val[keys[i]], seen)
        }
      }
    }

    let mark
    let measure

    if ('development' !== 'production') {
      const perf = inBrowser && window.performance
      /* istanbul ignore if */

      if (perf && perf.mark && perf.measure && perf.clearMarks && perf.clearMeasures) {
        mark = function (tag) {
          return perf.mark(tag)
        }

        measure = function (name, startTag, endTag) {
          perf.measure(name, startTag, endTag)
          perf.clearMarks(startTag)
          perf.clearMarks(endTag) // perf.clearMeasures(name)
        }
      }
    }
    /*  */

    const normalizeEvent = cached(name => {
      const passive = name.charAt(0) === '&'
      name = passive ? name.slice(1) : name
      const once$$1 = name.charAt(0) === '~' // Prefixed last, checked first

      name = once$$1 ? name.slice(1) : name
      const capture = name.charAt(0) === '!'
      name = capture ? name.slice(1) : name
      return {
        name,
        once: once$$1,
        capture,
        passive,
      }
    })

    function createFnInvoker(fns, vm) {
      function invoker() {
        const arguments$1 = arguments
        const { fns } = invoker

        if (Array.isArray(fns)) {
          const cloned = fns.slice()

          for (let i = 0; i < cloned.length; i++) {
            invokeWithErrorHandling(cloned[i], null, arguments$1, vm, 'v-on handler')
          }
        } else {
          // return handler return value for single handlers
          return invokeWithErrorHandling(fns, null, arguments, vm, 'v-on handler')
        }
      }

      invoker.fns = fns
      return invoker
    }

    function updateListeners(on, oldOn, add, remove$$1, createOnceHandler, vm) {
      let name; let def$$1; let cur; let old; let
        event

      for (name in on) {
        def$$1 = cur = on[name]
        old = oldOn[name]
        event = normalizeEvent(name)

        if (isUndef(cur)) {
          'development' !== 'production' && warn(`Invalid handler for event "${event.name}": got ${String(cur)}`, vm)
        } else if (isUndef(old)) {
          if (isUndef(cur.fns)) {
            cur = on[name] = createFnInvoker(cur, vm)
          }

          if (isTrue(event.once)) {
            cur = on[name] = createOnceHandler(event.name, cur, event.capture)
          }

          add(event.name, cur, event.capture, event.passive, event.params)
        } else if (cur !== old) {
          old.fns = cur
          on[name] = old
        }
      }

      for (name in oldOn) {
        if (isUndef(on[name])) {
          event = normalizeEvent(name)
          remove$$1(event.name, oldOn[name], event.capture)
        }
      }
    }
    /*  */

    function mergeVNodeHook(def, hookKey, hook) {
      if (def instanceof VNode) {
        def = def.data.hook || (def.data.hook = {})
      }

      let invoker
      const oldHook = def[hookKey]

      function wrappedHook() {
        hook.apply(this, arguments) // important: remove merged hook to ensure it's called only once
        // and prevent memory leak

        remove(invoker.fns, wrappedHook)
      }

      if (isUndef(oldHook)) {
        // no existing hook
        invoker = createFnInvoker([wrappedHook])
      } else {
        /* istanbul ignore if */
        if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
          // already a merged invoker
          invoker = oldHook
          invoker.fns.push(wrappedHook)
        } else {
          // existing plain hook
          invoker = createFnInvoker([oldHook, wrappedHook])
        }
      }

      invoker.merged = true
      def[hookKey] = invoker
    }
    /*  */

    function extractPropsFromVNodeData(data, Ctor, tag) {
      // we are only extracting raw values here.
      // validation and default values are handled in the child
      // component itself.
      const propOptions = Ctor.options.props

      if (isUndef(propOptions)) {
        return
      }

      const res = {}
      const { attrs } = data
      const { props } = data

      if (isDef(attrs) || isDef(props)) {
        for (const key in propOptions) {
          const altKey = hyphenate(key)

          if ('development' !== 'production') {
            const keyInLowerCase = key.toLowerCase()

            if (key !== keyInLowerCase && attrs && hasOwn(attrs, keyInLowerCase)) {
              tip(`Prop "${keyInLowerCase}" is passed to component ${formatComponentName(tag || Ctor)}, but the declared prop name is` + ` "${key}". ` + 'Note that HTML attributes are case-insensitive and camelCased ' + 'props need to use their kebab-case equivalents when using in-DOM ' + `templates. You should probably use "${altKey}" instead of "${key}".`)
            }
          }

          checkProp(res, props, key, altKey, true) || checkProp(res, attrs, key, altKey, false)
        }
      }

      return res
    }

    function checkProp(res, hash, key, altKey, preserve) {
      if (isDef(hash)) {
        if (hasOwn(hash, key)) {
          res[key] = hash[key]

          if (!preserve) {
            delete hash[key]
          }

          return true
        } if (hasOwn(hash, altKey)) {
          res[key] = hash[altKey]

          if (!preserve) {
            delete hash[altKey]
          }

          return true
        }
      }

      return false
    }
    /*  */
    // The template compiler attempts to minimize the need for normalization by
    // statically analyzing the template at compile time.
    //
    // For plain HTML markup, normalization can be completely skipped because the
    // generated render function is guaranteed to return Array<VNode>. There are
    // two cases where extra normalization is needed:
    // 1. When the children contains components - because a functional component
    // may return an Array instead of a single root. In this case, just a simple
    // normalization is needed - if any child is an Array, we flatten the whole
    // thing with Array.prototype.concat. It is guaranteed to be only 1-level deep
    // because functional components already normalize their own children.

    function simpleNormalizeChildren(children) {
      for (let i = 0; i < children.length; i++) {
        if (Array.isArray(children[i])) {
          return Array.prototype.concat.apply([], children)
        }
      }

      return children
    } // 2. When the children contains constructs that always generated nested Arrays,
    // e.g. <template>, <slot>, v-for, or when the children is provided by user
    // with hand-written render functions / JSX. In such cases a full normalization
    // is needed to cater to all possible types of children values.

    function normalizeChildren(children) {
      return isPrimitive(children) ? [createTextVNode(children)] : Array.isArray(children) ? normalizeArrayChildren(children) : undefined
    }

    function isTextNode(node) {
      return isDef(node) && isDef(node.text) && isFalse(node.isComment)
    }

    function normalizeArrayChildren(children, nestedIndex) {
      const res = []
      let i; let c; let lastIndex; let
        last

      for (i = 0; i < children.length; i++) {
        c = children[i]

        if (isUndef(c) || typeof c === 'boolean') {
          continue
        }

        lastIndex = res.length - 1
        last = res[lastIndex] //  nested

        if (Array.isArray(c)) {
          if (c.length > 0) {
            c = normalizeArrayChildren(c, `${nestedIndex || ''}_${i}`) // merge adjacent text nodes

            if (isTextNode(c[0]) && isTextNode(last)) {
              res[lastIndex] = createTextVNode(last.text + c[0].text)
              c.shift()
            }

            res.push.apply(res, c)
          }
        } else if (isPrimitive(c)) {
          if (isTextNode(last)) {
            // merge adjacent text nodes
            // this is necessary for SSR hydration because text nodes are
            // essentially merged when rendered to HTML strings
            res[lastIndex] = createTextVNode(last.text + c)
          } else if (c !== '') {
            // convert primitive to vnode
            res.push(createTextVNode(c))
          }
        } else if (isTextNode(c) && isTextNode(last)) {
        // merge adjacent text nodes
          res[lastIndex] = createTextVNode(last.text + c.text)
        } else {
        // default key for nested array children (likely generated by v-for)
          if (isTrue(children._isVList) && isDef(c.tag) && isUndef(c.key) && isDef(nestedIndex)) {
            c.key = `__vlist${nestedIndex}_${i}__`
          }

          res.push(c)
        }
      }

      return res
    }
    /*  */

    function initProvide(vm) {
      const { provide } = vm.$options

      if (provide) {
        vm._provided = typeof provide === 'function' ? provide.call(vm) : provide
      }
    }

    function initInjections(vm) {
      const result = resolveInject(vm.$options.inject, vm)

      if (result) {
        toggleObserving(false)
        Object.keys(result).forEach(key => {
          /* istanbul ignore else */
          if ('development' !== 'production') {
            defineReactive$$1(vm, key, result[key], () => {
              warn(`${'Avoid mutating an injected value directly since the changes will be ' + 'overwritten whenever the provided component re-renders. ' + 'injection being mutated: "'}${key}"`, vm)
            })
          } else {
            defineReactive$$1(vm, key, result[key])
          }
        })
        toggleObserving(true)
      }
    }

    function resolveInject(inject, vm) {
      if (inject) {
        // inject is :any because flow is not smart enough to figure out cached
        const result = Object.create(null)
        const keys = hasSymbol ? Reflect.ownKeys(inject) : Object.keys(inject)

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i] // #6574 in case the inject object is observed...

          if (key === '__ob__') {
            continue
          }

          const provideKey = inject[key].from
          let source = vm

          while (source) {
            if (source._provided && hasOwn(source._provided, provideKey)) {
              result[key] = source._provided[provideKey]
              break
            }

            source = source.$parent
          }

          if (!source) {
            if ('default' in inject[key]) {
              const provideDefault = inject[key].default
              result[key] = typeof provideDefault === 'function' ? provideDefault.call(vm) : provideDefault
            } else if ('development' !== 'production') {
              warn(`Injection "${key}" not found`, vm)
            }
          }
        }

        return result
      }
    }
    /*  */

    /**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */

    function resolveSlots(children, context) {
      if (!children || !children.length) {
        return {}
      }

      const slots = {}

      for (let i = 0, l = children.length; i < l; i++) {
        const child = children[i]
        const { data } = child // remove slot attribute if the node is resolved as a Vue slot node

        if (data && data.attrs && data.attrs.slot) {
          delete data.attrs.slot
        } // named slots should only be respected if the vnode was rendered in the
        // same context.

        if ((child.context === context || child.fnContext === context) && data && data.slot != null) {
          const name = data.slot
          const slot = slots[name] || (slots[name] = [])

          if (child.tag === 'template') {
            slot.push.apply(slot, child.children || [])
          } else {
            slot.push(child)
          }
        } else {
          (slots.default || (slots.default = [])).push(child)
        }
      } // ignore slots that contains only whitespace

      for (const name$1 in slots) {
        if (slots[name$1].every(isWhitespace)) {
          delete slots[name$1]
        }
      }

      return slots
    }

    function isWhitespace(node) {
      return node.isComment && !node.asyncFactory || node.text === ' '
    }
    /*  */

    function normalizeScopedSlots(slots, normalSlots, prevSlots) {
      let res
      const hasNormalSlots = Object.keys(normalSlots).length > 0
      const isStable = slots ? !!slots.$stable : !hasNormalSlots
      const key = slots && slots.$key

      if (!slots) {
        res = {}
      } else if (slots._normalized) {
        // fast path 1: child component re-render only, parent did not change
        return slots._normalized
      } else if (isStable && prevSlots && prevSlots !== emptyObject && key === prevSlots.$key && !hasNormalSlots && !prevSlots.$hasNormal) {
        // fast path 2: stable scoped slots w/ no normal slots to proxy,
        // only need to normalize once
        return prevSlots
      } else {
        res = {}

        for (const key$1 in slots) {
          if (slots[key$1] && key$1[0] !== '$') {
            res[key$1] = normalizeScopedSlot(normalSlots, key$1, slots[key$1])
          }
        }
      } // expose normal slots on scopedSlots

      for (const key$2 in normalSlots) {
        if (!(key$2 in res)) {
          res[key$2] = proxyNormalSlot(normalSlots, key$2)
        }
      } // avoriaz seems to mock a non-extensible $scopedSlots object
      // and when that is passed down this would cause an error

      if (slots && Object.isExtensible(slots)) {
        slots._normalized = res
      }

      def(res, '$stable', isStable)
      def(res, '$key', key)
      def(res, '$hasNormal', hasNormalSlots)
      return res
    }

    function normalizeScopedSlot(normalSlots, key, fn) {
      const normalized = function () {
        let res = arguments.length ? fn.apply(null, arguments) : fn({})
        res = res && typeof res === 'object' && !Array.isArray(res) ? [res] // single vnode
          : normalizeChildren(res)
        return res && (res.length === 0 || res.length === 1 && res[0].isComment // #9658
        ) ? undefined : res
      } // this is a slot using the new v-slot syntax without scope. although it is
      // compiled as a scoped slot, render fn users would expect it to be present
      // on this.$slots because the usage is semantically a normal slot.

      if (fn.proxy) {
        Object.defineProperty(normalSlots, key, {
          get: normalized,
          enumerable: true,
          configurable: true,
        })
      }

      return normalized
    }

    function proxyNormalSlot(slots, key) {
      return function () {
        return slots[key]
      }
    }
    /*  */

    /**
 * Runtime helper for rendering v-for lists.
 */

    function renderList(val, render) {
      let ret; let i; let l; let keys; let
        key

      if (Array.isArray(val) || typeof val === 'string') {
        ret = new Array(val.length)

        for (i = 0, l = val.length; i < l; i++) {
          ret[i] = render(val[i], i)
        }
      } else if (typeof val === 'number') {
        ret = new Array(val)

        for (i = 0; i < val; i++) {
          ret[i] = render(i + 1, i)
        }
      } else if (isObject(val)) {
        if (hasSymbol && val[Symbol.iterator]) {
          ret = []
          const iterator = val[Symbol.iterator]()
          let result = iterator.next()

          while (!result.done) {
            ret.push(render(result.value, ret.length))
            result = iterator.next()
          }
        } else {
          keys = Object.keys(val)
          ret = new Array(keys.length)

          for (i = 0, l = keys.length; i < l; i++) {
            key = keys[i]
            ret[i] = render(val[key], key, i)
          }
        }
      }

      if (!isDef(ret)) {
        ret = []
      }

      ret._isVList = true
      return ret
    }
    /*  */

    /**
 * Runtime helper for rendering <slot>
 */

    function renderSlot(name, fallback, props, bindObject) {
      const scopedSlotFn = this.$scopedSlots[name]
      let nodes

      if (scopedSlotFn) {
        // scoped slot
        props = props || {}

        if (bindObject) {
          if ('development' !== 'production' && !isObject(bindObject)) {
            warn('slot v-bind without argument expects an Object', this)
          }

          props = extend(extend({}, bindObject), props)
        }

        nodes = scopedSlotFn(props) || fallback
      } else {
        nodes = this.$slots[name] || fallback
      }

      const target = props && props.slot

      if (target) {
        return this.$createElement('template', {
          slot: target,
        }, nodes)
      }
      return nodes

    }
    /*  */

    /**
 * Runtime helper for resolving filters
 */

    function resolveFilter(id) {
      return resolveAsset(this.$options, 'filters', id, true) || identity
    }
    /*  */

    function isKeyNotMatch(expect, actual) {
      if (Array.isArray(expect)) {
        return expect.indexOf(actual) === -1
      }
      return expect !== actual

    }
    /**
 * Runtime helper for checking keyCodes from config.
 * exposed as Vue.prototype._k
 * passing in eventKeyName as last argument separately for backwards compat
 */

    function checkKeyCodes(eventKeyCode, key, builtInKeyCode, eventKeyName, builtInKeyName) {
      const mappedKeyCode = config.keyCodes[key] || builtInKeyCode

      if (builtInKeyName && eventKeyName && !config.keyCodes[key]) {
        return isKeyNotMatch(builtInKeyName, eventKeyName)
      } if (mappedKeyCode) {
        return isKeyNotMatch(mappedKeyCode, eventKeyCode)
      } if (eventKeyName) {
        return hyphenate(eventKeyName) !== key
      }
    }
    /*  */

    /**
 * Runtime helper for merging v-bind="object" into a VNode's data.
 */

    function bindObjectProps(data, tag, value, asProp, isSync) {
      if (value) {
        if (!isObject(value)) {
          'development' !== 'production' && warn('v-bind without argument expects an Object or Array value', this)
        } else {
          if (Array.isArray(value)) {
            value = toObject(value)
          }

          let hash

          const loop = function (key) {
            if (key === 'class' || key === 'style' || isReservedAttribute(key)) {
              hash = data
            } else {
              const type = data.attrs && data.attrs.type
              hash = asProp || config.mustUseProp(tag, type, key) ? data.domProps || (data.domProps = {}) : data.attrs || (data.attrs = {})
            }

            const camelizedKey = camelize(key)
            const hyphenatedKey = hyphenate(key)

            if (!(camelizedKey in hash) && !(hyphenatedKey in hash)) {
              hash[key] = value[key]

              if (isSync) {
                const on = data.on || (data.on = {})

                on[`update:${key}`] = function ($event) {
                  value[key] = $event
                }
              }
            }
          }

          for (const key in value) loop(key)
        }
      }

      return data
    }
    /*  */

    /**
 * Runtime helper for rendering static trees.
 */

    function renderStatic(index, isInFor) {
      const cached = this._staticTrees || (this._staticTrees = [])
      let tree = cached[index] // if has already-rendered static tree and not inside v-for,
      // we can reuse the same tree.

      if (tree && !isInFor) {
        return tree
      } // otherwise, render a fresh tree.

      tree = cached[index] = this.$options.staticRenderFns[index].call(this._renderProxy, null, this, // for render fns generated for functional component templates
      )
      markStatic(tree, `__static__${index}`, false)
      return tree
    }
    /**
 * Runtime helper for v-once.
 * Effectively it means marking the node as static with a unique key.
 */

    function markOnce(tree, index, key) {
      markStatic(tree, `__once__${index}${key ? `_${key}` : ''}`, true)
      return tree
    }

    function markStatic(tree, key, isOnce) {
      if (Array.isArray(tree)) {
        for (let i = 0; i < tree.length; i++) {
          if (tree[i] && typeof tree[i] !== 'string') {
            markStaticNode(tree[i], `${key}_${i}`, isOnce)
          }
        }
      } else {
        markStaticNode(tree, key, isOnce)
      }
    }

    function markStaticNode(node, key, isOnce) {
      node.isStatic = true
      node.key = key
      node.isOnce = isOnce
    }
    /*  */

    function bindObjectListeners(data, value) {
      if (value) {
        if (!isPlainObject(value)) {
          'development' !== 'production' && warn('v-on without argument expects an Object value', this)
        } else {
          const on = data.on = data.on ? extend({}, data.on) : {}

          for (const key in value) {
            const existing = on[key]
            const ours = value[key]
            on[key] = existing ? [].concat(existing, ours) : ours
          }
        }
      }

      return data
    }
    /*  */

    function resolveScopedSlots(fns, // see flow/vnode
      res, // the following are added in 2.6
      hasDynamicKeys, contentHashKey) {
      res = res || {
        $stable: !hasDynamicKeys,
      }

      for (let i = 0; i < fns.length; i++) {
        const slot = fns[i]

        if (Array.isArray(slot)) {
          resolveScopedSlots(slot, res, hasDynamicKeys)
        } else if (slot) {
          // marker for reverse proxying v-slot without scope on this.$slots
          if (slot.proxy) {
            slot.fn.proxy = true
          }

          res[slot.key] = slot.fn
        }
      }

      if (contentHashKey) {
        res.$key = contentHashKey
      }

      return res
    }
    /*  */

    function bindDynamicKeys(baseObj, values) {
      for (let i = 0; i < values.length; i += 2) {
        const key = values[i]

        if (typeof key === 'string' && key) {
          baseObj[values[i]] = values[i + 1]
        } else if ('development' !== 'production' && key !== '' && key !== null) {
          // null is a special value for explicitly removing a binding
          warn(`Invalid value for dynamic directive argument (expected string or null): ${key}`, this)
        }
      }

      return baseObj
    } // helper to dynamically append modifier runtime markers to event names.
    // ensure only append when value is already string, otherwise it will be cast
    // to string and cause the type check to miss.

    function prependModifier(value, symbol) {
      return typeof value === 'string' ? symbol + value : value
    }
    /*  */

    function installRenderHelpers(target) {
      target._o = markOnce
      target._n = toNumber
      target._s = toString
      target._l = renderList
      target._t = renderSlot
      target._q = looseEqual
      target._i = looseIndexOf
      target._m = renderStatic
      target._f = resolveFilter
      target._k = checkKeyCodes
      target._b = bindObjectProps
      target._v = createTextVNode
      target._e = createEmptyVNode
      target._u = resolveScopedSlots
      target._g = bindObjectListeners
      target._d = bindDynamicKeys
      target._p = prependModifier
    }
    /*  */

    function FunctionalRenderContext(data, props, children, parent, Ctor) {
      const this$1 = this
      const { options } = Ctor // ensure the createElement function in functional components
      // gets a unique context - this is necessary for correct named slot check

      let contextVm

      if (hasOwn(parent, '_uid')) {
        contextVm = Object.create(parent) // $flow-disable-line

        contextVm._original = parent
      } else {
        // the context vm passed in is a functional context as well.
        // in this case we want to make sure we are able to get a hold to the
        // real context instance.
        contextVm = parent // $flow-disable-line

        parent = parent._original
      }

      const isCompiled = isTrue(options._compiled)
      const needNormalization = !isCompiled
      this.data = data
      this.props = props
      this.children = children
      this.parent = parent
      this.listeners = data.on || emptyObject
      this.injections = resolveInject(options.inject, parent)

      this.slots = function () {
        if (!this$1.$slots) {
          normalizeScopedSlots(data.scopedSlots, this$1.$slots = resolveSlots(children, parent))
        }

        return this$1.$slots
      }

      Object.defineProperty(this, 'scopedSlots', {
        enumerable: true,
        get: function get() {
          return normalizeScopedSlots(data.scopedSlots, this.slots())
        },
      }) // support for compiled functional template

      if (isCompiled) {
        // exposing $options for renderStatic()
        this.$options = options // pre-resolve slots for renderSlot()

        this.$slots = this.slots()
        this.$scopedSlots = normalizeScopedSlots(data.scopedSlots, this.$slots)
      }

      if (options._scopeId) {
        this._c = function (a, b, c, d) {
          const vnode = createElement(contextVm, a, b, c, d, needNormalization)

          if (vnode && !Array.isArray(vnode)) {
            vnode.fnScopeId = options._scopeId
            vnode.fnContext = parent
          }

          return vnode
        }
      } else {
        this._c = function (a, b, c, d) {
          return createElement(contextVm, a, b, c, d, needNormalization)
        }
      }
    }

    installRenderHelpers(FunctionalRenderContext.prototype)

    function createFunctionalComponent(Ctor, propsData, data, contextVm, children) {
      const { options } = Ctor
      const props = {}
      const propOptions = options.props

      if (isDef(propOptions)) {
        for (const key in propOptions) {
          props[key] = validateProp(key, propOptions, propsData || emptyObject)
        }
      } else {
        if (isDef(data.attrs)) {
          mergeProps(props, data.attrs)
        }

        if (isDef(data.props)) {
          mergeProps(props, data.props)
        }
      }

      const renderContext = new FunctionalRenderContext(data, props, children, contextVm, Ctor)
      const vnode = options.render.call(null, renderContext._c, renderContext)

      if (vnode instanceof VNode) {
        return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options, renderContext)
      } if (Array.isArray(vnode)) {
        const vnodes = normalizeChildren(vnode) || []
        const res = new Array(vnodes.length)

        for (let i = 0; i < vnodes.length; i++) {
          res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options, renderContext)
        }

        return res
      }
    }

    function cloneAndMarkFunctionalResult(vnode, data, contextVm, options, renderContext) {
      // #7817 clone node before setting fnContext, otherwise if the node is reused
      // (e.g. it was from a cached normal slot) the fnContext causes named slots
      // that should not be matched to match.
      const clone = cloneVNode(vnode)
      clone.fnContext = contextVm
      clone.fnOptions = options

      if ('development' !== 'production') {
        (clone.devtoolsMeta = clone.devtoolsMeta || {}).renderContext = renderContext
      }

      if (data.slot) {
        (clone.data || (clone.data = {})).slot = data.slot
      }

      return clone
    }

    function mergeProps(to, from) {
      for (const key in from) {
        to[camelize(key)] = from[key]
      }
    }
    /*  */

    /*  */

    /*  */

    /*  */
    // inline hooks to be invoked on component VNodes during patch

    var componentVNodeHooks = {
      init: function init(vnode, hydrating) {
        if (vnode.componentInstance && !vnode.componentInstance._isDestroyed && vnode.data.keepAlive) {
          // kept-alive components, treat as a patch
          const mountedNode = vnode // work around flow

          componentVNodeHooks.prepatch(mountedNode, mountedNode)
        } else {
          const child = vnode.componentInstance = createComponentInstanceForVnode(vnode, activeInstance)
          child.$mount(hydrating ? vnode.elm : undefined, hydrating)
        }
      },
      prepatch: function prepatch(oldVnode, vnode) {
        const options = vnode.componentOptions
        const child = vnode.componentInstance = oldVnode.componentInstance
        updateChildComponent(child, options.propsData, // updated props
          options.listeners, // updated listeners
          vnode, // new parent vnode
          options.children, // new children
        )
      },
      insert: function insert(vnode) {
        const { context } = vnode
        const { componentInstance } = vnode

        if (!componentInstance._isMounted) {
          componentInstance._isMounted = true
          callHook(componentInstance, 'mounted')
        }

        if (vnode.data.keepAlive) {
          if (context._isMounted) {
            // vue-router#1212
            // During updates, a kept-alive component's child components may
            // change, so directly walking the tree here may call activated hooks
            // on incorrect children. Instead we push them into a queue which will
            // be processed after the whole patch process ended.
            queueActivatedComponent(componentInstance)
          } else {
            activateChildComponent(componentInstance, true,
            /* direct */
            )
          }
        }
      },
      destroy: function destroy(vnode) {
        const { componentInstance } = vnode

        if (!componentInstance._isDestroyed) {
          if (!vnode.data.keepAlive) {
            componentInstance.$destroy()
          } else {
            deactivateChildComponent(componentInstance, true,
            /* direct */
            )
          }
        }
      },
    }
    const hooksToMerge = Object.keys(componentVNodeHooks)

    function createComponent(Ctor, data, context, children, tag) {
      if (isUndef(Ctor)) {
        return
      }

      const baseCtor = context.$options._base // plain options object: turn it into a constructor

      if (isObject(Ctor)) {
        Ctor = baseCtor.extend(Ctor)
      } // if at this stage it's not a constructor or an async component factory,
      // reject.

      if (typeof Ctor !== 'function') {
        if ('development' !== 'production') {
          warn(`Invalid Component definition: ${String(Ctor)}`, context)
        }

        return
      } // async component

      let asyncFactory

      if (isUndef(Ctor.cid)) {
        asyncFactory = Ctor
        Ctor = resolveAsyncComponent(asyncFactory, baseCtor)

        if (Ctor === undefined) {
          // return a placeholder node for async component, which is rendered
          // as a comment node but preserves all the raw information for the node.
          // the information will be used for async server-rendering and hydration.
          return createAsyncPlaceholder(asyncFactory, data, context, children, tag)
        }
      }

      data = data || {} // resolve constructor options in case global mixins are applied after
      // component constructor creation

      resolveConstructorOptions(Ctor) // transform component v-model data into props & events

      if (isDef(data.model)) {
        transformModel(Ctor.options, data)
      } // extract props

      const propsData = extractPropsFromVNodeData(data, Ctor, tag) // functional component

      if (isTrue(Ctor.options.functional)) {
        return createFunctionalComponent(Ctor, propsData, data, context, children)
      } // extract listeners, since these needs to be treated as
      // child component listeners instead of DOM listeners

      const listeners = data.on // replace with listeners with .native modifier
      // so it gets processed during parent component patch.

      data.on = data.nativeOn

      if (isTrue(Ctor.options.abstract)) {
        // abstract components do not keep anything
        // other than props & listeners & slot
        // work around flow
        const { slot } = data
        data = {}

        if (slot) {
          data.slot = slot
        }
      } // install component management hooks onto the placeholder node

      installComponentHooks(data) // return a placeholder vnode

      const name = Ctor.options.name || tag
      const vnode = new VNode(`vue-component-${Ctor.cid}${name ? `-${name}` : ''}`, data, undefined, undefined, undefined, context, {
        Ctor,
        propsData,
        listeners,
        tag,
        children,
      }, asyncFactory)
      return vnode
    }

    function createComponentInstanceForVnode(vnode, // we know it's MountedComponentVNode but flow doesn't
      parent, // activeInstance in lifecycle state
    ) {
      const options = {
        _isComponent: true,
        _parentVnode: vnode,
        parent,
      } // check inline-template render functions

      const { inlineTemplate } = vnode.data

      if (isDef(inlineTemplate)) {
        options.render = inlineTemplate.render
        options.staticRenderFns = inlineTemplate.staticRenderFns
      }

      return new vnode.componentOptions.Ctor(options)
    }

    function installComponentHooks(data) {
      const hooks = data.hook || (data.hook = {})

      for (let i = 0; i < hooksToMerge.length; i++) {
        const key = hooksToMerge[i]
        const existing = hooks[key]
        const toMerge = componentVNodeHooks[key]

        if (existing !== toMerge && !(existing && existing._merged)) {
          hooks[key] = existing ? mergeHook$1(toMerge, existing) : toMerge
        }
      }
    }

    function mergeHook$1(f1, f2) {
      const merged = function (a, b) {
        // flow complains about extra args which is why we use any
        f1(a, b)
        f2(a, b)
      }

      merged._merged = true
      return merged
    } // transform component v-model info (value and callback) into
    // prop and event handler respectively.

    function transformModel(options, data) {
      const prop = options.model && options.model.prop || 'value'
      const event = options.model && options.model.event || 'input';
      (data.attrs || (data.attrs = {}))[prop] = data.model.value
      const on = data.on || (data.on = {})
      const existing = on[event]
      const { callback } = data.model

      if (isDef(existing)) {
        if (Array.isArray(existing) ? existing.indexOf(callback) === -1 : existing !== callback) {
          on[event] = [callback].concat(existing)
        }
      } else {
        on[event] = callback
      }
    }
    /*  */

    const SIMPLE_NORMALIZE = 1
    const ALWAYS_NORMALIZE = 2 // wrapper function for providing a more flexible interface
    // without getting yelled at by flow

    function createElement(context, tag, data, children, normalizationType, alwaysNormalize) {
      if (Array.isArray(data) || isPrimitive(data)) {
        normalizationType = children
        children = data
        data = undefined
      }

      if (isTrue(alwaysNormalize)) {
        normalizationType = ALWAYS_NORMALIZE
      }

      return _createElement(context, tag, data, children, normalizationType)
    }

    function _createElement(context, tag, data, children, normalizationType) {
      if (isDef(data) && isDef(data.__ob__)) {
        'development' !== 'production' && warn(`Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` + 'Always create fresh vnode data objects in each render!', context)
        return createEmptyVNode()
      } // object syntax in v-bind

      if (isDef(data) && isDef(data.is)) {
        tag = data.is
      }

      if (!tag) {
        // in case of component :is set to falsy value
        return createEmptyVNode()
      } // warn against non-primitive key

      if ('development' !== 'production' && isDef(data) && isDef(data.key) && !isPrimitive(data.key)) {
        {
          warn('Avoid using non-primitive value as key, ' + 'use string/number value instead.', context)
        }
      } // support single function children as default scoped slot

      if (Array.isArray(children) && typeof children[0] === 'function') {
        data = data || {}
        data.scopedSlots = {
          default: children[0],
        }
        children.length = 0
      }

      if (normalizationType === ALWAYS_NORMALIZE) {
        children = normalizeChildren(children)
      } else if (normalizationType === SIMPLE_NORMALIZE) {
        children = simpleNormalizeChildren(children)
      }

      let vnode; let
        ns

      if (typeof tag === 'string') {
        let Ctor
        ns = context.$vnode && context.$vnode.ns || config.getTagNamespace(tag)

        if (config.isReservedTag(tag)) {
          // platform built-in elements
          if ('development' !== 'production' && isDef(data) && isDef(data.nativeOn)) {
            warn(`The .native modifier for v-on is only valid on components but it was used on <${tag}>.`, context)
          }

          vnode = new VNode(config.parsePlatformTagName(tag), data, children, undefined, undefined, context)
        } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
          // component
          vnode = createComponent(Ctor, data, context, children, tag)
        } else {
          // unknown or unlisted namespaced elements
          // check at runtime because it may get assigned a namespace when its
          // parent normalizes children
          vnode = new VNode(tag, data, children, undefined, undefined, context)
        }
      } else {
        // direct component options / constructor
        vnode = createComponent(tag, data, context, children)
      }

      if (Array.isArray(vnode)) {
        return vnode
      } if (isDef(vnode)) {
        if (isDef(ns)) {
          applyNS(vnode, ns)
        }

        if (isDef(data)) {
          registerDeepBindings(data)
        }

        return vnode
      }
      return createEmptyVNode()

    }

    function applyNS(vnode, ns, force) {
      vnode.ns = ns

      if (vnode.tag === 'foreignObject') {
        // use default namespace inside foreignObject
        ns = undefined
        force = true
      }

      if (isDef(vnode.children)) {
        for (let i = 0, l = vnode.children.length; i < l; i++) {
          const child = vnode.children[i]

          if (isDef(child.tag) && (isUndef(child.ns) || isTrue(force) && child.tag !== 'svg')) {
            applyNS(child, ns, force)
          }
        }
      }
    } // ref #5318
    // necessary to ensure parent re-render when deep bindings like :style and
    // :class are used on slot nodes

    function registerDeepBindings(data) {
      if (isObject(data.style)) {
        traverse(data.style)
      }

      if (isObject(data.class)) {
        traverse(data.class)
      }
    }
    /*  */

    function initRender(vm) {
      vm._vnode = null // the root of the child tree

      vm._staticTrees = null // v-once cached trees

      const options = vm.$options
      const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree

      const renderContext = parentVnode && parentVnode.context
      vm.$slots = resolveSlots(options._renderChildren, renderContext)
      vm.$scopedSlots = emptyObject // bind the createElement fn to this instance
      // so that we get proper render context inside it.
      // args order: tag, data, children, normalizationType, alwaysNormalize
      // internal version is used by render functions compiled from templates

      vm._c = function (a, b, c, d) {
        return createElement(vm, a, b, c, d, false)
      } // normalization is always applied for the public version, used in
      // user-written render functions.

      vm.$createElement = function (a, b, c, d) {
        return createElement(vm, a, b, c, d, true)
      } // $attrs & $listeners are exposed for easier HOC creation.
      // they need to be reactive so that HOCs using them are always updated

      const parentData = parentVnode && parentVnode.data
      /* istanbul ignore else */

      if ('development' !== 'production') {
        defineReactive$$1(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
          !isUpdatingChildComponent && warn('$attrs is readonly.', vm)
        }, true)
        defineReactive$$1(vm, '$listeners', options._parentListeners || emptyObject, () => {
          !isUpdatingChildComponent && warn('$listeners is readonly.', vm)
        }, true)
      } else {
        defineReactive$$1(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
        defineReactive$$1(vm, '$listeners', options._parentListeners || emptyObject, null, true)
      }
    }

    let currentRenderingInstance = null

    function renderMixin(Vue) {
      // install runtime convenience helpers
      installRenderHelpers(Vue.prototype)

      Vue.prototype.$nextTick = function (fn) {
        return nextTick(fn, this)
      }

      Vue.prototype._render = function () {
        const vm = this
        const ref = vm.$options
        const { render } = ref
        const { _parentVnode } = ref

        if (_parentVnode) {
          vm.$scopedSlots = normalizeScopedSlots(_parentVnode.data.scopedSlots, vm.$slots, vm.$scopedSlots)
        } // set parent vnode. this allows render functions to have access
        // to the data on the placeholder node.

        vm.$vnode = _parentVnode // render self

        let vnode

        try {
          // There's no need to maintain a stack because all render fns are called
          // separately from one another. Nested component's render fns are called
          // when parent component is patched.
          currentRenderingInstance = vm
          vnode = render.call(vm._renderProxy, vm.$createElement)
        } catch (e) {
          handleError(e, vm, 'render') // return error render result,
          // or previous vnode to prevent render error causing blank component

          /* istanbul ignore else */

          if ('development' !== 'production' && vm.$options.renderError) {
            try {
              vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
            } catch (e) {
              handleError(e, vm, 'renderError')
              vnode = vm._vnode
            }
          } else {
            vnode = vm._vnode
          }
        } finally {
          currentRenderingInstance = null
        } // if the returned array contains only a single node, allow it

        if (Array.isArray(vnode) && vnode.length === 1) {
          vnode = vnode[0]
        } // return empty vnode in case the render function errored out

        if (!(vnode instanceof VNode)) {
          if ('development' !== 'production' && Array.isArray(vnode)) {
            warn('Multiple root nodes returned from render function. Render function ' + 'should return a single root node.', vm)
          }

          vnode = createEmptyVNode()
        } // set parent

        vnode.parent = _parentVnode
        return vnode
      }
    }
    /*  */

    function ensureCtor(comp, base) {
      if (comp.__esModule || hasSymbol && comp[Symbol.toStringTag] === 'Module') {
        comp = comp.default
      }

      return isObject(comp) ? base.extend(comp) : comp
    }

    function createAsyncPlaceholder(factory, data, context, children, tag) {
      const node = createEmptyVNode()
      node.asyncFactory = factory
      node.asyncMeta = {
        data,
        context,
        children,
        tag,
      }
      return node
    }

    function resolveAsyncComponent(factory, baseCtor) {
      if (isTrue(factory.error) && isDef(factory.errorComp)) {
        return factory.errorComp
      }

      if (isDef(factory.resolved)) {
        return factory.resolved
      }

      const owner = currentRenderingInstance

      if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
        // already pending
        factory.owners.push(owner)
      }

      if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
        return factory.loadingComp
      }

      if (owner && !isDef(factory.owners)) {
        const owners = factory.owners = [owner]
        let sync = true
        let timerLoading = null
        let timerTimeout = null
        owner.$on('hook:destroyed', () => {
          return remove(owners, owner)
        })

        const forceRender = function (renderCompleted) {
          for (let i = 0, l = owners.length; i < l; i++) {
            owners[i].$forceUpdate()
          }

          if (renderCompleted) {
            owners.length = 0

            if (timerLoading !== null) {
              clearTimeout(timerLoading)
              timerLoading = null
            }

            if (timerTimeout !== null) {
              clearTimeout(timerTimeout)
              timerTimeout = null
            }
          }
        }

        const resolve = once(res => {
          // cache resolved
          factory.resolved = ensureCtor(res, baseCtor) // invoke callbacks only if this is not a synchronous resolve
          // (async resolves are shimmed as synchronous during SSR)

          if (!sync) {
            forceRender(true)
          } else {
            owners.length = 0
          }
        })
        const reject = once(reason => {
          'development' !== 'production' && warn(`Failed to resolve async component: ${String(factory)}${reason ? `\nReason: ${reason}` : ''}`)

          if (isDef(factory.errorComp)) {
            factory.error = true
            forceRender(true)
          }
        })
        const res = factory(resolve, reject)

        if (isObject(res)) {
          if (isPromise(res)) {
            // () => Promise
            if (isUndef(factory.resolved)) {
              res.then(resolve, reject)
            }
          } else if (isPromise(res.component)) {
            res.component.then(resolve, reject)

            if (isDef(res.error)) {
              factory.errorComp = ensureCtor(res.error, baseCtor)
            }

            if (isDef(res.loading)) {
              factory.loadingComp = ensureCtor(res.loading, baseCtor)

              if (res.delay === 0) {
                factory.loading = true
              } else {
                timerLoading = setTimeout(() => {
                  timerLoading = null

                  if (isUndef(factory.resolved) && isUndef(factory.error)) {
                    factory.loading = true
                    forceRender(false)
                  }
                }, res.delay || 200)
              }
            }

            if (isDef(res.timeout)) {
              timerTimeout = setTimeout(() => {
                timerTimeout = null

                if (isUndef(factory.resolved)) {
                  reject('development' !== 'production' ? `timeout (${res.timeout}ms)` : null)
                }
              }, res.timeout)
            }
          }
        }

        sync = false // return in case resolved synchronously

        return factory.loading ? factory.loadingComp : factory.resolved
      }
    }
    /*  */

    function isAsyncPlaceholder(node) {
      return node.isComment && node.asyncFactory
    }
    /*  */

    function getFirstComponentChild(children) {
      if (Array.isArray(children)) {
        for (let i = 0; i < children.length; i++) {
          const c = children[i]

          if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
            return c
          }
        }
      }
    }
    /*  */

    /*  */

    function initEvents(vm) {
      vm._events = Object.create(null)
      vm._hasHookEvent = false // init parent attached events

      const listeners = vm.$options._parentListeners

      if (listeners) {
        updateComponentListeners(vm, listeners)
      }
    }

    let target

    function add(event, fn) {
      target.$on(event, fn)
    }

    function remove$1(event, fn) {
      target.$off(event, fn)
    }

    function createOnceHandler(event, fn) {
      const _target = target
      return function onceHandler() {
        const res = fn.apply(null, arguments)

        if (res !== null) {
          _target.$off(event, onceHandler)
        }
      }
    }

    function updateComponentListeners(vm, listeners, oldListeners) {
      target = vm
      updateListeners(listeners, oldListeners || {}, add, remove$1, createOnceHandler, vm)
      target = undefined
    }

    function eventsMixin(Vue) {
      const hookRE = /^hook:/

      Vue.prototype.$on = function (event, fn) {
        const vm = this

        if (Array.isArray(event)) {
          for (let i = 0, l = event.length; i < l; i++) {
            vm.$on(event[i], fn)
          }
        } else {
          (vm._events[event] || (vm._events[event] = [])).push(fn) // optimize hook:event cost by using a boolean flag marked at registration
          // instead of a hash lookup

          if (hookRE.test(event)) {
            vm._hasHookEvent = true
          }
        }

        return vm
      }

      Vue.prototype.$once = function (event, fn) {
        const vm = this

        function on() {
          vm.$off(event, on)
          fn.apply(vm, arguments)
        }

        on.fn = fn
        vm.$on(event, on)
        return vm
      }

      Vue.prototype.$off = function (event, fn) {
        const vm = this // all

        if (!arguments.length) {
          vm._events = Object.create(null)
          return vm
        } // array of events

        if (Array.isArray(event)) {
          for (let i$1 = 0, l = event.length; i$1 < l; i$1++) {
            vm.$off(event[i$1], fn)
          }

          return vm
        } // specific event

        const cbs = vm._events[event]

        if (!cbs) {
          return vm
        }

        if (!fn) {
          vm._events[event] = null
          return vm
        } // specific handler

        let cb
        let i = cbs.length

        while (i--) {
          cb = cbs[i]

          if (cb === fn || cb.fn === fn) {
            cbs.splice(i, 1)
            break
          }
        }

        return vm
      }

      Vue.prototype.$emit = function (event) {
        const vm = this

        if ('development' !== 'production') {
          const lowerCaseEvent = event.toLowerCase()

          if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
            tip(`Event "${lowerCaseEvent}" is emitted in component ${formatComponentName(vm)} but the handler is registered for "${event}". ` + 'Note that HTML attributes are case-insensitive and you cannot use ' + 'v-on to listen to camelCase events when using in-DOM templates. ' + `You should probably use "${hyphenate(event)}" instead of "${event}".`)
          }
        }

        let cbs = vm._events[event]

        if (cbs) {
          cbs = cbs.length > 1 ? toArray(cbs) : cbs
          const args = toArray(arguments, 1)
          const info = `event handler for "${event}"`

          for (let i = 0, l = cbs.length; i < l; i++) {
            invokeWithErrorHandling(cbs[i], vm, args, vm, info)
          }
        }

        return vm
      }
    }
    /*  */

    var activeInstance = null
    var isUpdatingChildComponent = false

    function setActiveInstance(vm) {
      const prevActiveInstance = activeInstance
      activeInstance = vm
      return function () {
        activeInstance = prevActiveInstance
      }
    }

    function initLifecycle(vm) {
      const options = vm.$options // locate first non-abstract parent

      let { parent } = options

      if (parent && !options.abstract) {
        while (parent.$options.abstract && parent.$parent) {
          parent = parent.$parent
        }

        parent.$children.push(vm)
      }

      vm.$parent = parent
      vm.$root = parent ? parent.$root : vm
      vm.$children = []
      vm.$refs = {}
      vm._watcher = null
      vm._inactive = null
      vm._directInactive = false
      vm._isMounted = false
      vm._isDestroyed = false
      vm._isBeingDestroyed = false
    }

    function lifecycleMixin(Vue) {
      Vue.prototype._update = function (vnode, hydrating) {
        const vm = this
        const prevEl = vm.$el
        const prevVnode = vm._vnode
        const restoreActiveInstance = setActiveInstance(vm)
        vm._vnode = vnode // Vue.prototype.__patch__ is injected in entry points
        // based on the rendering backend used.

        if (!prevVnode) {
          // initial render
          vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false,
          /* removeOnly */
          )
        } else {
          // updates
          vm.$el = vm.__patch__(prevVnode, vnode)
        }

        restoreActiveInstance() // update __vue__ reference

        if (prevEl) {
          prevEl.__vue__ = null
        }

        if (vm.$el) {
          vm.$el.__vue__ = vm
        } // if parent is an HOC, update its $el as well

        if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
          vm.$parent.$el = vm.$el
        } // updated hook is called by the scheduler to ensure that children are
        // updated in a parent's updated hook.

      }

      Vue.prototype.$forceUpdate = function () {
        const vm = this

        if (vm._watcher) {
          vm._watcher.update()
        }
      }

      Vue.prototype.$destroy = function () {
        const vm = this

        if (vm._isBeingDestroyed) {
          return
        }

        callHook(vm, 'beforeDestroy')
        vm._isBeingDestroyed = true // remove self from parent

        const parent = vm.$parent

        if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
          remove(parent.$children, vm)
        } // teardown watchers

        if (vm._watcher) {
          vm._watcher.teardown()
        }

        let i = vm._watchers.length

        while (i--) {
          vm._watchers[i].teardown()
        } // remove reference from data ob
        // frozen object may not have observer.

        if (vm._data.__ob__) {
          vm._data.__ob__.vmCount--
        } // call the last hook...

        vm._isDestroyed = true // invoke destroy hooks on current rendered tree

        vm.__patch__(vm._vnode, null) // fire destroyed hook

        callHook(vm, 'destroyed') // turn off all instance listeners.

        vm.$off() // remove __vue__ reference

        if (vm.$el) {
          vm.$el.__vue__ = null
        } // release circular reference (#6759)

        if (vm.$vnode) {
          vm.$vnode.parent = null
        }
      }
    }

    function mountComponent(vm, el, hydrating) {
      vm.$el = el

      if (!vm.$options.render) {
        vm.$options.render = createEmptyVNode

        if ('development' !== 'production') {
          /* istanbul ignore if */
          if (vm.$options.template && vm.$options.template.charAt(0) !== '#' || vm.$options.el || el) {
            warn('You are using the runtime-only build of Vue where the template ' + 'compiler is not available. Either pre-compile the templates into ' + 'render functions, or use the compiler-included build.', vm)
          } else {
            warn('Failed to mount component: template or render function not defined.', vm)
          }
        }
      }

      callHook(vm, 'beforeMount')
      let updateComponent
      /* istanbul ignore if */

      if ('development' !== 'production' && config.performance && mark) {
        updateComponent = function () {
          const name = vm._name
          const id = vm._uid
          const startTag = `vue-perf-start:${id}`
          const endTag = `vue-perf-end:${id}`
          mark(startTag)

          const vnode = vm._render()

          mark(endTag)
          measure(`vue ${name} render`, startTag, endTag)
          mark(startTag)

          vm._update(vnode, hydrating)

          mark(endTag)
          measure(`vue ${name} patch`, startTag, endTag)
        }
      } else {
        updateComponent = function () {
          vm._update(vm._render(), hydrating)
        }
      } // we set this to vm._watcher inside the watcher's constructor
      // since the watcher's initial patch may call $forceUpdate (e.g. inside child
      // component's mounted hook), which relies on vm._watcher being already defined

      new Watcher(vm, updateComponent, noop, {
        before: function before() {
          if (vm._isMounted && !vm._isDestroyed) {
            callHook(vm, 'beforeUpdate')
          }
        },
      }, true,
      /* isRenderWatcher */
      )
      hydrating = false // manually mounted instance, call mounted on self
      // mounted is called for render-created child components in its inserted hook

      if (vm.$vnode == null) {
        vm._isMounted = true
        callHook(vm, 'mounted')
      }

      return vm
    }

    function updateChildComponent(vm, propsData, listeners, parentVnode, renderChildren) {
      if ('development' !== 'production') {
        isUpdatingChildComponent = true
      } // determine whether component has slot children
      // we need to do this before overwriting $options._renderChildren.
      // check if there are dynamic scopedSlots (hand-written or compiled but with
      // dynamic slot names). Static scoped slots compiled from template has the
      // "$stable" marker.

      const newScopedSlots = parentVnode.data.scopedSlots
      const oldScopedSlots = vm.$scopedSlots
      const hasDynamicScopedSlot = !!(newScopedSlots && !newScopedSlots.$stable || oldScopedSlots !== emptyObject && !oldScopedSlots.$stable || newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key) // Any static slot children from the parent may have changed during parent's
      // update. Dynamic scoped slots may also have changed. In such cases, a forced
      // update is necessary to ensure correctness.

      const needsForceUpdate = !!(renderChildren // has new static slots
  || vm.$options._renderChildren // has old static slots
  || hasDynamicScopedSlot)
      vm.$options._parentVnode = parentVnode
      vm.$vnode = parentVnode // update vm's placeholder node without re-render

      if (vm._vnode) {
        // update child tree's parent
        vm._vnode.parent = parentVnode
      }

      vm.$options._renderChildren = renderChildren // update $attrs and $listeners hash
      // these are also reactive so they may trigger child update if the child
      // used them during render

      vm.$attrs = parentVnode.data.attrs || emptyObject
      vm.$listeners = listeners || emptyObject // update props

      if (propsData && vm.$options.props) {
        toggleObserving(false)
        const props = vm._props
        const propKeys = vm.$options._propKeys || []

        for (let i = 0; i < propKeys.length; i++) {
          const key = propKeys[i]
          const propOptions = vm.$options.props // wtf flow?

          props[key] = validateProp(key, propOptions, propsData, vm)
        }

        toggleObserving(true) // keep a copy of raw propsData

        vm.$options.propsData = propsData
      } // update listeners

      listeners = listeners || emptyObject
      const oldListeners = vm.$options._parentListeners
      vm.$options._parentListeners = listeners
      updateComponentListeners(vm, listeners, oldListeners) // resolve slots + force update if has children

      if (needsForceUpdate) {
        vm.$slots = resolveSlots(renderChildren, parentVnode.context)
        vm.$forceUpdate()
      }

      if ('development' !== 'production') {
        isUpdatingChildComponent = false
      }
    }

    function isInInactiveTree(vm) {
      while (vm && (vm = vm.$parent)) {
        if (vm._inactive) {
          return true
        }
      }

      return false
    }

    function activateChildComponent(vm, direct) {
      if (direct) {
        vm._directInactive = false

        if (isInInactiveTree(vm)) {
          return
        }
      } else if (vm._directInactive) {
        return
      }

      if (vm._inactive || vm._inactive === null) {
        vm._inactive = false

        for (let i = 0; i < vm.$children.length; i++) {
          activateChildComponent(vm.$children[i])
        }

        callHook(vm, 'activated')
      }
    }

    function deactivateChildComponent(vm, direct) {
      if (direct) {
        vm._directInactive = true

        if (isInInactiveTree(vm)) {
          return
        }
      }

      if (!vm._inactive) {
        vm._inactive = true

        for (let i = 0; i < vm.$children.length; i++) {
          deactivateChildComponent(vm.$children[i])
        }

        callHook(vm, 'deactivated')
      }
    }

    function callHook(vm, hook) {
      // #7573 disable dep collection when invoking lifecycle hooks
      pushTarget()
      const handlers = vm.$options[hook]
      const info = `${hook} hook`

      if (handlers) {
        for (let i = 0, j = handlers.length; i < j; i++) {
          invokeWithErrorHandling(handlers[i], vm, null, vm, info)
        }
      }

      if (vm._hasHookEvent) {
        vm.$emit(`hook:${hook}`)
      }

      popTarget()
    }
    /*  */

    const MAX_UPDATE_COUNT = 100
    const queue = []
    const activatedChildren = []
    let has = {}
    let circular = {}
    let waiting = false
    let flushing = false
    let index = 0
    /**
 * Reset the scheduler's state.
 */

    function resetSchedulerState() {
      index = queue.length = activatedChildren.length = 0
      has = {}

      if ('development' !== 'production') {
        circular = {}
      }

      waiting = flushing = false
    } // Async edge case #6566 requires saving the timestamp when event listeners are
    // attached. However, calling performance.now() has a perf overhead especially
    // if the page has thousands of event listeners. Instead, we take a timestamp
    // every time the scheduler flushes and use that for all event listeners
    // attached during that flush.

    let currentFlushTimestamp = 0 // Async edge case fix requires storing an event listener's attach timestamp.

    let getNow = Date.now // Determine what event timestamp the browser is using. Annoyingly, the
    // timestamp can either be hi-res (relative to page load) or low-res
    // (relative to UNIX epoch), so in order to compare time we have to use the
    // same timestamp type when saving the flush timestamp.
    // All IE versions use low-res event timestamps, and have problematic clock
    // implementations (#9632)

    if (inBrowser && !isIE) {
      const { performance } = window

      if (performance && typeof performance.now === 'function' && getNow() > document.createEvent('Event').timeStamp) {
        // if the event timestamp, although evaluated AFTER the Date.now(), is
        // smaller than it, it means the event is using a hi-res timestamp,
        // and we need to use the hi-res version for event listener timestamps as
        // well.
        getNow = function () {
          return performance.now()
        }
      }
    }
    /**
 * Flush both queues and run the watchers.
 */

    function flushSchedulerQueue() {
      currentFlushTimestamp = getNow()
      flushing = true
      let watcher; let
        id // Sort queue before flush.
      // This ensures that:
      // 1. Components are updated from parent to child. (because parent is always
      //    created before the child)
      // 2. A component's user watchers are run before its render watcher (because
      //    user watchers are created before the render watcher)
      // 3. If a component is destroyed during a parent component's watcher run,
      //    its watchers can be skipped.

      queue.sort((a, b) => {
        return a.id - b.id
      }) // do not cache length because more watchers might be pushed
      // as we run existing watchers

      for (index = 0; index < queue.length; index++) {
        watcher = queue[index]

        if (watcher.before) {
          watcher.before()
        }

        id = watcher.id
        has[id] = null
        watcher.run() // in dev build, check and stop circular updates.

        if ('development' !== 'production' && has[id] != null) {
          circular[id] = (circular[id] || 0) + 1

          if (circular[id] > MAX_UPDATE_COUNT) {
            warn(`You may have an infinite update loop ${watcher.user ? `in watcher with expression "${watcher.expression}"` : 'in a component render function.'}`, watcher.vm)
            break
          }
        }
      } // keep copies of post queues before resetting state

      const activatedQueue = activatedChildren.slice()
      const updatedQueue = queue.slice()
      resetSchedulerState() // call component updated and activated hooks

      callActivatedHooks(activatedQueue)
      callUpdatedHooks(updatedQueue) // devtool hook

      /* istanbul ignore if */

      if (devtools && config.devtools) {
        devtools.emit('flush')
      }
    }

    function callUpdatedHooks(queue) {
      let i = queue.length

      while (i--) {
        const watcher = queue[i]
        const { vm } = watcher

        if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
          callHook(vm, 'updated')
        }
      }
    }
    /**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */

    function queueActivatedComponent(vm) {
      // setting _inactive to false here so that a render function can
      // rely on checking whether it's in an inactive tree (e.g. router-view)
      vm._inactive = false
      activatedChildren.push(vm)
    }

    function callActivatedHooks(queue) {
      for (let i = 0; i < queue.length; i++) {
        queue[i]._inactive = true
        activateChildComponent(queue[i], true,
        /* true */
        )
      }
    }
    /**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */

    function queueWatcher(watcher) {
      const { id } = watcher

      if (has[id] == null) {
        has[id] = true

        if (!flushing) {
          queue.push(watcher)
        } else {
          // if already flushing, splice the watcher based on its id
          // if already past its id, it will be run next immediately.
          let i = queue.length - 1

          while (i > index && queue[i].id > watcher.id) {
            i--
          }

          queue.splice(i + 1, 0, watcher)
        } // queue the flush

        if (!waiting) {
          waiting = true

          if ('development' !== 'production' && !config.async) {
            flushSchedulerQueue()
            return
          }

          nextTick(flushSchedulerQueue)
        }
      }
    }
    /*  */

    let uid$2 = 0
    /**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */

    var Watcher = function Watcher(vm, expOrFn, cb, options, isRenderWatcher) {
      this.vm = vm

      if (isRenderWatcher) {
        vm._watcher = this
      }

      vm._watchers.push(this) // options

      if (options) {
        this.deep = !!options.deep
        this.user = !!options.user
        this.lazy = !!options.lazy
        this.sync = !!options.sync
        this.before = options.before
      } else {
        this.deep = this.user = this.lazy = this.sync = false
      }

      this.cb = cb
      this.id = ++uid$2 // uid for batching

      this.active = true
      this.dirty = this.lazy // for lazy watchers

      this.deps = []
      this.newDeps = []
      this.depIds = new _Set()
      this.newDepIds = new _Set()
      this.expression = 'development' !== 'production' ? expOrFn.toString() : '' // parse expression for getter

      if (typeof expOrFn === 'function') {
        this.getter = expOrFn
      } else {
        this.getter = parsePath(expOrFn)

        if (!this.getter) {
          this.getter = noop
          'development' !== 'production' && warn(`Failed watching path: "${expOrFn}" ` + 'Watcher only accepts simple dot-delimited paths. ' + 'For full control, use a function instead.', vm)
        }
      }

      this.value = this.lazy ? undefined : this.get()
    }
    /**
 * Evaluate the getter, and re-collect dependencies.
 */

    Watcher.prototype.get = function get() {
      pushTarget(this)
      let value
      const { vm } = this

      try {
        value = this.getter.call(vm, vm)
      } catch (e) {
        if (this.user) {
          handleError(e, vm, `getter for watcher "${this.expression}"`)
        } else {
          throw e
        }
      } finally {
        // "touch" every property so they are all tracked as
        // dependencies for deep watching
        if (this.deep) {
          traverse(value)
        }

        popTarget()
        this.cleanupDeps()
      }

      return value
    }
    /**
 * Add a dependency to this directive.
 */

    Watcher.prototype.addDep = function addDep(dep) {
      const { id } = dep

      if (!this.newDepIds.has(id)) {
        this.newDepIds.add(id)
        this.newDeps.push(dep)

        if (!this.depIds.has(id)) {
          dep.addSub(this)
        }
      }
    }
    /**
 * Clean up for dependency collection.
 */

    Watcher.prototype.cleanupDeps = function cleanupDeps() {
      let i = this.deps.length

      while (i--) {
        const dep = this.deps[i]

        if (!this.newDepIds.has(dep.id)) {
          dep.removeSub(this)
        }
      }

      let tmp = this.depIds
      this.depIds = this.newDepIds
      this.newDepIds = tmp
      this.newDepIds.clear()
      tmp = this.deps
      this.deps = this.newDeps
      this.newDeps = tmp
      this.newDeps.length = 0
    }
    /**
 * Subscriber interface.
 * Will be called when a dependency changes.
 */

    Watcher.prototype.update = function update() {
      /* istanbul ignore else */
      if (this.lazy) {
        this.dirty = true
      } else if (this.sync) {
        this.run()
      } else {
        queueWatcher(this)
      }
    }
    /**
 * Scheduler job interface.
 * Will be called by the scheduler.
 */

    Watcher.prototype.run = function run() {
      if (this.active) {
        const value = this.get()

        if (value !== this.value // Deep watchers and watchers on Object/Arrays should fire even
    // when the value is the same, because the value may
    // have mutated.
    || isObject(value) || this.deep) {
          // set new value
          const oldValue = this.value
          this.value = value

          if (this.user) {
            try {
              this.cb.call(this.vm, value, oldValue)
            } catch (e) {
              handleError(e, this.vm, `callback for watcher "${this.expression}"`)
            }
          } else {
            this.cb.call(this.vm, value, oldValue)
          }
        }
      }
    }
    /**
 * Evaluate the value of the watcher.
 * This only gets called for lazy watchers.
 */

    Watcher.prototype.evaluate = function evaluate() {
      this.value = this.get()
      this.dirty = false
    }
    /**
 * Depend on all deps collected by this watcher.
 */

    Watcher.prototype.depend = function depend() {
      let i = this.deps.length

      while (i--) {
        this.deps[i].depend()
      }
    }
    /**
 * Remove self from all dependencies' subscriber list.
 */

    Watcher.prototype.teardown = function teardown() {
      if (this.active) {
        // remove self from vm's watcher list
        // this is a somewhat expensive operation so we skip it
        // if the vm is being destroyed.
        if (!this.vm._isBeingDestroyed) {
          remove(this.vm._watchers, this)
        }

        let i = this.deps.length

        while (i--) {
          this.deps[i].removeSub(this)
        }

        this.active = false
      }
    }
    /*  */

    const sharedPropertyDefinition = {
      enumerable: true,
      configurable: true,
      get: noop,
      set: noop,
    }

    function proxy(target, sourceKey, key) {
      sharedPropertyDefinition.get = function proxyGetter() {
        return this[sourceKey][key]
      }

      sharedPropertyDefinition.set = function proxySetter(val) {
        this[sourceKey][key] = val
      }

      Object.defineProperty(target, key, sharedPropertyDefinition)
    }

    function initState(vm) {
      vm._watchers = []
      const opts = vm.$options

      if (opts.props) {
        initProps(vm, opts.props)
      }

      if (opts.methods) {
        initMethods(vm, opts.methods)
      }

      if (opts.data) {
        initData(vm)
      } else {
        observe(vm._data = {}, true,
        /* asRootData */
        )
      }

      if (opts.computed) {
        initComputed(vm, opts.computed)
      }

      if (opts.watch && opts.watch !== nativeWatch) {
        initWatch(vm, opts.watch)
      }
    }

    function initProps(vm, propsOptions) {
      const propsData = vm.$options.propsData || {}
      const props = vm._props = {} // cache prop keys so that future props updates can iterate using Array
      // instead of dynamic object key enumeration.

      const keys = vm.$options._propKeys = []
      const isRoot = !vm.$parent // root instance props should be converted

      if (!isRoot) {
        toggleObserving(false)
      }

      const loop = function (key) {
        keys.push(key)
        const value = validateProp(key, propsOptions, propsData, vm)
        /* istanbul ignore else */

        if ('development' !== 'production') {
          const hyphenatedKey = hyphenate(key)

          if (isReservedAttribute(hyphenatedKey) || config.isReservedAttr(hyphenatedKey)) {
            warn(`"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`, vm)
          }

          defineReactive$$1(props, key, value, () => {
            if (!isRoot && !isUpdatingChildComponent) {
              warn(`${'Avoid mutating a prop directly since the value will be ' + 'overwritten whenever the parent component re-renders. ' + "Instead, use a data or computed property based on the prop's " + 'value. Prop being mutated: "'}${key}"`, vm)
            }
          })
        } else {
          defineReactive$$1(props, key, value)
        } // static props are already proxied on the component's prototype
        // during Vue.extend(). We only need to proxy props defined at
        // instantiation here.

        if (!(key in vm)) {
          proxy(vm, '_props', key)
        }
      }

      for (const key in propsOptions) loop(key)

      toggleObserving(true)
    }

    function initData(vm) {
      let { data } = vm.$options
      data = vm._data = typeof data === 'function' ? getData(data, vm) : data || {}

      if (!isPlainObject(data)) {
        data = {}
        'development' !== 'production' && warn('data functions should return an object:\n' + 'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function', vm)
      } // proxy data on instance

      const keys = Object.keys(data)
      const { props } = vm.$options
      const { methods } = vm.$options
      let i = keys.length

      while (i--) {
        const key = keys[i]

        if ('development' !== 'production') {
          if (methods && hasOwn(methods, key)) {
            warn(`Method "${key}" has already been defined as a data property.`, vm)
          }
        }

        if (props && hasOwn(props, key)) {
          'development' !== 'production' && warn(`The data property "${key}" is already declared as a prop. ` + 'Use prop default value instead.', vm)
        } else if (!isReserved(key)) {
          proxy(vm, '_data', key)
        }
      } // observe data

      observe(data, true,
      /* asRootData */
      )
    }

    function getData(data, vm) {
      // #7573 disable dep collection when invoking data getters
      pushTarget()

      try {
        return data.call(vm, vm)
      } catch (e) {
        handleError(e, vm, 'data()')
        return {}
      } finally {
        popTarget()
      }
    }

    const computedWatcherOptions = {
      lazy: true,
    }

    function initComputed(vm, computed) {
      // $flow-disable-line
      const watchers = vm._computedWatchers = Object.create(null) // computed properties are just getters during SSR

      const isSSR = isServerRendering()

      for (const key in computed) {
        const userDef = computed[key]
        const getter = typeof userDef === 'function' ? userDef : userDef.get

        if ('development' !== 'production' && getter == null) {
          warn(`Getter is missing for computed property "${key}".`, vm)
        }

        if (!isSSR) {
          // create internal watcher for the computed property.
          watchers[key] = new Watcher(vm, getter || noop, noop, computedWatcherOptions)
        } // component-defined computed properties are already defined on the
        // component prototype. We only need to define computed properties defined
        // at instantiation here.

        if (!(key in vm)) {
          defineComputed(vm, key, userDef)
        } else if ('development' !== 'production') {
          if (key in vm.$data) {
            warn(`The computed property "${key}" is already defined in data.`, vm)
          } else if (vm.$options.props && key in vm.$options.props) {
            warn(`The computed property "${key}" is already defined as a prop.`, vm)
          }
        }
      }
    }

    function defineComputed(target, key, userDef) {
      const shouldCache = !isServerRendering()

      if (typeof userDef === 'function') {
        sharedPropertyDefinition.get = shouldCache ? createComputedGetter(key) : createGetterInvoker(userDef)
        sharedPropertyDefinition.set = noop
      } else {
        sharedPropertyDefinition.get = userDef.get ? shouldCache && userDef.cache !== false ? createComputedGetter(key) : createGetterInvoker(userDef.get) : noop
        sharedPropertyDefinition.set = userDef.set || noop
      }

      if ('development' !== 'production' && sharedPropertyDefinition.set === noop) {
        sharedPropertyDefinition.set = function () {
          warn(`Computed property "${key}" was assigned to but it has no setter.`, this)
        }
      }

      Object.defineProperty(target, key, sharedPropertyDefinition)
    }

    function createComputedGetter(key) {
      return function computedGetter() {
        const watcher = this._computedWatchers && this._computedWatchers[key]

        if (watcher) {
          if (watcher.dirty) {
            watcher.evaluate()
          }

          if (Dep.target) {
            watcher.depend()
          }

          return watcher.value
        }
      }
    }

    function createGetterInvoker(fn) {
      return function computedGetter() {
        return fn.call(this, this)
      }
    }

    function initMethods(vm, methods) {
      const { props } = vm.$options

      for (const key in methods) {
        if ('development' !== 'production') {
          if (typeof methods[key] !== 'function') {
            warn(`Method "${key}" has type "${typeof methods[key]}" in the component definition. ` + 'Did you reference the function correctly?', vm)
          }

          if (props && hasOwn(props, key)) {
            warn(`Method "${key}" has already been defined as a prop.`, vm)
          }

          if (key in vm && isReserved(key)) {
            warn(`Method "${key}" conflicts with an existing Vue instance method. ` + 'Avoid defining component methods that start with _ or $.')
          }
        }

        vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
      }
    }

    function initWatch(vm, watch) {
      for (const key in watch) {
        const handler = watch[key]

        if (Array.isArray(handler)) {
          for (let i = 0; i < handler.length; i++) {
            createWatcher(vm, key, handler[i])
          }
        } else {
          createWatcher(vm, key, handler)
        }
      }
    }

    function createWatcher(vm, expOrFn, handler, options) {
      if (isPlainObject(handler)) {
        options = handler
        handler = handler.handler
      }

      if (typeof handler === 'string') {
        handler = vm[handler]
      }

      return vm.$watch(expOrFn, handler, options)
    }

    function stateMixin(Vue) {
      // flow somehow has problems with directly declared definition object
      // when using Object.defineProperty, so we have to procedurally build up
      // the object here.
      const dataDef = {}

      dataDef.get = function () {
        return this._data
      }

      const propsDef = {}

      propsDef.get = function () {
        return this._props
      }

      if ('development' !== 'production') {
        dataDef.set = function () {
          warn('Avoid replacing instance root $data. ' + 'Use nested data properties instead.', this)
        }

        propsDef.set = function () {
          warn('$props is readonly.', this)
        }
      }

      Object.defineProperty(Vue.prototype, '$data', dataDef)
      Object.defineProperty(Vue.prototype, '$props', propsDef)
      Vue.prototype.$set = set
      Vue.prototype.$delete = del

      Vue.prototype.$watch = function (expOrFn, cb, options) {
        const vm = this

        if (isPlainObject(cb)) {
          return createWatcher(vm, expOrFn, cb, options)
        }

        options = options || {}
        options.user = true
        const watcher = new Watcher(vm, expOrFn, cb, options)

        if (options.immediate) {
          try {
            cb.call(vm, watcher.value)
          } catch (error) {
            handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
          }
        }

        return function unwatchFn() {
          watcher.teardown()
        }
      }
    }
    /*  */

    let uid$3 = 0

    function initMixin(Vue) {
      Vue.prototype._init = function (options) {
        const vm = this // a uid

        vm._uid = uid$3++
        let startTag; let
          endTag
        /* istanbul ignore if */

        if ('development' !== 'production' && config.performance && mark) {
          startTag = `vue-perf-start:${vm._uid}`
          endTag = `vue-perf-end:${vm._uid}`
          mark(startTag)
        } // a flag to avoid this being observed

        vm._isVue = true // merge options

        if (options && options._isComponent) {
          // optimize internal component instantiation
          // since dynamic options merging is pretty slow, and none of the
          // internal component options needs special treatment.
          initInternalComponent(vm, options)
        } else {
          vm.$options = mergeOptions(resolveConstructorOptions(vm.constructor), options || {}, vm)
        }
        /* istanbul ignore else */

        if ('development' !== 'production') {
          initProxy(vm)
        } else {
          vm._renderProxy = vm
        } // expose real self

        vm._self = vm
        initLifecycle(vm)
        initEvents(vm)
        initRender(vm)
        callHook(vm, 'beforeCreate')
        initInjections(vm) // resolve injections before data/props

        initState(vm)
        initProvide(vm) // resolve provide after data/props

        callHook(vm, 'created')
        /* istanbul ignore if */

        if ('development' !== 'production' && config.performance && mark) {
          vm._name = formatComponentName(vm, false)
          mark(endTag)
          measure(`vue ${vm._name} init`, startTag, endTag)
        }

        if (vm.$options.el) {
          vm.$mount(vm.$options.el)
        }
      }
    }

    function initInternalComponent(vm, options) {
      const opts = vm.$options = Object.create(vm.constructor.options) // doing this because it's faster than dynamic enumeration.

      const parentVnode = options._parentVnode
      opts.parent = options.parent
      opts._parentVnode = parentVnode
      const vnodeComponentOptions = parentVnode.componentOptions
      opts.propsData = vnodeComponentOptions.propsData
      opts._parentListeners = vnodeComponentOptions.listeners
      opts._renderChildren = vnodeComponentOptions.children
      opts._componentTag = vnodeComponentOptions.tag

      if (options.render) {
        opts.render = options.render
        opts.staticRenderFns = options.staticRenderFns
      }
    }

    function resolveConstructorOptions(Ctor) {
      let { options } = Ctor

      if (Ctor.super) {
        const superOptions = resolveConstructorOptions(Ctor.super)
        const cachedSuperOptions = Ctor.superOptions

        if (superOptions !== cachedSuperOptions) {
          // super option changed,
          // need to resolve new options.
          Ctor.superOptions = superOptions // check if there are any late-modified/attached options (#4976)

          const modifiedOptions = resolveModifiedOptions(Ctor) // update base extend options

          if (modifiedOptions) {
            extend(Ctor.extendOptions, modifiedOptions)
          }

          options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)

          if (options.name) {
            options.components[options.name] = Ctor
          }
        }
      }

      return options
    }

    function resolveModifiedOptions(Ctor) {
      let modified
      const latest = Ctor.options
      const sealed = Ctor.sealedOptions

      for (const key in latest) {
        if (latest[key] !== sealed[key]) {
          if (!modified) {
            modified = {}
          }

          modified[key] = latest[key]
        }
      }

      return modified
    }

    function Vue(options) {
      if ('development' !== 'production' && !(this instanceof Vue)) {
        warn('Vue is a constructor and should be called with the `new` keyword')
      }

      this._init(options)
    }

    initMixin(Vue)
    stateMixin(Vue)
    eventsMixin(Vue)
    lifecycleMixin(Vue)
    renderMixin(Vue)
    /*  */

    function initUse(Vue) {
      Vue.use = function (plugin) {
        const installedPlugins = this._installedPlugins || (this._installedPlugins = [])

        if (installedPlugins.indexOf(plugin) > -1) {
          return this
        } // additional parameters

        const args = toArray(arguments, 1)
        args.unshift(this)

        if (typeof plugin.install === 'function') {
          plugin.install.apply(plugin, args)
        } else if (typeof plugin === 'function') {
          plugin.apply(null, args)
        }

        installedPlugins.push(plugin)
        return this
      }
    }
    /*  */

    function initMixin$1(Vue) {
      Vue.mixin = function (mixin) {
        this.options = mergeOptions(this.options, mixin)
        return this
      }
    }
    /*  */

    function initExtend(Vue) {
      /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
      Vue.cid = 0
      let cid = 1
      /**
   * Class inheritance
   */

      Vue.extend = function (extendOptions) {
        extendOptions = extendOptions || {}
        const Super = this
        const SuperId = Super.cid
        const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})

        if (cachedCtors[SuperId]) {
          return cachedCtors[SuperId]
        }

        const name = extendOptions.name || Super.options.name

        if ('development' !== 'production' && name) {
          validateComponentName(name)
        }

        const Sub = function VueComponent(options) {
          this._init(options)
        }

        Sub.prototype = Object.create(Super.prototype)
        Sub.prototype.constructor = Sub
        Sub.cid = cid++
        Sub.options = mergeOptions(Super.options, extendOptions)
        Sub.super = Super // For props and computed properties, we define the proxy getters on
        // the Vue instances at extension time, on the extended prototype. This
        // avoids Object.defineProperty calls for each instance created.

        if (Sub.options.props) {
          initProps$1(Sub)
        }

        if (Sub.options.computed) {
          initComputed$1(Sub)
        } // allow further extension/mixin/plugin usage

        Sub.extend = Super.extend
        Sub.mixin = Super.mixin
        Sub.use = Super.use // create asset registers, so extended classes
        // can have their private assets too.

        ASSET_TYPES.forEach(type => {
          Sub[type] = Super[type]
        }) // enable recursive self-lookup

        if (name) {
          Sub.options.components[name] = Sub
        } // keep a reference to the super options at extension time.
        // later at instantiation we can check if Super's options have
        // been updated.

        Sub.superOptions = Super.options
        Sub.extendOptions = extendOptions
        Sub.sealedOptions = extend({}, Sub.options) // cache constructor

        cachedCtors[SuperId] = Sub
        return Sub
      }
    }

    function initProps$1(Comp) {
      const { props } = Comp.options

      for (const key in props) {
        proxy(Comp.prototype, '_props', key)
      }
    }

    function initComputed$1(Comp) {
      const { computed } = Comp.options

      for (const key in computed) {
        defineComputed(Comp.prototype, key, computed[key])
      }
    }
    /*  */

    function initAssetRegisters(Vue) {
      /**
   * Create asset registration methods.
   */
      ASSET_TYPES.forEach(type => {
        Vue[type] = function (id, definition) {
          if (!definition) {
            return this.options[`${type}s`][id]
          }
          /* istanbul ignore if */
          if ('development' !== 'production' && type === 'component') {
            validateComponentName(id)
          }

          if (type === 'component' && isPlainObject(definition)) {
            definition.name = definition.name || id
            definition = this.options._base.extend(definition)
          }

          if (type === 'directive' && typeof definition === 'function') {
            definition = {
              bind: definition,
              update: definition,
            }
          }

          this.options[`${type}s`][id] = definition
          return definition

        }
      })
    }
    /*  */

    function getComponentName(opts) {
      return opts && (opts.Ctor.options.name || opts.tag)
    }

    function matches(pattern, name) {
      if (Array.isArray(pattern)) {
        return pattern.indexOf(name) > -1
      } if (typeof pattern === 'string') {
        return pattern.split(',').indexOf(name) > -1
      } if (isRegExp(pattern)) {
        return pattern.test(name)
      }
      /* istanbul ignore next */

      return false
    }

    function pruneCache(keepAliveInstance, filter) {
      const { cache } = keepAliveInstance
      const { keys } = keepAliveInstance
      const { _vnode } = keepAliveInstance

      for (const key in cache) {
        const cachedNode = cache[key]

        if (cachedNode) {
          const name = getComponentName(cachedNode.componentOptions)

          if (name && !filter(name)) {
            pruneCacheEntry(cache, key, keys, _vnode)
          }
        }
      }
    }

    function pruneCacheEntry(cache, key, keys, current) {
      const cached$$1 = cache[key]

      if (cached$$1 && (!current || cached$$1.tag !== current.tag)) {
        cached$$1.componentInstance.$destroy()
      }

      cache[key] = null
      remove(keys, key)
    }

    const patternTypes = [String, RegExp, Array]
    const KeepAlive = {
      name: 'keep-alive',
      abstract: true,
      props: {
        include: patternTypes,
        exclude: patternTypes,
        max: [String, Number],
      },
      created: function created() {
        this.cache = Object.create(null)
        this.keys = []
      },
      destroyed: function destroyed() {
        for (const key in this.cache) {
          pruneCacheEntry(this.cache, key, this.keys)
        }
      },
      mounted: function mounted() {
        const this$1 = this
        this.$watch('include', val => {
          pruneCache(this$1, name => {
            return matches(val, name)
          })
        })
        this.$watch('exclude', val => {
          pruneCache(this$1, name => {
            return !matches(val, name)
          })
        })
      },
      render: function render() {
        const slot = this.$slots.default
        const vnode = getFirstComponentChild(slot)
        const componentOptions = vnode && vnode.componentOptions

        if (componentOptions) {
          // check pattern
          const name = getComponentName(componentOptions)
          const ref = this
          const { include } = ref
          const { exclude } = ref

          if ( // not included
            include && (!name || !matches(include, name)) // excluded
      || exclude && name && matches(exclude, name)) {
            return vnode
          }

          const ref$1 = this
          const { cache } = ref$1
          const { keys } = ref$1
          const key = vnode.key == null // same constructor may get registered as different local components
          // so cid alone is not enough (#3269)
            ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '') : vnode.key

          if (cache[key]) {
            vnode.componentInstance = cache[key].componentInstance // make current key freshest

            remove(keys, key)
            keys.push(key)
          } else {
            cache[key] = vnode
            keys.push(key) // prune oldest entry

            if (this.max && keys.length > parseInt(this.max)) {
              pruneCacheEntry(cache, keys[0], keys, this._vnode)
            }
          }

          vnode.data.keepAlive = true
        }

        return vnode || slot && slot[0]
      },
    }
    const builtInComponents = {
      KeepAlive,
    }
    /*  */

    function initGlobalAPI(Vue) {
      // config
      const configDef = {}

      configDef.get = function () {
        return config
      }

      if ('development' !== 'production') {
        configDef.set = function () {
          warn('Do not replace the Vue.config object, set individual fields instead.')
        }
      }

      Object.defineProperty(Vue, 'config', configDef) // exposed util methods.
      // NOTE: these are not considered part of the public API - avoid relying on
      // them unless you are aware of the risk.

      Vue.util = {
        warn,
        extend,
        mergeOptions,
        defineReactive: defineReactive$$1,
      }
      Vue.set = set
      Vue.delete = del
      Vue.nextTick = nextTick // 2.6 explicit observable API

      Vue.observable = function (obj) {
        observe(obj)
        return obj
      }

      Vue.options = Object.create(null)
      ASSET_TYPES.forEach(type => {
        Vue.options[`${type}s`] = Object.create(null)
      }) // this is used to identify the "base" constructor to extend all plain-object
      // components with in Weex's multi-instance scenarios.

      Vue.options._base = Vue
      extend(Vue.options.components, builtInComponents)
      initUse(Vue)
      initMixin$1(Vue)
      initExtend(Vue)
      initAssetRegisters(Vue)
    }

    initGlobalAPI(Vue)
    Object.defineProperty(Vue.prototype, '$isServer', {
      get: isServerRendering,
    })
    Object.defineProperty(Vue.prototype, '$ssrContext', {
      get: function get() {
        /* istanbul ignore next */
        return this.$vnode && this.$vnode.ssrContext
      },
    }) // expose FunctionalRenderContext for ssr runtime helper installation

    Object.defineProperty(Vue, 'FunctionalRenderContext', {
      value: FunctionalRenderContext,
    })
    Vue.version = '2.6.12'
    /*  */
    // these are reserved for web because they are directly compiled away
    // during template compilation

    const isReservedAttr = makeMap('style,class') // attributes that should be using props for binding

    const acceptValue = makeMap('input,textarea,option,select,progress')

    const mustUseProp = function (tag, type, attr) {
      return attr === 'value' && acceptValue(tag) && type !== 'button' || attr === 'selected' && tag === 'option' || attr === 'checked' && tag === 'input' || attr === 'muted' && tag === 'video'
    }

    const isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck')
    const isValidContentEditableValue = makeMap('events,caret,typing,plaintext-only')

    const convertEnumeratedValue = function (key, value) {
      return isFalsyAttrValue(value) || value === 'false' ? 'false' // allow arbitrary string value for contenteditable
        : key === 'contenteditable' && isValidContentEditableValue(value) ? value : 'true'
    }

    const isBooleanAttr = makeMap('allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,' + 'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,' + 'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,' + 'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,' + 'required,reversed,scoped,seamless,selected,sortable,translate,' + 'truespeed,typemustmatch,visible')
    const xlinkNS = 'http://www.w3.org/1999/xlink'

    const isXlink = function (name) {
      return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink'
    }

    const getXlinkProp = function (name) {
      return isXlink(name) ? name.slice(6, name.length) : ''
    }

    var isFalsyAttrValue = function (val) {
      return val == null || val === false
    }
    /*  */

    function genClassForVnode(vnode) {
      let { data } = vnode
      let parentNode = vnode
      let childNode = vnode

      while (isDef(childNode.componentInstance)) {
        childNode = childNode.componentInstance._vnode

        if (childNode && childNode.data) {
          data = mergeClassData(childNode.data, data)
        }
      }

      while (isDef(parentNode = parentNode.parent)) {
        if (parentNode && parentNode.data) {
          data = mergeClassData(data, parentNode.data)
        }
      }

      return renderClass(data.staticClass, data.class)
    }

    function mergeClassData(child, parent) {
      return {
        staticClass: concat(child.staticClass, parent.staticClass),
        class: isDef(child.class) ? [child.class, parent.class] : parent.class,
      }
    }

    function renderClass(staticClass, dynamicClass) {
      if (isDef(staticClass) || isDef(dynamicClass)) {
        return concat(staticClass, stringifyClass(dynamicClass))
      }
      /* istanbul ignore next */

      return ''
    }

    function concat(a, b) {
      return a ? b ? `${a} ${b}` : a : b || ''
    }

    function stringifyClass(value) {
      if (Array.isArray(value)) {
        return stringifyArray(value)
      }

      if (isObject(value)) {
        return stringifyObject(value)
      }

      if (typeof value === 'string') {
        return value
      }
      /* istanbul ignore next */

      return ''
    }

    function stringifyArray(value) {
      let res = ''
      let stringified

      for (let i = 0, l = value.length; i < l; i++) {
        if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
          if (res) {
            res += ' '
          }

          res += stringified
        }
      }

      return res
    }

    function stringifyObject(value) {
      let res = ''

      for (const key in value) {
        if (value[key]) {
          if (res) {
            res += ' '
          }

          res += key
        }
      }

      return res
    }
    /*  */

    const namespaceMap = {
      svg: 'http://www.w3.org/2000/svg',
      math: 'http://www.w3.org/1998/Math/MathML',
    }
    const isHTMLTag = makeMap('html,body,base,head,link,meta,style,title,' + 'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' + 'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' + 'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' + 's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' + 'embed,object,param,source,canvas,script,noscript,del,ins,' + 'caption,col,colgroup,table,thead,tbody,td,th,tr,' + 'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' + 'output,progress,select,textarea,' + 'details,dialog,menu,menuitem,summary,' + 'content,element,shadow,template,blockquote,iframe,tfoot') // this map is intentionally selective, only covering SVG elements that may
    // contain child elements.

    const isSVG = makeMap('svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' + 'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' + 'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view', true)

    const isReservedTag = function (tag) {
      return isHTMLTag(tag) || isSVG(tag)
    }

    function getTagNamespace(tag) {
      if (isSVG(tag)) {
        return 'svg'
      } // basic support for MathML
      // note it doesn't support other MathML elements being component roots

      if (tag === 'math') {
        return 'math'
      }
    }

    const unknownElementCache = Object.create(null)

    function isUnknownElement(tag) {
      /* istanbul ignore if */
      if (!inBrowser) {
        return true
      }

      if (isReservedTag(tag)) {
        return false
      }

      tag = tag.toLowerCase()
      /* istanbul ignore if */

      if (unknownElementCache[tag] != null) {
        return unknownElementCache[tag]
      }

      const el = document.createElement(tag)

      if (tag.indexOf('-') > -1) {
        // http://stackoverflow.com/a/28210364/1070244
        return unknownElementCache[tag] = el.constructor === window.HTMLUnknownElement || el.constructor === window.HTMLElement
      }
      return unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString())

    }

    const isTextInputType = makeMap('text,number,password,search,email,tel,url')
    /*  */

    /**
 * Query an element selector if it's not an element already.
 */

    function query(el) {
      if (typeof el === 'string') {
        const selected = document.querySelector(el)

        if (!selected) {
          'development' !== 'production' && warn(`Cannot find element: ${el}`)
          return document.createElement('div')
        }

        return selected
      }
      return el

    }
    /*  */

    function createElement$1(tagName, vnode) {
      const elm = document.createElement(tagName)

      if (tagName !== 'select') {
        return elm
      } // false or null will remove the attribute but undefined will not

      if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
        elm.setAttribute('multiple', 'multiple')
      }

      return elm
    }

    function createElementNS(namespace, tagName) {
      return document.createElementNS(namespaceMap[namespace], tagName)
    }

    function createTextNode(text) {
      return document.createTextNode(text)
    }

    function createComment(text) {
      return document.createComment(text)
    }

    function insertBefore(parentNode, newNode, referenceNode) {
      parentNode.insertBefore(newNode, referenceNode)
    }

    function removeChild(node, child) {
      node.removeChild(child)
    }

    function appendChild(node, child) {
      node.appendChild(child)
    }

    function parentNode(node) {
      return node.parentNode
    }

    function nextSibling(node) {
      return node.nextSibling
    }

    function tagName(node) {
      return node.tagName
    }

    function setTextContent(node, text) {
      node.textContent = text
    }

    function setStyleScope(node, scopeId) {
      node.setAttribute(scopeId, '')
    }

    const nodeOps = /* #__PURE__ */Object.freeze({
      createElement: createElement$1,
      createElementNS,
      createTextNode,
      createComment,
      insertBefore,
      removeChild,
      appendChild,
      parentNode,
      nextSibling,
      tagName,
      setTextContent,
      setStyleScope,
    })
    /*  */

    const ref = {
      create: function create(_, vnode) {
        registerRef(vnode)
      },
      update: function update(oldVnode, vnode) {
        if (oldVnode.data.ref !== vnode.data.ref) {
          registerRef(oldVnode, true)
          registerRef(vnode)
        }
      },
      destroy: function destroy(vnode) {
        registerRef(vnode, true)
      },
    }

    function registerRef(vnode, isRemoval) {
      const key = vnode.data.ref

      if (!isDef(key)) {
        return
      }

      const vm = vnode.context
      const ref = vnode.componentInstance || vnode.elm
      const refs = vm.$refs

      if (isRemoval) {
        if (Array.isArray(refs[key])) {
          remove(refs[key], ref)
        } else if (refs[key] === ref) {
          refs[key] = undefined
        }
      } else if (vnode.data.refInFor) {
        if (!Array.isArray(refs[key])) {
          refs[key] = [ref]
        } else if (refs[key].indexOf(ref) < 0) {
        // $flow-disable-line
          refs[key].push(ref)
        }
      } else {
        refs[key] = ref
      }
    }
    /**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by Evan You (@yyx990803)
 *
 * Not type-checking this because this file is perf-critical and the cost
 * of making flow understand it is not worth it.
 */

    const emptyNode = new VNode('', {}, [])
    const hooks = ['create', 'activate', 'update', 'remove', 'destroy']

    function sameVnode(a, b) {
      return a.key === b.key && (a.tag === b.tag && a.isComment === b.isComment && isDef(a.data) === isDef(b.data) && sameInputType(a, b) || isTrue(a.isAsyncPlaceholder) && a.asyncFactory === b.asyncFactory && isUndef(b.asyncFactory.error))
    }

    function sameInputType(a, b) {
      if (a.tag !== 'input') {
        return true
      }

      let i
      const typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type
      const typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type
      return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
    }

    function createKeyToOldIdx(children, beginIdx, endIdx) {
      let i; let
        key
      const map = {}

      for (i = beginIdx; i <= endIdx; ++i) {
        key = children[i].key

        if (isDef(key)) {
          map[key] = i
        }
      }

      return map
    }

    function createPatchFunction(backend) {
      let i; let
        j
      const cbs = {}
      const { modules } = backend
      const { nodeOps } = backend

      for (i = 0; i < hooks.length; ++i) {
        cbs[hooks[i]] = []

        for (j = 0; j < modules.length; ++j) {
          if (isDef(modules[j][hooks[i]])) {
            cbs[hooks[i]].push(modules[j][hooks[i]])
          }
        }
      }

      function emptyNodeAt(elm) {
        return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
      }

      function createRmCb(childElm, listeners) {
        function remove$$1() {
          if (--remove$$1.listeners === 0) {
            removeNode(childElm)
          }
        }

        remove$$1.listeners = listeners
        return remove$$1
      }

      function removeNode(el) {
        const parent = nodeOps.parentNode(el) // element may have already been removed due to v-html / v-text

        if (isDef(parent)) {
          nodeOps.removeChild(parent, el)
        }
      }

      function isUnknownElement$$1(vnode, inVPre) {
        return !inVPre && !vnode.ns && !(config.ignoredElements.length && config.ignoredElements.some(ignore => {
          return isRegExp(ignore) ? ignore.test(vnode.tag) : ignore === vnode.tag
        })) && config.isUnknownElement(vnode.tag)
      }

      let creatingElmInVPre = 0

      function createElm(vnode, insertedVnodeQueue, parentElm, refElm, nested, ownerArray, index) {
        if (isDef(vnode.elm) && isDef(ownerArray)) {
          // This vnode was used in a previous render!
          // now it's used as a new node, overwriting its elm would cause
          // potential patch errors down the road when it's used as an insertion
          // reference node. Instead, we clone the node on-demand before creating
          // associated DOM element for it.
          vnode = ownerArray[index] = cloneVNode(vnode)
        }

        vnode.isRootInsert = !nested // for transition enter check

        if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
          return
        }

        const { data } = vnode
        const { children } = vnode
        const { tag } = vnode

        if (isDef(tag)) {
          if ('development' !== 'production') {
            if (data && data.pre) {
              creatingElmInVPre++
            }

            if (isUnknownElement$$1(vnode, creatingElmInVPre)) {
              warn(`Unknown custom element: <${tag}> - did you ` + 'register the component correctly? For recursive components, ' + 'make sure to provide the "name" option.', vnode.context)
            }
          }

          vnode.elm = vnode.ns ? nodeOps.createElementNS(vnode.ns, tag) : nodeOps.createElement(tag, vnode)
          setScope(vnode)
          /* istanbul ignore if */

          {
            createChildren(vnode, children, insertedVnodeQueue)

            if (isDef(data)) {
              invokeCreateHooks(vnode, insertedVnodeQueue)
            }

            insert(parentElm, vnode.elm, refElm)
          }

          if ('development' !== 'production' && data && data.pre) {
            creatingElmInVPre--
          }
        } else if (isTrue(vnode.isComment)) {
          vnode.elm = nodeOps.createComment(vnode.text)
          insert(parentElm, vnode.elm, refElm)
        } else {
          vnode.elm = nodeOps.createTextNode(vnode.text)
          insert(parentElm, vnode.elm, refElm)
        }
      }

      function createComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
        let i = vnode.data

        if (isDef(i)) {
          const isReactivated = isDef(vnode.componentInstance) && i.keepAlive

          if (isDef(i = i.hook) && isDef(i = i.init)) {
            i(vnode, false,
            /* hydrating */
            )
          } // after calling the init hook, if the vnode is a child component
          // it should've created a child instance and mounted it. the child
          // component also has set the placeholder vnode's elm.
          // in that case we can just return the element and be done.

          if (isDef(vnode.componentInstance)) {
            initComponent(vnode, insertedVnodeQueue)
            insert(parentElm, vnode.elm, refElm)

            if (isTrue(isReactivated)) {
              reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm)
            }

            return true
          }
        }
      }

      function initComponent(vnode, insertedVnodeQueue) {
        if (isDef(vnode.data.pendingInsert)) {
          insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert)
          vnode.data.pendingInsert = null
        }

        vnode.elm = vnode.componentInstance.$el

        if (isPatchable(vnode)) {
          invokeCreateHooks(vnode, insertedVnodeQueue)
          setScope(vnode)
        } else {
          // empty component root.
          // skip all element-related modules except for ref (#3455)
          registerRef(vnode) // make sure to invoke the insert hook

          insertedVnodeQueue.push(vnode)
        }
      }

      function reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
        let i // hack for #4339: a reactivated component with inner transition
        // does not trigger because the inner node's created hooks are not called
        // again. It's not ideal to involve module-specific logic in here but
        // there doesn't seem to be a better way to do it.

        let innerNode = vnode

        while (innerNode.componentInstance) {
          innerNode = innerNode.componentInstance._vnode

          if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
            for (i = 0; i < cbs.activate.length; ++i) {
              cbs.activate[i](emptyNode, innerNode)
            }

            insertedVnodeQueue.push(innerNode)
            break
          }
        } // unlike a newly created component,
        // a reactivated keep-alive component doesn't insert itself

        insert(parentElm, vnode.elm, refElm)
      }

      function insert(parent, elm, ref$$1) {
        if (isDef(parent)) {
          if (isDef(ref$$1)) {
            if (nodeOps.parentNode(ref$$1) === parent) {
              nodeOps.insertBefore(parent, elm, ref$$1)
            }
          } else {
            nodeOps.appendChild(parent, elm)
          }
        }
      }

      function createChildren(vnode, children, insertedVnodeQueue) {
        if (Array.isArray(children)) {
          if ('development' !== 'production') {
            checkDuplicateKeys(children)
          }

          for (let i = 0; i < children.length; ++i) {
            createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i)
          }
        } else if (isPrimitive(vnode.text)) {
          nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)))
        }
      }

      function isPatchable(vnode) {
        while (vnode.componentInstance) {
          vnode = vnode.componentInstance._vnode
        }

        return isDef(vnode.tag)
      }

      function invokeCreateHooks(vnode, insertedVnodeQueue) {
        for (let i$1 = 0; i$1 < cbs.create.length; ++i$1) {
          cbs.create[i$1](emptyNode, vnode)
        }

        i = vnode.data.hook // Reuse variable

        if (isDef(i)) {
          if (isDef(i.create)) {
            i.create(emptyNode, vnode)
          }

          if (isDef(i.insert)) {
            insertedVnodeQueue.push(vnode)
          }
        }
      } // set scope id attribute for scoped CSS.
      // this is implemented as a special case to avoid the overhead
      // of going through the normal attribute patching process.

      function setScope(vnode) {
        let i

        if (isDef(i = vnode.fnScopeId)) {
          nodeOps.setStyleScope(vnode.elm, i)
        } else {
          let ancestor = vnode

          while (ancestor) {
            if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
              nodeOps.setStyleScope(vnode.elm, i)
            }

            ancestor = ancestor.parent
          }
        } // for slot content they should also get the scopeId from the host instance.

        if (isDef(i = activeInstance) && i !== vnode.context && i !== vnode.fnContext && isDef(i = i.$options._scopeId)) {
          nodeOps.setStyleScope(vnode.elm, i)
        }
      }

      function addVnodes(parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
        for (; startIdx <= endIdx; ++startIdx) {
          createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx)
        }
      }

      function invokeDestroyHook(vnode) {
        let i; let
          j
        const { data } = vnode

        if (isDef(data)) {
          if (isDef(i = data.hook) && isDef(i = i.destroy)) {
            i(vnode)
          }

          for (i = 0; i < cbs.destroy.length; ++i) {
            cbs.destroy[i](vnode)
          }
        }

        if (isDef(i = vnode.children)) {
          for (j = 0; j < vnode.children.length; ++j) {
            invokeDestroyHook(vnode.children[j])
          }
        }
      }

      function removeVnodes(vnodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
          const ch = vnodes[startIdx]

          if (isDef(ch)) {
            if (isDef(ch.tag)) {
              removeAndInvokeRemoveHook(ch)
              invokeDestroyHook(ch)
            } else {
              // Text node
              removeNode(ch.elm)
            }
          }
        }
      }

      function removeAndInvokeRemoveHook(vnode, rm) {
        if (isDef(rm) || isDef(vnode.data)) {
          let i
          const listeners = cbs.remove.length + 1

          if (isDef(rm)) {
            // we have a recursively passed down rm callback
            // increase the listeners count
            rm.listeners += listeners
          } else {
            // directly removing
            rm = createRmCb(vnode.elm, listeners)
          } // recursively invoke hooks on child component root node

          if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
            removeAndInvokeRemoveHook(i, rm)
          }

          for (i = 0; i < cbs.remove.length; ++i) {
            cbs.remove[i](vnode, rm)
          }

          if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
            i(vnode, rm)
          } else {
            rm()
          }
        } else {
          removeNode(vnode.elm)
        }
      }

      function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
        let oldStartIdx = 0
        let newStartIdx = 0
        let oldEndIdx = oldCh.length - 1
        let oldStartVnode = oldCh[0]
        let oldEndVnode = oldCh[oldEndIdx]
        let newEndIdx = newCh.length - 1
        let newStartVnode = newCh[0]
        let newEndVnode = newCh[newEndIdx]
        let oldKeyToIdx; let idxInOld; let vnodeToMove; let
          refElm // removeOnly is a special flag used only by <transition-group>
        // to ensure removed elements stay in correct relative positions
        // during leaving transitions

        const canMove = !removeOnly

        if ('development' !== 'production') {
          checkDuplicateKeys(newCh)
        }

        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
          if (isUndef(oldStartVnode)) {
            oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
          } else if (isUndef(oldEndVnode)) {
            oldEndVnode = oldCh[--oldEndIdx]
          } else if (sameVnode(oldStartVnode, newStartVnode)) {
            patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            oldStartVnode = oldCh[++oldStartIdx]
            newStartVnode = newCh[++newStartIdx]
          } else if (sameVnode(oldEndVnode, newEndVnode)) {
            patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
            oldEndVnode = oldCh[--oldEndIdx]
            newEndVnode = newCh[--newEndIdx]
          } else if (sameVnode(oldStartVnode, newEndVnode)) {
            // Vnode moved right
            patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
            canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
            oldStartVnode = oldCh[++oldStartIdx]
            newEndVnode = newCh[--newEndIdx]
          } else if (sameVnode(oldEndVnode, newStartVnode)) {
            // Vnode moved left
            patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
            oldEndVnode = oldCh[--oldEndIdx]
            newStartVnode = newCh[++newStartIdx]
          } else {
            if (isUndef(oldKeyToIdx)) {
              oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
            }

            idxInOld = isDef(newStartVnode.key) ? oldKeyToIdx[newStartVnode.key] : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)

            if (isUndef(idxInOld)) {
              // New element
              createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
            } else {
              vnodeToMove = oldCh[idxInOld]

              if (sameVnode(vnodeToMove, newStartVnode)) {
                patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
                oldCh[idxInOld] = undefined
                canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
              } else {
                // same key but different element. treat as new element
                createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
              }
            }

            newStartVnode = newCh[++newStartIdx]
          }
        }

        if (oldStartIdx > oldEndIdx) {
          refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
          addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
        } else if (newStartIdx > newEndIdx) {
          removeVnodes(oldCh, oldStartIdx, oldEndIdx)
        }
      }

      function checkDuplicateKeys(children) {
        const seenKeys = {}

        for (let i = 0; i < children.length; i++) {
          const vnode = children[i]
          const { key } = vnode

          if (isDef(key)) {
            if (seenKeys[key]) {
              warn(`Duplicate keys detected: '${key}'. This may cause an update error.`, vnode.context)
            } else {
              seenKeys[key] = true
            }
          }
        }
      }

      function findIdxInOld(node, oldCh, start, end) {
        for (let i = start; i < end; i++) {
          const c = oldCh[i]

          if (isDef(c) && sameVnode(node, c)) {
            return i
          }
        }
      }

      function patchVnode(oldVnode, vnode, insertedVnodeQueue, ownerArray, index, removeOnly) {
        if (oldVnode === vnode) {
          return
        }

        if (isDef(vnode.elm) && isDef(ownerArray)) {
          // clone reused vnode
          vnode = ownerArray[index] = cloneVNode(vnode)
        }

        const elm = vnode.elm = oldVnode.elm

        if (isTrue(oldVnode.isAsyncPlaceholder)) {
          if (isDef(vnode.asyncFactory.resolved)) {
            hydrate(oldVnode.elm, vnode, insertedVnodeQueue)
          } else {
            vnode.isAsyncPlaceholder = true
          }

          return
        } // reuse element for static trees.
        // note we only do this if the vnode is cloned -
        // if the new node is not cloned it means the render functions have been
        // reset by the hot-reload-api and we need to do a proper re-render.

        if (isTrue(vnode.isStatic) && isTrue(oldVnode.isStatic) && vnode.key === oldVnode.key && (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))) {
          vnode.componentInstance = oldVnode.componentInstance
          return
        }

        let i
        const { data } = vnode

        if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
          i(oldVnode, vnode)
        }

        const oldCh = oldVnode.children
        const ch = vnode.children

        if (isDef(data) && isPatchable(vnode)) {
          for (i = 0; i < cbs.update.length; ++i) {
            cbs.update[i](oldVnode, vnode)
          }

          if (isDef(i = data.hook) && isDef(i = i.update)) {
            i(oldVnode, vnode)
          }
        }

        if (isUndef(vnode.text)) {
          if (isDef(oldCh) && isDef(ch)) {
            if (oldCh !== ch) {
              updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
            }
          } else if (isDef(ch)) {
            if ('development' !== 'production') {
              checkDuplicateKeys(ch)
            }

            if (isDef(oldVnode.text)) {
              nodeOps.setTextContent(elm, '')
            }

            addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
          } else if (isDef(oldCh)) {
            removeVnodes(oldCh, 0, oldCh.length - 1)
          } else if (isDef(oldVnode.text)) {
            nodeOps.setTextContent(elm, '')
          }
        } else if (oldVnode.text !== vnode.text) {
          nodeOps.setTextContent(elm, vnode.text)
        }

        if (isDef(data)) {
          if (isDef(i = data.hook) && isDef(i = i.postpatch)) {
            i(oldVnode, vnode)
          }
        }
      }

      function invokeInsertHook(vnode, queue, initial) {
        // delay insert hooks for component root nodes, invoke them after the
        // element is really inserted
        if (isTrue(initial) && isDef(vnode.parent)) {
          vnode.parent.data.pendingInsert = queue
        } else {
          for (let i = 0; i < queue.length; ++i) {
            queue[i].data.hook.insert(queue[i])
          }
        }
      }

      let hydrationBailed = false // list of modules that can skip create hook during hydration because they
      // are already rendered on the client or has no need for initialization
      // Note: style is excluded because it relies on initial clone for future
      // deep updates (#7063).

      const isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key') // Note: this is a browser-only function so we can assume elms are DOM nodes.

      function hydrate(elm, vnode, insertedVnodeQueue, inVPre) {
        let i
        const { tag } = vnode
        const { data } = vnode
        const { children } = vnode
        inVPre = inVPre || data && data.pre
        vnode.elm = elm

        if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
          vnode.isAsyncPlaceholder = true
          return true
        } // assert node match

        if ('development' !== 'production') {
          if (!assertNodeMatch(elm, vnode, inVPre)) {
            return false
          }
        }

        if (isDef(data)) {
          if (isDef(i = data.hook) && isDef(i = i.init)) {
            i(vnode, true,
            /* hydrating */
            )
          }

          if (isDef(i = vnode.componentInstance)) {
            // child component. it should have hydrated its own tree.
            initComponent(vnode, insertedVnodeQueue)
            return true
          }
        }

        if (isDef(tag)) {
          if (isDef(children)) {
            // empty element, allow client to pick up and populate children
            if (!elm.hasChildNodes()) {
              createChildren(vnode, children, insertedVnodeQueue)
            } else {
              // v-html and domProps: innerHTML
              if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
                if (i !== elm.innerHTML) {
                  /* istanbul ignore if */
                  if ('development' !== 'production' && typeof console !== 'undefined' && !hydrationBailed) {
                    hydrationBailed = true
                    console.warn('Parent: ', elm)
                    console.warn('server innerHTML: ', i)
                    console.warn('client innerHTML: ', elm.innerHTML)
                  }

                  return false
                }
              } else {
                // iterate and compare children lists
                let childrenMatch = true
                let childNode = elm.firstChild

                for (let i$1 = 0; i$1 < children.length; i$1++) {
                  if (!childNode || !hydrate(childNode, children[i$1], insertedVnodeQueue, inVPre)) {
                    childrenMatch = false
                    break
                  }

                  childNode = childNode.nextSibling
                } // if childNode is not null, it means the actual childNodes list is
                // longer than the virtual children list.

                if (!childrenMatch || childNode) {
                  /* istanbul ignore if */
                  if ('development' !== 'production' && typeof console !== 'undefined' && !hydrationBailed) {
                    hydrationBailed = true
                    console.warn('Parent: ', elm)
                    console.warn('Mismatching childNodes vs. VNodes: ', elm.childNodes, children)
                  }

                  return false
                }
              }
            }
          }

          if (isDef(data)) {
            let fullInvoke = false

            for (const key in data) {
              if (!isRenderedModule(key)) {
                fullInvoke = true
                invokeCreateHooks(vnode, insertedVnodeQueue)
                break
              }
            }

            if (!fullInvoke && data.class) {
              // ensure collecting deps for deep class bindings for future updates
              traverse(data.class)
            }
          }
        } else if (elm.data !== vnode.text) {
          elm.data = vnode.text
        }

        return true
      }

      function assertNodeMatch(node, vnode, inVPre) {
        if (isDef(vnode.tag)) {
          return vnode.tag.indexOf('vue-component') === 0 || !isUnknownElement$$1(vnode, inVPre) && vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase())
        }
        return node.nodeType === (vnode.isComment ? 8 : 3)

      }

      return function patch(oldVnode, vnode, hydrating, removeOnly) {
        if (isUndef(vnode)) {
          if (isDef(oldVnode)) {
            invokeDestroyHook(oldVnode)
          }

          return
        }

        let isInitialPatch = false
        const insertedVnodeQueue = []

        if (isUndef(oldVnode)) {
          // empty mount (likely as component), create new root element
          isInitialPatch = true
          createElm(vnode, insertedVnodeQueue)
        } else {
          const isRealElement = isDef(oldVnode.nodeType)

          if (!isRealElement && sameVnode(oldVnode, vnode)) {
            // patch existing root node
            patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
          } else {
            if (isRealElement) {
              // mounting to a real element
              // check if this is server-rendered content and if we can perform
              // a successful hydration.
              if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
                oldVnode.removeAttribute(SSR_ATTR)
                hydrating = true
              }

              if (isTrue(hydrating)) {
                if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
                  invokeInsertHook(vnode, insertedVnodeQueue, true)
                  return oldVnode
                } if ('development' !== 'production') {
                  warn('The client-side rendered virtual DOM tree is not matching ' + 'server-rendered content. This is likely caused by incorrect ' + 'HTML markup, for example nesting block-level elements inside ' + '<p>, or missing <tbody>. Bailing hydration and performing ' + 'full client-side render.')
                }
              } // either not server-rendered, or hydration failed.
              // create an empty node and replace it

              oldVnode = emptyNodeAt(oldVnode)
            } // replacing existing element

            const oldElm = oldVnode.elm
            const parentElm = nodeOps.parentNode(oldElm) // create new node

            createElm(vnode, insertedVnodeQueue, // extremely rare edge case: do not insert if old element is in a
            // leaving transition. Only happens when combining transition +
            // keep-alive + HOCs. (#4590)
              oldElm._leaveCb ? null : parentElm, nodeOps.nextSibling(oldElm)) // update parent placeholder node element, recursively

            if (isDef(vnode.parent)) {
              let ancestor = vnode.parent
              const patchable = isPatchable(vnode)

              while (ancestor) {
                for (let i = 0; i < cbs.destroy.length; ++i) {
                  cbs.destroy[i](ancestor)
                }

                ancestor.elm = vnode.elm

                if (patchable) {
                  for (let i$1 = 0; i$1 < cbs.create.length; ++i$1) {
                    cbs.create[i$1](emptyNode, ancestor)
                  } // #6513
                  // invoke insert hooks that may have been merged by create hooks.
                  // e.g. for directives that uses the "inserted" hook.

                  const { insert } = ancestor.data.hook

                  if (insert.merged) {
                    // start at index 1 to avoid re-invoking component mounted hook
                    for (let i$2 = 1; i$2 < insert.fns.length; i$2++) {
                      insert.fns[i$2]()
                    }
                  }
                } else {
                  registerRef(ancestor)
                }

                ancestor = ancestor.parent
              }
            } // destroy old node

            if (isDef(parentElm)) {
              removeVnodes([oldVnode], 0, 0)
            } else if (isDef(oldVnode.tag)) {
              invokeDestroyHook(oldVnode)
            }
          }
        }

        invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
        return vnode.elm
      }
    }
    /*  */

    const directives = {
      create: updateDirectives,
      update: updateDirectives,
      destroy: function unbindDirectives(vnode) {
        updateDirectives(vnode, emptyNode)
      },
    }

    function updateDirectives(oldVnode, vnode) {
      if (oldVnode.data.directives || vnode.data.directives) {
        _update(oldVnode, vnode)
      }
    }

    function _update(oldVnode, vnode) {
      const isCreate = oldVnode === emptyNode
      const isDestroy = vnode === emptyNode
      const oldDirs = normalizeDirectives$1(oldVnode.data.directives, oldVnode.context)
      const newDirs = normalizeDirectives$1(vnode.data.directives, vnode.context)
      const dirsWithInsert = []
      const dirsWithPostpatch = []
      let key; let oldDir; let
        dir

      for (key in newDirs) {
        oldDir = oldDirs[key]
        dir = newDirs[key]

        if (!oldDir) {
          // new directive, bind
          callHook$1(dir, 'bind', vnode, oldVnode)

          if (dir.def && dir.def.inserted) {
            dirsWithInsert.push(dir)
          }
        } else {
          // existing directive, update
          dir.oldValue = oldDir.value
          dir.oldArg = oldDir.arg
          callHook$1(dir, 'update', vnode, oldVnode)

          if (dir.def && dir.def.componentUpdated) {
            dirsWithPostpatch.push(dir)
          }
        }
      }

      if (dirsWithInsert.length) {
        const callInsert = function () {
          for (let i = 0; i < dirsWithInsert.length; i++) {
            callHook$1(dirsWithInsert[i], 'inserted', vnode, oldVnode)
          }
        }

        if (isCreate) {
          mergeVNodeHook(vnode, 'insert', callInsert)
        } else {
          callInsert()
        }
      }

      if (dirsWithPostpatch.length) {
        mergeVNodeHook(vnode, 'postpatch', () => {
          for (let i = 0; i < dirsWithPostpatch.length; i++) {
            callHook$1(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
          }
        })
      }

      if (!isCreate) {
        for (key in oldDirs) {
          if (!newDirs[key]) {
            // no longer present, unbind
            callHook$1(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
          }
        }
      }
    }

    const emptyModifiers = Object.create(null)

    function normalizeDirectives$1(dirs, vm) {
      const res = Object.create(null)

      if (!dirs) {
        // $flow-disable-line
        return res
      }

      let i; let
        dir

      for (i = 0; i < dirs.length; i++) {
        dir = dirs[i]

        if (!dir.modifiers) {
          // $flow-disable-line
          dir.modifiers = emptyModifiers
        }

        res[getRawDirName(dir)] = dir
        dir.def = resolveAsset(vm.$options, 'directives', dir.name, true)
      } // $flow-disable-line

      return res
    }

    function getRawDirName(dir) {
      return dir.rawName || `${dir.name}.${Object.keys(dir.modifiers || {}).join('.')}`
    }

    function callHook$1(dir, hook, vnode, oldVnode, isDestroy) {
      const fn = dir.def && dir.def[hook]

      if (fn) {
        try {
          fn(vnode.elm, dir, vnode, oldVnode, isDestroy)
        } catch (e) {
          handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`)
        }
      }
    }

    const baseModules = [ref, directives]
    /*  */

    function updateAttrs(oldVnode, vnode) {
      const opts = vnode.componentOptions

      if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
        return
      }

      if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
        return
      }

      let key; let cur; let
        old
      const { elm } = vnode
      const oldAttrs = oldVnode.data.attrs || {}
      let attrs = vnode.data.attrs || {} // clone observed objects, as the user probably wants to mutate it

      if (isDef(attrs.__ob__)) {
        attrs = vnode.data.attrs = extend({}, attrs)
      }

      for (key in attrs) {
        cur = attrs[key]
        old = oldAttrs[key]

        if (old !== cur) {
          setAttr(elm, key, cur)
        }
      } // #4391: in IE9, setting type can reset value for input[type=radio]
      // #6666: IE/Edge forces progress value down to 1 before setting a max

      /* istanbul ignore if */

      if ((isIE || isEdge) && attrs.value !== oldAttrs.value) {
        setAttr(elm, 'value', attrs.value)
      }

      for (key in oldAttrs) {
        if (isUndef(attrs[key])) {
          if (isXlink(key)) {
            elm.removeAttributeNS(xlinkNS, getXlinkProp(key))
          } else if (!isEnumeratedAttr(key)) {
            elm.removeAttribute(key)
          }
        }
      }
    }

    function setAttr(el, key, value) {
      if (el.tagName.indexOf('-') > -1) {
        baseSetAttr(el, key, value)
      } else if (isBooleanAttr(key)) {
        // set attribute for blank value
        // e.g. <option disabled>Select one</option>
        if (isFalsyAttrValue(value)) {
          el.removeAttribute(key)
        } else {
          // technically allowfullscreen is a boolean attribute for <iframe>,
          // but Flash expects a value of "true" when used on <embed> tag
          value = key === 'allowfullscreen' && el.tagName === 'EMBED' ? 'true' : key
          el.setAttribute(key, value)
        }
      } else if (isEnumeratedAttr(key)) {
        el.setAttribute(key, convertEnumeratedValue(key, value))
      } else if (isXlink(key)) {
        if (isFalsyAttrValue(value)) {
          el.removeAttributeNS(xlinkNS, getXlinkProp(key))
        } else {
          el.setAttributeNS(xlinkNS, key, value)
        }
      } else {
        baseSetAttr(el, key, value)
      }
    }

    function baseSetAttr(el, key, value) {
      if (isFalsyAttrValue(value)) {
        el.removeAttribute(key)
      } else {
        // #7138: IE10 & 11 fires input event when setting placeholder on
        // <textarea>... block the first input event and remove the blocker
        // immediately.

        /* istanbul ignore if */
        if (isIE && !isIE9 && el.tagName === 'TEXTAREA' && key === 'placeholder' && value !== '' && !el.__ieph) {
          var blocker = function (e) {
            e.stopImmediatePropagation()
            el.removeEventListener('input', blocker)
          }

          el.addEventListener('input', blocker) // $flow-disable-line

          el.__ieph = true
          /* IE placeholder patched */
        }

        el.setAttribute(key, value)
      }
    }

    const attrs = {
      create: updateAttrs,
      update: updateAttrs,
    }
    /*  */

    function updateClass(oldVnode, vnode) {
      const el = vnode.elm
      const { data } = vnode
      const oldData = oldVnode.data

      if (isUndef(data.staticClass) && isUndef(data.class) && (isUndef(oldData) || isUndef(oldData.staticClass) && isUndef(oldData.class))) {
        return
      }

      let cls = genClassForVnode(vnode) // handle transition classes

      const transitionClass = el._transitionClasses

      if (isDef(transitionClass)) {
        cls = concat(cls, stringifyClass(transitionClass))
      } // set the class

      if (cls !== el._prevClass) {
        el.setAttribute('class', cls)
        el._prevClass = cls
      }
    }

    const klass = {
      create: updateClass,
      update: updateClass,
    }
    /*  */

    /*  */

    /*  */

    /*  */
    // in some cases, the event used has to be determined at runtime
    // so we used some reserved tokens during compile.

    const RANGE_TOKEN = '__r'
    const CHECKBOX_RADIO_TOKEN = '__c'
    /*  */
    // normalize v-model event tokens that can only be determined at runtime.
    // it's important to place the event as the first in the array because
    // the whole point is ensuring the v-model callback gets called before
    // user-attached handlers.

    function normalizeEvents(on) {
      /* istanbul ignore if */
      if (isDef(on[RANGE_TOKEN])) {
        // IE input[type=range] only supports `change` event
        const event = isIE ? 'change' : 'input'
        on[event] = [].concat(on[RANGE_TOKEN], on[event] || [])
        delete on[RANGE_TOKEN]
      } // This was originally intended to fix #4521 but no longer necessary
      // after 2.5. Keeping it for backwards compat with generated code from < 2.4

      /* istanbul ignore if */

      if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
        on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || [])
        delete on[CHECKBOX_RADIO_TOKEN]
      }
    }

    let target$1

    function createOnceHandler$1(event, handler, capture) {
      const _target = target$1 // save current target element in closure

      return function onceHandler() {
        const res = handler.apply(null, arguments)

        if (res !== null) {
          remove$2(event, onceHandler, capture, _target)
        }
      }
    } // #9446: Firefox <= 53 (in particular, ESR 52) has incorrect Event.timeStamp
    // implementation and does not fire microtasks in between event propagation, so
    // safe to exclude.

    const useMicrotaskFix = isUsingMicroTask && !(isFF && Number(isFF[1]) <= 53)

    function add$1(name, handler, capture, passive) {
      // async edge case #6566: inner click event triggers patch, event handler
      // attached to outer element during patch, and triggered again. This
      // happens because browsers fire microtask ticks between event propagation.
      // the solution is simple: we save the timestamp when a handler is attached,
      // and the handler would only fire if the event passed to it was fired
      // AFTER it was attached.
      if (useMicrotaskFix) {
        const attachedTimestamp = currentFlushTimestamp
        const original = handler

        handler = original._wrapper = function (e) {
          if ( // no bubbling, should always fire.
          // this is just a safety net in case event.timeStamp is unreliable in
          // certain weird environments...
            e.target === e.currentTarget // event is fired after handler attachment
      || e.timeStamp >= attachedTimestamp // bail for environments that have buggy event.timeStamp implementations
      // #9462 iOS 9 bug: event.timeStamp is 0 after history.pushState
      // #9681 QtWebEngine event.timeStamp is negative value
      || e.timeStamp <= 0 // #9448 bail if event is fired in another document in a multi-page
      // electron/nw.js app, since event.timeStamp will be using a different
      // starting reference
      || e.target.ownerDocument !== document) {
            return original.apply(this, arguments)
          }
        }
      }

      target$1.addEventListener(name, handler, supportsPassive ? {
        capture,
        passive,
      } : capture)
    }

    function remove$2(name, handler, capture, _target) {
      (_target || target$1).removeEventListener(name, handler._wrapper || handler, capture)
    }

    function updateDOMListeners(oldVnode, vnode) {
      if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
        return
      }

      const on = vnode.data.on || {}
      const oldOn = oldVnode.data.on || {}
      target$1 = vnode.elm
      normalizeEvents(on)
      updateListeners(on, oldOn, add$1, remove$2, createOnceHandler$1, vnode.context)
      target$1 = undefined
    }

    const events = {
      create: updateDOMListeners,
      update: updateDOMListeners,
    }
    /*  */

    let svgContainer

    function updateDOMProps(oldVnode, vnode) {
      if (isUndef(oldVnode.data.domProps) && isUndef(vnode.data.domProps)) {
        return
      }

      let key; let
        cur
      const { elm } = vnode
      const oldProps = oldVnode.data.domProps || {}
      let props = vnode.data.domProps || {} // clone observed objects, as the user probably wants to mutate it

      if (isDef(props.__ob__)) {
        props = vnode.data.domProps = extend({}, props)
      }

      for (key in oldProps) {
        if (!(key in props)) {
          elm[key] = ''
        }
      }

      for (key in props) {
        cur = props[key] // ignore children if the node has textContent or innerHTML,
        // as these will throw away existing DOM nodes and cause removal errors
        // on subsequent patches (#3360)

        if (key === 'textContent' || key === 'innerHTML') {
          if (vnode.children) {
            vnode.children.length = 0
          }

          if (cur === oldProps[key]) {
            continue
          } // #6601 work around Chrome version <= 55 bug where single textNode
          // replaced by innerHTML/textContent retains its parentNode property

          if (elm.childNodes.length === 1) {
            elm.removeChild(elm.childNodes[0])
          }
        }

        if (key === 'value' && elm.tagName !== 'PROGRESS') {
          // store value as _value as well since
          // non-string values will be stringified
          elm._value = cur // avoid resetting cursor position when value is the same

          const strCur = isUndef(cur) ? '' : String(cur)

          if (shouldUpdateValue(elm, strCur)) {
            elm.value = strCur
          }
        } else if (key === 'innerHTML' && isSVG(elm.tagName) && isUndef(elm.innerHTML)) {
          // IE doesn't support innerHTML for SVG elements
          svgContainer = svgContainer || document.createElement('div')
          svgContainer.innerHTML = `<svg>${cur}</svg>`
          const svg = svgContainer.firstChild

          while (elm.firstChild) {
            elm.removeChild(elm.firstChild)
          }

          while (svg.firstChild) {
            elm.appendChild(svg.firstChild)
          }
        } else if ( // skip the update if old and new VDOM state is the same.
        // `value` is handled separately because the DOM value may be temporarily
        // out of sync with VDOM state due to focus, composition and modifiers.
        // This  #4521 by skipping the unnecessary `checked` update.
          cur !== oldProps[key]) {
          // some property updates can throw
          // e.g. `value` on <progress> w/ non-finite value
          try {
            elm[key] = cur
          } catch (e) {}
        }
      }
    } // check platforms/web/util/attrs.js acceptValue

    function shouldUpdateValue(elm, checkVal) {
      return !elm.composing && (elm.tagName === 'OPTION' || isNotInFocusAndDirty(elm, checkVal) || isDirtyWithModifiers(elm, checkVal))
    }

    function isNotInFocusAndDirty(elm, checkVal) {
      // return true when textbox (.number and .trim) loses focus and its value is
      // not equal to the updated value
      let notInFocus = true // #6157
      // work around IE bug when accessing document.activeElement in an iframe

      try {
        notInFocus = document.activeElement !== elm
      } catch (e) {}

      return notInFocus && elm.value !== checkVal
    }

    function isDirtyWithModifiers(elm, newVal) {
      const { value } = elm
      const modifiers = elm._vModifiers // injected by v-model runtime

      if (isDef(modifiers)) {
        if (modifiers.number) {
          return toNumber(value) !== toNumber(newVal)
        }

        if (modifiers.trim) {
          return value.trim() !== newVal.trim()
        }
      }

      return value !== newVal
    }

    const domProps = {
      create: updateDOMProps,
      update: updateDOMProps,
    }
    /*  */

    const parseStyleText = cached(cssText => {
      const res = {}
      const listDelimiter = /;(?![^(]*\))/g
      const propertyDelimiter = /:(.+)/
      cssText.split(listDelimiter).forEach(item => {
        if (item) {
          const tmp = item.split(propertyDelimiter)
          tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim())
        }
      })
      return res
    }) // merge static and dynamic style data on the same vnode

    function normalizeStyleData(data) {
      const style = normalizeStyleBinding(data.style) // static style is pre-processed into an object during compilation
      // and is always a fresh object, so it's safe to merge into it

      return data.staticStyle ? extend(data.staticStyle, style) : style
    } // normalize possible array / string values into Object

    function normalizeStyleBinding(bindingStyle) {
      if (Array.isArray(bindingStyle)) {
        return toObject(bindingStyle)
      }

      if (typeof bindingStyle === 'string') {
        return parseStyleText(bindingStyle)
      }

      return bindingStyle
    }
    /**
 * parent component style should be after child's
 * so that parent component's style could override it
 */

    function getStyle(vnode, checkChild) {
      const res = {}
      let styleData

      if (checkChild) {
        let childNode = vnode

        while (childNode.componentInstance) {
          childNode = childNode.componentInstance._vnode

          if (childNode && childNode.data && (styleData = normalizeStyleData(childNode.data))) {
            extend(res, styleData)
          }
        }
      }

      if (styleData = normalizeStyleData(vnode.data)) {
        extend(res, styleData)
      }

      let parentNode = vnode

      while (parentNode = parentNode.parent) {
        if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
          extend(res, styleData)
        }
      }

      return res
    }
    /*  */

    const cssVarRE = /^--/
    const importantRE = /\s*!important$/

    const setProp = function (el, name, val) {
      /* istanbul ignore if */
      if (cssVarRE.test(name)) {
        el.style.setProperty(name, val)
      } else if (importantRE.test(val)) {
        el.style.setProperty(hyphenate(name), val.replace(importantRE, ''), 'important')
      } else {
        const normalizedName = normalize(name)

        if (Array.isArray(val)) {
          // Support values array created by autoprefixer, e.g.
          // {display: ["-webkit-box", "-ms-flexbox", "flex"]}
          // Set them one by one, and the browser will only set those it can recognize
          for (let i = 0, len = val.length; i < len; i++) {
            el.style[normalizedName] = val[i]
          }
        } else {
          el.style[normalizedName] = val
        }
      }
    }

    const vendorNames = ['Webkit', 'Moz', 'ms']
    let emptyStyle
    var normalize = cached(prop => {
      emptyStyle = emptyStyle || document.createElement('div').style
      prop = camelize(prop)

      if (prop !== 'filter' && prop in emptyStyle) {
        return prop
      }

      const capName = prop.charAt(0).toUpperCase() + prop.slice(1)

      for (let i = 0; i < vendorNames.length; i++) {
        const name = vendorNames[i] + capName

        if (name in emptyStyle) {
          return name
        }
      }
    })

    function updateStyle(oldVnode, vnode) {
      const { data } = vnode
      const oldData = oldVnode.data

      if (isUndef(data.staticStyle) && isUndef(data.style) && isUndef(oldData.staticStyle) && isUndef(oldData.style)) {
        return
      }

      let cur; let
        name
      const el = vnode.elm
      const oldStaticStyle = oldData.staticStyle
      const oldStyleBinding = oldData.normalizedStyle || oldData.style || {} // if static style exists, stylebinding already merged into it when doing normalizeStyleData

      const oldStyle = oldStaticStyle || oldStyleBinding
      const style = normalizeStyleBinding(vnode.data.style) || {} // store normalized style under a different key for next diff
      // make sure to clone it if it's reactive, since the user likely wants
      // to mutate it.

      vnode.data.normalizedStyle = isDef(style.__ob__) ? extend({}, style) : style
      const newStyle = getStyle(vnode, true)

      for (name in oldStyle) {
        if (isUndef(newStyle[name])) {
          setProp(el, name, '')
        }
      }

      for (name in newStyle) {
        cur = newStyle[name]

        if (cur !== oldStyle[name]) {
          // ie9 setting to null has no effect, must use empty string
          setProp(el, name, cur == null ? '' : cur)
        }
      }
    }

    const style = {
      create: updateStyle,
      update: updateStyle,
    }
    /*  */

    const whitespaceRE = /\s+/
    /**
 * Add class with compatibility for SVG since classList is not supported on
 * SVG elements in IE
 */

    function addClass(el, cls) {
      /* istanbul ignore if */
      if (!cls || !(cls = cls.trim())) {
        return
      }
      /* istanbul ignore else */

      if (el.classList) {
        if (cls.indexOf(' ') > -1) {
          cls.split(whitespaceRE).forEach(c => {
            return el.classList.add(c)
          })
        } else {
          el.classList.add(cls)
        }
      } else {
        const cur = ` ${el.getAttribute('class') || ''} `

        if (cur.indexOf(` ${cls} `) < 0) {
          el.setAttribute('class', (cur + cls).trim())
        }
      }
    }
    /**
 * Remove class with compatibility for SVG since classList is not supported on
 * SVG elements in IE
 */

    function removeClass(el, cls) {
      /* istanbul ignore if */
      if (!cls || !(cls = cls.trim())) {
        return
      }
      /* istanbul ignore else */

      if (el.classList) {
        if (cls.indexOf(' ') > -1) {
          cls.split(whitespaceRE).forEach(c => {
            return el.classList.remove(c)
          })
        } else {
          el.classList.remove(cls)
        }

        if (!el.classList.length) {
          el.removeAttribute('class')
        }
      } else {
        let cur = ` ${el.getAttribute('class') || ''} `
        const tar = ` ${cls} `

        while (cur.indexOf(tar) >= 0) {
          cur = cur.replace(tar, ' ')
        }

        cur = cur.trim()

        if (cur) {
          el.setAttribute('class', cur)
        } else {
          el.removeAttribute('class')
        }
      }
    }
    /*  */

    function resolveTransition(def$$1) {
      if (!def$$1) {
        return
      }
      /* istanbul ignore else */

      if (typeof def$$1 === 'object') {
        const res = {}

        if (def$$1.css !== false) {
          extend(res, autoCssTransition(def$$1.name || 'v'))
        }

        extend(res, def$$1)
        return res
      } if (typeof def$$1 === 'string') {
        return autoCssTransition(def$$1)
      }
    }

    var autoCssTransition = cached(name => {
      return {
        enterClass: `${name}-enter`,
        enterToClass: `${name}-enter-to`,
        enterActiveClass: `${name}-enter-active`,
        leaveClass: `${name}-leave`,
        leaveToClass: `${name}-leave-to`,
        leaveActiveClass: `${name}-leave-active`,
      }
    })
    const hasTransition = inBrowser && !isIE9
    const TRANSITION = 'transition'
    const ANIMATION = 'animation' // Transition property/event sniffing

    let transitionProp = 'transition'
    let transitionEndEvent = 'transitionend'
    let animationProp = 'animation'
    let animationEndEvent = 'animationend'

    if (hasTransition) {
      /* istanbul ignore if */
      if (window.ontransitionend === undefined && window.onwebkittransitionend !== undefined) {
        transitionProp = 'WebkitTransition'
        transitionEndEvent = 'webkitTransitionEnd'
      }

      if (window.onanimationend === undefined && window.onwebkitanimationend !== undefined) {
        animationProp = 'WebkitAnimation'
        animationEndEvent = 'webkitAnimationEnd'
      }
    } // binding to window is necessary to make hot reload work in IE in strict mode

    const raf = inBrowser ? window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : setTimeout
    /* istanbul ignore next */
      : function (fn) {
        return fn()
      }

    function nextFrame(fn) {
      raf(() => {
        raf(fn)
      })
    }

    function addTransitionClass(el, cls) {
      const transitionClasses = el._transitionClasses || (el._transitionClasses = [])

      if (transitionClasses.indexOf(cls) < 0) {
        transitionClasses.push(cls)
        addClass(el, cls)
      }
    }

    function removeTransitionClass(el, cls) {
      if (el._transitionClasses) {
        remove(el._transitionClasses, cls)
      }

      removeClass(el, cls)
    }

    function whenTransitionEnds(el, expectedType, cb) {
      const ref = getTransitionInfo(el, expectedType)
      const { type } = ref
      const { timeout } = ref
      const { propCount } = ref

      if (!type) {
        return cb()
      }

      const event = type === TRANSITION ? transitionEndEvent : animationEndEvent
      let ended = 0

      const end = function () {
        el.removeEventListener(event, onEnd)
        cb()
      }

      var onEnd = function (e) {
        if (e.target === el) {
          if (++ended >= propCount) {
            end()
          }
        }
      }

      setTimeout(() => {
        if (ended < propCount) {
          end()
        }
      }, timeout + 1)
      el.addEventListener(event, onEnd)
    }

    const transformRE = /\b(transform|all)(,|$)/

    function getTransitionInfo(el, expectedType) {
      const styles = window.getComputedStyle(el) // JSDOM may return undefined for transition properties

      const transitionDelays = (styles[`${transitionProp}Delay`] || '').split(', ')
      const transitionDurations = (styles[`${transitionProp}Duration`] || '').split(', ')
      const transitionTimeout = getTimeout(transitionDelays, transitionDurations)
      const animationDelays = (styles[`${animationProp}Delay`] || '').split(', ')
      const animationDurations = (styles[`${animationProp}Duration`] || '').split(', ')
      const animationTimeout = getTimeout(animationDelays, animationDurations)
      let type
      let timeout = 0
      let propCount = 0
      /* istanbul ignore if */

      if (expectedType === TRANSITION) {
        if (transitionTimeout > 0) {
          type = TRANSITION
          timeout = transitionTimeout
          propCount = transitionDurations.length
        }
      } else if (expectedType === ANIMATION) {
        if (animationTimeout > 0) {
          type = ANIMATION
          timeout = animationTimeout
          propCount = animationDurations.length
        }
      } else {
        timeout = Math.max(transitionTimeout, animationTimeout)
        type = timeout > 0 ? transitionTimeout > animationTimeout ? TRANSITION : ANIMATION : null
        propCount = type ? type === TRANSITION ? transitionDurations.length : animationDurations.length : 0
      }

      const hasTransform = type === TRANSITION && transformRE.test(styles[`${transitionProp}Property`])
      return {
        type,
        timeout,
        propCount,
        hasTransform,
      }
    }

    function getTimeout(delays, durations) {
      /* istanbul ignore next */
      while (delays.length < durations.length) {
        delays = delays.concat(delays)
      }

      return Math.max.apply(null, durations.map((d, i) => {
        return toMs(d) + toMs(delays[i])
      }))
    } // Old versions of Chromium (below 61.0.3163.100) formats floating pointer numbers
    // in a locale-dependent way, using a comma instead of a dot.
    // If comma is not replaced with a dot, the input will be rounded down (i.e. acting
    // as a floor function) causing unexpected behaviors

    function toMs(s) {
      return Number(s.slice(0, -1).replace(',', '.')) * 1000
    }
    /*  */

    function enter(vnode, toggleDisplay) {
      const el = vnode.elm // call leave callback now

      if (isDef(el._leaveCb)) {
        el._leaveCb.cancelled = true

        el._leaveCb()
      }

      const data = resolveTransition(vnode.data.transition)

      if (isUndef(data)) {
        return
      }
      /* istanbul ignore if */

      if (isDef(el._enterCb) || el.nodeType !== 1) {
        return
      }

      const { css } = data
      const { type } = data
      const { enterClass } = data
      const { enterToClass } = data
      const { enterActiveClass } = data
      const { appearClass } = data
      const { appearToClass } = data
      const { appearActiveClass } = data
      const { beforeEnter } = data
      const { enter } = data
      const { afterEnter } = data
      const { enterCancelled } = data
      const { beforeAppear } = data
      const { appear } = data
      const { afterAppear } = data
      const { appearCancelled } = data
      const { duration } = data // activeInstance will always be the <transition> component managing this
      // transition. One edge case to check is when the <transition> is placed
      // as the root node of a child component. In that case we need to check
      // <transition>'s parent for appear check.

      let context = activeInstance
      let transitionNode = activeInstance.$vnode

      while (transitionNode && transitionNode.parent) {
        context = transitionNode.context
        transitionNode = transitionNode.parent
      }

      const isAppear = !context._isMounted || !vnode.isRootInsert

      if (isAppear && !appear && appear !== '') {
        return
      }

      const startClass = isAppear && appearClass ? appearClass : enterClass
      const activeClass = isAppear && appearActiveClass ? appearActiveClass : enterActiveClass
      const toClass = isAppear && appearToClass ? appearToClass : enterToClass
      const beforeEnterHook = isAppear ? beforeAppear || beforeEnter : beforeEnter
      const enterHook = isAppear ? typeof appear === 'function' ? appear : enter : enter
      const afterEnterHook = isAppear ? afterAppear || afterEnter : afterEnter
      const enterCancelledHook = isAppear ? appearCancelled || enterCancelled : enterCancelled
      const explicitEnterDuration = toNumber(isObject(duration) ? duration.enter : duration)

      if ('development' !== 'production' && explicitEnterDuration != null) {
        checkDuration(explicitEnterDuration, 'enter', vnode)
      }

      const expectsCSS = css !== false && !isIE9
      const userWantsControl = getHookArgumentsLength(enterHook)
      var cb = el._enterCb = once(() => {
        if (expectsCSS) {
          removeTransitionClass(el, toClass)
          removeTransitionClass(el, activeClass)
        }

        if (cb.cancelled) {
          if (expectsCSS) {
            removeTransitionClass(el, startClass)
          }

          enterCancelledHook && enterCancelledHook(el)
        } else {
          afterEnterHook && afterEnterHook(el)
        }

        el._enterCb = null
      })

      if (!vnode.data.show) {
        // remove pending leave element on enter by injecting an insert hook
        mergeVNodeHook(vnode, 'insert', () => {
          const parent = el.parentNode
          const pendingNode = parent && parent._pending && parent._pending[vnode.key]

          if (pendingNode && pendingNode.tag === vnode.tag && pendingNode.elm._leaveCb) {
            pendingNode.elm._leaveCb()
          }

          enterHook && enterHook(el, cb)
        })
      } // start enter transition

      beforeEnterHook && beforeEnterHook(el)

      if (expectsCSS) {
        addTransitionClass(el, startClass)
        addTransitionClass(el, activeClass)
        nextFrame(() => {
          removeTransitionClass(el, startClass)

          if (!cb.cancelled) {
            addTransitionClass(el, toClass)

            if (!userWantsControl) {
              if (isValidDuration(explicitEnterDuration)) {
                setTimeout(cb, explicitEnterDuration)
              } else {
                whenTransitionEnds(el, type, cb)
              }
            }
          }
        })
      }

      if (vnode.data.show) {
        toggleDisplay && toggleDisplay()
        enterHook && enterHook(el, cb)
      }

      if (!expectsCSS && !userWantsControl) {
        cb()
      }
    }

    function leave(vnode, rm) {
      const el = vnode.elm // call enter callback now

      if (isDef(el._enterCb)) {
        el._enterCb.cancelled = true

        el._enterCb()
      }

      const data = resolveTransition(vnode.data.transition)

      if (isUndef(data) || el.nodeType !== 1) {
        return rm()
      }
      /* istanbul ignore if */

      if (isDef(el._leaveCb)) {
        return
      }

      const { css } = data
      const { type } = data
      const { leaveClass } = data
      const { leaveToClass } = data
      const { leaveActiveClass } = data
      const { beforeLeave } = data
      const { leave } = data
      const { afterLeave } = data
      const { leaveCancelled } = data
      const { delayLeave } = data
      const { duration } = data
      const expectsCSS = css !== false && !isIE9
      const userWantsControl = getHookArgumentsLength(leave)
      const explicitLeaveDuration = toNumber(isObject(duration) ? duration.leave : duration)

      if ('development' !== 'production' && isDef(explicitLeaveDuration)) {
        checkDuration(explicitLeaveDuration, 'leave', vnode)
      }

      var cb = el._leaveCb = once(() => {
        if (el.parentNode && el.parentNode._pending) {
          el.parentNode._pending[vnode.key] = null
        }

        if (expectsCSS) {
          removeTransitionClass(el, leaveToClass)
          removeTransitionClass(el, leaveActiveClass)
        }

        if (cb.cancelled) {
          if (expectsCSS) {
            removeTransitionClass(el, leaveClass)
          }

          leaveCancelled && leaveCancelled(el)
        } else {
          rm()
          afterLeave && afterLeave(el)
        }

        el._leaveCb = null
      })

      if (delayLeave) {
        delayLeave(performLeave)
      } else {
        performLeave()
      }

      function performLeave() {
        // the delayed leave may have already been cancelled
        if (cb.cancelled) {
          return
        } // record leaving element

        if (!vnode.data.show && el.parentNode) {
          (el.parentNode._pending || (el.parentNode._pending = {}))[vnode.key] = vnode
        }

        beforeLeave && beforeLeave(el)

        if (expectsCSS) {
          addTransitionClass(el, leaveClass)
          addTransitionClass(el, leaveActiveClass)
          nextFrame(() => {
            removeTransitionClass(el, leaveClass)

            if (!cb.cancelled) {
              addTransitionClass(el, leaveToClass)

              if (!userWantsControl) {
                if (isValidDuration(explicitLeaveDuration)) {
                  setTimeout(cb, explicitLeaveDuration)
                } else {
                  whenTransitionEnds(el, type, cb)
                }
              }
            }
          })
        }

        leave && leave(el, cb)

        if (!expectsCSS && !userWantsControl) {
          cb()
        }
      }
    } // only used in dev mode

    function checkDuration(val, name, vnode) {
      if (typeof val !== 'number') {
        warn(`<transition> explicit ${name} duration is not a valid number - ` + `got ${JSON.stringify(val)}.`, vnode.context)
      } else if (isNaN(val)) {
        warn(`<transition> explicit ${name} duration is NaN - ` + 'the duration expression might be incorrect.', vnode.context)
      }
    }

    function isValidDuration(val) {
      return typeof val === 'number' && !isNaN(val)
    }
    /**
 * Normalize a transition hook's argument length. The hook may be:
 * - a merged hook (invoker) with the original in .fns
 * - a wrapped component method (check ._length)
 * - a plain function (.length)
 */

    function getHookArgumentsLength(fn) {
      if (isUndef(fn)) {
        return false
      }

      const invokerFns = fn.fns

      if (isDef(invokerFns)) {
        // invoker
        return getHookArgumentsLength(Array.isArray(invokerFns) ? invokerFns[0] : invokerFns)
      }
      return (fn._length || fn.length) > 1

    }

    function _enter(_, vnode) {
      if (vnode.data.show !== true) {
        enter(vnode)
      }
    }

    const transition = inBrowser ? {
      create: _enter,
      activate: _enter,
      remove: function remove$$1(vnode, rm) {
        /* istanbul ignore else */
        if (vnode.data.show !== true) {
          leave(vnode, rm)
        } else {
          rm()
        }
      },
    } : {}
    const platformModules = [attrs, klass, events, domProps, style, transition]
    /*  */
    // the directive module should be applied last, after all
    // built-in modules have been applied.

    const modules = platformModules.concat(baseModules)
    const patch = createPatchFunction({
      nodeOps,
      modules,
    })
    /**
 * Not type checking this file because flow doesn't like attaching
 * properties to Elements.
 */

    /* istanbul ignore if */

    if (isIE9) {
      // http://www.matts411.com/post/internet-explorer-9-oninput/
      document.addEventListener('selectionchange', () => {
        const el = document.activeElement

        if (el && el.vmodel) {
          trigger(el, 'input')
        }
      })
    }

    var directive = {
      inserted: function inserted(el, binding, vnode, oldVnode) {
        if (vnode.tag === 'select') {
          // #6903
          if (oldVnode.elm && !oldVnode.elm._vOptions) {
            mergeVNodeHook(vnode, 'postpatch', () => {
              directive.componentUpdated(el, binding, vnode)
            })
          } else {
            setSelected(el, binding, vnode.context)
          }

          el._vOptions = [].map.call(el.options, getValue)
        } else if (vnode.tag === 'textarea' || isTextInputType(el.type)) {
          el._vModifiers = binding.modifiers

          if (!binding.modifiers.lazy) {
            el.addEventListener('compositionstart', onCompositionStart)
            el.addEventListener('compositionend', onCompositionEnd) // Safari < 10.2 & UIWebView doesn't fire compositionend when
            // switching focus before confirming composition choice
            // this also fixes the issue where some browsers e.g. iOS Chrome
            // fires "change" instead of "input" on autocomplete.

            el.addEventListener('change', onCompositionEnd)
            /* istanbul ignore if */

            if (isIE9) {
              el.vmodel = true
            }
          }
        }
      },
      componentUpdated: function componentUpdated(el, binding, vnode) {
        if (vnode.tag === 'select') {
          setSelected(el, binding, vnode.context) // in case the options rendered by v-for have changed,
          // it's possible that the value is out-of-sync with the rendered options.
          // detect such cases and filter out values that no longer has a matching
          // option in the DOM.

          const prevOptions = el._vOptions
          const curOptions = el._vOptions = [].map.call(el.options, getValue)

          if (curOptions.some((o, i) => {
            return !looseEqual(o, prevOptions[i])
          })) {
            // trigger change event if
            // no matching option found for at least one value
            const needReset = el.multiple ? binding.value.some(v => {
              return hasNoMatchingOption(v, curOptions)
            }) : binding.value !== binding.oldValue && hasNoMatchingOption(binding.value, curOptions)

            if (needReset) {
              trigger(el, 'change')
            }
          }
        }
      },
    }

    function setSelected(el, binding, vm) {
      actuallySetSelected(el, binding, vm)
      /* istanbul ignore if */

      if (isIE || isEdge) {
        setTimeout(() => {
          actuallySetSelected(el, binding, vm)
        }, 0)
      }
    }

    function actuallySetSelected(el, binding, vm) {
      const { value } = binding
      const isMultiple = el.multiple

      if (isMultiple && !Array.isArray(value)) {
        'development' !== 'production' && warn(`<select multiple v-model="${binding.expression}"> ` + `expects an Array value for its binding, but got ${Object.prototype.toString.call(value).slice(8, -1)}`, vm)
        return
      }

      let selected; let
        option

      for (let i = 0, l = el.options.length; i < l; i++) {
        option = el.options[i]

        if (isMultiple) {
          selected = looseIndexOf(value, getValue(option)) > -1

          if (option.selected !== selected) {
            option.selected = selected
          }
        } else if (looseEqual(getValue(option), value)) {
          if (el.selectedIndex !== i) {
            el.selectedIndex = i
          }

          return
        }
      }

      if (!isMultiple) {
        el.selectedIndex = -1
      }
    }

    function hasNoMatchingOption(value, options) {
      return options.every(o => {
        return !looseEqual(o, value)
      })
    }

    function getValue(option) {
      return '_value' in option ? option._value : option.value
    }

    function onCompositionStart(e) {
      e.target.composing = true
    }

    function onCompositionEnd(e) {
      // prevent triggering an input event for no reason
      if (!e.target.composing) {
        return
      }

      e.target.composing = false
      trigger(e.target, 'input')
    }

    function trigger(el, type) {
      const e = document.createEvent('HTMLEvents')
      e.initEvent(type, true, true)
      el.dispatchEvent(e)
    }
    /*  */
    // recursively search for possible transition defined inside the component root

    function locateNode(vnode) {
      return vnode.componentInstance && (!vnode.data || !vnode.data.transition) ? locateNode(vnode.componentInstance._vnode) : vnode
    }

    const show = {
      bind: function bind(el, ref, vnode) {
        const { value } = ref
        vnode = locateNode(vnode)
        const transition$$1 = vnode.data && vnode.data.transition
        const originalDisplay = el.__vOriginalDisplay = el.style.display === 'none' ? '' : el.style.display

        if (value && transition$$1) {
          vnode.data.show = true
          enter(vnode, () => {
            el.style.display = originalDisplay
          })
        } else {
          el.style.display = value ? originalDisplay : 'none'
        }
      },
      update: function update(el, ref, vnode) {
        const { value } = ref
        const { oldValue } = ref
        /* istanbul ignore if */

        if (!value === !oldValue) {
          return
        }

        vnode = locateNode(vnode)
        const transition$$1 = vnode.data && vnode.data.transition

        if (transition$$1) {
          vnode.data.show = true

          if (value) {
            enter(vnode, () => {
              el.style.display = el.__vOriginalDisplay
            })
          } else {
            leave(vnode, () => {
              el.style.display = 'none'
            })
          }
        } else {
          el.style.display = value ? el.__vOriginalDisplay : 'none'
        }
      },
      unbind: function unbind(el, binding, vnode, oldVnode, isDestroy) {
        if (!isDestroy) {
          el.style.display = el.__vOriginalDisplay
        }
      },
    }
    const platformDirectives = {
      model: directive,
      show,
    }
    /*  */

    const transitionProps = {
      name: String,
      appear: Boolean,
      css: Boolean,
      mode: String,
      type: String,
      enterClass: String,
      leaveClass: String,
      enterToClass: String,
      leaveToClass: String,
      enterActiveClass: String,
      leaveActiveClass: String,
      appearClass: String,
      appearActiveClass: String,
      appearToClass: String,
      duration: [Number, String, Object],
    } // in case the child is also an abstract component, e.g. <keep-alive>
    // we want to recursively retrieve the real component to be rendered

    function getRealChild(vnode) {
      const compOptions = vnode && vnode.componentOptions

      if (compOptions && compOptions.Ctor.options.abstract) {
        return getRealChild(getFirstComponentChild(compOptions.children))
      }
      return vnode

    }

    function extractTransitionData(comp) {
      const data = {}
      const options = comp.$options // props

      for (const key in options.propsData) {
        data[key] = comp[key]
      } // events.
      // extract listeners and pass them directly to the transition methods

      const listeners = options._parentListeners

      for (const key$1 in listeners) {
        data[camelize(key$1)] = listeners[key$1]
      }

      return data
    }

    function placeholder(h, rawChild) {
      if (/\d-keep-alive$/.test(rawChild.tag)) {
        return h('keep-alive', {
          props: rawChild.componentOptions.propsData,
        })
      }
    }

    function hasParentTransition(vnode) {
      while (vnode = vnode.parent) {
        if (vnode.data.transition) {
          return true
        }
      }
    }

    function isSameChild(child, oldChild) {
      return oldChild.key === child.key && oldChild.tag === child.tag
    }

    const isNotTextNode = function (c) {
      return c.tag || isAsyncPlaceholder(c)
    }

    const isVShowDirective = function (d) {
      return d.name === 'show'
    }

    const Transition = {
      name: 'transition',
      props: transitionProps,
      abstract: true,
      render: function render(h) {
        const this$1 = this
        let children = this.$slots.default

        if (!children) {
          return
        } // filter out text nodes (possible whitespaces)

        children = children.filter(isNotTextNode)
        /* istanbul ignore if */

        if (!children.length) {
          return
        } // warn multiple elements

        if ('development' !== 'production' && children.length > 1) {
          warn('<transition> can only be used on a single element. Use ' + '<transition-group> for lists.', this.$parent)
        }

        const { mode } = this // warn invalid mode

        if ('development' !== 'production' && mode && mode !== 'in-out' && mode !== 'out-in') {
          warn(`invalid <transition> mode: ${mode}`, this.$parent)
        }

        const rawChild = children[0] // if this is a component root node and the component's
        // parent container node also has transition, skip.

        if (hasParentTransition(this.$vnode)) {
          return rawChild
        } // apply transition data to child
        // use getRealChild() to ignore abstract components e.g. keep-alive

        const child = getRealChild(rawChild)
        /* istanbul ignore if */

        if (!child) {
          return rawChild
        }

        if (this._leaving) {
          return placeholder(h, rawChild)
        } // ensure a key that is unique to the vnode type and to this transition
        // component instance. This key will be used to remove pending leaving nodes
        // during entering.

        const id = `__transition-${this._uid}-`
        child.key = child.key == null ? child.isComment ? `${id}comment` : id + child.tag : isPrimitive(child.key) ? String(child.key).indexOf(id) === 0 ? child.key : id + child.key : child.key
        const data = (child.data || (child.data = {})).transition = extractTransitionData(this)
        const oldRawChild = this._vnode
        const oldChild = getRealChild(oldRawChild) // mark v-show
        // so that the transition module can hand over the control to the directive

        if (child.data.directives && child.data.directives.some(isVShowDirective)) {
          child.data.show = true
        }

        if (oldChild && oldChild.data && !isSameChild(child, oldChild) && !isAsyncPlaceholder(oldChild) // #6687 component root is a comment node
    && !(oldChild.componentInstance && oldChild.componentInstance._vnode.isComment)) {
          // replace old child transition data with fresh one
          // important for dynamic transitions!
          const oldData = oldChild.data.transition = extend({}, data) // handle transition mode

          if (mode === 'out-in') {
            // return placeholder node and queue update when leave finishes
            this._leaving = true
            mergeVNodeHook(oldData, 'afterLeave', () => {
              this$1._leaving = false
              this$1.$forceUpdate()
            })
            return placeholder(h, rawChild)
          } if (mode === 'in-out') {
            if (isAsyncPlaceholder(child)) {
              return oldRawChild
            }

            let delayedLeave

            const performLeave = function () {
              delayedLeave()
            }

            mergeVNodeHook(data, 'afterEnter', performLeave)
            mergeVNodeHook(data, 'enterCancelled', performLeave)
            mergeVNodeHook(oldData, 'delayLeave', leave => {
              delayedLeave = leave
            })
          }
        }

        return rawChild
      },
    }
    /*  */

    const props = extend({
      tag: String,
      moveClass: String,
    }, transitionProps)
    delete props.mode
    const TransitionGroup = {
      props,
      beforeMount: function beforeMount() {
        const this$1 = this
        const update = this._update

        this._update = function (vnode, hydrating) {
          const restoreActiveInstance = setActiveInstance(this$1) // force removing pass

          this$1.__patch__(this$1._vnode, this$1.kept, false, // hydrating
            true, // removeOnly (!important, avoids unnecessary moves)
          )

          this$1._vnode = this$1.kept
          restoreActiveInstance()
          update.call(this$1, vnode, hydrating)
        }
      },
      render: function render(h) {
        const tag = this.tag || this.$vnode.data.tag || 'span'
        const map = Object.create(null)
        const prevChildren = this.prevChildren = this.children
        const rawChildren = this.$slots.default || []
        const children = this.children = []
        const transitionData = extractTransitionData(this)

        for (let i = 0; i < rawChildren.length; i++) {
          const c = rawChildren[i]

          if (c.tag) {
            if (c.key != null && String(c.key).indexOf('__vlist') !== 0) {
              children.push(c)
              map[c.key] = c;
              (c.data || (c.data = {})).transition = transitionData
            } else if ('development' !== 'production') {
              const opts = c.componentOptions
              const name = opts ? opts.Ctor.options.name || opts.tag || '' : c.tag
              warn(`<transition-group> children must be keyed: <${name}>`)
            }
          }
        }

        if (prevChildren) {
          const kept = []
          const removed = []

          for (let i$1 = 0; i$1 < prevChildren.length; i$1++) {
            const c$1 = prevChildren[i$1]
            c$1.data.transition = transitionData
            c$1.data.pos = c$1.elm.getBoundingClientRect()

            if (map[c$1.key]) {
              kept.push(c$1)
            } else {
              removed.push(c$1)
            }
          }

          this.kept = h(tag, null, kept)
          this.removed = removed
        }

        return h(tag, null, children)
      },
      updated: function updated() {
        const children = this.prevChildren
        const moveClass = this.moveClass || `${this.name || 'v'}-move`

        if (!children.length || !this.hasMove(children[0].elm, moveClass)) {
          return
        } // we divide the work into three loops to avoid mixing DOM reads and writes
        // in each iteration - which helps prevent layout thrashing.

        children.forEach(callPendingCbs)
        children.forEach(recordPosition)
        children.forEach(applyTranslation) // force reflow to put everything in position
        // assign to this to avoid being removed in tree-shaking
        // $flow-disable-line

        this._reflow = document.body.offsetHeight
        children.forEach(c => {
          if (c.data.moved) {
            const el = c.elm
            const s = el.style
            addTransitionClass(el, moveClass)
            s.transform = s.WebkitTransform = s.transitionDuration = ''
            el.addEventListener(transitionEndEvent, el._moveCb = function cb(e) {
              if (e && e.target !== el) {
                return
              }

              if (!e || /transform$/.test(e.propertyName)) {
                el.removeEventListener(transitionEndEvent, cb)
                el._moveCb = null
                removeTransitionClass(el, moveClass)
              }
            })
          }
        })
      },
      methods: {
        hasMove: function hasMove(el, moveClass) {
          /* istanbul ignore if */
          if (!hasTransition) {
            return false
          }
          /* istanbul ignore if */

          if (this._hasMove) {
            return this._hasMove
          } // Detect whether an element with the move class applied has
          // CSS transitions. Since the element may be inside an entering
          // transition at this very moment, we make a clone of it and remove
          // all other transition classes applied to ensure only the move class
          // is applied.

          const clone = el.cloneNode()

          if (el._transitionClasses) {
            el._transitionClasses.forEach(cls => {
              removeClass(clone, cls)
            })
          }

          addClass(clone, moveClass)
          clone.style.display = 'none'
          this.$el.appendChild(clone)
          const info = getTransitionInfo(clone)
          this.$el.removeChild(clone)
          return this._hasMove = info.hasTransform
        },
      },
    }

    function callPendingCbs(c) {
      /* istanbul ignore if */
      if (c.elm._moveCb) {
        c.elm._moveCb()
      }
      /* istanbul ignore if */

      if (c.elm._enterCb) {
        c.elm._enterCb()
      }
    }

    function recordPosition(c) {
      c.data.newPos = c.elm.getBoundingClientRect()
    }

    function applyTranslation(c) {
      const oldPos = c.data.pos
      const { newPos } = c.data
      const dx = oldPos.left - newPos.left
      const dy = oldPos.top - newPos.top

      if (dx || dy) {
        c.data.moved = true
        const s = c.elm.style
        s.transform = s.WebkitTransform = `translate(${dx}px,${dy}px)`
        s.transitionDuration = '0s'
      }
    }

    const platformComponents = {
      Transition,
      TransitionGroup,
    }
    /*  */
    // install platform specific utils

    Vue.config.mustUseProp = mustUseProp
    Vue.config.isReservedTag = isReservedTag
    Vue.config.isReservedAttr = isReservedAttr
    Vue.config.getTagNamespace = getTagNamespace
    Vue.config.isUnknownElement = isUnknownElement // install platform runtime directives & components

    extend(Vue.options.directives, platformDirectives)
    extend(Vue.options.components, platformComponents) // install platform patch function

    Vue.prototype.__patch__ = inBrowser ? patch : noop // public mount method

    Vue.prototype.$mount = function (el, hydrating) {
      el = el && inBrowser ? query(el) : undefined
      return mountComponent(this, el, hydrating)
    } // devtools global hook

    /* istanbul ignore next */

    if (inBrowser) {
      setTimeout(() => {
        if (config.devtools) {
          if (devtools) {
            devtools.emit('init', Vue)
          } else if ('development' !== 'production' && 'development' !== 'test') {
            console[console.info ? 'info' : 'log']('Download the Vue Devtools extension for a better development experience:\n' + 'https://github.com/vuejs/vue-devtools')
          }
        }

        if ('development' !== 'production' && 'development' !== 'test' && config.productionTip !== false && typeof console !== 'undefined') {
          console[console.info ? 'info' : 'log']('You are running Vue in development mode.\n' + 'Make sure to turn on production mode when deploying for production.\n' + 'See more tips at https://vuejs.org/guide/deployment.html')
        }
      }, 0)
    }
    /*  */

    const _default = Vue
    exports.default = _default
  }, {}],
  '../../../../node_modules/vue-hot-reload-api/dist/index.js': [function (require, module, exports) {
    let Vue // late bind
    let version
    const map = Object.create(null)
    if (typeof window !== 'undefined') {
      window.__VUE_HOT_MAP__ = map
    }
    let installed = false
    let isBrowserify = false
    let initHookName = 'beforeCreate'

    exports.install = function (vue, browserify) {
      if (installed) { return }
      installed = true

      Vue = vue.__esModule ? vue.default : vue
      version = Vue.version.split('.').map(Number)
      isBrowserify = browserify

      // compat with < 2.0.0-alpha.7
      if (Vue.config._lifecycleHooks.indexOf('init') > -1) {
        initHookName = 'init'
      }

      exports.compatible = version[0] >= 2
      if (!exports.compatible) {
        console.warn(
          '[HMR] You are using a version of vue-hot-reload-api that is '
        + 'only compatible with Vue.js core ^2.0.0.',
        )

      }
    }

    /**
 * Create a record for a hot module, which keeps track of its constructor
 * and instances
 *
 * @param {String} id
 * @param {Object} options
 */

    exports.createRecord = function (id, options) {
      if (map[id]) { return }

      let Ctor = null
      if (typeof options === 'function') {
        Ctor = options
        options = Ctor.options
      }
      makeOptionsHot(id, options)
      map[id] = {
        Ctor,
        options,
        instances: [],
      }
    }

    /**
 * Check if module is recorded
 *
 * @param {String} id
 */

    exports.isRecorded = function (id) {
      return typeof map[id] !== 'undefined'
    }

    /**
 * Make a Component options object hot.
 *
 * @param {String} id
 * @param {Object} options
 */

    function makeOptionsHot(id, options) {
      if (options.functional) {
        const { render } = options
        options.render = function (h, ctx) {
          const { instances } = map[id]
          if (ctx && instances.indexOf(ctx.parent) < 0) {
            instances.push(ctx.parent)
          }
          return render(h, ctx)
        }
      } else {
        injectHook(options, initHookName, function () {
          const record = map[id]
          if (!record.Ctor) {
            record.Ctor = this.constructor
          }
          record.instances.push(this)
        })
        injectHook(options, 'beforeDestroy', function () {
          const { instances } = map[id]
          instances.splice(instances.indexOf(this), 1)
        })
      }
    }

    /**
 * Inject a hook to a hot reloadable component so that
 * we can keep track of it.
 *
 * @param {Object} options
 * @param {String} name
 * @param {Function} hook
 */

    function injectHook(options, name, hook) {
      const existing = options[name]
      options[name] = existing
        ? Array.isArray(existing) ? existing.concat(hook) : [existing, hook]
        : [hook]
    }

    function tryWrap(fn) {
      return function (id, arg) {
        try {
          fn(id, arg)
        } catch (e) {
          console.error(e)
          console.warn(
            'Something went wrong during Vue component hot-reload. Full reload required.',
          )
        }
      }
    }

    function updateOptions(oldOptions, newOptions) {
      for (const key in oldOptions) {
        if (!(key in newOptions)) {
          delete oldOptions[key]
        }
      }
      for (const key$1 in newOptions) {
        oldOptions[key$1] = newOptions[key$1]
      }
    }

    exports.rerender = tryWrap((id, options) => {
      const record = map[id]
      if (!options) {
        record.instances.slice().forEach(instance => {
          instance.$forceUpdate()
        })
        return
      }
      if (typeof options === 'function') {
        options = options.options
      }
      if (record.Ctor) {
        record.Ctor.options.render = options.render
        record.Ctor.options.staticRenderFns = options.staticRenderFns
        record.instances.slice().forEach(instance => {
          instance.$options.render = options.render
          instance.$options.staticRenderFns = options.staticRenderFns
          // reset static trees
          // pre 2.5, all static trees are cached together on the instance
          if (instance._staticTrees) {
            instance._staticTrees = []
          }
          // 2.5.0
          if (Array.isArray(record.Ctor.options.cached)) {
            record.Ctor.options.cached = []
          }
          // 2.5.3
          if (Array.isArray(instance.$options.cached)) {
            instance.$options.cached = []
          }

          // post 2.5.4: v-once trees are cached on instance._staticTrees.
          // Pure static trees are cached on the staticRenderFns array
          // (both already reset above)

          // 2.6: temporarily mark rendered scoped slots as unstable so that
          // child components can be forced to update
          const restore = patchScopedSlots(instance)
          instance.$forceUpdate()
          instance.$nextTick(restore)
        })
      } else {
        // functional or no instance created yet
        record.options.render = options.render
        record.options.staticRenderFns = options.staticRenderFns

        // handle functional component re-render
        if (record.options.functional) {
          // rerender with full options
          if (Object.keys(options).length > 2) {
            updateOptions(record.options, options)
          } else {
            // template-only rerender.
            // need to inject the style injection code for CSS modules
            // to work properly.
            const injectStyles = record.options._injectStyles
            if (injectStyles) {
              const { render } = options
              record.options.render = function (h, ctx) {
                injectStyles.call(ctx)
                return render(h, ctx)
              }
            }
          }
          record.options._Ctor = null
          // 2.5.3
          if (Array.isArray(record.options.cached)) {
            record.options.cached = []
          }
          record.instances.slice().forEach(instance => {
            instance.$forceUpdate()
          })
        }
      }
    })

    exports.reload = tryWrap((id, options) => {
      const record = map[id]
      if (options) {
        if (typeof options === 'function') {
          options = options.options
        }
        makeOptionsHot(id, options)
        if (record.Ctor) {
          if (version[1] < 2) {
            // preserve pre 2.2 behavior for global mixin handling
            record.Ctor.extendOptions = options
          }
          const newCtor = record.Ctor.super.extend(options)
          // prevent record.options._Ctor from being overwritten accidentally
          newCtor.options._Ctor = record.options._Ctor
          record.Ctor.options = newCtor.options
          record.Ctor.cid = newCtor.cid
          record.Ctor.prototype = newCtor.prototype
          if (newCtor.release) {
            // temporary global mixin strategy used in < 2.0.0-alpha.6
            newCtor.release()
          }
        } else {
          updateOptions(record.options, options)
        }
      }
      record.instances.slice().forEach(instance => {
        if (instance.$vnode && instance.$vnode.context) {
          instance.$vnode.context.$forceUpdate()
        } else {
          console.warn(
            'Root or manually mounted instance modified. Full reload required.',
          )
        }
      })
    })

    // 2.6 optimizes template-compiled scoped slots and skips updates if child
    // only uses scoped slots. We need to patch the scoped slots resolving helper
    // to temporarily mark all scoped slots as unstable in order to force child
    // updates.
    function patchScopedSlots(instance) {
      if (!instance._u) { return }
      // https://github.com/vuejs/vue/blob/dev/src/core/instance/render-helpers/resolve-scoped-slots.js
      const original = instance._u
      instance._u = function (slots) {
        try {
          // 2.6.4 ~ 2.6.6
          return original(slots, true)
        } catch (e) {
          // 2.5 / >= 2.6.7
          return original(slots, null, true)
        }
      }
      return function () {
        instance._u = original
      }
    }

  }, {}],
  'components/App.vue': [function (require, module, exports) {

    Object.defineProperty(exports, '__esModule', {
      value: true,
    })
    exports.default = void 0

    const _vue = _interopRequireDefault(require('vue'))

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj } }

    //
    //
    //
    //
    //
    //
    const _default = _vue.default.extend({
      data: function data() {
        return {}
      },
    })

    exports.default = _default
    let $5f3a6c = exports.default || module.exports

    if (typeof $5f3a6c === 'function') {
      $5f3a6c = $5f3a6c.options
    }

    /* template */
    Object.assign($5f3a6c, (function () {
      const render = function () {
        const _vm = this
        const _h = _vm.$createElement
        const _c = _vm._self._c || _h
        return _c('div', [_vm._v('\n  Hallo Welt!\n')])
      }
      const staticRenderFns = []
      render._withStripped = true

      return {
        render,
        staticRenderFns,
        _compiled: true,
        _scopeId: null,
        functional: undefined,
      }
    }()));

    /* hot reload */
    (function () {
      if (module.hot) {
        const api = require('vue-hot-reload-api')
        api.install(require('vue'))
        if (api.compatible) {
          module.hot.accept()
          if (!module.hot.data) {
            api.createRecord('$5f3a6c', $5f3a6c)
          } else {
            api.reload('$5f3a6c', $5f3a6c)
          }
        }

      }
    }())
  }, { vue: '../../../../node_modules/vue/dist/vue.runtime.esm.js', 'vue-hot-reload-api': '../../../../node_modules/vue-hot-reload-api/dist/index.js' }],
  'index.js': [function (require, module, exports) {

    const _vue = _interopRequireDefault(require('vue'))

    const _App = _interopRequireDefault(require('./components/App.vue'))

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj } }

    new _vue.default({
      render: function render(createElement) {
        return createElement(_App.default)
      },
    }).$mount('#app')
  }, { vue: '../../../../node_modules/vue/dist/vue.runtime.esm.js', './components/App.vue': 'components/App.vue' }],
  '../../../../node_modules/parcel-bundler/src/builtins/hmr-runtime.js': [function (require, module, exports) {
    const global = arguments[3]
    const OVERLAY_ID = '__parcel__error__overlay__'
    const OldModule = module.bundle.Module

    function Module(moduleName) {
      OldModule.call(this, moduleName)
      this.hot = {
        data: module.bundle.hotData,
        _acceptCallbacks: [],
        _disposeCallbacks: [],
        accept(fn) {
          this._acceptCallbacks.push(fn || (() => {}))
        },
        dispose(fn) {
          this._disposeCallbacks.push(fn)
        },
      }
      module.bundle.hotData = null
    }

    module.bundle.Module = Module
    let checkedAssets; let
      assetsToAccept
    const { parent } = module.bundle

    if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
      const hostname = '' || location.hostname
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${protocol}://${hostname}:` + '61049' + '/')

      ws.onmessage = function (event) {
        checkedAssets = {}
        assetsToAccept = []
        const data = JSON.parse(event.data)

        if (data.type === 'update') {
          let handled = false
          data.assets.forEach(asset => {
            if (!asset.isNew) {
              const didAccept = hmrAcceptCheck(global.parcelRequire, asset.id)

              if (didAccept) {
                handled = true
              }
            }
          }) // Enable HMR for CSS by default.

          handled = handled || data.assets.every(asset => {
            return asset.type === 'css' && asset.generated.js
          })

          if (handled) {
            console.clear()
            data.assets.forEach(asset => {
              hmrApply(global.parcelRequire, asset)
            })
            assetsToAccept.forEach(v => {
              hmrAcceptRun(v[0], v[1])
            })
          } else if (location.reload) {
            // `location` global exists in a web worker context but lacks `.reload()` function.
            location.reload()
          }
        }

        if (data.type === 'reload') {
          ws.close()

          ws.onclose = function () {
            location.reload()
          }
        }

        if (data.type === 'error-resolved') {
          console.log('[parcel] ✨ Error resolved')
          removeErrorOverlay()
        }

        if (data.type === 'error') {
          console.error(`[parcel] 🚨  ${data.error.message}\n${data.error.stack}`)
          removeErrorOverlay()
          const overlay = createErrorOverlay(data)
          document.body.appendChild(overlay)
        }
      }
    }

    function removeErrorOverlay() {
      const overlay = document.getElementById(OVERLAY_ID)

      if (overlay) {
        overlay.remove()
      }
    }

    function createErrorOverlay(data) {
      const overlay = document.createElement('div')
      overlay.id = OVERLAY_ID // html encode message and stack trace

      const message = document.createElement('div')
      const stackTrace = document.createElement('pre')
      message.innerText = data.error.message
      stackTrace.innerText = data.error.stack
      overlay.innerHTML = `${'<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">'}${message.innerHTML}</div>` + `<pre>${stackTrace.innerHTML}</pre>` + '</div>'
      return overlay
    }

    function getParents(bundle, id) {
      const { modules } = bundle

      if (!modules) {
        return []
      }

      let parents = []
      let k; let d; let
        dep

      for (k in modules) {
        for (d in modules[k][1]) {
          dep = modules[k][1][d]

          if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
            parents.push(k)
          }
        }
      }

      if (bundle.parent) {
        parents = parents.concat(getParents(bundle.parent, id))
      }

      return parents
    }

    function hmrApply(bundle, asset) {
      const { modules } = bundle

      if (!modules) {
        return
      }

      if (modules[asset.id] || !bundle.parent) {
        const fn = new Function('require', 'module', 'exports', asset.generated.js)
        asset.isNew = !modules[asset.id]
        modules[asset.id] = [fn, asset.deps]
      } else if (bundle.parent) {
        hmrApply(bundle.parent, asset)
      }
    }

    function hmrAcceptCheck(bundle, id) {
      const { modules } = bundle

      if (!modules) {
        return
      }

      if (!modules[id] && bundle.parent) {
        return hmrAcceptCheck(bundle.parent, id)
      }

      if (checkedAssets[id]) {
        return
      }

      checkedAssets[id] = true
      const cached = bundle.cache[id]
      assetsToAccept.push([bundle, id])

      if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
        return true
      }

      return getParents(global.parcelRequire, id).some(id => {
        return hmrAcceptCheck(global.parcelRequire, id)
      })
    }

    function hmrAcceptRun(bundle, id) {
      let cached = bundle.cache[id]
      bundle.hotData = {}

      if (cached) {
        cached.hot.data = bundle.hotData
      }

      if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
        cached.hot._disposeCallbacks.forEach(cb => {
          cb(bundle.hotData)
        })
      }

      delete bundle.cache[id]
      bundle(id)
      cached = bundle.cache[id]

      if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
        cached.hot._acceptCallbacks.forEach(cb => {
          cb()
        })

        return true
      }
    }
  }, {}],
}, {}, ['../../../../node_modules/parcel-bundler/src/builtins/hmr-runtime.js', 'index.js'], null))
// # sourceMappingURL=/index.js.map
