/**
The YUI module contains the components required for building the YUI seed file.
This includes the script loading mechanism, a simple queue, and the core
utilities for the library.

@module yui
@main yui
@submodule yui-base
**/

/*jshint eqeqeq: false*/
if (typeof YUI != 'undefined') {
    YUI._YUI = YUI;
}

/**
The YUI global namespace object. This is the constructor for all YUI instances.

This is a self-instantiable factory function, meaning you don't need to precede
it with the `new` operator. You can invoke it directly like this:

    YUI().use('*', function (Y) {
        // Y is a new YUI instance.
    });

But it also works like this:

    var Y = YUI();

The `YUI` constructor accepts an optional config object, like this:

    YUI({
        debug: true,
        combine: false
    }).use('node', function (Y) {
        // Y.Node is ready to use.
    });

See the API docs for the <a href="config.html">Config</a> class for the complete
list of supported configuration properties accepted by the YUI constuctor.

If a global `YUI` object is already defined, the existing YUI object will not be
overwritten, to ensure that defined namespaces are preserved.

Each YUI instance has full custom event support, but only if the event system is
available.

@class YUI
@uses EventTarget
@constructor
@global
@param {Object} [config]* Zero or more optional configuration objects. Config
    values are stored in the `Y.config` property. See the
    <a href="config.html">Config</a> docs for the list of supported properties.
**/

    /*global YUI*/
    /*global YUI_config*/
    var YUI = function() {
        var i = 0,
            Y = this,
            args = arguments,
            l = args.length,
            instanceOf = function(o, type) {
                return (o && o.hasOwnProperty && (o instanceof type));
            },
            gconf = (typeof YUI_config !== 'undefined') && YUI_config;

        // Early hook to patch YUI instance
        if (!Y._instancePatched && gconf && gconf.instancePatches) {
            (function (patches, len, i) {
                Y._instancePatched = true;
                for (i = 0, len = patches.length; i < len; i += 1) {
                    patches[i](Y);
                }
            }(gconf.instancePatches));
        }

        if (!(instanceOf(Y, YUI))) {
            Y = new YUI();
        } else {
            // set up the core environment
            Y._init();

            /**
            Master configuration that might span multiple contexts in a non-
            browser environment. It is applied first to all instances in all
            contexts.

            @example

                YUI.GlobalConfig = {
                    filter: 'debug'
                };

                YUI().use('node', function (Y) {
                    // debug files used here
                });

                YUI({
                    filter: 'min'
                }).use('node', function (Y) {
                    // min files used here
                });

            @property {Object} GlobalConfig
            @global
            @static
            **/
            if (YUI.GlobalConfig) {
                Y.applyConfig(YUI.GlobalConfig);
            }

            /**
            Page-level config applied to all YUI instances created on the
            current page. This is applied after `YUI.GlobalConfig` and before
            any instance-level configuration.

            @example

                // Single global var to include before YUI seed file
                YUI_config = {
                    filter: 'debug'
                };

                YUI().use('node', function (Y) {
                    // debug files used here
                });

                YUI({
                    filter: 'min'
                }).use('node', function (Y) {
                    // min files used here
                });

            @property {Object} YUI_config
            @global
            **/
            if (gconf) {
                Y.applyConfig(gconf);
            }

            // bind the specified additional modules for this instance
            if (!l) {
                Y._setup();
            }
        }

        if (l) {
            // Each instance can accept one or more configuration objects.
            // These are applied after YUI.GlobalConfig and YUI_Config,
            // overriding values set in those config files if there is a
            // matching property.
            for (; i < l; i++) {
                Y.applyConfig(args[i]);
            }

            Y._setup();
        }

        Y.instanceOf = instanceOf;

        // Hook to patch intialized instance
        if (!Y._patched && Y.config.patches) {
            (function (patches, len, i) {
                Y._patched = true;
                for (i = 0, len = patches.length; i < len; i += 1) {
                    patches[i](Y);
                }
            }(Y.config.patches));
        }

        return Y;
    };

