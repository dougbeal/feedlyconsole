#CoffeeScript = require 'coffee-script'
fs = require 'fs'
{exec} = require 'child_process'
util = require 'util'
path = require 'path'


srcCoffeeDir = 'coffeescript'
dstDir = 'chrome-extension'
dstJavascriptDir = "#{dstDir}/javascript"
dstExtJavascriptDir = "#{dstJavascriptDir}/ext"

coffeeFiles = [
  'feedlyconsole'
  'background'
  ]

options = "--bare --output #{dstJavascriptDir} --map --compile"

copySearchPath = [
  'josh.js/js'
  'josh.js/ext/optparse-js/lib'
  ]

download_urls = [
  "http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.js"
  "http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js"
  "http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.map"
  "http://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js"
  "http://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.map"
  "http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.2/underscore-min.js"
  "http://code.jquery.com/ui/1.9.2/themes/base/jquery-ui.css"
  ]

download_dst =
  js: 'javascript/ext'
  map: 'javascript/ext'
  css: 'stylesheets'


manifest = JSON.parse fs.readFileSync("chrome-extension/manifest.json", "utf8")
content_scripts = manifest["content_scripts"]
manifest_js = []
for content_script in content_scripts
  for js in content_script['js']
    manifest_js.push js


copy_files = []
copy_files.push file
  .split('/')
  .pop() for file in manifest_js when file
    .split('.')[...-1]
    .join('.') not in coffeeFiles

#  args = [], opts = [], next
run = (cmd, optional...) ->
  opts = {}
  args = []
  switch optional.length
    when 3
      next = optional.pop()
      opts = optional.pop()
      args = optional.pop()
    when 2
      last = optional.pop()
      if typeof last is 'function'
        next = last
      else
        opts = last
      args = optional.pop()
    when 1
      last = optional.pop()
      if typeof last is 'function'
        next = last
      else
        args = last
    when 0
    else
      throw
        msg: "too many arguments"
      
  args_joined = args.join(' ')
  cmd_string = "#{cmd} #{args_joined}"
  try
    child = exec cmd_string, opts, (error, stdout, stderr)->
      output = "#{cmd_string}"
      output = "#{output} #{JSON.stringify(opts)}" if opts?
      output = "#{output} #{error}" if error?
      output = "#{output} >> #{stdout.trim()}" if stdout.length > 0
      output = "#{output}  stderr:#{stderr.trim()}" if stderr.length > 0
      if error? util.error output else console.log output
      next() if next?
  catch error
    util.error error

#need to run synchronously or at least sequentially
cp_chmod = (src, dst) ->
  run 'mkdir', ["-vp", dst.split('/')[...-1].join('/')], ->
    run 'cp', ["-fv", src, dst], ->
      run 'chmod', ["-v", "a-w", dst]

curl = (url) ->
  ext = url.split('.').pop()
  filename = url.split('/').pop()
  dstByType = download_dst[ext]
  cwd = "#{dstDir}/#{dstByType}"
  path = "#{dstDir}/#{dstByType}/#{filename}"
  fs.exists path, (exists) ->
    if exists
      console.log "#{filename} up to date."
    else
      run 'mkdir', ["-pv", cwd], ->
        run 'curl', ['-sSO', url], cwd: cwd

task 'test', 'Print out internal state', ->
  console.log "test copy_files #{copy_files}."
  run 'ls|wc'
  run 'ls|wc', [], cwd: 'chrome-extension'
  run 'ls', ['foobar'], cwd: 'chrome-extension'
  run 'foobar', [], cwd: 'chrome-extension'
  run 'ls index.html', ->
    run 'ls coffeescript'
  run 'ls', ['javascript'], cwd: 'chrome-extension', ->
    run 'ls', ['stylesheets'], cwd: 'chrome-extension', ->
      run 'pwd', ['stylesheets'], cwd: 'chrome-extension'


task 'copy', 'Copy submodule javascript to dstExtJavascriptDir', ->
  for path in copySearchPath then do (path) ->
    for file in fs.readdirSync(path) when file in copy_files then do (file) ->
      console.log 'copy', path, file
      cp_chmod "#{__dirname}/#{path}/#{file}",
       "#{__dirname}/#{dstExtJavascriptDir}/#{file}"

task 'download', 'Download javascripts to dstExtJavascriptDir', ->
  for url in download_urls then do (url) ->
    curl url

task 'compile', 'Compile coffeescripts to dstExtJavascriptDir', ->
  files = (path.join( __dirname, srcCoffeeDir, "#{name}.coffee") for name in coffeeFiles).join(' ')
  run "coffee #{options} #{files}"

task 'build', 'Build chrome extension', ->
  invoke 'copy'
  invoke 'download'
  invoke 'compile'

task 'watch', 'Watch prod source files and build changes', ->
  console.log "Watching for changes in #{srcrcCoffeeDir}"
  for file in coffeeFiles then do (file) ->
    fs.watchFile "#{srcCoffeeDir}/#{file}.coffee", (curr, prev) ->
    if +curr.mtime isnt +prev.mtime
      console.log "Saw change in #{srcCoffeeDir}/#{file}.coffee"
      invoke 'build'
