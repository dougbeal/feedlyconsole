class @InputAdapter
  constructor: (@target) ->

  input_event: (type, code) ->
    @target.simulate type, keyCode: code

  enter: ->
    @input_event 'keydown', $.simulate.keyCode.ENTER

  input: (string, enter=true) ->
    for i in [0...string.length]
      code = string.charCodeAt i
      @input_event 'keydown', code
      @input_event 'keypress', code
      @input_event 'keyup', code
    @enter() if enter

  current: ->
    $('#shell-cli .input .left').text()

  onscreen: ->
    $('#shell-view .input .left').map (i,v) -> $(v).text()

render_callback = ->
should = chai.should()

# wrap Josh.config.shell.render
Josh.config.shell.render = do () ->
  old = Josh.config.shell.render
  ->
    v = old()
    render_callback()
    return v

cli_commands = [ "clear", "help", "history", "ls", "pwd", "cd",
  "profile", "tags", "subscriptions", "preferences", "categories",
  "topics", "info" ]
cli_async_commands = [
  "profile"
  "tags"
  "subscriptions"
  "preferences"
  "categories"
  "topics"
  'info'
]
cli_sync_commands = _.difference cli_commands, cli_async_commands
cli_commands_no_output = [
  "clear"
  "cd"
]
cli_sync_commands_with_output = _.difference cli_sync_commands,
  cli_commands_no_output
console.log 'cli_sync_commands:', cli_sync_commands
console.log 'cli_sync_commands_with_output:', cli_sync_commands_with_output


verify_cd_no_output = (children=null) ->
  console.log "verify_cd_no_output"
  command = "cd"
  children = $('#shell-view').children().get() unless children?
  for child,i in children
    child = $ child
    console.log "##{i} outer:", child.prop('outerHTML'), " text:",
    child.text()
  children.should.have.length.at.least 2
  l = children.length
  children.reverse()
  next = 0
  console.log "prompt at #{l-next-1}"
  child = $ children[next]
  prop = child.prop 'outerHTML'
  should.exist prop
  prop.should.contain 'prompt'
  prop = child.prop 'id'
  should.exist prop
  prop.should.equal 'shell-cli'
  next++

  #command or error on output
  console.log "command at #{l-next-1}"
  child = $ children[next]
  text = child.text()
  prop = child.prop 'outerHTML'
  should.exist prop
  prop.should.contain 'prompt'
  text.should.not.contain "Unrecognized command:"
  text.should.not.contain "No such directory"
  text.should.contain command

verify_command_with_output = (command, children=null) ->
  children = $('#shell-view').children().get() unless children?
  children.should.have.length.at.least 3
  l = children.length
  children.reverse()

  next = 0
  console.log "prompt at #{l-next-1}"
  child = $ children[next]
  prop = child.prop 'outerHTML'
  should.exist prop
  prop.should.contain 'prompt'
  prop = child.prop 'id'
  should.exist prop
  prop.should.equal 'shell-cli'
  next++

  # is there a clear?
  child = $ children[next]
  prop = child.prop 'class'
  if prop? and prop is 'clear'
    console.log "clear at #{l-next-1}"
    children.should.have.length.at.least 3
    next++

  # command output
  console.log "output at #{l-next-1}"
  child = $ children[next]
  text = child.text()
  text.should.not.be.empty
  next++

  #command
  console.log "command at #{l-next-1}"
  child = $ children[next]
  text = child.text()
  prop = child.prop 'outerHTML'
  should.exist prop
  prop.should.contain 'prompt'
  text.should.not.contain "Unrecognized command:"
  text.should.contain command