(function() {

    var proto, prop,
        VERSION = '@VERSION@',
        PERIOD = '.',
        BASE = 'http://yui.yahooapis.com/',
        /*
            These CSS class names can't be generated by
            getClassName since it is not available at the
            time they are being used.
        */
        DOC_LABEL = 'yui3-js-enabled',
        CSS_STAMP_EL = 'yui3-css-stamp',
        NOOP = function() {},
        SLICE = Array.prototype.slice,
        APPLY_TO_AUTH = { 'io.xdrReady': 1,   // the functions applyTo
                          'io.xdrResponse': 1,   // can call. this should
                          'SWF.eventHandler': 1 }, // be done at build time
        hasWin = (typeof window != 'undefined'),
        win = (hasWin) ? window : null,
        doc = (hasWin) ? win.document : null,
        docEl = doc && doc.documentElement,
        docClass = docEl && docEl.className,
        instances = {},
        time = new Date().getTime(),
        add = function(el, type, fn, capture) {
            if (el && el.addEventListener) {
                el.addEventListener(type, fn, capture);
            } else if (el && el.attachEvent) {
                el.attachEvent('on' + type, fn);
            }
        },
        remove = function(el, type, fn, capture) {
            if (el && el.removeEventListener) {
                // this can throw an uncaught exception in FF
                try {
                    el.removeEventListener(type, fn, capture);
                } catch (ex) {}
            } else if (el && el.detachEvent) {
                el.detachEvent('on' + type, fn);
            }
        },
        handleReady = function() {
            YUI.Env.DOMReady = true;
            if (hasWin) {
                remove(doc, 'DOMContentLoaded', handleReady);
            }        
        },
        handleLoad = function() {
            YUI.Env.windowLoaded = true;
            YUI.Env.DOMReady = true;
            if (hasWin) {
                remove(window, 'load', handleLoad);
            }
        },
        getLoader = function(Y, o) {
            var loader = Y.Env._loader,
                lCore = [ 'loader-base' ],
                G_ENV = YUI.Env,
                mods = G_ENV.mods;

            if (loader) {
                //loader._config(Y.config);
                loader.ignoreRegistered = false;
                loader.onEnd = null;
                loader.data = null;
                loader.required = [];
                loader.loadType = null;
            } else {
                loader = new Y.Loader(Y.config);
                Y.Env._loader = loader;
            }
            if (mods && mods.loader) {
                lCore = [].concat(lCore, YUI.Env.loaderExtras);
            }
            YUI.Env.core = Y.Array.dedupe([].concat(YUI.Env.core, lCore));

            return loader;
        },

        clobber = function(r, s) {
            for (var i in s) {
                if (s.hasOwnProperty(i)) {
                    r[i] = s[i];
                }
            }
        },

        ALREADY_DONE = { success: true };

//  Stamp the documentElement (HTML) with a class of "yui-loaded" to
//  enable styles that need to key off of JS being enabled.
if (docEl && docClass.indexOf(DOC_LABEL) == -1) {
    if (docClass) {
        docClass += ' ';
    }
    docClass += DOC_LABEL;
    docEl.className = docClass;
}

if (VERSION.indexOf('@') > -1) {
    VERSION = '3.5.0'; // dev time hack for cdn test
}

proto = {
    /**
    Applies a new configuration object to the config of this YUI instance. This
    will merge new group/module definitions, and will also update the loader
    cache if necessary. Updating `Y.config` directly will not update the cache.

    @method applyConfig
    @param {Object} o the configuration object.
    @since 3.2.0
    **/
    applyConfig: function(o) {

        o = o || NOOP;

        var attr,
            name,
            // detail,
            config = this.config,
            mods = config.modules,
            groups = config.groups,
            aliases = config.aliases,
            loader = this.Env._loader;

        for (name in o) {
            if (o.hasOwnProperty(name)) {
                attr = o[name];
                if (mods && name == 'modules') {
                    clobber(mods, attr);
                } else if (aliases && name == 'aliases') {
                    clobber(aliases, attr);
                } else if (groups && name == 'groups') {
                    clobber(groups, attr);
                } else if (name == 'win') {
                    config[name] = (attr && attr.contentWindow) || attr;
                    config.doc = config[name] ? config[name].document : null;
                } else if (name == '_yuid') {
                    // preserve the guid
                } else {
                    config[name] = attr;
                }
            }
        }

        if (loader) {
            loader._config(o);
        }

    },

    /**
    Old way to apply a config to this instance (calls `applyConfig` under the
    hood).

    @private
    @method _config
    @param {Object} o The config to apply
    **/
    _config: function(o) {
        this.applyConfig(o);
    },

    /**
    Initializes this YUI instance.

    @private
    @method _init
    **/
    _init: function() {
        var filter, el,
            Y = this,
            G_ENV = YUI.Env,
            Env = Y.Env,
            prop;

        /**
        The version number of this YUI instance.

        This value is typically updated by a script when a YUI release is built,
        so it may not reflect the correct version number when YUI is run from
        the development source tree.

        @property {String} version
        **/
        Y.version = VERSION;

        if (!Env) {
            Y.Env = {
                core: @YUI_CORE@,
                loaderExtras: ['loader-rollup', 'loader-yui3'],
                mods: {}, // flat module map
                versions: {}, // version module map
                base: BASE,
                cdn: BASE + VERSION + '/build/',
                // bootstrapped: false,
                _idx: 0,
                _used: {},
                _attached: {},
                _exported: {},
                _missed: [],
                _yidx: 0,
                _uidx: 0,
                _guidp: 'y',
                _loaded: {},
                // serviced: {},
                // Regex in English:
                // I'll start at the \b(yui).
                // 1. Look in the test string for "yui" or
                //    "yui-base" or "yui-davglass" or "yui-foobar" that comes after a word break.  That is, it
                //    can't match "foyui" or "i_heart_yui". This can be anywhere in the string.
                // 2. After #1 must come a forward slash followed by the string matched in #1, so
                //    "yui-base/yui-base" or "yui-pants/yui-pants".
                // 3. The second occurence of the #1 token can optionally be followed by "-debug" or "-min",
                //    so "yui/yui-min", "yui/yui-debug", "yui-base/yui-base-debug". NOT "yui/yui-tshirt".
                // 4. This is followed by ".js", so "yui/yui.js".
                // 0. Going back to the beginning, now. If all that stuff in 1-4 comes after a "?" in the string,
                //    then capture the junk between the LAST "&" and the string in 1-4.  So
                //    "blah?foo/yui/yui.js" will capture "foo/" and "blah?some/thing.js&3.3.0/build/yui-davglass/yui-davglass.js"
                //    will capture "3.3.0/build/"
                //
                // Regex Exploded:
                // (?:\?             Find a ?
                //   (?:[^&]*&)      followed by 0..n characters followed by an &
                //   *               in fact, find as many sets of characters followed by a & as you can
                //   ([^&]*)         capture the stuff after the last & in \1
                // )?                but it's ok if all this ?junk&more_junk stuff isn't even there
                // \b(               after a word break find either the string
                //    yui(?:-\w+)?   "yui" optionally followed by a -, then more characters
                // )                 and store the yui-* string in \2
                // \/\2              then comes a / followed by the yui-* string in \2
                // (?:-(min|debug))? optionally followed by "-min" or "-debug"
                // .js               and ending in ".js"
                _BASE_RE: /(?:\?(?:[^&]*&)*([^&]*))?\b(yui(?:-\w+)?)\/\2(?:-(min|debug))?\.js/,
                parseBasePath: function(src, pattern) {
                    var match = src.match(pattern),
                        path, filter;

                    if (match) {
                        path = RegExp.leftContext || src.slice(0, src.indexOf(match[0]));

                        // this is to set up the path to the loader.  The file
                        // filter for loader should match the yui include.
                        filter = match[3];

                        // extract correct path for mixed combo urls
                        // http://yuilibrary.com/projects/yui3/ticket/2528423
                        if (match[1]) {
                            path += '?' + match[1];
                        }
                        path = {
                            filter: filter,
                            path: path
                        };
                    }
                    return path;
                },
                getBase: G_ENV && G_ENV.getBase ||
                        function(pattern) {
                            var nodes = (doc && doc.getElementsByTagName('script')) || [],
                                path = Env.cdn, parsed,
                                i, len, src;

                            for (i = 0, len = nodes.length; i < len; ++i) {
                                src = nodes[i].src;
                                if (src) {
                                    parsed = Y.Env.parseBasePath(src, pattern);
                                    if (parsed) {
                                        filter = parsed.filter;
                                        path = parsed.path;
                                        break;
                                    }
                                }
                            }

                            // use CDN default
                            return path;
                        }

            };

            Env = Y.Env;

            Env._loaded[VERSION] = {};

            if (G_ENV && Y !== YUI) {
                Env._yidx = ++G_ENV._yidx;
                Env._guidp = ('yui_' + VERSION + '_' +
                             Env._yidx + '_' + time).replace(/[^a-z0-9_]+/g, '_');
            } else if (YUI._YUI) {

                G_ENV = YUI._YUI.Env;
                Env._yidx += G_ENV._yidx;
                Env._uidx += G_ENV._uidx;

                for (prop in G_ENV) {
                    if (!(prop in Env)) {
                        Env[prop] = G_ENV[prop];
                    }
                }

                delete YUI._YUI;
            }

            Y.id = Y.stamp(Y);
            instances[Y.id] = Y;

        }

        Y.constructor = YUI;

        // configuration defaults
        Y.config = Y.config || {
            bootstrap: true,
            cacheUse: true,
            debug: true,
            doc: doc,
            fetchCSS: true,
            throwFail: true,
            useBrowserConsole: true,
            useNativeES5: true,
            win: win,
            global: Function('return this')()
        };

        //Register the CSS stamp element
        if (doc && !doc.getElementById(CSS_STAMP_EL)) {
            el = doc.createElement('div');
            el.innerHTML = '<div id="' + CSS_STAMP_EL + '" style="position: absolute !important; visibility: hidden !important"></div>';
            YUI.Env.cssStampEl = el.firstChild;
            if (doc.body) {
                doc.body.appendChild(YUI.Env.cssStampEl);
            } else {
                docEl.insertBefore(YUI.Env.cssStampEl, docEl.firstChild);
            }
        } else if (doc && doc.getElementById(CSS_STAMP_EL) && !YUI.Env.cssStampEl) {
            YUI.Env.cssStampEl = doc.getElementById(CSS_STAMP_EL);
        }

        Y.config.lang = Y.config.lang || 'en-US';

        Y.config.base = YUI.config.base || Y.Env.getBase(Y.Env._BASE_RE);

        if (!filter || (!('mindebug').indexOf(filter))) {
            filter = 'min';
        }
        filter = (filter) ? '-' + filter : filter;
        Y.config.loaderPath = YUI.config.loaderPath || 'loader/loader' + filter + '.js';

    },

    /**
    Finishes the instance setup. Attaches whatever YUI modules were defined
    at the time that this instance was created.

    @method _setup
    @private
    **/
    _setup: function() {
        var i, Y = this,
            core = [],
            mods = YUI.Env.mods,
            extras = Y.config.core || [].concat(YUI.Env.core); //Clone it..

        for (i = 0; i < extras.length; i++) {
            if (mods[extras[i]]) {
                core.push(extras[i]);
            }
        }

        Y._attach(['yui-base']);
        Y._attach(core);

        if (Y.Loader) {
            getLoader(Y);
        }

        // Y.log(Y.id + ' initialized', 'info', 'yui');
    },

    /**
    Executes the named method on the specified YUI instance if that method is
    whitelisted.

    @method applyTo
    @param {String} id YUI instance id.
    @param {String} method Name of the method to execute. For example:
        'Object.keys'.
    @param {Array} args Arguments to apply to the method.
    @return {Mixed} Return value from the applied method, or `null` if the
        specified instance was not found or the method was not whitelisted.
    **/
    applyTo: function(id, method, args) {
        if (!(method in APPLY_TO_AUTH)) {
            this.log(method + ': applyTo not allowed', 'warn', 'yui');
            return null;
        }

        var instance = instances[id], nest, m, i;
        if (instance) {
            nest = method.split('.');
            m = instance;
            for (i = 0; i < nest.length; i = i + 1) {
                m = m[nest[i]];
                if (!m) {
                    this.log('applyTo not found: ' + method, 'warn', 'yui');
                }
            }
            return m && m.apply(instance, args);
        }

        return null;
    },

/**
Registers a YUI module and makes it available for use in a `YUI().use()` call or
as a dependency for other modules.

The easiest way to create a first-class YUI module is to use
<a href="http://yui.github.com/shifter/">Shifter</a>, the YUI component build
tool.

Shifter will automatically wrap your module code in a `YUI.add()` call along
with any configuration info required for the module.

@example

    YUI.add('davglass', function (Y) {
        Y.davglass = function () {
            Y.log('Dav was here!');
        };
    }, '3.4.0', {
        requires: ['harley-davidson', 'mt-dew']
    });

@method add
@param {String} name Module name.
@param {Function} fn Function containing module code. This function will be
    executed whenever the module is attached to a specific YUI instance.

    @param {YUI} fn.Y The YUI instance to which this module is attached.
    @param {String} fn.name Name of the module

@param {String} version Module version number. This is currently used only for
    informational purposes, and is not used internally by YUI.

@param {Object} [config] Module config.
    @param {Array} [config.requires] Array of other module names that must be
        attached before this module can be attached.
    @param {Array} [config.optional] Array of optional module names that should
        be attached before this module is attached if they've already been
        loaded. If the `loadOptional` YUI option is `true`, optional modules
        that have not yet been loaded will be loaded just as if they were hard
        requirements.
    @param {Array} [config.use] Array of module names that are included within
        or otherwise provided by this module, and which should be attached
        automatically when this module is attached. This makes it possible to
        create "virtual rollup" modules that simply attach a collection of other
        modules or submodules.

@return {YUI} This YUI instance.
**/
    add: function(name, fn, version, details) {
        details = details || {};
        var env = YUI.Env,
            mod = {
                name: name,
                fn: fn,
                version: version,
                details: details
            },
            //Instance hash so we don't apply it to the same instance twice
            applied = {},
            loader, inst,
            i, versions = env.versions;

        env.mods[name] = mod;
        versions[version] = versions[version] || {};
        versions[version][name] = mod;

        for (i in instances) {
            if (instances.hasOwnProperty(i)) {
                inst = instances[i];
                if (!applied[inst.id]) {
                    applied[inst.id] = true;
                    loader = inst.Env._loader;
                    if (loader) {
                        if (!loader.moduleInfo[name] || loader.moduleInfo[name].temp) {
                            loader.addModule(details, name);
                        }
                    }
                }
            }
        }

        return this;
    },

    /**
    Executes the callback function associated with each required module,
    attaching the module to this YUI instance.

    @method _attach
    @param {Array} r The array of modules to attach
    @param {Boolean} [moot=false] If `true`, don't throw a warning if the module
        is not attached.
    @private
    **/
    _attach: function(r, moot) {
        var i, name, mod, details, req, use, after,
            mods = YUI.Env.mods,
            aliases = YUI.Env.aliases,
            Y = this, j,
            cache = YUI.Env._renderedMods,
            loader = Y.Env._loader,
            done = Y.Env._attached,
            exported = Y.Env._exported,
            len = r.length, loader, def, go,
            c = [],
            modArgs, esCompat, reqlen,
            __exports__, __imports__;

        //Check for conditional modules (in a second+ instance) and add their requirements
        //TODO I hate this entire method, it needs to be fixed ASAP (3.5.0) ^davglass
        for (i = 0; i < len; i++) {
            name = r[i];
            mod = mods[name];
            c.push(name);
            if (loader && loader.conditions[name]) {
                for (j in loader.conditions[name]) {
                    if (loader.conditions[name].hasOwnProperty(j)) {
                        def = loader.conditions[name][j];
                        go = def && ((def.ua && Y.UA[def.ua]) || (def.test && def.test(Y)));
                        if (go) {
                            c.push(def.name);
                        }
                    }
                }
            }
        }
        r = c;
        len = r.length;

        for (i = 0; i < len; i++) {
            if (!done[r[i]]) {
                name = r[i];
                mod = mods[name];

                if (aliases && aliases[name] && !mod) {
                    Y._attach(aliases[name]);
                    continue;
                }
                if (!mod) {
                    if (loader && loader.moduleInfo[name]) {
                        mod = loader.moduleInfo[name];
                        moot = true;
                    }

                    // Y.log('no js def for: ' + name, 'info', 'yui');

                    //if (!loader || !loader.moduleInfo[name]) {
                    //if ((!loader || !loader.moduleInfo[name]) && !moot) {
                    if (!moot && name) {
                        if ((name.indexOf('skin-') === -1) && (name.indexOf('css') === -1)) {
                            Y.Env._missed.push(name);
                            Y.Env._missed = Y.Array.dedupe(Y.Env._missed);
                            Y.message('NOT loaded: ' + name, 'warn', 'yui');
                        }
                    }
                } else {
                    done[name] = true;
                    //Don't like this, but in case a mod was asked for once, then we fetch it
                    //We need to remove it from the missed list ^davglass
                    for (j = 0; j < Y.Env._missed.length; j++) {
                        if (Y.Env._missed[j] === name) {
                            Y.message('Found: ' + name + ' (was reported as missing earlier)', 'warn', 'yui');
                            Y.Env._missed.splice(j, 1);
                        }
                    }
                    /*
                        If it's a temp module, we need to redo it's requirements if it's already loaded
                        since it may have been loaded by another instance and it's dependencies might
                        have been redefined inside the fetched file.
                    */
                    if (loader && cache && cache[name] && cache[name].temp) {
                        loader.getRequires(cache[name]);
                        req = [];
                        for (j in loader.moduleInfo[name].expanded_map) {
                            if (loader.moduleInfo[name].expanded_map.hasOwnProperty(j)) {
                                req.push(j);
                            }
                        }
                        Y._attach(req);
                    }

                    details = mod.details;
                    req = details.requires;
                    esCompat = details.es;
                    use = details.use;
                    after = details.after;
                    //Force Intl load if there is a language (Loader logic) @todo fix this shit
                    if (details.lang) {
                        req = req || [];
                        req.unshift('intl');
                    }

                    if (req) {
                        reqlen = req.length;
                        for (j = 0; j < reqlen; j++) {
                            if (!done[req[j]]) {
                                if (!Y._attach(req)) {
                                    return false;
                                }
                                break;
                            }
                        }
                    }

                    if (after) {
                        for (j = 0; j < after.length; j++) {
                            if (!done[after[j]]) {
                                if (!Y._attach(after, true)) {
                                    return false;
                                }
                                break;
                            }
                        }
                    }

                    if (mod.fn) {
                        modArgs = [Y, name];
                        if (esCompat) {
                            __imports__ = {};
                            __exports__ = {};
                            // passing `exports` and `imports` onto the module function
                            modArgs.push(__imports__, __exports__);
                            if (req) {
                                reqlen = req.length;
                                for (j = 0; j < reqlen; j++) {
                                    __imports__[req[j]] = exported.hasOwnProperty(req[j]) ? exported[req[j]] : Y;
                                }
                            }
                        }
                        if (Y.config.throwFail) {
                            __exports__ = mod.fn.apply(mod, modArgs);
                        } else {
                            try {
                                __exports__ = mod.fn.apply(mod, modArgs);
                            } catch (e) {
                                Y.error('Attach error: ' + name, e, name);
                                return false;
                            }
                        }
                        if (esCompat) {
                            // store the `exports` in case others `es` modules requires it
                            exported[name] = __exports__;
                        }
                    }

                    if (use) {
                        for (j = 0; j < use.length; j++) {
                            if (!done[use[j]]) {
                                if (!Y._attach(use)) {
                                    return false;
                                }
                                break;
                            }
                        }
                    }



                }
            }
        }

        return true;
    },

    /**
    Delays the `use` callback until another event has taken place such as
    `window.onload`, `domready`, `contentready`, or `available`.

    @private
    @method _delayCallback
    @param {Function} cb The original `use` callback.
    @param {String|Object} until Either an event name ('load', 'domready', etc.)
        or an object containing event/args keys for contentready/available.
    @return {Function}
    **/
    _delayCallback: function(cb, until) {

        var Y = this,
            mod = ['event-base'];

        until = (Y.Lang.isObject(until) ? until : { event: until });

        if (until.event === 'load') {
            mod.push('event-synthetic');
        }

        Y.log('Delaying use callback until: ' + until.event, 'info', 'yui');
        return function() {
            Y.log('Use callback fired, waiting on delay', 'info', 'yui');
            var args = arguments;
            Y._use(mod, function() {
                Y.log('Delayed use wrapper callback after dependencies', 'info', 'yui');
                Y.on(until.event, function() {
                    args[1].delayUntil = until.event;
                    Y.log('Delayed use callback done after ' + until.event, 'info', 'yui');
                    cb.apply(Y, args);
                }, until.args);
            });
        };
    },

    /**
    Attaches one or more modules to this YUI instance. When this is executed,
    the requirements of the desired modules are analyzed, and one of several
    things can happen:


      * All required modules have already been loaded, and just need to be
        attached to this YUI instance. In this case, the `use()` callback will
        be executed synchronously after the modules are attached.

      * One or more modules have not yet been loaded, or the Get utility is not
        available, or the `bootstrap` config option is `false`. In this case,
        a warning is issued indicating that modules are missing, but all
        available modules will still be attached and the `use()` callback will
        be executed synchronously.

      * One or more modules are missing and the Loader is not available but the
        Get utility is, and `bootstrap` is not `false`. In this case, the Get
        utility will be used to load the Loader, and we will then proceed to
        the following state:

      * One or more modules are missing and the Loader is available. In this
        case, the Loader will be used to resolve the dependency tree for the
        missing modules and load them and their dependencies. When the Loader is
        finished loading modules, the `use()` callback will be executed
        asynchronously.

    @example

        // Loads and attaches dd and its dependencies.
        YUI().use('dd', function (Y) {
            // ...
        });

        // Loads and attaches dd and node as well as all of their dependencies.
        YUI().use(['dd', 'node'], function (Y) {
            // ...
        });

        // Attaches all modules that have already been loaded.
        YUI().use('*', function (Y) {
            // ...
        });

        // Attaches a gallery module.
        YUI().use('gallery-yql', function (Y) {
            // ...
        });

        // Attaches a YUI 2in3 module.
        YUI().use('yui2-datatable', function (Y) {
            // ...
        });

    @method use
    @param {String|Array} modules* One or more module names to attach.
    @param {Function} [callback] Callback function to be executed once all
        specified modules and their dependencies have been attached.
    @param {YUI} callback.Y The YUI instance created for this sandbox.
    @param {Object} callback.status Object containing `success`, `msg` and
        `data` properties.
    @chainable
    **/
    use: function() {
        var args = SLICE.call(arguments, 0),
            callback = args[args.length - 1],
            Y = this,
            i = 0,
            name,
            Env = Y.Env,
            provisioned = true;

        // The last argument supplied to use can be a load complete callback
        if (Y.Lang.isFunction(callback)) {
            args.pop();
            if (Y.config.delayUntil) {
                callback = Y._delayCallback(callback, Y.config.delayUntil);
            }
        } else {
            callback = null;
        }
        if (Y.Lang.isArray(args[0])) {
            args = args[0];
        }

        if (Y.config.cacheUse) {
            while ((name = args[i++])) {
                if (!Env._attached[name]) {
                    provisioned = false;
                    break;
                }
            }

            if (provisioned) {
                if (args.length) {
                    Y.log('already provisioned: ' + args, 'info', 'yui');
                }
                Y._notify(callback, ALREADY_DONE, args);
                return Y;
            }
        }

        if (Y._loading) {
            Y._useQueue = Y._useQueue || new Y.Queue();
            Y._useQueue.add([args, callback]);
        } else {
            Y._use(args, function(Y, response) {
                Y._notify(callback, response, args);
            });
        }

        return Y;
    },

    /**
    Handles Loader notifications about attachment/load errors.

    @method _notify
    @param {Function} callback Callback to pass to `Y.config.loadErrorFn`.
    @param {Object} response Response returned from Loader.
    @param {Array} args Arguments passed from Loader.
    @private
    **/
    _notify: function(callback, response, args) {
        if (!response.success && this.config.loadErrorFn) {
            this.config.loadErrorFn.call(this, this, callback, response, args);
        } else if (callback) {
            if (this.Env._missed && this.Env._missed.length) {
                response.msg = 'Missing modules: ' + this.Env._missed.join();
                response.success = false;
            }
            if (this.config.throwFail) {
                callback(this, response);
            } else {
                try {
                    callback(this, response);
                } catch (e) {
                    this.error('use callback error', e, args);
                }
            }
        }
    },

    /**
    Called from the `use` method queue to ensure that only one set of loading
    logic is performed at a time.

    @method _use
    @param {String} args* One or more modules to attach.
    @param {Function} [callback] Function to call once all required modules have
        been attached.
    @private
    **/
    _use: function(args, callback) {

        if (!this.Array) {
            this._attach(['yui-base']);
        }

        var len, loader, handleBoot,
            Y = this,
            G_ENV = YUI.Env,
            mods = G_ENV.mods,
            Env = Y.Env,
            used = Env._used,
            aliases = G_ENV.aliases,
            queue = G_ENV._loaderQueue,
            firstArg = args[0],
            YArray = Y.Array,
            config = Y.config,
            boot = config.bootstrap,
            missing = [],
            i,
            r = [],
            ret = true,
            fetchCSS = config.fetchCSS,
            process = function(names, skip) {

                var i = 0, a = [], name, len, m, req, use;

                if (!names.length) {
                    return;
                }

                if (aliases) {
                    len = names.length;
                    for (i = 0; i < len; i++) {
                        if (aliases[names[i]] && !mods[names[i]]) {
                            a = [].concat(a, aliases[names[i]]);
                        } else {
                            a.push(names[i]);
                        }
                    }
                    names = a;
                }

                len = names.length;

                for (i = 0; i < len; i++) {
                    name = names[i];
                    if (!skip) {
                        r.push(name);
                    }

                    // only attach a module once
                    if (used[name]) {
                        continue;
                    }

                    m = mods[name];
                    req = null;
                    use = null;

                    if (m) {
                        used[name] = true;
                        req = m.details.requires;
                        use = m.details.use;
                    } else {
                        // CSS files don't register themselves, see if it has
                        // been loaded
                        if (!G_ENV._loaded[VERSION][name]) {
                            missing.push(name);
                        } else {
                            used[name] = true; // probably css
                        }
                    }

                    // make sure requirements are attached
                    if (req && req.length) {
                        process(req);
                    }

                    // make sure we grab the submodule dependencies too
                    if (use && use.length) {
                        process(use, 1);
                    }
                }

            },

            handleLoader = function(fromLoader) {
                var response = fromLoader || {
                        success: true,
                        msg: 'not dynamic'
                    },
                    redo, origMissing,
                    ret = true,
                    data = response.data;

                Y._loading = false;

                if (data) {
                    origMissing = missing;
                    missing = [];
                    r = [];
                    process(data);
                    redo = missing.length;
                    if (redo) {
                        if ([].concat(missing).sort().join() ==
                                origMissing.sort().join()) {
                            redo = false;
                        }
                    }
                }

                if (redo && data) {
                    Y._loading = true;
                    Y._use(missing, function() {
                        Y.log('Nested use callback: ' + data, 'info', 'yui');
                        if (Y._attach(data)) {
                            Y._notify(callback, response, data);
                        }
                    });
                } else {
                    if (data) {
                        // Y.log('attaching from loader: ' + data, 'info', 'yui');
                        ret = Y._attach(data);
                    }
                    if (ret) {
                        Y._notify(callback, response, args);
                    }
                }

                if (Y._useQueue && Y._useQueue.size() && !Y._loading) {
                    Y._use.apply(Y, Y._useQueue.next());
                }

            };

// Y.log(Y.id + ': use called: ' + a + ' :: ' + callback, 'info', 'yui');

        // YUI().use('*'); // bind everything available
        if (firstArg === '*') {
            args = [];
            for (i in mods) {
                if (mods.hasOwnProperty(i)) {
                    args.push(i);
                }
            }
            ret = Y._attach(args);
            if (ret) {
                handleLoader();
            }
            return Y;
        }

        if ((mods.loader || mods['loader-base']) && !Y.Loader) {
            Y.log('Loader was found in meta, but it is not attached. Attaching..', 'info', 'yui');
            Y._attach(['loader' + ((!mods.loader) ? '-base' : '')]);
        }

        // Y.log('before loader requirements: ' + args, 'info', 'yui');

        // use loader to expand dependencies and sort the
        // requirements if it is available.
        if (boot && Y.Loader && args.length) {
            Y.log('Using loader to expand dependencies', 'info', 'yui');
            loader = getLoader(Y);
            loader.require(args);
            loader.ignoreRegistered = true;
            loader._boot = true;
            loader.calculate(null, (fetchCSS) ? null : 'js');
            args = loader.sorted;
            loader._boot = false;
        }

        process(args);

        len = missing.length;


        if (len) {
            missing = YArray.dedupe(missing);
            len = missing.length;
Y.log('Modules missing: ' + missing + ', ' + missing.length, 'info', 'yui');
        }


        // dynamic load
        if (boot && len && Y.Loader) {
// Y.log('Using loader to fetch missing deps: ' + missing, 'info', 'yui');
            Y.log('Using Loader', 'info', 'yui');
            Y._loading = true;
            loader = getLoader(Y);
            loader.onEnd = handleLoader;
            loader.context = Y;
            loader.data = args;
            loader.ignoreRegistered = false;
            loader.require(missing);
            loader.insert(null, (fetchCSS) ? null : 'js');

        } else if (boot && len && Y.Get && !Env.bootstrapped) {

            Y._loading = true;

            handleBoot = function() {
                Y._loading = false;
                queue.running = false;
                Env.bootstrapped = true;
                G_ENV._bootstrapping = false;
                if (Y._attach(['loader'])) {
                    Y._use(args, callback);
                }
            };

            if (G_ENV._bootstrapping) {
Y.log('Waiting for loader', 'info', 'yui');
                queue.add(handleBoot);
            } else {
                G_ENV._bootstrapping = true;
Y.log('Fetching loader: ' + config.base + config.loaderPath, 'info', 'yui');
                Y.Get.script(config.base + config.loaderPath, {
                    onEnd: handleBoot
                });
            }

        } else {
            Y.log('Attaching available dependencies: ' + args, 'info', 'yui');
            ret = Y._attach(args);
            if (ret) {
                handleLoader();
            }
        }

        return Y;
    },


    /**
    Utility method for safely creating namespaces if they don't already exist.
    May be called statically on the YUI global object or as a method on a YUI
    instance.

    When called statically, a namespace will be created on the YUI global
    object:

        // Create `YUI.your.namespace.here` as nested objects, preserving any
        // objects that already exist instead of overwriting them.
        YUI.namespace('your.namespace.here');

    When called as a method on a YUI instance, a namespace will be created on
    that instance:

        // Creates `Y.property.package`.
        Y.namespace('property.package');

    Dots in the input string cause `namespace` to create nested objects for each
    token. If any part of the requested namespace already exists, the current
    object will be left in place and will not be overwritten. This allows
    multiple calls to `namespace` to preserve existing namespaced properties.

    If the first token in the namespace string is "YAHOO", that token is
    discarded. This is legacy behavior for backwards compatibility with YUI 2.

    Be careful with namespace tokens. Reserved words may work in some browsers
    and not others. For instance, the following will fail in some browsers
    because the supported version of JavaScript reserves the word "long":

        Y.namespace('really.long.nested.namespace');

    Note: If you pass multiple arguments to create multiple namespaces, only the
    last one created is returned from this function.

    @method namespace
    @param {String} namespace* One or more namespaces to create.
    @return {Object} Reference to the last namespace object created.
    **/
    namespace: function() {
        var a = arguments, o, i = 0, j, d, arg;

        for (; i < a.length; i++) {
            o = this; //Reset base object per argument or it will get reused from the last
            arg = a[i];
            if (arg.indexOf(PERIOD) > -1) { //Skip this if no "." is present
                d = arg.split(PERIOD);
                for (j = (d[0] == 'YAHOO') ? 1 : 0; j < d.length; j++) {
                    o[d[j]] = o[d[j]] || {};
                    o = o[d[j]];
                }
            } else {
                o[arg] = o[arg] || {};
                o = o[arg]; //Reset base object to the new object so it's returned
            }
        }
        return o;
    },

    // this is replaced if the log module is included
    log: NOOP,
    message: NOOP,
    // this is replaced if the dump module is included
    dump: function (o) { return ''+o; },

    /**
    Reports an error.

    The reporting mechanism is controlled by the `throwFail` configuration
    attribute. If `throwFail` is falsy, the message is logged. If `throwFail` is
    truthy, a JS exception is thrown.

    If an `errorFn` is specified in the config it must return `true` to indicate
    that the exception was handled and keep it from being thrown.

    @method error
    @param {String} msg Error message.
    @param {Error|String} [e] JavaScript error object or an error string.
    @param {String} [src] Source of the error (such as the name of the module in
        which the error occurred).
    @chainable
    **/
    error: function(msg, e, src) {
        //TODO Add check for window.onerror here

        var Y = this, ret;

        if (Y.config.errorFn) {
            ret = Y.config.errorFn.apply(Y, arguments);
        }

        if (!ret) {
            throw (e || new Error(msg));
        } else {
            Y.message(msg, 'error', ''+src); // don't scrub this one
        }

        return Y;
    },

    /**
    Generates an id string that is unique among all YUI instances in this
    execution context.

    @method guid
    @param {String} [pre] Prefix.
    @return {String} Unique id.
    **/
    guid: function(pre) {
        var id = this.Env._guidp + '_' + (++this.Env._uidx);
        return (pre) ? (pre + id) : id;
    },

    /**
    Returns a unique id associated with the given object and (if *readOnly* is
    falsy) stamps the object with that id so it can be identified in the future.

    Stamping an object involves adding a `_yuid` property to it that contains
    the object's id. One exception to this is that in Internet Explorer, DOM
    nodes have a `uniqueID` property that contains a browser-generated unique
    id, which will be used instead of a YUI-generated id when available.

    @method stamp
    @param {Object} o Object to stamp.
    @param {Boolean} readOnly If truthy and the given object has not already
        been stamped, the object will not be modified and `null` will be
        returned.
    @return {String} Object's unique id, or `null` if *readOnly* was truthy and
        the given object was not already stamped.
    **/
    stamp: function(o, readOnly) {
        var uid;
        if (!o) {
            return o;
        }

        // IE generates its own unique ID for dom nodes
        // The uniqueID property of a document node returns a new ID
        if (o.uniqueID && o.nodeType && o.nodeType !== 9) {
            uid = o.uniqueID;
        } else {
            uid = (typeof o === 'string') ? o : o._yuid;
        }

        if (!uid) {
            uid = this.guid();
            if (!readOnly) {
                try {
                    o._yuid = uid;
                } catch (e) {
                    uid = null;
                }
            }
        }
        return uid;
    },

    /**
    Destroys this YUI instance.

    @method destroy
    @since 3.3.0
    **/
    destroy: function() {
        var Y = this;
        if (Y.Event) {
            Y.Event._unload();
        }
        delete instances[Y.id];
        delete Y.Env;
        delete Y.config;
    }

    /**
    Safe `instanceof` wrapper that works around a memory leak in IE when the
    object being tested is `window` or `document`.

    Unless you are testing objects that may be `window` or `document`, you
    should use the native `instanceof` operator instead of this method.

    @method instanceOf
    @param {Object} o Object to check.
    @param {Object} type Class to check against.
    @since 3.3.0
    **/
};

    YUI.prototype = proto;

    // inheritance utilities are not available yet
    for (prop in proto) {
        if (proto.hasOwnProperty(prop)) {
            YUI[prop] = proto[prop];
        }
    }

    /**
    Applies a configuration to all YUI instances in this execution context.

    The main use case for this method is in "mashups" where several third-party
    scripts need to write to a global YUI config, but cannot share a single
    centrally-managed config object. This way they can all call
    `YUI.applyConfig({})` instead of overwriting the single global config.

    @example

        YUI.applyConfig({
            modules: {
                davglass: {
                    fullpath: './davglass.js'
                }
            }
        });

        YUI.applyConfig({
            modules: {
                foo: {
                    fullpath: './foo.js'
                }
            }
        });

        YUI().use('davglass', function (Y) {
            // Module davglass will be available here.
        });

    @method applyConfig
    @param {Object} o Configuration object to apply.
    @static
    @since 3.5.0
    **/
    YUI.applyConfig = function(o) {
        if (!o) {
            return;
        }
        //If there is a GlobalConfig, apply it first to set the defaults
        if (YUI.GlobalConfig) {
            this.prototype.applyConfig.call(this, YUI.GlobalConfig);
        }
        //Apply this config to it
        this.prototype.applyConfig.call(this, o);
        //Reset GlobalConfig to the combined config
        YUI.GlobalConfig = this.config;
    };

    // set up the environment
    YUI._init();

    if (hasWin) {
        add(doc, 'DOMContentLoaded', handleReady);

        // add a window load event at load time so we can capture
        // the case where it fires before dynamic loading is
        // complete.
        add(window, 'load', handleLoad);
    } else {
        handleReady();
        handleLoad();
    }

    YUI.Env.add = add;
    YUI.Env.remove = remove;

    /*global exports*/
    // Support the CommonJS method for exporting our single global
    if (typeof exports == 'object') {
        exports.YUI = YUI;
        /**
        * Set a method to be called when `Get.script` is called in Node.js
        * `Get` will open the file, then pass it's content and it's path
        * to this method before attaching it. Commonly used for code coverage
        * instrumentation. <strong>Calling this multiple times will only
        * attach the last hook method</strong>. This method is only
        * available in Node.js.
        * @method setLoadHook
        * @static
        * @param {Function} fn The function to set
        * @param {String} fn.data The content of the file
        * @param {String} fn.path The file path of the file
        */
        YUI.setLoadHook = function(fn) {
            YUI._getLoadHook = fn;
        };
        /**
        * Load hook for `Y.Get.script` in Node.js, see `YUI.setLoadHook`
        * @method _getLoadHook
        * @private
        * @param {String} data The content of the file
        * @param {String} path The file path of the file
        */
        YUI._getLoadHook = null;
    }

    YUI.Env[VERSION] = {};
}());


