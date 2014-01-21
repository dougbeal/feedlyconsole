Browser = require 'zombie'
browser = new Browser
  debug: true
  waitFor: 200


chai = require 'chai'
chai.Assertion.includeStack = true
should = chai.should()

browser.on "error", (error) ->
  console.error error


describe 'Loads pages', ->
  this.timeout(5000)
  before (done) ->
    browser
    .visit("file://#{process.cwd()}/../../../index.html")
    .then( done, done )
  it 'should load index.html', ->
    should.not.exist browser.error
    browser.text("title").should.equal 'Feedlyconsole demo by dougbeal'

  it 'should log text', ->
    browser.evaluate "console.log( 'log text' )"

  it 'should input text', ->
    words = ['profile', 'ls']
    for word in words
      for char in word
        i = char.charCodeAt(0)
        r = browser.evaluate """
          $('#shell-panel').simulate("keypress", {
            keyCode: #{i}
          });
          #{i};"""
        ###
        r = browser.evaluate """
          function keypress(key) {
            $('#shell-panel').simulate( "keypress", {
              keyCode: key
            });
            return key
          };
          keypress( #{i} ) ;
          """
        ###
        r.should.equal i
      browser.text("#shell-cli .input .left").should.equal word

      i = "jQuery.simulate.keyCode.ENTER"
      browser.evaluate """
          $('#shell-panel').simulate("keydown", {
            keyCode: #{i}
          });
          #{i};"""
