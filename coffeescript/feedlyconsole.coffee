_console =
  log: window.console.log.bind window.console
  debug: window.console.debug.bind window.console


_josh_disable_console =
  log: () ->
  debug: () ->

Josh = Josh or {}
Josh.Debug = true
Josh.config =
  history: new Josh.History()
  console: _console
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

  url: ->
    @url

  _url_parameters: (args) ->
    "?" + _.map(args, (v, k) ->
      k + "=" + v
      ).join("&")

  get: (resource, args, callback) ->
    unless chrome.extension?
      # not embedded, demo mode
      demo = demo_data[resource]
      status = if demo then 'ok' else 'error'
      _console.debug "[feedlyconsole/apirequest] fetching %s %O, status %s.",
        resource,
        demo,
        status
      callback demo, status, null
    else
      url = [ @url, resource ].join('/') + @_url_parameters args
      _console.debug "[feedlyconsole/apirequest] fetching %s at %s.", resource, url
      request = @build_request url
      $.ajax(request).always (response, status, xhr) ->
        _console.debug "[feedlyconsole/apirequest] '%s' status '%s' response %O xhr %O.",
          resource, status, response, xhr
        return callback response, status, xhr

  build_request: (url) ->
    url: url
    dataType: "json"
    xhrFields:
      withCredentials: true


class FeedlyApiRequest extends ApiRequest
  constructor: (@url, @api_version, @oauth) ->
    super([@url, @api_version].join('/'))
    @resources = [
      "profile"
      "tags"
      "subscriptions"
      "preferences"
      "categories"
      "topics"
      "streams"
    ]

  build_request: (url) ->
    request = super(url)
    request.headers = Authorization: "OAuth #{@oauth}"
    return request

  validate_resource: (resource, args) ->
    return _.find @resources, (str) -> resource.indexOf(str) is 0

  get: (resource, args, callback) ->
    return callback null, 'error', null unless @validate_resource resource, args
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
        callback(response, status)
      else
        if response? and response
          return callback(response, status)
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

  constructor: (@name, @path, @type, @json_data) ->
    @children = null
    FeedlyNode._NODES[@path] = @
    @type ?= 'node'
    _console.debug "[feedlyconsole/FeedlyNode] new '%s' %O.", @path, @

  @_initRootNode: =>
    @_ROOT_NODE ?= new RootFeedlyNode()

  @_getPathParts: (path) ->
    parts = path.split("/")
    #remove empty trailing element
    return parts.slice(0, parts.length - 1)  if parts[parts.length - 1] is ""
    return parts

  @_current: ->
    return Josh.config.pathhandler.current

  @_api:  ->
    return Josh.FeedlyConsole.api

  # normalize path
  @_resolvePath: (path) =>
    parts = @_getPathParts(path)

    # non-empty item 0 indicates relative path
    # when relative, prepend _current path
    parts = @_getPathParts(@_current().path).concat(parts) if parts[0] isnt ""

    # resolve `.` and `..`
    resolved = []
    _.each parts, (x) ->
      return if x is "."
      if x is ".."
        resolved.pop()
      else
        resolved.push x

    return "/" if not resolved? or resolved.length is 1
    return resolved.join("/")


  @getNode: (path, callback) =>
    @_initRootNode()
    _console.debug "[feedlyconsole/FeedlyNode] looking for node at '%s'.", path
    return callback @_ROOT_NODE unless path?
    normalized = @_resolvePath path
    _console.debug "[feedlyconsole/FeedlyNode] normalized path '%s'", normalized
    return callback @_NODES[normalized] if normalized of @_NODES

    name = _.last normalized.split('/')
    @call_api_by_path normalized, (json, status) ->
      if status is 'error'
        callback null
      else
        node = new FeedlyNode(name, normalized, 'name', json)
        return callback node

  @call_api_by_path: (path, callback) ->
    parts = path.split('/')
    _console.debug "[feedlyconsole/FeedlyNode.call_api_by_path]
 depth %i, %O.", parts.length, parts
    if parts.length is 2 # [ "", "profile" ]
      @_api().get _.last(parts), [], (response, status) ->
        callback(response, status)
    else # [ "", "categories", "blackberry" ]
      # get parent node
      parent_path = parts[0...-1].join '/'
      name = _.last parts
      @getNode parent_path, (parent) =>
        _console.debug "[feedlyconsole/FeedlyNode.call_api_by_path]
 parent %O @ %s.", parent, parent_path
        id = parent.getChildId(name)
        return callback("", "error") unless id?
        encoded_id = encodeURIComponent id
        @_api().get "streams/#{encoded_id}/contents", [], (response, status) ->
          callback(response, status)

  @getChildNodes: (node, callback) =>
    @_initRootNode()
    node.getChildNodes callback

  call_api_by_path: (callback) ->
    FeedlyNode.call_api_by_path @path, (json, status) =>
      @json_data = json
      callback(json)

  # match title or label to get id
  getChildId: (name) ->
    @call_api_by_path unless @json_data?
    if _.isArray(@json_data)
      item = _.find @json_data, (item) ->
        _.find ['title', 'label', 'id'], (field) ->
          item[field] is name
      return item.id if item?
    return null

  getChildNodes: (callback) ->
    if @type is 'leaf'
      @children = null
      return callback @children
    else
      unless @json_data?
        @call_api_by_path =>
          @children ?= @makeJSONNodes()
          return callback @children
      else
        @children ?= @makeJSONNodes()
        return callback @children

  makeJSONNodes: (json) ->
    json ?= @json_data
    json = json.items if 'items' of json
    if _.isArray(json)
      nodes = _.map json, (item) =>
        name = item.title or item.label or item.id
        path = [@path, name].join '/'
        type = if 'id' of item then 'node' else 'leaf'
        json = if 'id' of item then null else item
        return new FeedlyNode name, path, type, json
      return nodes
    else
      # its a map, so all children are leaves
      _.map json, (value, key) =>
        name = [
          key
          value
        ].join(":")
        json =
          key: value
        return new FeedlyNode name, @path, 'leaf', json