/**
Config object that contains all of the configuration options for
this `YUI` instance.

This object is supplied by the implementer when instantiating YUI. Some
properties have default values if they are not supplied by the implementer.

This object should not be updated directly because some values are cached. Use
`applyConfig()` to update the config object on a YUI instance that has already
been configured.

@class config
@static
**/

/**
If `true` (the default), YUI will "bootstrap" the YUI Loader and module metadata
if they're needed to load additional dependencies and aren't already available.

Setting this to `false` will prevent YUI from automatically loading the Loader
and module metadata, so you will need to manually ensure that they're available
or handle dependency resolution yourself.

@property {Boolean} bootstrap
@default true
**/

/**
If `true`, `Y.log()` messages will be written to the browser's debug console
when available and when `useBrowserConsole` is also `true`.

@property {Boolean} debug
@default true
**/

/**
Log messages to the browser console if `debug` is `true` and the browser has a
supported console.

@property {Boolean} useBrowserConsole
@default true
**/

/**
A hash of log sources that should be logged. If specified, only messages from
these sources will be logged. Others will be discarded.

@property {Object} logInclude
@type object
**/

/**
A hash of log sources that should be not be logged. If specified, all sources
will be logged *except* those on this list.

@property {Object} logExclude
**/

/**
When the YUI seed file is dynamically loaded after the `window.onload` event has
fired, set this to `true` to tell YUI that it shouldn't wait for `window.onload`
to occur.

This ensures that components that rely on `window.onload` and the `domready`
custom event will work as expected even when YUI is dynamically injected.

@property {Boolean} injected
@default false
**/

