fs = require 'fs'
Browser = require 'zombie'
browser = new Browser
  debug: false
  waitFor: 200
  silent: true


chai = require 'chai'
chai.Assertion.includeStack = true
should = chai.should()

describe 'mocha in zombie browser', ->
  this.timeout(5000)
  it 'should run on visit', (done)->
    browser
    .visit("file://#{process.cwd()}/_site/test.html")
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
