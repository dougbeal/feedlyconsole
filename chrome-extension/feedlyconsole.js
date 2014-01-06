function inject() {
    // inject after readline is initilized
    $(document).ready( function() {
        file = 'inject.js';
        // supress keydown, keypress when console is active
        console.debug("[feedlyconsole] injecting " + file);
        // var script = $('<script type="text/javascript">'+
        //                code + "</script>");
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


var Josh = Josh || {};
Josh.Debug = true;
Josh.config = {
    history: new Josh.History(),
    console: window.console,
    killring: new Josh.KillRing(),
    readline: null,
    shell: null
};
Josh.config.readline = new Josh.ReadLine(Josh.config);
Josh.config.shell = new Josh.Shell(Josh.config);


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



        // `Josh.PathHandler` is attached to `Josh.Shell` to provide basic file system navigation.
        _self.pathhandler = new Josh.PathHandler(_self.shell, {console: _console});

        // Custom Templates
        // ================
        // `Josh.Shell` uses *Underscore* templates for rendering output to the shell. This console overrides some and adds a couple of new ones for its own commands.

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
        // {
        //   "id": "c805fcbf-3acf-4302-a97e-d82f9d7c897f",
        //   "email": "jim.smith@gmail.com",
        //   "givenName": "Jim",
        //   "familyName": "Smith",
        //   "picture": "https://www.google.com/profile_images/1771656873/bigger.jpg",
        //   "gender": "male",
        //   "locale": "en",
        //   "reader": "9080770707070700",
        //   "google": "115562565652656565656",
        //   "twitter": "jimsmith",
        //   "facebook": "",
        //   "wave": "2013.7"
        // }
        // {"id":"10f8ec78-deba-43d0-862e-d3247d252a1a","client":"Feedly sandbox client","familyName":"Beal","givenName":"Douglas","google":"106867699444780221078","email":"dougbeal@gmail.com","gender":"male","picture":"https://lh6.googleusercontent.com/-cTmUKJfU-bU/AAAAAAAAAAI/AAAAAAAAIfY/iuvpdEN5tlM/photo.jpg?sz=50","wave":"2013.52","created":1388188400136,"evernoteConnected":false,"pocketConnected":false,"wordPressConnected":false,"locale":"en","fullName":"Douglas Beal"}
        _self.shell.templates.profile = _.template("<div class='userinfo'>" +
                                                   "<img src='<%=profile.picture%>' style='float:right;'/>" +
                                                   "<table>" +
                                                   "<tr><td><strong>Id:</strong></td><td><%=profile.id %></td></tr>" +
                                                   "<tr><td><strong>Email:</strong></td><td><%=profile.email %></td></tr>" +
                                                   "<tr><td><strong>Name:</strong></td><td><%=profile.fullName %></td></tr>" +

                                                   "</table>" +
                                                   "</div>"
                                                  ); 



        // Adding Commands to the Console
        // ==============================


        //<section id='cmd.user'/>

        function buildExecCommandHandler(command_name) {

            return {
                // `exec` handles the execution of the command.
                exec: function(cmd, args, callback) {
                    template = _self.shell.templates[command_name];
                    template_args = {};
                    cache = _self[command_name];
                    if ( template === undefined ) {
                        template = _self.shell.templates.default_template;
                        template_args.data = cache;
                        _console.log("[Josh.FeedlyConsole] using default template for %s", command_name);
                    }

                    if(cache) {
                        template_args[command_name] = cache;
                        return callback(template(template_args));
                    }
                    get(command_name, null, function(data) {
                        if(!data) {
                            return err("api request failed to get data");
                        }
                        template_args.data = template_args[command_name] = _self[command_name] = data;
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

        //<section id='cmd.repo'/>

        // repo [ -l | reponame ]
        // ----------------------

        // The `repo` command is used to display information about the current repo or switch to. It
        _self.shell.setCommandHandler("repo", {

            // `exec` handles the execution of the command.
            exec: function(cmd, args, callback) {

                // Given no arguments, it renders information about the current repo.
                if(!args || args.length === 0) {
                    return callback(_self.shell.templates.repo({repo: _self.repo}));
                }
                var name = args[0];

                // Given the argument `-l`, it lists all repos for the current user. This information was fetched at user
                // initialization
                if(name === '-l') {
                    return callback(_self.shell.templates.repos({repos: _self.repos}));
                }

                // Otherwise, the argument is assumed to a repo name, which `getRepo` uses to fetch the repository's information
                // from the data in `_self.repos`, if possible.
                var repo = getRepo(name, _self.repos);

                // If there is no matching repo, it renders an error.
                if(!repo) {
                    return callback(_self.shell.templates.repo_error({name: name, msg: 'no such repo'}));
                }

                // Given a valid repo, `setRepo` initializes the repo (i.e. fetching the root directory) and renders the repo
                // information.
                return setRepo(repo,
                               function(msg) {
                                   return callback(_self.shell.templates.repo_error({name: name, msg: msg}));
                               },
                               function(repo) {
                                   if(!repo) {
                                       return callback(_self.shell.templates.repo_not_found({repo: name, user: _self.user.login}));
                                   }
                                   return callback(_self.shell.templates.repo({repo: _self.repo}));
                               }
                              );
            },

            // `completion` uses `_self.repo` and `Josh.Shell.bestMatch` to try and match the partial information to the possible
            // matching repositories.
            completion: function(cmd, arg, line, callback) {
                callback(_self.shell.bestMatch(arg, _.map(_self.repos, function(repo) {
                    return repo.name;
                })));
            }
        });

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
            _console.debug("[Josh.FeedlyConsole]looking for node at: " + path);

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
            return getDir(absolute, callback);
        };

        //<section id='getChildNodes'/>

        // getChildNodes
        // -------------

        // `getChildNodes` is the second function implementation required for `Josh.PathHandler`. Given a pathnode, it returns
        // a list of child pathnodes. This is used by `Tab` completion to resolve a partial path, after first resolving the
        // nearest parent node using `getNode
        _self.pathhandler.getChildNodes = function(node, callback) {

            // If the given node is a file node, no further work is required.
            if(node.isfile) {
                _console.debug("[Josh.FeedlyConsole]it's a file, no children");
                return callback();
            }

            // Otherwise, if the child nodes have already been initialized, which is done lazily, return them.
            if(node.children) {
                _console.debug("[Josh.FeedlyConsole]got children, let's turn them into nodes %O", node);
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
            if(args) {
                url += "?" + _.map(args,function(v, k) {
                    return k + "=" + v;
                }).join("&");
            }
            _console.debug("[Josh.FeedlyConsole]fetching: " + url);
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
                return callback(response);
            });
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
            $('head').prepend( $('<link/>', {
                rel: "stylesheet",
                type: "text/css",
                href: chrome.extension.getURL(name)
            }));
        }
        function doInsertShellUI() {
            observer.disconnect();


            file = "feedlyconsole.html";
            _console.debug("[feedlyconsole] injecting " + file);

            insertCSSLink("feedlyconsole.css");
            insertCSSLink("stylesheets/source-code-pro.css");
            insertCSSLink("stylesheets/styles.css");
            insertCSSLink("stylesheets/jquery-ui.css");

            feedlyconsole = $('<div/>', {
                'id': 'feedlyconsole'
                }
            ).load(chrome.extension.getURL(file), function() {
                _console.log("[feedlyconsole] loaded %s %O readline.attach %O", file, $('#feedlyconsole'), this);


                Josh.config.readline.attach($('#shell-panel').get(0));
                //inject();

                initializeUI();
            });

            $('body').prepend(feedlyconsole);




        }

        function mutationHandler (mutationRecords) {
            _found = false;
            mutationRecords.forEach ( function (mutation) {
                target = mutation.target;
                if( target.id === 'box' ) {
                    type = mutation.type;
                    name = mutation.attributeName;
                    attr = target.attributes.getNamedItem(name);
                    value = "";
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
        var observer = new MutationObserver (mutationHandler);
        function insertShellUI() {
            if( $('#feedlyconsole').length === 0 ) {
                _console.debug("[feedlyconsole] mutation observer start");
                //            observer.disconnect();
                target = document;
                config = { 
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

            // Although paths in the internal representation may have a trailing `/`, it has to be removed before using it
            // as the argument for an API request.
            if(path && path.length > 1 && path[path.length - 1] === '/') {
                path = path.substr(0, path.length - 1);
            }

            if(!path || (path.length == 1 && path === '/')) {
                // 0, root, each command a subdir
                path = '/';
                node = {
                    name: '/',
                    path: path,
                    children: makeRootNodes()
                };
                _console.debug("[Josh.FeedlyConsole] root node %O.", node);
                return callback(node);
            } else { 
                if(path && path.length > 1 && path[0] === '/') {
                    stripped_path = path.substr(1, path.length);
                }
                parts = getPathParts(stripped_path);
                if(parts.length == 1) { 
                    name = parts[0];
                    // 1, commands
                    node = {
                        name: name,
                        path: path,
                        children: null
                    };
                    handler = _self.root_commands[name];
                    command = handler.exec;
                    command("", "", function(map) {
                        json = _self[name];
                        _console.debug("[Josh.FeedlyConsole]to nodes: %O", json);
                        node.children = makeJSONNodes(path, json, 'leaf');
                        return callback(node);
                    });
                } else {
                    // 2+, details
                    _console.debug("[Josh.FeedlyConsole] not impleted, path: %s", path);
                }
            }
        }

        //<section id='getRepos'/>

        // getRepos
        // --------

        // This function fetches all repositories for a given user.
        function getRepos(userLogin, callback) {
            return get("users/" + userLogin + "/repos", null, function(data) {
                callback(data);
            });
        }

        //<section id='getRepo'/>

        // getRepo
        // -------

        // This function tries to match a repository from the given list of known repositories. Should `repo_name` be null,
        // the first repository in `repos` is returned.
        function getRepo(repo_name, repos) {
            if(!repos || repos.length === 0) {
                return null;
            }
            var repo;
            if(repo_name) {
                repo = _.find(repos, function(repo) {
                    return repo.name === repo_name;
                });
                if(!repo) {
                    return callback();
                }
            } else {
                repo = repos[0];
            }
            return repo;
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
            return _.map(children, function(node) {
                return {
                    name: node.name,
                    path: "/" + node.path,
                    isFile: node.type === 'leaf'
                };
            });
        }

        function makeJSONNodes(path, children, type) {
            return _.map(children, function(value, key, list) {
                name = [key, value].join(':');
                return {
                    name: name,
                    path: path + '/' + name,
                    isFile: type === 'leaf'
                };
            });
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
            _console.debug("[" + context + "] failed to initialize: " + msg);
            alert("unable to initialize shell. Encountered a problem talking to github api. Try reloading the page");
        }

        //<section id='initializeUI'/>

        // intializeUI
        // -----------

        // After a current user and repo have been set, this function initializes the UI state to allow the shell to be
        // shown and hidden.
        function initializeUI() {
            _console.log("[Josh.FeedlyConsole] initializeUI");

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


        _console.log("[Josh.FeedlyConsole] initialize");        
        initialize();
        // wire up pageAction to toggle console
        // kind of a mess, but we only want to create one listener, 
        // but initializeUI can be called multiple times because
        // feedly will blow away console that are added to early
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                _console.debug("[feedlyconsole] msg:" + request.msg);

                if ( request.action === "icon_active" ) {
                    url_array = request.url.split("/");
                    url = url_array[0] + "//" + url_array[2] + "/" + _self.api_version;
                    _console.debug("[feedlyconsole] set api:" + url);
                    _self.api = url;
                } else if ( request.action === "toggle_console" ) {
                    if(_self.ui.toggleActivateAndShow === undefined) {
                        window.console.warn("[feedlyconsole] ui not yet ready");
                    } else {
                        _self.ui.toggleActivateAndShow();
                    }
                } else if ( request.action === "cookie_feedlytoken" ) {
                    _self.OAuth = request.feedlytoken;
                    _console.debug("[feedlyconsole] token " + 
                                   _self.OAuth.slice(0,8) + "..." );
                } else {
                    _console.debug("[feedlyconsole] unknown action:" + request.action);
                }
                sendResponse({ "action": "ack" });
            });
            return _self;
    })(root, $, _);
    console.log("[feedlyconsole] loaded %O", Josh.FeedlyConsole);
})(this, $, _);
console.log("[feedlyconsole] loaded %O", Josh);




