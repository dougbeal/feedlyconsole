Josh = Josh or {}
Josh.Debug = true
Josh.config =
  history: new Josh.History()
  console: window.console
  killring: new Josh.KillRing()
  readline: null
  shell: null
  pathhandler: null

Josh.config.readline = new Josh.ReadLine(Josh.config)
Josh.config.shell = new Josh.Shell(Josh.config)

# `Josh.PathHandler` is attached to `Josh.Shell` to provide basic file
# system navigation.
Josh.config.pathhandler = new Josh.PathHandler(Josh.config.shell,
  console: Josh.config.console
)

_console =
  log: window.console.log
  debug: window.console.debug

console.log "[feedlyconsole] loading %O", Josh

demo_data =
  tags: [
    id: "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/tag/global.saved"
  ,
    id: "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/tag/tech"
    label: "tech"
  ,
    id: "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/tag/inspiration"
    label: "inspiration"
  ]
  subscriptions: [
    id: "feed/http://feeds.feedburner.com/design-milk"
    title: "Design Milk"
    categories: [
      id: "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/category/design"
      label: "design"
    ,
      id: "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/category/global.must"
      label: "must reads"
    ]
    sortid: "26152F8F"
    updated: 1367539068016
    website: "http://design-milk.com"
  ,
    id: "feed/http://5secondrule.typepad.com/my_weblog/atom.xml"
    title: "5 second rule"
    categories: []
    sortid: "26152F8F"
    updated: 1367539068016
    website: "http://5secondrule.typepad.com/my_weblog/"
  ,
    id: "feed/http://feed.500px.com/500px-editors"
    title: "500px: Editors' Choice"
    categories: [
      id: "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/category/photography"
      label: "photography"
    ]
    sortid: "26152F8F"
    updated: 1367539068016
    website: "http://500px.com/editors"
  ]
  profile:
    id: "c805fcbf-3acf-4302-a97e-d82f9d7c897f"
    email: "jim.smith@gmail.com"
    givenName: "Jim"
    familyName: "Smith"
    picture: "img/download.jpeg"
    gender: "male"
    locale: "en"
    reader: "9080770707070700"
    google: "115562565652656565656"
    twitter: "jimsmith"
    facebook: ""
    wave: "2013.7"
  categories: [
    id: "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/category/tech"
    label: "tech"
  ,
    id: "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/category/design"
    label: "design"
  ]
  topics: [
    id: "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/topic/arduino"
    interest: "high"
    updated: 1367539068016
    created: 1367539068016
  ,
    id: "user/c805fcbf-3acf-4302-a97e-d82f9d7c897f/topic/rock climbing"
    interest: "low"
    updated: 1367539068016
    created: 1367539068016
  ]
  preferences:
    autoMarkAsReadOnSelect: "50"
    "category/reviews/entryOverviewSize": "0"
    "subscription/feed/http://
feeds.engadget.com/weblogsinc/engadget/entryOverviewSize": "4"
    "subscription/feed/http://
www.yatzer.com/feed/index.php/hideReadArticlesFilter": "off"
    "category/photography/entryOverviewSize": "6"
    "subscription/feed/http://
feeds.feedburner.com/venturebeat/entryOverviewSize.mobile": "1"

FEEDLY_API_VERSION = "v3"



class ApiRequest
  constructor: (@url) ->
    @_cache = {}

  url: ->
    @url

  _url_parameters: (args) ->
    "?" + _.map(args, (v, k) ->
      k + "=" + v
      ).join("&")

  get: (resource, args, callback) ->
    cache_entry = @_cache[resource]
    if cache_entry
      _console.debug "[Josh.FeedlyConsole] %s cached.", resource
      return callback(cache_entry)

    unless chrome.extension?
      # not embedded, demo mode
      demo = demo_data[resource]
      demo = {} unless demo?
      @_cache[resource] = demo
      callback demo, null, null
    else
      url = [ @url, resource ].join('/') + @_url_parameters args
      _console.debug "[Josh.FeedlyConsole] fetching %s at %s.", resource, url
      request = @build_request url

      $.ajax(request).done (response, status, xhr) =>
        @_cache[resource] = response
        return callback response, status, xhr

  build_request: (url) ->
    url: url
    dataType: "json"
    xhrFields:
      withCredentials: true


