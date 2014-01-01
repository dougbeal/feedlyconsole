//var jquery = "http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js";
var jquery = "http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.js";
var scripts = [ 
    "http://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js",
    "http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.2/underscore-min.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/killring.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/history.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/readline.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/shell.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/pathhandler.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/example.js"
];

////////////////////////////////////////////////////////////
// based on josh.js:gh-pages githubconsole
(function(root, $, _) {
  Josh.FeedlyConsole = (function(root, $, _) {

    // Enable console debugging, when Josh.Debug is set and there is a console object on the document root.
    var _console = (Josh.Debug && root.console) ? root.console : {
      log: function() {
      }
    };

    // Console State
    // =============
    //
    // `_self` contains all state variables for the console's operation
    var _self = {
      shell: Josh.Shell({console: _console}),
      api: "v3/"
    };

    // `Josh.PathHandler` is attached to `Josh.Shell` to provide basic file system navigation.
    _self.pathhandler = new Josh.PathHandler(_self.shell, {console: _console});

    // Custom Templates
    // ================
    // `Josh.Shell` uses *Underscore* templates for rendering output to the shell. This console overrides some and adds a couple of new ones for its own commands.

    // **templates.prompt**

    // Override of the default prompt to provide a multi-line prompt of the current user, repo and path and branch.
    _self.shell.templates.prompt = _.template("<em>[<%= self.user.login %>/<%= self.repo.name %>]</em></br>(<%=self.branch%>) <strong><%= node.path %> $</strong>");

    // **templates.ls**

    // Override of the pathhandler ls template to create a multi-column listing.
    _self.shell.templates.ls = _.template("<ul class='widelist'><% _.each(nodes, function(node) { %><li><%- node.name %></li><% }); %></ul><div class='clear'/>");

    // **templates.not_found**

    // Override of the pathhandler *not_found* template, since we will throw *not_found* if you try to access a valid file. This is done for the simplicity of the tutorial.
    _self.shell.templates.not_found = _.template("<div><%=cmd%>: <%=path%>: No such directory</div>");

    //**templates.rateLimitTemplate**

    // Since GitHub rate limits un-authenticated use rather drastically, we render the current rate limit status in the shell so that it is clear that extended experimenting requires authentication.
    _self.shell.templates.rateLimitTemplate = _.template("<%=remaining%>/<%=limit%><% if(!authenticated) {%> <a href='http://josh.claassen.net/github/authenticate'>Authenticate with Github to increase your Rate Limit.</a><%}%>");

    //**templates.user**

    // Render basic information (including gravatar) whenever we switch users or enter `user` without an argument
    _self.shell.templates.user = _.template("<div class='userinfo'>" +
      "<img src='<%=user.avatar_url%>' style='float:right;'/>" +
      "<table>" +
      "<tr><td><strong>Id:</strong></td><td><%=user.id %></td></tr>" +
      "<tr><td><strong>Name:</strong></td><td><%=user.login %></td></tr>" +
      "<tr><td><strong>Location:</strong></td><td><%=user.location %></td></tr>" +
      "</table>" +
      "</div>"
    );

    // **templates.user_error**

    // Generic error in case setting the user fails.
    _self.shell.templates.user_error = _.template("Unable to set user '<%=name%>': <%=msg%>");

    // **templates.repos**

    // Just like `ls`, we render a wide list of repositories for `repo -l`.
    _self.shell.templates.repos = _.template("<ul class='widelist'><% _.each(repos, function(repo) { %><li><%- repo.name %></li><% }); %></ul><div class='clear'/>");

    // **template.repo**

    // Whenever we change repositories or `repo` is called without an argument, we show basic information about the repo.
    _self.shell.templates.repo = _.template("<div><div><strong>Name: </strong><%=repo.full_name%></div><div><strong>Description: </strong><%=repo.description %></div></div>");

    // **template.repo_not_found**

    // Error message in case someone tries to switch to an invalid repo.
    _self.shell.templates.repo_not_found = _.template("<div>repo: <%=repo%>: No such repo for user '<%= user %>'</div>");

    // **templates.repo_error**

    // Generic error message in case setting the repo fails.
    _self.shell.templates.repo_error = _.template("Unable to switch to repository '<%=name%>': <%=msg%>");

    // **templates.branches**

    // Again, like `ls`, we render a wide like of branches for `branch -l`.
    _self.shell.templates.branches = _.template("webfont.woff<ul class='widelist'><% _.each(branches, function(branch) { %><li><%- branch.name %></li><% }); %></ul><div class='clear'/>");

    // **templates.branch_error**

    // Generic error message in case setting the current branch fails.
    _self.shell.templates.branch_error = _.template("Unable to switch to branch '<%=name%>': <%=msg%>");

    // **templates.branches_error**

    // Generic error in case fetching the list of branches fails.
    _self.shell.templates.branches_error = _.template("Unable to load branch list: <%=msg%>");

    // Adding Commands to the Console
    // ==============================

    //<section id='cmd.user'/>

    // user [ username ]
    // -----------------

    // The `user` command is used to display information about the current user or switch between github users.
    _self.shell.setCommandHandler("user", {

      // `exec` handles the execution of the command.
      exec: function(cmd, args, callback) {

        // Given no arguments, it renders information about the current user, using the data fetched at user initialization.
        if(!args || args.length == 0) {
          return callback(_self.shell.templates.user({user: _self.user}));
        }
        var username = args[0];

        // Given an argument (assumed to be a username), it calls `setUser` to fetch the specified user and repository
        // information.
        return setUser(username, null,
          function(msg) {
            return callback(_self.shell.templates.user_error({name: username, msg: msg}));
          },
          function(user) {
            return callback(_self.shell.templates.user({user: user}));
          }
        );
      }

      // `user` has no completion handler, since the userbase of github is quite large and creating a search based
      // completion handler is beyond the scope of this tutorial implementation.
    });

    //<section id='cmd.repo'/>

    // repo [ -l | reponame ]
    // ----------------------

    // The `repo` command is used to display information about the current repo or switch to. It
    _self.shell.setCommandHandler("repo", {

      // `exec` handles the execution of the command.
      exec: function(cmd, args, callback) {

        // Given no arguments, it renders information about the current repo.
        if(!args || args.length == 0) {
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

    //<section id='cmd.branch'/>

    // branch [ -l | branchname ]
    // --------------------------

    // The `branch` command is used to switch or list branches for the current repository.
    _self.shell.setCommandHandler("branch", {

      // `exec` handles the execution of the command.
      exec: function(cmd, args, callback) {

        // Given no arguments, it simply returns the current branch, which will be rendered by the shell.
        if(!args || args.length == 0) {
          return callback(_self.branch);
        }
        var branch = args[0];

        // Given the argument `-l`, it lists all branches for the current repo. This information is lazily
        // initialized via `ensureBranches`.
        if(branch === '-l') {
          return ensureBranches(
            function(msg) {
              callback(_self.shell.templates.branches_error({msg: msg}));
            },
            function() {
              return callback(_self.shell.templates.branches({branches: _self.branches}));
            }
          );
        }

        // Owherwise, the current branch is switched by fetching the root directory for the new branch, and on success,
        // setting `_self.branch` and setting the current pathandler node to the root directory fetched.
        return getDir(_self.repo.full_name, branch, "/", function(node) {
          if(!node) {
            callback(_self.shell.templates.branch_error({name: branch, msg: "unable to load root directory for branch"}));
          }
          _self.branch = branch;
          _self.pathhandler.current = node;
          _self.root = node;
          callback();
        });
      },

      // `completion` handles `TAB` completion on a partial branch name. The list of possible branches is once again
      // lazily initialized via `ensureBranches`.
      completion: function(cmd, arg, line, callback) {
        return ensureBranches(
          function() {
            callback();
          },
          function() {
            callback(_self.shell.bestMatch(arg, _.map(_self.branches, function(branch) {
              return branch.name;
            })));
          }
        );
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
      _console.log("looking for node at: " + path);

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
      _console.log("path to fetch: " + absolute);
      return getDir(_self.repo.full_name, _self.branch, absolute, callback);
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
        _console.log("it's a file, no children");
        return callback();
      }

      // Otherwise, if the child nodes have already been initialized, which is done lazily, return them.
      if(node.children) {
        _console.log("got children, let's turn them into nodes");
        return callback(makeNodes(node.children));
      }

      // Finally, use `getDir` to fetch and populate the child nodes.
      _console.log("no children, fetch them");
      return getDir(_self.repo.full_name, _self.branch, node.path, function(detailNode) {
        node.children = detailNode.children;
        callback(makeNodes(node.children));
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
      _console.log("fetching: " + url);
      var request = {
        url: url,
        dataType: 'json',
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
        if(ratelimit.remaining == 0) {
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
      })
    }

    //<section id='ensureBranches'/>

    // ensureBranches
    // --------------

    // This function lazily fetches the branches for the current repo from the API.
    function ensureBranches(err, callback) {
      get("repos/" + _self.repo.full_name + "/branches", null, function(branches) {
        if(!branches) {
          return err("api request failed to return branch list");
        }
        _self.branches = branches;
        return callback();
      });
    }

    //<section id='setUser'/>

    // setUser
    // -------

    // This function fetches the specified user and initializes a repository to the provided value (which may be null).
    // one fetched by `initialzeRepos`.
    function setUser(user_name, repo_name, err, callback) {
      if(_self.user && _self.user.login === user_name) {
        return callback(_self.user);
      }
      return get("users/" + user_name, null, function(user) {
        if(!user) {
          return err("no such user");
        }
        return initializeRepos(user, repo_name, err, function(repo) {
          _self.user = user;
          return callback(_self.user);
        });
      });
    }

    //<section id='initializeRepos'/>

    // initalizeRepos
    // --------------

    // This function first fetches all repos for the given user from the API and then sets the current repo to the provided
    // value (which may be null).
    function initializeRepos(user, repo_name, err, callback) {
      return getRepos(user.login, function(repos) {
        var repo = getRepo(repo_name, repos);
        if(!repo) {
          return err("user has no repositories");
        }
        return setRepo(repo, err, function(repo) {
          _self.repos = repos;
          return callback(repo);
        });
      });
    }

    //<section id='getDir'/>

    // getDir
    // ------

    // This function function fetches the directory listing for a path on a given repo and branch.
    function getDir(repo_full_name, branch, path, callback) {

      // Although paths in the internal representation may have a trailing `/`, it has to be removed before using it
      // as the argument for an API request.
      if(path && path.length > 1 && path[path.length - 1] === '/') {
        path = path.substr(0, path.length - 1);
      }
      get("repos/" + repo_full_name + "/contents" + path, {ref: branch}, function(data) {

        // The API call may return either an array, indicating that the path was a directory, or an object. Since only
        // are stored as pathnodes, retrieving anything but an array returns null via the callback.
        if(Object.prototype.toString.call(data) !== '[object Array]') {
          _console.log("path '" + path + "' was a file");
          return callback();
        }

        // Given a directory listing, i.e. array, the current directory node is created and the API return value captured
        // as children so that they can later be transformed into child pathnodes, if required.
        var node = {
          name: _.last(_.filter(path.split("/"), function(x) {
            return x;
          })) || "",
          path: path,
          children: data
        };
        _console.log("got node at: " + node.path);
        return callback(node);
      });
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
      if(!repos || repos.length == 0) {
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

    //<section id='setRepo'/>

    // setRepo
    // -------

    // This function fetches the root directory for the specified repository and initializes the current repository
    // state.
    function setRepo(repo, err, callback) {
      return getDir(repo.full_name, repo.default_branch, "/", function(node) {
        if(!node) {
          return err("could not initialize root directory of repository '" + repo.full_name + "'");
        }
        _console.log("setting repo to '" + repo.name + "'");
        _self.repo = repo;
        _self.branch = repo.default_branch;
        _self.pathhandler.current = node;
        _self.root = node;
        return callback(repo);
      });
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
          isFile: node.type === 'file'
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
      _console.log("[" + context + "] failed to initialize: " + msg);
      alert("unable to initialize shell. Encountered a problem talking to github api. Try reloading the page");
    }

    //<section id='initializeUI'/>

    // intializeUI
    // -----------

    // After a current user and repo have been set, this function initializes the UI state to allow the shell to be
    // shown and hidden.
    function initializeUI() {
      _console.log("activating");

      // We grab the `consoletab` and wire up hover behavior for it.
      var $consoletab = $('#consoletab');
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
      $(document).keypress(function(event) {
        if(_self.shell.isActive()) {
          return;
        }
        if(event.keyCode == 126) {
          event.preventDefault();
          activateAndShow();
        }
      });
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

      _self.shell.onEOT(hideAndDeactivate);
      _self.shell.onCancel(hideAndDeactivate);
    }

    //<section id='document.ready'/>

    // On document ready, the default user and repo are loaded from the API before the UI can complete initialization.
    $(document).ready(function() {
      setUser("sdether", "josh.js",
        function(msg) {
          initializationError("default", msg);
        },
        initializeUI
      );
    });
  })(root, $, _);
})
  (this, $, _);

function initializeConsole()
{ 
    window.console.log("scripts loaded, feedlyconsole.js complete");
    window.console.log(jQuery('head'));
    jQuery('body')('#shell-container').add('
<div id="consoletab" class="consoletab" style="display: block;">Click or type <code>~</code> to show Console</div>
<div id="shell-container">
  <div id=shell-status>Github rate limit: <span id="ratelimit"></span></div>
  <div id="shell-panel">
    <div>Type <code>help</code> or hit <code>TAB</code> for a list of commands. Press
      <code>Ctrl-C</code> to hide the console.
    </div>
    <div id="shell-view"></div>

  </div>
</div>');
}

function loadScripts()
{
    jQuery.when.apply(jQuery, jQuery.map(scripts, jQuery.getScript)).done(initializeConsole);

}

function loadjQuery(url, callback)
{
    // Adding the script tag to the head as suggested before
    var head = document.getElementsByTagName('head')[0];
    if (typeof jQuery == 'undefined')
    {
        window.console.log('loading jQuery');
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        
        // Then bind the event to the callback function.
        // There are several events for cross browser compatibility.
        script.onreadystatechange = callback;
        script.onload = callback;
        
        // Fire the loading
        head.appendChild(script);
    }
    else
    {
        window.console.log('jQuery already loaded');
        callback();
    }
}

loadjQuery(jquery, loadScripts);
window.console.log("file feedlyconsole.js");