/**
If `true`, `Y.error()` will generate or re-throw a JavaScript error. Otherwise,
errors are merely logged silently.

@property {Boolean} throwFail
@default true
**/

/**
Reference to the global object for this execution context.

In a browser, this is the current `window` object. In Node.js, this is the
Node.js `global` object.

@property {Object} global
**/

/**
The browser window or frame that this YUI instance should operate in.

When running in Node.js, this property is `undefined`, since there is no
`window` object. Use `global` to get a reference to the global object that will
work in both browsers and Node.js.

@property {Window} win
**/

/**
The browser `document` object associated with this YUI instance's `win` object.

When running in Node.js, this property is `undefined`, since there is no
`document` object.

@property {Document} doc
**/

/**
A list of modules that defines the YUI core (overrides the default list).

@property {Array} core
@type Array
@default ['get', 'features', 'intl-base', 'yui-log', 'yui-later', 'loader-base', 'loader-rollup', 'loader-yui3']
**/

/**
A list of languages to use in order of preference.

This list is matched against the list of available languages in modules that the
YUI instance uses to determine the best possible localization of language
sensitive modules.

Languages are represented using BCP 47 language tags, such as "en-GB" for
English as used in the United Kingdom, or "zh-Hans-CN" for simplified Chinese as
used in China. The list may be provided as a comma-separated string or as an
array.

@property {String|String[]} lang
**/