class FeedlyApiRequest extends ApiRequest
  constructor: (@url, @api_version, @oauth) ->
    super([@url, @api_version].join('/'))

  build_request: (url) ->
    request = super(url)
    request.headers = Authorization: "OAuth #{@oauth}"
    return request

  get: (resource, args, callback) ->
    return super resource, args, (response, status, xhr) ->
      if response? and not status?
        # Every response from the API includes rate limiting
        # headers, as well as an indicator injected by the API proxy
        # whether the request was done with authentication. Both are
        # used to display request rate information and a link to
        # authenticate, if required.
        ratelimit =
          remaining: parseInt xhr.getResponseHeader("X-RateLimit-Remaining")
          limit: parseInt xhr.getResponseHeader("X-RateLimit-Limit")
          authenticated: xhr.getResponseHeader("Authenticated") is "true"

        $("#ratelimit").html _self
        .shell.templates.rateLimitTemplate(ratelimit)
        if ratelimit.remaining is 0
          alert "Whoops, you've hit the rate limit."
          _self.shell.deactivate()
          return null

        # For simplicity, this tutorial trivially deals with request
        # failures by just returning null from this function via the
        # callback.
        callback(response)
      else
        if response? and response
          return callback(response)
        else
          return callback()


class FeedlyNode
  @_ROOT_COMMANDS: [
      "profile"
      "tags"
      "subscriptions"
      "preferences"
      "categories"
      "topics"
    ]
  @_ROOT_PATH: '/'
  @_ROOT_NODE: null
  @_NODES: {}
  @_NODES[@_ROOT_PATH] = null

  constructor: (@name, @path, @json_data) ->
    @children = null
    FeedlyNode._NODES[@path] = @

  @_initRootNode: =>
    @_ROOT_NODE ?= new RootFeedlyNode()

  @_getPathParts = (path) ->
    parts = path.split("/")
    #remove empty trailing element
    return parts.slice(0, parts.length - 1)  if parts[parts.length - 1] is ""
    return parts

  @_current = ->
    return Josh.config.pathhandler.current

  @_resolvePath: (path) =>
    parts = @_getPathParts(path)

    # non-empty item 0 indicates relative path
    # when relative, prepend _current path
    parts = @_getPathParts(@_current().path).concat(parts) if parts[0] isnt ""

    # resolve `.` and `..`
    resolved = ['']
    _.each parts, (x) ->
      return if x is "."
      if x is ".."
        resolved.pop()
      else
        resolved.push x

    return resolved.join("/")

  @getNode: (path, callback) =>
    @_initRootNode()
    _console.debug "[feedlyconsole:FeedlyNode] looking for node at '%s'.", path
    return callback @_ROOT_NODE unless path?
    absolute = @_resolvePath path
    _console.debug "[Josh.FeedlyConsole]path to fetch: " + absolute
    return callback @_NODES[path] if path of @_NODES

    #temporary hack
    return callback @_ROOT_NODE


  @getChildNodes: (node, callback) =>
    @_initRootNode()
    node.getChildNodes callback

  getChildNodes: (callback) ->
    # If the given node is a file node, no further work is required.
    if node.isFile
      _console.debug "[Josh.FeedlyConsole] it's a file, no children %O", node
      return callback()
    # Otherwise, if the child nodes have already been initialized,
    # which is done lazily, return them.
    if node.children
      _console.debug """
      [Josh.FeedlyConsole] got children, let's turn them into nodes %O"""
      , node
      return callback(makeNodes(node.children))
    _console.debug "[Josh.FeedlyConsole] no children, fetch them %O", node
    # Finally, use `getDir` to fetch and populate the child nodes.
    getDir node.path, (detailNode) ->
      node.children = detailNode.children
      callback node.children

  getDir = (path, callback) ->
    node = undefined
    name = undefined

    # remove trailing '/' for API requests.
    path = path[...-1] if path and path.length > 1 and _.last path is "/"
    if not path or (path.length is 1 and path is "/")
      # item 0, root, each command a subdir
      name = "/"
      node =
        name: "/"
        path: path
        children: makeRootNodes()

      _console.debug "[Josh.FeedlyConsole] root node %O.", node
      callback node
    else
      parts = getPathParts(path)

      # leading '/' produces empty item
      parts = parts.slice(1)  if parts[0] is ""
      name = parts[0]
      handler = _self.root_commands[name]
      unless handler?
        callback()
      else if parts.length is 1
        # item 1, commands
        node =
          name: name
          path: path
          children: null

        # implicitly call command as part of path
        command = handler.exec
        command "", "", (map) ->
          json = _self[name]
          _console.debug "[Josh.FeedlyConsole] json to nodes %O.", json
          node.children = makeJSONNodes(path, json, name)
          callback node
      else
        # item 2+, details
        _console.debug """
        [Josh.FeedlyConsole]
        not implemented, path: %s, name %s""", path, name
        get "streams/"
        callback null
  ###
  #<section id='getPathParts'/>

  # getPathParts
  # ------------

  # This function splits a path on `/` and removes any empty trailing element.
  ###


  #<section id='makeNodes'/>

  # makeNodes
  # ---------

  # This function builds child pathnodes from the directory
  # information returned by getDir.
  makeNodes = (children) ->
    _console.debug "[Josh.FeedlyConsole] makeNodes %O.", children
    _.map children, (node) ->
      name: node.name
      path: "/" + node.path
      isFile: node.type is "leaf"

  makeJSONNodes = (path, children, type) ->
    if _.isArray(children)
      nodes = _.map(children, (item) ->
        name = item.label or item.title or item.id
        $.extend
          name: name
          path: path + "/" + name
          isFile: type is "leaf"
        , item
      )
      nodes
    else
      _.map children, (value, key) ->
        name = [
          key
          value
        ].join(":")
        name: name
        path: path + "/" + name
        isFile: type is "leaf"

  makeRootNodes = ->
    _.map _self.root_commands, (value, key, list) ->
      name: key
      path: "/" + key
      type: "command"
      isFile: "command" is "leaf"