$(document).ready ->
  window.console.log "[feedlyconsole/test]"
  describe 'nop', ->
    it 'always succeed', ->
      true

  should = chai.should()
  describe 'dependencies should be loaded', ->
    it 'chai loaded', ->
      window.console.log "[feedlyconsole/test] chai"
      chai.should()
    it '$ exists', ->
      $.should.exist
    it 'jQuery version exists', ->
      jQuery.fn.jquery.should.exist
    it 'jquery.simulate exists', ->
      $.simulate.should.exist


  describe 'keypress in shell-panel', ->
    it 'a', ->
      char = 'a'
      code = char.charCodeAt(0)
      $('#shell-panel').simulate 'keypress', keyCode: code
      text = $('#shell-cli .input .left').text()
      should.exist text
      text.should.include char

    it 'abcdefg', ->
      s = 'abcdefg'
      p = $('#shell-panel')
      for c in s
        code = c.charCodeAt 0
        p.simulate 'keypress', keyCode: code
      text = $('#shell-cli .input .left').text()
      should.exist text
      text.should.include s


  describe 'valid command in shell-panel', ->
    ia = new InputAdapter $('#shell-panel')

    it 'history is cleared', ->
      ia.enter()
      ia.input 'history --clear'
      ia.input 'clear'
      ia.input 'history'
      ia.current().should.be.empty
      spans = ia.onscreen()
      spans.should.have.length 2
      spans[0].should.equal 'history'
      _.last(spans).should.be.empty # current cursor

    it 'history has history', ->
      ia.enter()
      ia.input 'history --clear'
      cmds = [
        'clear'
        'history'
        'history'
        ]
      (ia.input cmd for cmd in cmds)
      spans = ia.onscreen()
      spans.should.have.length 3
      spans[0].should.equal 'history'
      spans[1].should.equal 'history'
      _.last(spans).should.be.empty # current cursor
      divs = $('#shell-cli').prev().children('div')
      for i in [0...divs.length]
        t = $(divs[i]).text()
        t[0].should.equal "#{i}"
        l = cmds[i].length + 2
        t[2...l].should.equal cmds[i]

    it 'invalid command foobar', ->
      ia.enter()
      ia.input 'history --clear'
      ia.input 'clear'
      cmd = 'foobar'
      ia.input cmd
      spans = ia.onscreen()
      spans.should.have.length.at.least 2
      cmd_index = spans.length - 2
      spans[cmd_index].should.equal cmd
      _.last(spans).should.be.empty # current cursor
      divs = $('#shell-cli').parent().children('div')
      l = divs.length
      i = l - 2
      text = $(divs[i]).text()
      console.log "divs #{divs.length} #{text}"
      text.should.contain "Unrecognized command:"
      text.should.contain cmd

    it 'ls not Unrecognized', ->
      ia.enter()
      ia.input 'history --clear'
      ia.input 'clear'
      cmd = 'ls'
      ia.input cmd
      spans = ia.onscreen()
      spans.should.have.length.at.least 2
      cmd_index = spans.length - 2
      spans[cmd_index].should.equal cmd
      _.last(spans).should.be.empty # current cursor
      children = $('#shell-cli').parent().children()
      children = children.get()
      children.reverse()
      child = $ children[0]
      child.prop('id').should.equal 'shell-cli'
      child = $ children[1]
      child.prop('class').should.equal 'clear'
      child = $ children[2]
      child.prop('tagName').should.equal 'UL'

    it 'info not Unrecognized', ->
      ia.enter()
      ia.input 'cd /'
      ia.input 'history --clear'
      ia.input 'clear'
      cmd = 'info'
      ia.input cmd
      spans = ia.onscreen()
      spans.should.have.length.at.least 2
      cmd_index = spans.length - 2
      spans[cmd_index].should.equal cmd
      _.last(spans).should.be.empty # current cursor

      children = $('#shell-view').children()
      children = children.get()
      children.reverse()
      for child,i in children
        child = $ child
        console.log "##{i}", child.prop 'outerHTML'
      child = $ children[0]
      #console.log child.prop 'outerHTML'
      child.prop('id').should.equal 'shell-cli'
      child = $ children[1]
      html = child.prop 'outerHTML'
      #console.log html
      child.prop('class').should.contain 'node'
      html.should.contain('name')
      html.should.contain '/'
      html.should.contain 'type'

    it 'cd sync no output',  ->
      command = 'cd'
      ia.enter()
      ia.input 'history --clear'
      ia.input 'clear'
      ia.input command
      verify_cd_no_output()

    it 'invalid cd sync no output',  ->
      command = 'cd foobar'
      ia.enter()
      ia.input 'history --clear'
      ia.input 'clear'
      ia.input command
      verify_cd_no_output.should.throw chai.AssertionError


    it 'clear sync no output', ->
      command = 'clear'
      ia.enter()
      ia.input 'history --clear'
      ia.input 'clear'
      ia.input command
      children = $('#shell-view').children().get()
      children.should.have.length 1
      child = $ _.last children
      oh = child.prop 'outerHTML'
      oh.should.contain 'prompt'
      $('#shell-cli').text().should.not.contain "Unrecognized command:"



    for command in cli_sync_commands_with_output
      it "#{command} sync with output", do (command) -> ->
        ia.enter()
        ia.input 'cd /'
        ia.input 'history --clear'
        ia.input 'clear'
        ia.input command
        children = $('#shell-view').children().get()
        for child,i in children
          child = $ child
          console.log "##{i} outer:", child.prop('outerHTML'), " text:",
          child.text()
        verify_command_with_output command, children

    for command in cli_async_commands
      it "#{command} produces async output", do (command) -> (done) ->
        @timeout 250
        start = Date.now()
        ia.enter()
        ia.input 'history --clear'
        ia.input 'clear'
        ia.input command, false
        count = 0
        console.log "[feedlyconsole/test/#{command}:#{Date.now()-start}]
 before callback count #{count}."
        render_callback = ->
          count = count + 1
          console.log "[feedlyconsole/test/#{command}:#{Date.now()-start}]
 render count #{count}."
          if count > 1
            children = $('#shell-view').children().get()
            ###
            for child,i in children
              child = $ child
              console.log "##{i} outer:", child.prop('outerHTML'), " text:",
              child.text()
            ###
            verify_command_with_output command, children
            console.log "[feedlyconsole/test/#{command}:#{Date.now()-start}]
 ending callback at count #{count}."
            render_callback = ->
            done()
        ia.enter()


    it 'info should take a path', ->
      ia.enter()
      ia.input 'cd /'
      ia.input 'history --clear'
      ia.input 'clear'
      path = '/profile'
      cmd = 'info ' + path
      ia.input cmd
      spans = ia.onscreen()
      spans.should.have.length.at.least 2
      cmd_index = spans.length - 2
      _.last(spans).should.be.empty # current cursor
      children = $('#shell-view').children()
      children = children.get()
      children.reverse()
      for child,i in children
        child = $ child
        console.log "##{i}", child.prop 'outerHTML'

      child = $ children[0]
      child.prop('id').should.equal 'shell-cli'
      child = $ children[1]
      html = child.prop 'outerHTML'
      child.prop('class').should.contain 'node'
      html.should.contain 'name'
      html.should.contain path
      html.should.contain 'type'
      html.should.contain 'json_data'

  describe 'series of commands in shell-panel', ->
    ia = new InputAdapter $('#shell-panel')

    it "cd tags;cd tech", (done) ->
      FeedlyNode.reset()
      @timeout 250
      start = Date.now()
      count = 0
      callback = ->
        count = count + 1
        console.log "[feedlyconsole/test/#{@name}:#{Date.now()-start}]
render count #{count}."
        if count > 1
          children = $('#shell-view').children().get()
          for child,i in children
            child = $ child
            console.log "##{i} outer:", child.prop('outerHTML'), " text:",
            child.text()
          verify_command_with_output 'ls', children
          console.log "[feedlyconsole/test/#{@name}:#{Date.now()-start}]
ending callback at count #{count}."
          render_callback = ->
          done()

      console.log "[feedlyconsole/test/#{@name}:#{Date.now()-start}]
before callback count #{count}."
      ia.enter()
      ia.input 'cd /'
      ia.input 'history --clear'
      ia.input 'clear'
      ia.input 'cd tags'
      verify_cd_no_output()
      ia.input 'cd tech'
      verify_cd_no_output()
      ia.input 'ls', false
      render_callback = callback
      ia.enter()





  $(window).load ->
    window.console.log "[feedlyconsole/test] mocha running"
    if window.mochaPhantomJS
      mochaPhantomJS.run()
    else
      mocha.run()
