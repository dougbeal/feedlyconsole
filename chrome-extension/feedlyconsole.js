function inject() {
    // inject after readline is initilized
    $(document).ready( function() {
        var file = 'inject.js';
        // supress keydown, keypress when console is active
        console.debug("[feedlyconsole] injecting " + file);
        var script = $('<script/>', {
            src: chrome.extension.getURL(file),
            type: 'text/javascript'
        });

        script.ready( function() {
            console.debug("[feedlyconsole] loaded inject.js %O", script);
        });
        $('head').prepend(script);

    });
}


Josh = Josh || {};
Josh.Debug = true;
Josh.config = {
    history: new Josh.History(),
    console: window.console,
    killring: new Josh.KillRing(),
    readline: null,
    shell: null,
    pathhandler: null
};
Josh.config.readline = new Josh.ReadLine(Josh.config);
Josh.config.shell = new Josh.Shell(Josh.config);
// `Josh.PathHandler` is attached to `Josh.Shell` to provide basic file system navigation.
Josh.config.pathhandler = new Josh.PathHandler(Josh.config.shell, {console: Josh.config.console});

console.log("[feedlyconsole] loading %O", Josh);


////////////////////////////////////////////////////////////
// based on josh.js:gh-pages githubconsole
(function(root, $, _) {
    Josh.FeedlyConsole = (function(root, $, _) {
        console.debug("[Josh.FeedlyConsole]root %O %o", root, root);
        // Enable console debugging, when Josh.Debug is set and there is a console object on the document root.

        var _console = (Josh.Debug && window.console) ? window.console : {
            log: function() {
            },
            debug:function() {
            }
        };

        // Console State
        // =============
        //
        // `_self` contains all state variables for the console's operation
        var _self = {
            shell: Josh.config.shell,
            api_version: "v3/",
            api: "unset",
            OAuth: "",
            ui: {},
            root_commands: {}
        };


        // keep comments near templates - js2coffee
        (function() {
        _self.pathhandler = Josh.config.pathhandler

        // Custom Templates
        // ================
        // `Josh.Shell` uses *Underscore* templates for rendering output to the shell. This console overrides some and adds a couple of new ones for its own commands.
        //
        // **templates.prompt**
        // Override of the default prompt to provide a multi-line prompt of the current user, repo and path and branch.
        _self.shell.templates.prompt = _.template("<strong><%= node.path %> $</strong>");

        // **templates.ls**
        // Override of the pathhandler ls template to create a multi-column listing.
        _self.shell.templates.ls = _.template("<ul class='widelist'><% _.each(nodes, function(node) { %><li><%- node.name %></li><% }); %></ul><div class='clear'/>");

        // **templates.not_found**
        // Override of the pathhandler *not_found* template, since we will throw *not_found* if you try to access a valid file. This is done for the simplicity of the tutorial.
        _self.shell.templates.not_found = _.template("<div><%=cmd%>: <%=path%>: No such directory</div>");

        //**templates.rateLimitTemplate**
        // rate limiting will be added later to feedly api
        _self.shell.templates.rateLimitTemplate = _.template("<%=remaining%>/<%=limit%>");

        _self.shell.templates.default_template = _.template("<div><%= JSON.stringify(data) %></div>");

        //**templates.profile**
        // user information
        _self.shell.templates.profile = _.template("<div class='userinfo'>" +
                                                   "<img src='<%=profile.picture%>' style='float:right;'/>" +
                                                   "<table>" +
                                                   "<tr><td><strong>Id:</strong></td><td><%=profile.id %></td></tr>" +
                                                   "<tr><td><strong>Email:</strong></td><td><%=profile.email %></td></tr>" +
                                                   "<tr><td><strong>Name:</strong></td><td><%=profile.fullName %></td></tr>" +

                                                   "</table>" +
                                                   "</div>"
                                                  );
        })();



        // Adding Commands to the Console
        // ==============================


        //<section id='cmd.user'/>

        function buildExecCommandHandler(command_name) {

            return {
                // `exec` handles the execution of the command.
                exec: function(cmd, args, callback) {
                    get(command_name, null, function(data) {
                        if(!data) {
                            return err("api request failed to get data");
                        }
                        var template = _self.shell.templates[command_name] || _self.shell.templates.default_template;

                        var template_args = {};
                        template_args[command_name] = template_args['data'] = data;
                        _console.debug("[Josh.FeedlyConsole] data %O cmd %O args %O", data, cmd, args);
                        return callback(template(template_args));
                    });
                }
            };
        }

        var simple_commands = ['profile',
                               'tags',
                               'subscriptions',
                               'preferences',
                               'categories',
                               'topics',
                               //'opml'
                               ];



        function addCommandHandler(name, map) {
            _self.shell.setCommandHandler(name, map);
            _self.root_commands[name] = map;
        }
        _.each( simple_commands, function(command) {
            addCommandHandler(command, buildExecCommandHandler(command));
        });

        _self.root_commands.tags.help = "help here";

        //<section id='onNewPrompt'/>

        // This attaches a custom prompt render to the shell.
        _self.shell.onNewPrompt(function(callback) {
            callback(_self.shell.templates.prompt({self: _self, node: _self.pathhandler.current}));
        });

        // Wiring up PathHandler
        // =====================

        //<section id='getNode'/>

        // getNode
        // -------

        // `getNode` is required by `Josh.PathHandler` to provide filesystem behavior. Given a path, it is expected to return
        // a pathnode or null;
        _self.pathhandler.getNode = function(path, callback) {
            _console.debug("[Josh.FeedlyConsole] looking for node at %s.", path);

            // If the given path is empty, just return the current pathnode.
            if(!path) {
                return callback(_self.pathhandler.current);
            }
            var parts = getPathParts(path);

            // If the first part of path parts isn't empty, the path is a relative path, which can be turned into an
            // *absolutish* path by pre-pending the parts of the current pathnode.
            if(parts[0] !== '') {
                parts = getPathParts(_self.pathhandler.current.path).concat(parts);
            }

            // At this point the path is *absolutish*, i.e. looks absolute, but all `.` and `..` mentions need to removed and
            // resolved before it is truly absolute.
            var resolved = [];
            _.each(parts, function(x) {
                if(x === '.') {
                    return;
                }
                if(x === '..') {
                    resolved.pop();
                } else {
                    resolved.push(x);
                }
            });
            var absolute = resolved.join('/');
            _console.debug("[Josh.FeedlyConsole]path to fetch: " + absolute);
            // if get getDir returns false, use same node
            return getDir(absolute, callback) || self.node;
        };

        //<section id='getChildNodes'/>

        // getChildNodes
        // -------------

        // `getChildNodes` is the second function implementation required for `Josh.PathHandler`. Given a pathnode, it returns
        // a list of child pathnodes. This is used by `Tab` completion to resolve a partial path, after first resolving the
        // nearest parent node using `getNode
        _self.pathhandler.getChildNodes = function(node, callback) {

            // If the given node is a file node, no further work is required.
            if(node.isFile) {
                _console.debug("[Josh.FeedlyConsole] it's a file, no children %O", node);
                return callback();
            }

            // Otherwise, if the child nodes have already been initialized, which is done lazily, return them.
            if(node.children) {
                _console.debug("[Josh.FeedlyConsole] got children, let's turn them into nodes %O", node);
                return callback(makeNodes(node.children));
            }

            // Finally, use `getDir` to fetch and populate the child nodes.
            _console.debug("[Josh.FeedlyConsole] no children, fetch them %O", node);
            return getDir(node.path, function(detailNode) {
                node.children = detailNode.children;
                callback(node.children);
            });
        };

        // Supporting Functions
        // ====================

        //<section id='get'/>

        // get
        // ---

        // This function is responsible for all API requests, given a partial API path, `resource`, and an query argument object,
        // `args`.
        function get(resource, args, callback) {
            var url = _self.api + resource;
            var cache = _self[resource];

            if(cache) {
                return callback(cache);
            }
            function cacheCallback(value) {
                _self[resource] = value;
                callback(value);
            }
            
            if(chrome.extension === undefined) {
                // not embedded, demo mode
                switch(resource) {
                case 'tags':
                    return cacheCallback([
                        {
                            "id": "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/tag/global.saved"
                        },
                        {
                            "id": "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/tag/tech",
                            "label": "tech"
                        },
                        {
                            "id": "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/tag/inspiration",
                            "label": "inspiration"
                        }
                    ]);
                case 'subscriptions':
                    return cacheCallback([
                        {
                            "id": "feed/http://feeds.feedburner.com/design-milk",
                            "title": "Design Milk",
                            "categories": [
                                {
                                    "id": "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/category/design",
                                    "label": "design"
                                },
                                {
                                    "id": "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/category/global.must",
                                    "label": "must reads"
                                }
                            ],
                            "sortid": "26152F8F",
                            "updated": 1367539068016,
                            "website": "http://design-milk.com"
                        },
                        {
                            "id": "feed/http://5secondrule.typepad.com/my_weblog/atom.xml",
                            "title": "5 second rule",
                            "categories": [

                            ],
                            "sortid": "26152F8F",
                            "updated": 1367539068016,
                            "website": "http://5secondrule.typepad.com/my_weblog/"
                        },
                        {
                            "id": "feed/http://feed.500px.com/500px-editors",
                            "title": "500px: Editors' Choice",
                            "categories": [
                                {
                                    "id": "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/category/photography",
                                    "label": "photography"
                                }
                            ],
                            "sortid": "26152F8F",
                            "updated": 1367539068016,
                            "website": "http://500px.com/editors"
                        }
                    ]);
                case 'profile':
                    return cacheCallback({
                        "id": "c805fcbf-3acf-4302-a97e-d82f9d7c897f",
                        "email": "jim.smith@gmail.com",
                        "givenName": "Jim",
                        "familyName": "Smith",
                        "picture": "img/download.jpeg",
                        "gender": "male",
                        "locale": "en",
                        "reader": "9080770707070700",
                        "google": "115562565652656565656",
                        "twitter": "jimsmith",
                        "facebook": "",
                        "wave": "2013.7"
                    });
                case 'categories':
                    return cacheCallback([
                        {
                            "id": "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/category/tech",
                            "label": "tech"
                        },
                        {
                            "id": "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/category/design",
                            "label": "design"
                        }
                    ]);
                case 'topics':
                    return cacheCallback([
                        {
                            "id": "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/topic/arduino",
                            "interest": "high",
                            "updated": 1367539068016,
                            "created": 1367539068016
                        },
                        {
                            "id": "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/topic/rock climbing",
                            "interest": "low",
                            "updated": 1367539068016,
                            "created": 1367539068016
                        }
                    ]);
                case 'preferences':
                    return cacheCallback({
                        "autoMarkAsReadOnSelect": "50",
                        "category/reviews/entryOverviewSize": "0",
                        "subscription/feed/http://feeds.engadget.com/weblogsinc/engadget/entryOverviewSize": "4",
                        "subscription/feed/http://www.yatzer.com/feed/index.php/hideReadArticlesFilter": "off",
                        "category/photography/entryOverviewSize": "6",
                        "subscription/feed/http://feeds.feedburner.com/venturebeat/entryOverviewSize.mobile": "1"
                    });
                }

            } else {

                if(args) {
                    url += "?" + _.map(args,function(v, k) {
                        return k + "=" + v;
                    }).join("&");
                }
                _console.debug("[Josh.FeedlyConsole] fetching %s.", url);
                var request = {
                    url: url,
                    dataType: 'json',
                    headers: { "Authorization": "OAuth " + _self.OAuth },
                    xhrFields: {
                        withCredentials: true
                    }
                };
                $.ajax(request).done(function(response, status, xhr) {

                    // Every response from the API includes rate limiting headers, as well as an indicator injected by the API proxy
                    // whether the request was done with authentication. Both are used to display request rate information and a
                    // link to authenticate, if required.
                    var ratelimit = {
                        remaining: parseInt(xhr.getResponseHeader("X-RateLimit-Remaining")),
                        limit: parseInt(xhr.getResponseHeader("X-RateLimit-Limit")),
                        authenticated: xhr.getResponseHeader('Authenticated') === 'true'
                    };
                    $('#ratelimit').html(_self.shell.templates.rateLimitTemplate(ratelimit));
                    if(ratelimit.remaining === 0) {
                        alert("Whoops, you've hit the github rate limit. You'll need to authenticate to continue");
                        _self.shell.deactivate();
                        return null;
                    }

                    // For simplicity, this tutorial trivially deals with request failures by just returning null from this function
                    // via the callback.
                    if(status !== 'success') {
                        return callback();
                    }
                    return cacheCallback(response);
                });
            }
        }


        //<section id='initialize'/>

        // initalize
        // --------------

        // This function sets the node
        function initialize(evt) {//err, callback) {
            insertShellUI();
            return getDir("/",  function(node) {
                if(!node) {
                    return err("could not initialize root directory");
                }
                _self.pathhandler.current = node;
                _self.root = node;
                // return feedlyconsole.ready(function() {

                // });
            });
        }

        function insertCSSLink(name) {
            // insert css into head
            $('head').append( $('<link/>', {
                rel: "stylesheet",
                type: "text/css",
                href: chrome.extension.getURL(name)
            }));
        }
        function doInsertShellUI() {
            observer.disconnect();

            var file = "feedlyconsole.html";
            _console.debug("[feedlyconsole] injecting %s.", file);

            insertCSSLink("stylesheets/styles.css");
            //insertCSSLink("stylesheets/source-code-pro.css");
            insertCSSLink("stylesheets/jquery-ui.css");
            insertCSSLink("feedlyconsole.css");

            var feedlyconsole = $('<div/>', {
                'id': 'feedlyconsole'
                }
            ).load(chrome.extension.getURL(file), function() {
                _console.log("[feedlyconsole] loaded %s %O readline.attach %O.", file, $('#feedlyconsole'), this);
                Josh.config.readline.attach($('#shell-panel').get(0));
                initializeUI();
            });

            $('body').prepend(feedlyconsole);
        }

        function mutationHandler (mutationRecords) {
            _found = false;
            mutationRecords.forEach ( function (mutation) {
                var target = mutation.target;
                if( target.id === 'box' ) {
                    var type = mutation.type;
                    var name = mutation.attributeName;
                    var attr = target.attributes.getNamedItem(name);
                    var value = "";
                    if( attr !== null ) {
                        value = attr.value;
                    }
                    _console.debug( "[feedlyconsole/observer] %s: [%s]=%s on %O", type, name, value, target);

                    // not sure if wide will always be set, so trigger on the next mod
                    if( !_found &&
                        ((name === 'class' &&
                        value.indexOf("wide") != -1 ) ||
                        (name === '_pageid' &&
                         value.indexOf("rot21") != -1 )))
                    {
                        _console.debug("[feedlyconsole] mutation observer end %O", observer);
                        _found = true;
                        doInsertShellUI();
                        // found what we were looking for
                        return null;
                    }
                }
            });
        }
        observer = new MutationObserver (mutationHandler);
        function insertShellUI() {
            if( $('#feedlyconsole').length === 0 ) {
                _console.debug("[feedlyconsole] mutation observer start");
                var target = document;
                var config = {
                    attributes: true,
                    subtree: true
                };
                _console.debug(target);
                _console.debug(observer);
                _console.debug(config);
                observer.observe(target, config);
            }
        }
        //<section id='getDir'/>

        // getDir
        // ------

        // This function function fetches the directory listing for a path on a given repo and branch.
        function getDir(path, callback) {
            var node;
            var name;
            // remove trailing '/' for API requests.
            if(path && path.length > 1 && path[path.length - 1] === '/') {
                path = path.substr(0, path.length - 1);
            }

            if(!path || (path.length == 1 && path === '/')) {
                // item 0, root, each command a subdir
                name = '/';
                node = {
                    name: '/',
                    path: path,
                    children: makeRootNodes()
                };
                _console.debug("[Josh.FeedlyConsole] root node %O.", node);
                return callback(node);
            } else {
                var parts = getPathParts(path);
                // leading '/' produces empty item
                if(parts[0] === "") {
                    parts = parts.slice(1);
                }
                name = parts[0];
                var handler = _self.root_commands[name];
                if(handler === undefined) {
                    return callback();
                } else if(parts.length == 1) {
                    // item 1, commands
                    node = {
                        name: name,
                        path: path,
                        children: null
                    };
                    // implicitly call command as part of path
                    var command = handler.exec;
                    command("", "", function(map) {
                        var json = _self[name];
                        _console.debug("[Josh.FeedlyConsole] json to nodes %O.", json);
                        node.children = makeJSONNodes(path, json, name);
                        return callback(node);
                    });
                } else {
                    // item 2+, details
                    _console.debug("[Josh.FeedlyConsole] not implemented, path: %s, name %s", path, name);
                    get("streams/" );
                    return callback(undefined)
                }
            }
        }


        //<section id='getPathParts'/>

        // getPathParts
        // ------------

        // This function splits a path on `/` and removes any empty trailing element.
        function getPathParts(path) {
            var parts = path.split("/");
            if(parts[parts.length - 1] === '') {
                return parts.slice(0, parts.length - 1);
            }
            return parts;
        }

        //<section id='makeNodes'/>

        // makeNodes
        // ---------

        // This function builds child pathnodes from the directory information returned by getDir.
        function makeNodes(children) {
            _console.debug("[Josh.FeedlyConsole] makeNodes %O.", children);
            return _.map(children, function(node) {
                return {
                    name: node.name,
                    path: "/" + node.path,
                    isFile: node.type === 'leaf'
                };
            });
        }

        function makeJSONNodes(path, children, type) {
            if( _.isArray( children ) ) {
                var nodes = _.map(children, function(item) {
                    var name = item.label || item.title || item.id;
                    return $.extend( { name: name,
                                       path: path + '/' + name,
                                       isFile: type === 'leaf'
                                     }, item );
                });
                return nodes;
            } else {
                return _.map(children, function(value, key) {
                    var name = [key, value].join(':');
                    return {
                        name: name,
                        path: path + '/' + name,
                        isFile: type === 'leaf'
                    };
                });
            }
        }

        function makeRootNodes() {
            return _.map(_self.root_commands, function(value, key, list) {
                return {
                    name: key,
                    path: "/" + key,
                    type: 'command',
                    isFile: 'command' === 'leaf'
                };
            });
        }

        // UI setup and initialization
        // ===========================

        //<section id='initializationError'/>

        // initializationError
        // -------------------

        // This function is a lazy way with giving up if some request failed during intialization, forcing the user
        // to reload to retry.
        function initializationError(context, msg) {
            _console.error("[%s] failed to initialize: %s.", context, msg);
            //alert("unable to initialize shell. Encountered a problem talking to github api. Try reloading the page");
        }

        //<section id='initializeUI'/>

        // intializeUI
        // -----------

        // After a current user and repo have been set, this function initializes the UI state to allow the shell to be
        // shown and hidden.
        function initializeUI() {
            _console.log("[Josh.FeedlyConsole] initializeUI.");

            // We grab the `consoletab` and wire up hover behavior for it.
            var $consoletab = $('#consoletab');
            if( $consoletab.length === 0 ) {
                console.error('failed to find %s', $consoletab.selector);
            }
            $consoletab.hover(function() {
                $consoletab.addClass('consoletab-hover');
                $consoletab.removeClass('consoletab');
            }, function() {
                $consoletab.removeClass('consoletab-hover');
                $consoletab.addClass('consoletab');
            });

            // We also wire up a click handler to show the console to the `consoletab`.
            $consoletab.click(function() {
                activateAndShow();
            });

            var $consolePanel = $('#shell-container');
            $consolePanel.resizable({ handles: "s"});
            $(document).on( 'keypress', (function(event) {
                if(_self.shell.isActive()) {
                    return;
                }
                if(event.keyCode == 126) {
                    event.preventDefault();
                    activateAndShow();
                }
            }));

            function toggleActivateAndShow() {
                if(_self.shell.isActive()) {
                    hideAndDeactivate();
                } else {
                    activateAndShow();
                }
            }

            function activateAndShow() {
                $consoletab.slideUp();
                _self.shell.activate();
                $consolePanel.slideDown();
                $consolePanel.focus();
            }

            function hideAndDeactivate() {
                _self.shell.deactivate();
                $consolePanel.slideUp();
                $consolePanel.blur();
                $consoletab.slideDown();
            }
            _self.ui.toggleActivateAndShow = toggleActivateAndShow;
            _self.ui.activateAndShow = activateAndShow;
            _self.ui.hideAndDeactivate = hideAndDeactivate;

            _self.shell.onEOT(hideAndDeactivate);
            _self.shell.onCancel(hideAndDeactivate);
        }


        _console.log("[Josh.FeedlyConsole] initialize.");
        initialize();
        // wire up pageAction to toggle console
        // kind of a mess, but we only want to create one listener,
        // but initializeUI can be called multiple times because
        // feedly will blow away console that are added to early
        if(chrome.runtime !== undefined) { // when in extension
            chrome.runtime.onMessage.addListener(
                function(request, sender, sendResponse) {
                    _console.debug("[feedlyconsole] msg: %s.", request.msg);

                    if ( request.action === "icon_active" ) {
                        var url_array = request.url.split("/");
                        var url = url_array[0] + "//" + url_array[2] + "/" + _self.api_version;
                        _console.debug("[feedlyconsole] set api url: %s.", url);
                        _self.api = url;
                    } else if ( request.action === "toggle_console" ) {
                        if(_self.ui.toggleActivateAndShow === undefined) {
                            window.console.warn("[feedlyconsole] ui not yet ready");
                        } else {
                            _self.ui.toggleActivateAndShow();
                        }
                    } else if ( request.action === "cookie_feedlytoken" ) {
                        _self.OAuth = request.feedlytoken;
                        _console.debug("[feedlyconsole] token %s...",
                                       _self.OAuth.slice(0,8) );
                    } else {
                        _console.debug("[feedlyconsole] unknown action %s request %O.",
                                       request.action, request);
                    }
                    sendResponse({ "action": "ack" });
                });
        } else {
            // not extension
            $(document).ready(function() {
                initializeUI();
                _self.ui.activateAndShow();
            });
        }
        return _self;
    })(root, $, _);
    console.log("[feedlyconsole] loaded %O.", Josh.FeedlyConsole);
})(this, $, _);
console.log("[feedlyconsole] loaded %O.", Josh);
