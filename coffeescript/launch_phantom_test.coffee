fs = require 'fs'
webpage = require 'webpage'

chai = require 'chai'
chai.Assertion.includeStack = true
should = chai.should()

describe 'mocha in phantomjs browser', ->
  this.timeout(5000)
  page = null
  before ->
    page = webpage.create()

  it 'should run on visit', (done)->
    page.open "file://#{process.cwd()}/_site/test.html", (status) ->
      console.log "phantom page status #{status}"
    browser
    .visit()
    .then ->
      browser.wait (window) ->
        # wait for mocha in zombie to finish
        value = window.document.querySelector '#mocha'
      ,
      null
    .then ->
      browser.wait (window) ->
        # wait for mocha in zombie to finish
        window.document.querySelector '#mocha-stats'
      ,
      null
    .then ->
      done()
  after ->
    fs.writeFileSync "results.html", browser.html()
    phantom.exit