class RootFeedlyNode extends FeedlyNode
  constructor: () ->
    super FeedlyNode._ROOT_PATH,
      FeedlyNode._ROOT_PATH,
      { cmds: FeedlyNode._ROOT_COMMANDS }

  getChildNodes: (callback) ->
    @children ?= (new FeedlyNode(name,
      [@path, name].join('/'),
      null) for name in FeedlyNode._ROOT_COMMANDS)
    return callback @children

  toString: ->
    return "#{@name} '#{@path}'"

#//////////////////////////////////////////////////////////
# based on josh.js:gh-pages githubconsole
((root, $, _) ->
  Josh.FeedlyConsole = ((root, $, _) ->

    # Enable console debugging, when Josh.Debug is set and there is a
    # console object on the document root.
    _console = (if (Josh.Debug and window.console) then window.console else
      log: ->
      debug: ->
    )

    ###
    # Console State
    # =============
    #
    # `_self` contains all state variables for the console's operation
    ###
    _self =
      shell: Josh.config.shell
      ui: {}
      root_commands: {}
      pathhandler: Josh.config.pathhandler
      api: null

    ###
    # Custom Templates
    # ================

    # `Josh.Shell` uses *Underscore* templates for rendering output to
    # the shell. This console overrides some and adds a couple of new
    # ones for its own commands.
    ###

    ###
    # **templates.prompt**
    # Override of the default prompt to provide a multi-line prompt of
    # the current user, repo and path and branch.
    ###
    _self.shell.templates.prompt = _.template """
    <strong>
      <%= node.path %> $
    </strong>
    """

    # **templates.default_template**
    # Use when specific template doesn't exist
    _self.shell.templates.default_template = _.template """
    <div><%= JSON.stringify(data) %></div>"""

    # **templates.ls**
    # Override of the pathhandler ls template to create a multi-column listing.
    _self.shell.templates.ls = _.template """
    <ul class='widelist'>
      <% _.each(nodes, function(node) { %>
        <li><%- node.name %></li>
      <% }); %>
    </ul><div class='clear'/>"""

    # **templates.not_found**

    # Override of the pathhandler *not_found* template, since we will
    # throw *not_found* if you try to access a valid file. This is
    # done for the simplicity of the tutorial.
    _self.shell.templates.not_found = _.template """
    <div><%=cmd%>: <%=path%>: No such directory</div>
      """

    # **templates.not_ready**

    # Override of the pathhandler *not_found* template, since we will
    # throw *not_found* if you try to access a valid file. This is
    # done for the simplicity of the tutorial.
    _self.shell.templates.not_ready = _.template """
    <div><%=cmd%>: <%=path%>: api is not ready</div>
      """

    #**templates.rateLimitTemplate**
    # rate limiting will be added later to feedly api

    _self.shell.templates.rateLimitTemplate = _.template """
    <%=remaining%>/<%=limit%>
      """

    #**templates.profile**
    # user information

    _self.shell.templates.profile = _.template """
    <div class='userinfo'>
      <img src='<%=profile.picture%>' style='float:right;'/>
      <table>
        <tr>
          <td><strong>Id:</strong></td>
          <td><%=profile.id %></td>
        </tr>
        <tr><td><strong>Email:</strong></td>
          <td><%=profile.email %></td></tr>
        <tr><td><strong>Name:</strong></td>
          <td><%=profile.fullName %></td></tr>
      </table></div>"""

    # Adding Commands to the Console
    # ==============================

    buildExecCommandHandler = (command_name) ->

      # `exec` handles the execution of the command.
      exec: (cmd, args, callback) ->
        if _self.api
          _self.api.get command_name, null, (data) ->
            return err("api request failed to get data")  unless data
            template = _self.shell.templates[command_name]
            template = template or _self.shell.templates.default_template
            template_args = {}
            template_args[command_name] = template_args["data"] = data
            _console.debug "[Josh.FeedlyConsole] data %O cmd %O args %O",
            data, cmd, args
            callback template(template_args)
        else
          callback _self.shell.templates.not_ready({cmd})


    simple_commands = [
      "profile"
      "tags"
      "subscriptions"
      "preferences"
      "categories"
      "topics"
    ]

    addCommandHandler = (name, map) ->
      _self.shell.setCommandHandler name, map
      _self.root_commands[name] = map


    _.each simple_commands, (command) ->
      addCommandHandler command, buildExecCommandHandler(command)

    _self.root_commands.tags.help = "help here"

    #<section id='onNewPrompt'/>

    # This attaches a custom prompt render to the shell.
    _self.shell.onNewPrompt (callback) ->
      callback _self.shell.templates.prompt(
        self: _self
        node: _self.pathhandler.current
      )


    # Wiring up PathHandler
    # =====================

    #<section id='getNode'/>

    # getNode
    # -------

    # `getNode` is required by `Josh.PathHandler` to provide
    # filesystem behavior. Given a path, it is expected to return a
    # pathnode or null;
    _self.pathhandler.getNode = FeedlyNode.getNode


    #<section id='getChildNodes'/>

    # getChildNodes
    # -------------

    # `getChildNodes` is the second function implementation required
    # for `Josh.PathHandler`. Given a pathnode, it returns a list of
    # child pathnodes. This is used by `Tab` completion to resolve a
    # partial path, after first resolving the nearest parent node
    # using `getNode
    _self.pathhandler.getChildNodes = FeedlyNode.getChildNodes

    #<section id='initialize'/>

    # initalize
    # --------------

    # This function sets the node
    initialize = (evt) -> #err, callback) {
      insertShellUI()
      FeedlyNode.getNode "/", (node) ->
        return err("could not initialize root directory")  unless node
        _self.pathhandler.current = node

    insertCSSLink = (name) ->
      console.debug "[feedlyconsole] inserting css #{name}"
      # insert css into head
      $("head").append $ "<link/>",
        rel: "stylesheet"
        type: "text/css"
        href: chrome.extension.getURL(name)

    doInsertShellUI = ->
      observer.disconnect()
      file = "feedlyconsole.html"
      _console.debug "[feedlyconsole] injecting %s.", file
      #insertCSSLink "stylesheets/styles.css"
      #insertCSSLink("stylesheets/source-code-pro.css");
      insertCSSLink "stylesheets/jquery-ui.css"
      insertCSSLink "stylesheets/feedlyconsole.css"
      feedlyconsole = $("<div/>",
        id: "feedlyconsole"
      ).load(chrome.extension.getURL(file), ->
        _console.log "[feedlyconsole] loaded %s %O readline.attach %O.",
        file, $("#feedlyconsole"), this
        Josh.config.readline.attach $("#shell-panel").get(0)
        initializeUI()
      )
      $("body").prepend feedlyconsole
    mutationHandler = (mutationRecords) ->
      _found = false
      mutationRecords.forEach (mutation) ->
        target = mutation.target
        if target.id is "box"
          type = mutation.type
          name = mutation.attributeName
          attr = target.attributes.getNamedItem(name)
          value = ""
          value = attr.value  if attr isnt null
          _console.debug "[feedlyconsole/observer] %s: [%s]=%s on %O",
            type, name, value, target

          # not sure if wide will always be set, so trigger on the next mod
          wide = name is "class" and value.indexOf("wide") isnt -1
          page = name is "_pageid" and value.indexOf("rot21") isnt -1
          if not _found and (wide or page)
            _console.debug "[feedlyconsole] mutation observer end %O", observer
            _found = true
            doInsertShellUI()

            # found what we were looking for
            null

    insertShellUI = ->
      if $("#feedlyconsole").length is 0
        _console.debug "[feedlyconsole] mutation observer start"
        target = document
        config =
          attributes: true
          subtree: true

        _console.debug target
        _console.debug observer
        _console.debug config
        observer.observe target, config
      else
        _console.debug "[feedlyconsole] #feedlyconsole found."
        initializeUI()


    # UI setup and initialization
    # ===========================

    #<section id='initializationError'/>

    # initializationError
    # -------------------

    # This function is a lazy way with giving up if some request
    # failed during intialization, forcing the user to reload to
    # retry.
    initializationError = (context, msg) ->
      _console.error "[%s] failed to initialize: %s.", context, msg


    #<section id='initializeUI'/>

    # intializeUI
    # -----------

    # this function
    # initializes the UI state to allow the shell to be shown and
    # hidden.
    initializeUI = ->

      # We grab the `consoletab` and wire up hover behavior for it.

      # We also wire up a click handler to show the console to the `consoletab`.
      toggleActivateAndShow = ->
        if _self.shell.isActive()
          hideAndDeactivate()
        else
          activateAndShow()
      activateAndShow = ->
        $consoletab.slideUp()
        _self.shell.activate()
        $consolePanel.slideDown()
        $consolePanel.focus()
      hideAndDeactivate = ->
        _self.shell.deactivate()
        $consolePanel.slideUp()
        $consolePanel.blur()
        $consoletab.slideDown()
      _console.log "[Josh.FeedlyConsole] initializeUI."
      $consoletab = $("#consoletab")
      if $consoletab.length is 0
        console.error "failed to find %s", $consoletab.selector
      $consoletab.hover (->
        $consoletab.addClass "consoletab-hover"
        $consoletab.removeClass "consoletab"
      ), ->
        $consoletab.removeClass "consoletab-hover"
        $consoletab.addClass "consoletab"

      $consoletab.click ->
        activateAndShow()

      $consolePanel = $("#shell-container")
      $consolePanel.resizable handles: "s"
      $(document).on "keypress", ((event) ->
        return  if _self.shell.isActive()
        if event.keyCode is 126
          event.preventDefault()
          activateAndShow()
      )
      _self.ui.toggleActivateAndShow = toggleActivateAndShow
      _self.ui.activateAndShow = activateAndShow
      _self.ui.hideAndDeactivate = hideAndDeactivate
      _self.shell.onEOT hideAndDeactivate
      _self.shell.onCancel hideAndDeactivate





    # wire up pageAction to toggle console
    # kind of a mess, but we only want to create one listener,
    # but initializeUI can be called multiple times because
    # feedly will blow away console that are added to early
    if chrome.runtime?  # running in extension
      _console.log "[Josh.FeedlyConsole] extension, initialize."
      initialize()
      observer = new MutationObserver(mutationHandler)
      chrome.runtime.onMessage.addListener (request, sender, sendResponse) ->
        _console.debug "[feedlyconsole] msg: %s.", request.msg
        if request.action is "icon_active"
          _console.debug "[feedlyconsole/icon_active] ignore."
        else if request.action is "toggle_console"
          unless _self.ui.toggleActivateAndShow?
            window.console.warn "[feedlyconsole] ui not yet ready"
          else
            _self.ui.toggleActivateAndShow()
        else if request.action is "cookie_feedlytoken"
          unless _self.api
            OAuth = request.feedlytoken

            url_array = request.url.split("/")
            url = url_array[0] + "//" + url_array[2]
            _console.debug """
            [feedlyconsole/cookie_feedlytoken] url: %s oauth: %s.""",
              url,
              _self.OAuth.slice(0, 8)
            _self.api = new FeedlyApiRequest(url,
              FEEDLY_API_VERSION,
              OAuth)
          else
            _console.debug """
            [feedlyconsole/cookie_feedlytoken]
             ignoreing, already initialized."""
        else
          _console.debug "[feedlyconsole] unknown action %s request %O.",
          request.action, request
        sendResponse action: "ack"

    else  # running in webpage
      $(document).ready ->
        _console.log "[Josh.FeedlyConsole] webpage, initialize."
        initialize()
        _self.ui.activateAndShow()

    _self
  )(root, $, _)
) this, $, _
console.log "[feedlyconsole] loaded %O.", Josh
