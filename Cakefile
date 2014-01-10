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
  "http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.5.2/underscore-min.js"
  "http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.5.2/underscore-min.map"
  "http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.5.2/underscore.js"
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
cp_chmod = (src, dst, next) ->
  run 'cp', ["-fv", src, dst], ->
    run 'chmod', ["-v", "a-w", dst], next

cp = (src, dst, next) ->
  run 'cp', ["-fv", src, dst], next

nowrite = (dst, next) ->
  globchmod dst, "a-w", next

write = (dst, next) ->
  globchmod dst, "u+w", next

globchmod = (dst, mode, next) ->
  fs.stat dst, (err, stats) ->
    if stats.isFile()
      chmod dst, mode, next
    else
      chmod path.join(dst, '*'), mode, next

chmod = (dst, mode, next) ->
  run 'chmod', ["-v", mode, dst], next

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

gather_copy = () ->
  dstdir = path.join __dirname, dstExtJavascriptDir
  srcfiles = []
  dstfiles = []
  for srcpath in copySearchPath
    for file in fs.readdirSync(srcpath)
      if file in copy_files
        srcfile = path.join __dirname, srcpath, file
        dstfile = path.join dstdir, file
        srcfiles.push(srcfile)
        dstfiles.push(dstfile)
  return [srcfiles, dstfiles]

task 'copy', 'Copy submodule javascript to dstExtJavascriptDir', ->
  dstdir = path.join __dirname, dstExtJavascriptDir
  [srcfiles, dstfiles] = gather_copy()
  fs.mkdir dstdir, ->
    write dstdir, ->
      cp srcfiles.join(' '), dstdir, ->
        nowrite dstdir

# TODO: chmod isn't working...
task 'download', 'Download javascripts to dstExtJavascriptDir', ->
  for ext, dir in download_dst
    dstdir = path.join __dirname, dstDir, dir
    fs.mkdir dstdir
  for url in download_urls
    curl url
  for ext, dir in download_dst
    dstdir = path.join __dirname, dstDir, dir
    nowrite dstdir

gather_compile = () ->
  dstdir = path.join __dirname, dstJavascriptDir
  dstfiles = (path.join(
    dstdir,
    "#{name}.js") for name in coffeeFiles)
  srcfiles = (path.join(
    __dirname,
    srcCoffeeDir,
    "#{name}.coffee") for name in coffeeFiles)
  return [srcfiles, dstfiles]

task 'compile', 'Compile coffeescripts to dstExtJavascriptDir', ->
  [srcfiles, dstfiles] = gather_compile()
  run "coffee #{options} #{srcfiles.join(' ')}"

task 'build', 'Build chrome extension', ->
  invoke 'copy'
  invoke 'download'
  invoke 'compile'

task 'watch', 'Watch prod source files and build changes', ->
  console.log "Watching for changes."
  change = (event, filename) ->
    console.log "watch: #{filename} #{event}"
    invoke 'copy'
    invoke 'compile'
  [src, dst] = gather_compile()
  files = src
  [src, dst] = gather_copy()
  files.push.apply files, src
  for file in files
    fs.watch file, persistent: true, change
