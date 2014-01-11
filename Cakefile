#CoffeeScript = require 'coffee-script'
fs = require 'fs'
{exec} = require 'child_process'
util = require 'util'
path = require 'path'
async = require 'async'
_ = require 'underscore'



srcCoffeeDir = 'coffeescript'
dstDir = 'build/chrome-extension'
dstJavascriptDir = "#{dstDir}/javascript"
dstExtJavascriptDir = "#{dstJavascriptDir}/ext"

coffeeFiles = [
  'feedlyconsole.coffee'
  'background.coffee'
  ]

options = "--bare --output #{dstJavascriptDir} --map --compile"

copySearchPath = [
  'coffeescript'
  'josh.js/js'
  'josh.js/ext/optparse-js/lib'
  'chrome-extension'
  'chrome-extension/icon'
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

destination_directories_by_ext =
  js: 'javascript/ext'
  map: 'javascript/ext'
  css: 'stylesheets'
  json: '.'
  html: '.'
  png: 'icon'
  coffee: 'src'

download_filenames = (_.last(url.split '/') for url in download_urls)
manifest_JSON = JSON.parse fs.readFileSync("chrome-extension/manifest.json",
  "utf8")
manifest = []
for files in manifest_JSON["content_scripts"]
  for file in files['js']
    manifest.push file
for file in manifest_JSON["web_accessible_resources"]
  manifest.push file
manifest = manifest.concat _.values manifest_JSON["icons"]
manifest = manifest.concat _.values manifest_JSON["page_action"]['default_icon']

manifest.push('manifest.json')

include_filename = (filename) ->
  splt = filename.split '.'
  basename = splt[...-1].join '.'
  ext = _.last splt
  #cofp = filename not in coffeeFiles
  dowp = filename not in download_filenames
  extp = ext of destination_directories_by_ext
  return dowp and extp #cofp and


filtered_manifest_filenames = []
for file in manifest
  filename = _.last(file.split('/'))
  if include_filename filename
    filtered_manifest_filenames.push filename

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
      if opts? and not _.isEmpty(opts)
        output = "#{output} #{JSON.stringify(opts)}"
      output = "#{output} #{error}" if error?
      output = "#{output} >> #{stdout.trim()}" if stdout.length > 0
      output = "#{output}  stderr:#{stderr.trim()}" if stderr.length > 0
      if error? then util.error output
      next? error, output
  catch error
    util.error error

#need to run synchronously or at least sequentially
cp_chmod = (src, dst, next) ->
  run 'cp', ["-fv", src, dst], ->
    run 'chmod', ["-v", "a-w", dst], next

cp = (src, dst, next) ->
  run 'cp', ["-fv", src, dst], next

cp_obj = (obj, next) ->
  run 'cp', ["-fv", src, dst], next

mkdir = (path, next) ->
  run 'mkdir', ["-pv", path], next

nowrite = (dst, next) ->
  globchmod dst, "a-w", next

write = (dst, next) ->
  globchmod dst, "u+w", next

globchmod = (dst, mode, next) ->
  fs.stat dst, (err, stats) ->
    if not err? and stats.isDirectory()
      # implicit glob
      chmod path.join(dst, '*'), mode, next
    else
      # could be a file or an explicit glob
      chmod dst, mode, next


chmod = (dst, mode, next) ->
  run 'chmod', ["-v", mode, dst], next

get_destination_by_ext = (filepath) ->
  ext = _.last filepath.split('.')
  return path.join __dirname, dstDir, destination_directories_by_ext[ext]

curl = (url, next) ->
  ext = url.split('.').pop()
  filename = url.split('/').pop()
  dstByType = destination_directories_by_ext[ext]
  cwd = path.join dstDir, dstByType
  filepath = path.join get_destination_by_ext(filename), filename
  fs.exists filepath, (exists) ->
    if exists
      basename = path.basename filepath
      next? null, "curl: #{basename} exists, not downloading."
    else
      run 'curl', ['-sSO', url], cwd: cwd, next


task 'test', 'Print out internal state', ->
  console.log "test filtered_manifest_filenames #{filtered_manifest_filenames}."
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
  srcfiles = []
  dstfiles = {}
  for srcpath in copySearchPath
    for file in fs.readdirSync(srcpath)
      if file in filtered_manifest_filenames
        srcfile = path.join __dirname, srcpath, file
        srcfiles.push(srcfile)
        dst = get_destination_by_ext(file)
        if dst of dstfiles
          dstfiles[dst].push srcfile
        else
          dstfiles[dst] = [srcfile]
  return [srcfiles, dstfiles]

task 'gather_copy', 'List copy files', ->
  console.log 'manifest', manifest
  console.log 'download_filenames', download_filenames
  console.log 'filtered_manifest_filenames', filtered_manifest_filenames
  console.log 'gather_copy', gather_copy()

task 'copy', 'Copy files to build directory.', ->
  [srcfiles, dstmap] = gather_copy()
  dstdirs = _.keys dstmap
  dstfiles = _.flatten _.values(dstmap), true
  create_destinations (err, results) ->
    util.error err if err?
    console.log 'copy:create_destinations  ', results.join(' ')
    chmod_destinations dstfiles, true, (err, results) ->
      util.error err if err?
      console.log 'copy:chmod_destinations, writable ', results.join(' ')
      async.map dstdirs,
        ((key, next) -> cp dstmap[key].join(' '), key, next),
        (err, results) ->
          util.error err if err?
          console.log 'copy:cp  ', results.join(' ')
          chmod_destinations dstfiles, false, (err, results) ->
            util.error err if err?
            console.log 'copy:chmod_destinations, not writable: ',
              results.join(' ')
            console.log 'copy: finished'

create_destinations = (next) ->
  dstdirs = _.uniq (path.join __dirname, dstDir,
  dir for ext, dir of destination_directories_by_ext)
  async.map dstdirs, mkdir, (err, results) ->
    next? err, dstdirs

chmod_destinations = (files, write_or_not, next) ->
  target_ext = _.uniq (_.last file.split('.') for file in files)
  chmodglobs = []
  for ext, dir of destination_directories_by_ext when ext in target_ext
    chmodglobs.push path.join __dirname, dstDir, dir, "*.#{ext}"
  chmodglobs = _.uniq chmodglobs
  console.log target_ext, chmodglobs
  fn = if write_or_not then write else nowrite
  async.map chmodglobs, fn, (err, results) ->
    next? err, results

task 'download', 'Download javascripts to dstExtJavascriptDir', ->
  create_destinations (err, results) ->
    util.error err if err?
    console.log "download:create_destinations: ", results.join(' ')
    async.map download_urls, curl, (err, results) ->
      util.error err if err?
      console.log "download:map curl", err, results
      chmod_destinations download_urls, false, (err, results) ->
        util.error err if err?
        console.log "download: chmod_destinations. ", results.join(' ')
        console.log 'download: finished.'

gather_compile = () ->
  dstdir = path.join __dirname, dstJavascriptDir
  dstfiles = _.flatten (path.join(
    dstdir,
    filename
      .split('.')[...-1]
      .join('.') + ext) for filename in coffeeFiles for ext in [
        '.map'
        '.js'
        ])
  srcfiles = (path.join(
    __dirname,
    srcCoffeeDir,
    "#{filename}") for filename in coffeeFiles)
  return [srcfiles, dstfiles]

task 'gather_compile', 'List compile files', ->
  console.log gather_compile()

task 'compile', 'Compile coffeescripts to dstExtJavascriptDir', ->
  dstdir = path.join __dirname, dstJavascriptDir
  [srcfiles, dstfiles] = gather_compile()
  create_destinations (err, results) ->
    util.error err if err?
    console.log "compile.create_destinations: ", results.join(' ')
    run "coffee #{options} #{srcfiles.join(' ')}", (err, out) ->
      util.error err if err?
      console.log 'compile: finished. ', out
      for file in dstfiles
        if path.extname(file) is '.map'
          name = path.basename file
          name = name.split('.')[...-1].join('.')
          map = JSON.parse fs.readFileSync file
          map.sourceRoot = ".."
          map.sources = [
            "src/#{name}.coffee"
            ]
          fs.writeFile file, JSON.stringify(map, null, 2), (err) ->
            util.error err if err?
            console.log "compile: patched #{file} paths"



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

task 'clean', 'Clean out the build directory', ->
  target = path.join __dirname, dstDir
  run "rm -rf #{target}", (err, out) ->
    util.error err if err?
    console.log 'clean: finished. ', out
