class @InputAdapter
  constructor: (@target) ->

  input_event: (type, code) ->
    @target.simulate type, keyCode: code

  enter: ->
    @input_event 'keydown', $.simulate.keyCode.ENTER

  input: (string) ->
    for i in [0...string.length]
      code = string.charCodeAt i
      @input_event 'keydown', code
      @input_event 'keypress', code
      @input_event 'keyup', code
    @enter()

  current: ->
    $('#shell-cli .input .left').text()

  onscreen: ->
    $('#shell-view .input .left').map (i,v) -> $(v).text()


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

  $(window).load ->
    window.console.log "[feedlyconsole/test] mocha running"
    if window.mochaPhantomJS
      mochaPhantomJS.run()
    else
      mocha.run()
