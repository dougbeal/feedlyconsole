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
  'feedlyconsole_test.coffee'
  'background.coffee'
  ]

include_test_files = (file for file in coffeeFiles when file
.indexOf('_test.coffee') >= 0)

coffee_options = "--bare --output #{dstJavascriptDir} --map --compile"

compile_files =
  'chrome-extension/manifest.json': '_data/manifest.yaml'

compile =
  'json':
    'yaml': (src, dst) ->
      "node_modules/.bin/json2yaml '#{src}' > '#{dst}'"



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
  "https://raw.github.com/jquery/jquery-simulate/master/jquery.simulate.js"
  #"https://raw.github.com/mojombo/tpw/master/css/syntax.css"
  "https://raw.github.com/madhur/madhur.github.com/master/files/css/syntax.css"
  ]

destination_directories_by_ext =
  js: 'javascript/ext'
  map: 'javascript/ext'
  css: 'stylesheets'
  json: '.'
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
  # args, opts, next
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

      last = optional.pop()
      if _.isArray last
        args = last
      else
        opts = last

    when 1
      last = optional.pop()
      if typeof last is 'function'
        next = last
      else
        if _.isArray last
          args = last
        else
          opts = last
    when 0
    else
      throw
        msg: "too many arguments"

  args_joined = args.join(' ')
  cmd_string = "#{cmd} #{args_joined}"
  output = null
  try
    child = exec cmd_string, opts, (error, stdout, stderr)->
      output = "run:cmd:'#{cmd_string}'"
      if opts? and not _.isEmpty(opts)
        output = "#{output} opts:'#{JSON.stringify(opts)}'"
      #output = "#{output} error:'#{error}'" if error?
      output = "#{output} stdout:'#{stdout.trim()}'" if stdout.length > 0
      if not error? and stderr.length > 0
        # if error is set, stderr is redundant
        output = "#{output}  stderr:'#{stderr.trim()}'"
      next? error, output
  catch error
    console.error 'caught error'
    util.error error
    next? error, output

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
      next? false, "curl: #{basename} exists, not downloading."
    else
      run "curl -sSO \"#{url}\"", cwd: cwd, next

task 'info2', 'test this', ->
  invoke 'info'

task 'info', 'Print out internal state', ->
  console.log @name
  console.log "test filtered_manifest_filenames #{filtered_manifest_filenames}."
  run 'ls|wc'
  run 'ls|wc', [], cwd: 'chrome-extension'
  run 'ls', ['foobar'], cwd: 'chrome-extension'
  run 'foobar', [], cwd: 'chrome-extension'
  run 'ls index.html', ->
    run 'ls coffeescript'
  run 'ls', ['javascript'], cwd: 'chrome-extension', ->
    run 'ls', ['stylesheets'], cwd: 'chrome-extension', ->
      run 'pwd', ['stylesheets'], cwd: 'chrome-extension', (err, out) ->
        console.log out
  run 'pwd', cwd: dstJavascriptDir, (err, out) ->
    console.log out
  run 'ls', cwd: dstJavascriptDir, (err, out) ->
    console.log out

gather_copy = () ->
  srcfiles = []
  dstfiles = {}
  for srcpath in copySearchPath
    for file in fs.readdirSync(srcpath)
      if (file in filtered_manifest_filenames or
      file in include_test_files)
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
  console.log 'include_test_files', include_test_files
  console.log 'gather_copy', gather_copy()

task 'copy', 'Copy files to build directory.', (options, cb) ->
  [srcfiles, dstmap] = gather_copy()
  dstdirs = _.keys dstmap
  dstfiles = _.flatten _.values(dstmap), true
  errors = []
  results = []
  create_destinations (e, r) ->
    errors.push e if e?
    results.push r.join(' ')
    console.log "copy:create_destinations count #{r.length} err #{e?}"
    async.map dstdirs,
      ((key, next) -> cp dstmap[key].join(' '), key, next),
      (e, r) ->
        errors.push e if e?
        results.push r.join(' ')
        console.log "copy:cp count #{r.length} err #{e?}"
        if errors?.length > 0
          console.error errors
          console.log results
        console.log 'copy: finished'
        cb? errors, results

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
  fn = if write_or_not then write else nowrite
  async.map chmodglobs, fn, (err, results) ->
    next? err, results