class RootFeedlyNode extends FeedlyNode
  constructor: () ->
    super FeedlyNode._ROOT_PATH,
      FeedlyNode._ROOT_PATH,
      { cmds: FeedlyNode._ROOT_COMMANDS }
    @type = 'root'

  getChildNodes: (callback) ->
    unless @children?
      @children =[]
      for name in FeedlyNode._ROOT_COMMANDS
        child_path = [@path, name].join('')
        if child_path of FeedlyNode._NODES
          @children.push FeedlyNode._NODES[child_path]
        else
          @children.push new FeedlyNode(name, child_path, 'node', null)
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
      observer: null

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

    _self.shell.templates.info = _.template """
    <div class='node'><code>
      <pre><%= JSON.stringify(nodes, null, 2) %></pre>
    </code></div>"""

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
            _console.debug "[feedlyconsole/handler] data %O cmd %O args %O",
            data, cmd, args
            callback template(template_args)
        else
          path = _self.pathandler.current.path
          callback _self.shell.templates.not_ready({cmd, path})


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

    addCommandHandler 'info'
    ,
      exec: do ->
        options = {}
        parser = new optparse.OptionParser [
          ['-h', '--help', "Command help"]]

        parser.on "help", ->
          options.help = true
          this.halt()

        parser.on 0, (subcommand)->
          options.subcommand = subcommand
          this.halt()

        parser.on '*', ->
          options.error = true
          this.halt()

        (cmd, args, callback) ->
          #reset parser/state
          options = {}
          parser._halt = false

          parser.parse args
          _console.debug "[feedlconsole/info] args %s options %s",
            args.join(' '), JSON.stringify options
          nodes = _self.pathhandler.current
          if options.help
            return callback _self.shell.templates.options
              help_string: parser.toString() +
              '\n  CMD Specify which node, or all'
          else if options.subcommand
            switch options.subcommand
              when "all" then nodes = FeedlyNode._NODES
              else nodes = FeedlyNode.getNode options.subcommand, (node) ->
                if node
                  return callback _self.shell.templates.info {nodes: node}
                else
                  return callback _self.shell.templates.not_found
                    cmd: 'info'
                    path: options.subcommand
          return callback _self.shell.templates.info
            nodes: nodes
      help: "info on current path node"
      completion: Josh.config.pathhandler.pathCompletionHandler

    #<section id='onNewPrompt'/>

    # This attaches a custom prompt render to the shell.
    _self.shell.onNewPrompt (callback) ->
      callback _self.shell.templates.prompt(
        self: _self
        node: _self.pathhandler.current
      )

    ###
    # Wiring up PathHandler
    # =====================

    #<section id='getNode'/>

    # getNode
    # -------

    # `getNode` is required by `Josh.PathHandler` to provide
    # filesystem behavior. Given a path, it is expected to return a
    # pathnode or null;
    ###
    _self.pathhandler.getNode = FeedlyNode.getNode

    ###
    #<section id='getChildNodes'/>

    # getChildNodes
    # -------------

    # `getChildNodes` is the second function implementation required
    # for `Josh.PathHandler`. Given a pathnode, it returns a list of
    # child pathnodes. This is used by `Tab` completion to resolve a
    # partial path, after first resolving the nearest parent node
    # using `getNode
    ###
    _self.pathhandler.getChildNodes = FeedlyNode.getChildNodes

    ###
    #<section id='initialize'/>
    #
    # initalize
    # --------------
    ###

    # This function sets the node
    initialize = (evt) -> #err, callback) {
      insertShellUI()
      FeedlyNode.getNode "/", (node) ->
        return err("could not initialize root directory")  unless node
        _self.pathhandler.current = node

    insertCSSLink = (name) ->
      _console.debug "[feedlyconsole/init] inserting css #{name}"
      # insert css into head
      $("head").append $ "<link/>",
        rel: "stylesheet"
        type: "text/css"
        href: chrome.extension.getURL(name)

    doInsertShellUI = ->
      _self.observer.disconnect() if _self.observer?
      file = "feedlyconsole.html"
      _console.debug "[feedlyconsole/init] injecting shell ui from %s.", file
      #insertCSSLink "stylesheets/styles.css"
      #insertCSSLink("stylesheets/source-code-pro.css");
      insertCSSLink "stylesheets/jquery-ui.css"
      insertCSSLink "stylesheets/feedlyconsole.css"
      feedlyconsole = $("<div/>",
        id: "feedlyconsole"
      ).load(chrome.extension.getURL(file), ->
        _console.log "[feedlyconsole/init]
 loaded shell ui %s %O readline.attach %O.",
        file, $("#feedlyconsole"), this
        Josh.config.readline.attach $("#shell-panel").get(0)
        initializeUI()
      )
      $("body").prepend feedlyconsole

    insertShellUI = ->
      if $("#feedlyconsole").length is 0
        target = document
        config =
          attributes: true
          subtree: true
        _console.debug "[feedlyconsole/init/observer]
 mutation observer start target %O config %O",
          target,
          config
        _self.observer.observe target, config if _self.observer
      else
        _console.debug "[feedlyconsole/init/shell] #feedlyconsole found."
        initializeUI()

    # watch body writing until its stable enough to doInsertShellUI
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
          _console.debug "[feedlyconsole/init/observer] %s: [%s]=%s on %O",
            type, name, value, target

          # not sure if wide will always be set, so trigger on the next mod
          wide = name is "class" and value.indexOf("wide") isnt -1
          narrow = name is "class" and value.indexOf("narrow") isnt -1
          page = name is "_pageid" and value.indexOf("rot2") isnt -1
          if not _found and (wide or page or narrow)
            _console.debug "[feedlyconsole/init/observer]
 mutation observer end %O", _self.observer
            _found = true
            doInsertShellUI()

            # found what we were looking for
            null


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
      _console.log "[feedlyconsole/init] initializeUI."
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

      _self.shell.onEOT hideAndDeactivate
      _self.shell.onCancel hideAndDeactivate

      # export ui functions so they can be called by background page
      # via page action icon
      _self.ui.toggleActivateAndShow = toggleActivateAndShow
      _self.ui.activateAndShow = activateAndShow
      _self.ui.hideAndDeactivate = hideAndDeactivate

    if chrome.runtime?  # running in extension
      _console.log "[feedlyconsole/init] in extension contex, initializing."

      _console.debug "[feedlyconsole/init] mutationHandler installed."
      _self.observer = new MutationObserver(mutationHandler)
      initialize()

      # listener to messages from background page
      chrome.runtime.onMessage.addListener (request, sender, sendResponse) ->
        _console.debug "[feedlyconsole/msg] msg: %s.", request.msg
        if request.action is "icon_active"
          _console.debug "[feedlyconsole/msg/icon_active] ignore."
        else if request.action is "toggle_console"
          unless _self.ui.toggleActivateAndShow?
            window.console.warn "[feedlyconsole/msg] ui not ready."
          else
            _self.ui.toggleActivateAndShow()
        else if request.action is "cookie_feedlytoken"
          unless _self.api
            oauth = request.feedlytoken
            url_array = request.url.split "/"
            url = url_array[0] + "//" + url_array[2]
            _console.debug "[feedlyconsole/msg/cookie_feedlytoken]
 api init, url: %s oauth: %s.",
              url,
              oauth.slice 0, 8
            _self.api = new FeedlyApiRequest(url,
              FEEDLY_API_VERSION,
              oauth)
          else
            oauth = request.feedlytoken.slice 0, 8
            url = request.url
            _console.debug "[feedlyconsole/msg/cookie_feedlytoken]
 ignoring, api, url (%s), oauth (%s) already initialized.", url, oauth

        else
          _console.debug "[feedlyconsole/msg] unknown action %s request %O.",
          request.action, request
        sendResponse action: "ack"

    else  # running in webpage
      $(document).ready ->
        _console.log "[feedlyconsole/init] webpage context, initialize."
        initialize()
        _self.api = new FeedlyApiRequest("",
          FEEDLY_API_VERSION,
          null)
        _self.ui.activateAndShow()

    _self
  )(root, $, _)
) this, $, _
console.log "[feedlyconsole] loaded %O.", Josh