/**
Default date format.

@property {String} dateFormat
@deprecated Use configuration in `DataType.Date.format()` instead.
**/

/**
Default locale.

@property {String} locale
@deprecated Use `config.lang` instead.
**/

/**
Default generic polling interval in milliseconds.

@property {Number} pollInterval
@default 20
**/

/**
The number of dynamic `<script>` nodes to insert by default before automatically
removing them when loading scripts.

This applies only to script nodes because removing the node will not make the
evaluated script unavailable. Dynamic CSS nodes are not auto purged, because
removing a linked style sheet will also remove the style definitions.

@property {Number} purgethreshold
@default 20
**/

/**
Delay in milliseconds to wait after a window `resize` event before firing the
event. If another `resize` event occurs before this delay has elapsed, the
delay will start over to ensure that `resize` events are throttled.

@property {Number} windowResizeDelay
@default 40
**/

/**
Base directory for dynamic loading.

@property {String} base
**/

/**
Base URL for a dynamic combo handler. This will be used to make combo-handled
module requests if `combine` is set to `true.

@property {String} comboBase
@default "http://yui.yahooapis.com/combo?"
**/

/**
Root path to prepend to each module path when creating a combo-handled request.

This is updated for each YUI release to point to a specific version of the
library; for example: "3.8.0/build/".

@property {String} root
**/