task 'download', 'Download javascripts to dstExtJavascriptDir', (options, cb) ->
  errors = []
  results = []
  create_destinations (e, r) ->
    console.log "download:create_destinations  count #{r.length} err #{e?}"
    errors.push e if e?
    results.push r.join(' ')
    async.map download_urls, curl, (e, r) ->
      console.log "download:map curl", e, r
      errors.push e if e?
      results.push r.join(' ')
      if errors?.length > 0
        console.error errors
        console.log results
      console.log 'download: finished.'
      cb? errors, results

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

patch_map_file = (file, next) ->
  name = path.basename file
  name = name.split('.')[...-1].join('.')
  map = JSON.parse fs.readFileSync file
  map.sourceRoot = ".."
  map.sources = [
    "src/#{name}.coffee"
    ]
  fs.writeFile file, JSON.stringify(map, null, 2), (e) ->
    r = "#{file}"
    r = "error:#{r}" if err?
    next e, r

task 'compile', 'Compile coffeescripts to dstExtJavascriptDir', (options, cb) ->
  task = 'compile'
  dstdir = path.join __dirname, dstJavascriptDir
  [srcfiles, dstfiles] = gather_compile()
  errors = []
  results = []
  create_destinations (e, r) ->
    console.log "#{task}:create_destinations  count #{r.length} err #{e?}"
    errors.push e if e?
    results.push r.join(' ')
    run "coffee #{coffee_options} #{srcfiles.join(' ')}", (e, r) ->
      console.log "#{task}: #{r}"
      errors.push e if e?
      results.push r
      mapfiles = (file for file in dstfiles when path.extname(file) is '.map')
      async.map mapfiles, patch_map_file, (e, r) ->
        console.log "#{task}: patched #{r}."
        errors.push e if e?
        results.push r
        console.log( "#{task}: finished." )
        cb? errors, results


task 'site', 'Build Jekyll _site', (options, cb) ->
  task = @name
  errors = []
  results = []
  run "jekyll build --trace", (e, r) ->
    console.log "#{task}: #{r}."
    errors.push e if e?
    results.push r
    console.log( "#{task}: finished." )
    cb? errors, results

task 'build', 'Build chrome extension', (options, cb) ->
  task = @name
  errors = []
  results = []
  async.map [
    'compile'
    'download'
    'copy'
    ],
    invoke,
    (e, r) ->
      errors.push e if e?
      results.push r
      invoke 'site', (e, r) ->
        errors.push e if e?
        results.push r
        invoke 'test', (e, r) ->
          errors.push e if e?
          results.push r
          console.log "#{task}: finished."
          console.error "#{task}: error", errors if errors?.length > 0
          cb? errors, results

gather_test = () ->
  [srcfiles, dstfiles] = gather_compile()
  testfiles = (file for file in dstfiles when file.indexOf('_test.js') >= 0)
  return testfiles

task 'test', 'Run tests', (options, cb) ->
  task = 'test'
  testfiles = gather_test()
  errors = []
  results = []
  mod = "u+x"
  async.map testfiles, (do ->
    (dest, next) -> return globchmod dest, mod, next),
    (e, r) ->
      console.log "#{task}:globchmod #{mod} count #{r.length} err #{e?}."
      errors.push e if e?
      results.push r
      run "NODE_PATH=. NODE_DEBUG=t
 mocha #{testfiles.join ' ' }", cwd: dstJavascriptDir,
      (e, r) ->
        errors.push e if e?
        console.error "#{task}:error", errors if errors?.length > 0
        console.log "#{task}: ", r
        console.log "#{task}: finished."
        cb errors, results


task 'watch', 'Watch prod source files and build changes', (options, cb) ->
  task = 'watch'
  console.log "#{task}: Watching for changes."
  _building = true
  build_done = (err, results) ->
    _building = false
    console.error "#{task}: ", err if err
    console.log "#{task}: ", results if results
    console.log "#{task}: finished building."

  change = (event, filename) ->
    console.log "#{task}: #{filename} #{event}"
    unless _building
      _building = true
      invoke 'build', build_done
    else
      console.log "#{task}: ignoring file watch, building in progress."

  [src, dst] = gather_compile()
  files = src
  [src, dst] = gather_copy()
  files.push.apply files, src
  # watch jekyll html files
  for dir in ['.', '_includes']
    for file in fs.readdirSync dir
      if path.extname(file) is '.html'
        files.push path.join dir, file
  console.log "#{task}: #{path.basename file for file in files}."
  for file in files
    try
      fs.watch file, persistent: true, change
    catch error
      console.error file, error
  invoke 'build', build_done

task 'clean', 'Clean out the build directory', (options, cb) ->
  target = path.join __dirname, dstDir
  run "rm -rf #{target}", (err, out) ->
    util.error err if err?
    console.log 'clean: finished. ', out