/**
Filter to apply to module urls. This filter will modify the default path for all
modules.

The default path for the YUI library is the minified version of the files (e.g.,
event-min.js). The filter property can be a predefined filter or a custom
filter. The valid predefined filters are:

  - **debug**: Loads debug versions of modules (e.g., event-debug.js).
  - **raw**: Loads raw, non-minified versions of modules without debug logging
    (e.g., event.js).

You can also define a custom filter, which must be an object literal containing
a search regular expression and a replacement string:

    myFilter: {
        searchExp : "-min\\.js",
        replaceStr: "-debug.js"
    }

@property {Object|String} filter
**/

/**
Skin configuration and customizations.

@property {Object} skin
@param {String} [skin.defaultSkin='sam'] Default skin name. This skin will be
    applied automatically to skinnable components if not overridden by a
    component-specific skin name.
@param {String} [skin.base='assets/skins/'] Default base path for a skin,
    relative to Loader's `base` path.
@param {Object} [skin.overrides] Component-specific skin name overrides. Specify
    a component name as the key and, as the value, a string or array of strings
    for a skin or skins that should be loaded for that component instead of the
    `defaultSkin`.
**/

/**
Hash of per-component filter specifications. If specified for a given component,
this overrides the global `filter` config.

@example
    YUI({
        modules: {
            'foo': './foo.js',
            'bar': './bar.js',
            'baz': './baz.js'
        },
        filters: {
            'foo': {
                searchExp: '.js',
                replaceStr: '-coverage.js'
            }
        }
    }).use('foo', 'bar', 'baz', function (Y) {
        // foo-coverage.js is loaded
        // bar.js is loaded
        // baz.js is loaded
    });

@property {Object} filters
**/

/**
If `true`, YUI will use a combo handler to load multiple modules in as few
requests as possible.

The YUI CDN (which YUI uses by default) supports combo handling, but other
servers may not. If the server from which you're loading YUI does not support
combo handling, set this to `false`.

Providing a value for the `base` config property will cause `combine` to default
to `false` instead of `true`.

@property {Boolean} combine
@default true
*/

/**
Array of module names that should never be dynamically loaded.

@property {String[]} ignore
**/

/**
Array of module names that should always be loaded when required, even if
already present on the page.

@property {String[]} force
**/

/**
DOM element or id that should be used as the insertion point for dynamically
added `<script>` and `<link>` nodes.

@property {HTMLElement|String} insertBefore
**/

/**
Object hash containing attributes to add to dynamically added `<script>` nodes.

@property {Object} jsAttributes
**/

/**
Object hash containing attributes to add to dynamically added `<link>` nodes.

@property {Object} cssAttributes
**/

/**
Timeout in milliseconds before a dynamic JS or CSS request will be considered a
failure. If not set, no timeout will be enforced.

@property {Number} timeout
**/

/**
Callback for the 'CSSComplete' event. When dynamically loading YUI components
with CSS, this property fires when the CSS is finished loading.

This provides an opportunity to enhance the presentation of a loading page a
little bit before the entire loading process is done.

@property {Function} onCSS
**/

/**
A hash of module definitions to add to the list of available YUI modules. These
modules can then be dynamically loaded via the `use()` method.

This is a hash in which keys are module names and values are objects containing
module metadata.

See `Loader.addModule()` for the supported module metadata fields. Also see
`groups`, which provides a way to configure the base and combo spec for a set of
modules.

@example

    modules: {
        mymod1: {
            requires: ['node'],
            fullpath: '/mymod1/mymod1.js'
        },

        mymod2: {
            requires: ['mymod1'],
            fullpath: '/mymod2/mymod2.js'
        },

        mymod3: '/js/mymod3.js',
        mycssmod: '/css/mycssmod.css'
    }

@property {Object} modules
**/

/**
Aliases are dynamic groups of modules that can be used as shortcuts.

@example

    YUI({
        aliases: {
            davglass: [ 'node', 'yql', 'dd' ],
            mine: [ 'davglass', 'autocomplete']
        }
    }).use('mine', function (Y) {
        // Node, YQL, DD & AutoComplete available here.
    });

@property {Object} aliases
**/

/**
A hash of module group definitions.

For each group you can specify a list of modules and the base path and
combo spec to use when dynamically loading the modules.

@example

    groups: {
        yui2: {
            // specify whether or not this group has a combo service
            combine: true,

            // The comboSeperator to use with this group's combo handler
            comboSep: ';',

            // The maxURLLength for this server
            maxURLLength: 500,

            // the base path for non-combo paths
            base: 'http://yui.yahooapis.com/2.8.0r4/build/',

            // the path to the combo service
            comboBase: 'http://yui.yahooapis.com/combo?',

            // a fragment to prepend to the path attribute when
            // when building combo urls
            root: '2.8.0r4/build/',

            // the module definitions
            modules:  {
                yui2_yde: {
                    path: "yahoo-dom-event/yahoo-dom-event.js"
                },
                yui2_anim: {
                    path: "animation/animation.js",
                    requires: ['yui2_yde']
                }
            }
        }
    }

@property {Object} groups
**/

/**
Path to the Loader JS file, relative to the `base` path.

This is used to dynamically bootstrap the Loader when it's needed and isn't yet
available.

@property {String} loaderPath
@default "loader/loader-min.js"
**/

/**
If `true`, YUI will attempt to load CSS dependencies and skins. Set this to
`false` to prevent YUI from loading any CSS, or set it to the string `"force"`
to force CSS dependencies to be loaded even if their associated JS modules are
already loaded.

@property {Boolean|String} fetchCSS
@default true
**/

/**
Default gallery version used to build gallery module urls.

@property {String} gallery
@since 3.1.0
**/

/**
Default YUI 2 version used to build YUI 2 module urls.

This is used for intrinsic YUI 2 support via the 2in3 project. Also see the
`2in3` config for pulling different revisions of the wrapped YUI 2 modules.

@property {String} yui2
@default "2.9.0"
@since 3.1.0
**/

/**
Revision number of YUI 2in3 modules that should be used when loading YUI 2in3.

@property {String} 2in3
@default "4"
@since 3.1.0
**/

/**
Alternate console log function that should be used in environments without a
supported native console. This function is executed with the YUI instance as its
`this` object.

@property {Function} logFn
@since 3.1.0
**/

/**
The minimum log level to log messages for. Log levels are defined
incrementally. Messages greater than or equal to the level specified will
be shown. All others will be discarded. The order of log levels in
increasing priority is:

    debug
    info
    warn
    error

@property {String} logLevel
@default 'debug'
@since 3.10.0
**/

/**
Callback to execute when `Y.error()` is called. It receives the error message
and a JavaScript error object if one was provided.

This function is executed with the YUI instance as its `this` object.

Returning `true` from this function will prevent an exception from being thrown.

@property {Function} errorFn
@param {String} errorFn.msg Error message
@param {Object} [errorFn.err] Error object (if one was provided).
@since 3.2.0
**/

/**
A callback to execute when Loader fails to load one or more resources.

This could be because of a script load failure. It could also be because a
module fails to register itself when the `requireRegistration` config is `true`.

If this function is defined, the `use()` callback will only be called when the
loader succeeds. Otherwise, `use()` will always executes unless there was a
JavaScript error when attaching a module.

@property {Function} loadErrorFn
@since 3.3.0
**/

/**
If `true`, Loader will expect all loaded scripts to be first-class YUI modules
that register themselves with the YUI global, and will trigger a failure if a
loaded script does not register a YUI module.

@property {Boolean} requireRegistration
@default false
@since 3.3.0
**/

/**
Cache serviced use() requests.

@property {Boolean} cacheUse
@default true
@since 3.3.0
@deprecated No longer used.
**/

/**
Whether or not YUI should use native ES5 functionality when available for
features like `Y.Array.each()`, `Y.Object()`, etc.

When `false`, YUI will always use its own fallback implementations instead of
relying on ES5 functionality, even when ES5 functionality is available.

@property {Boolean} useNativeES5
@default true
@since 3.5.0
**/

/**
 * Leverage native JSON stringify if the browser has a native
 * implementation.  In general, this is a good idea.  See the Known Issues
 * section in the JSON user guide for caveats.  The default value is true
 * for browsers with native JSON support.
 *
 * @property useNativeJSONStringify
 * @type Boolean
 * @default true
 * @since 3.8.0
 */

 /**
 * Leverage native JSON parse if the browser has a native implementation.
 * In general, this is a good idea.  See the Known Issues section in the
 * JSON user guide for caveats.  The default value is true for browsers with
 * native JSON support.
 *
 * @property useNativeJSONParse
 * @type Boolean
 * @default true
 * @since 3.8.0
 */

/**
Delay the `use` callback until a specific event has passed (`load`, `domready`, `contentready` or `available`)

@property {Object|String} delayUntil
@since 3.6.0
@example

You can use `load` or `domready` strings by default:

    YUI({
        delayUntil: 'domready'
    }, function (Y) {
        // This will not execute until 'domeready' occurs.
    });

Or you can delay until a node is available (with `available` or `contentready`):

    YUI({
        delayUntil: {
            event: 'available',
            args : '#foo'
        }
    }, function (Y) {
        // This will not execute until a node matching the selector "#foo" is
        // available in the DOM.
    });

**/
