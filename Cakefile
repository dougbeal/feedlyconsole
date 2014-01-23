#CoffeeScript = require 'coffee-script'
fs = require 'fs'
{exec} = require 'child_process'
util = require 'util'
path = require 'path'
async = require 'async'
_ = require 'underscore'

out = console.log.bind console
dir = console.dir.bind console

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

github = "https://raw.github.com"
mocha = "#{github}/visionmedia/mocha/ffaa38d49d10d4a5efd8e8b67db2960c4731cdc3"
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
  "#{github}/madhur/madhur.github.com/master/files/css/syntax.css"
  "#{github}/chaijs/chai/4b51ea75484eae9225a4330d267f5e231f208ed0/chai.js"
  "#{mocha}/mocha.js"
  "#{mocha}/mocha.css"
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



#  args = [], opts = [], callback
run = (cmd, optional...) ->
  # args, opts, callback
  opts = {}
  args = []
  switch optional.length
    when 3
      callback = optional.pop()
      opts = optional.pop()
      args = optional.pop()
    when 2
      last = optional.pop()
      if typeof last is 'function'
        callback = last
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
        callback = last
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
      out "trace-" + output if trace
      if opts? and not _.isEmpty(opts)
        output = "#{output} opts:'#{JSON.stringify(opts)}'"
      #output = "#{output} error:'#{error}'" if error?
      output = "#{output} stdout:'#{stdout.trim()}'" if stdout.length > 0
      if not error? and stderr.length > 0
        # if error is set, stderr is redundant
        output = "#{output}  stderr:'#{stderr.trim()}'"
      return callback? error, output
  catch error
    console.error 'caught error'
    util.error error
    return callback? error, output

#need to run synchronously or at least sequentially
cp_chmod = (src, dst, callback) ->
  run 'cp', ["-fv", src, dst], ->
    run 'chmod', ["-v", "a-w", dst], callback

cp = (src, dst, callback) ->
  run 'cp', ["-fv", src, dst], callback

cp_obj = (obj, callback) ->
  run 'cp', ["-fv", src, dst], callback

mkdir = (path, callback) ->
  run 'mkdir', ["-pv", path], callback

nowrite = (dst, callback) ->
  globchmod dst, "a-w", callback

write = (dst, callback) ->
  globchmod dst, "u+w", callback

globchmod = (dst, mode, callback) ->
  fs.stat dst, (err, stats) ->
    if not err? and stats.isDirectory()
      # implicit glob
      chmod path.join(dst, '*'), mode, callback
    else
      # could be a file or an explicit glob
      chmod dst, mode, callback


chmod = (dst, mode, callback) ->
  run 'chmod', ["-v", mode, dst], callback

get_destination_by_ext = (filepath) ->
  ext = _.last filepath.split('.')
  return path.join __dirname, dstDir, destination_directories_by_ext[ext]

curl = (url, callback) ->
  ext = url.split('.').pop()
  filename = url.split('/').pop()
  dstByType = destination_directories_by_ext[ext]
  cwd = path.join dstDir, dstByType
  filepath = path.join get_destination_by_ext(filename), filename
  fs.exists filepath, (exists) ->
    if exists
      basename = path.basename filepath
      return callback? null, "curl: #{basename} exists, not downloading."
    else
      return run "curl -sSO \"#{url}\"", cwd: cwd, callback

option '-v', '--verbose', 'Print out more.'
option '-t', '--trace', 'Trace task invocation.'

verbose = false
trace = false

process_options = (options) ->
  if not verbose and options.verbose
    out "options: verbose"
    verbose = options.verbose?
  if not trace and options.trace
    out "options: trace"
    trace = options.trace?



task 'info2', 'test this', (o, callback)->
  process_options o
  dir arguments
  dir o
  out "verbose set" if verbose
  invoke 'info', o, ->
    out 'info2: back after invoke info'

task 'info', 'Print out internal state', (o) ->
  out o
  out @name
  out "test filtered_manifest_filenames #{filtered_manifest_filenames}."
  run 'ls|wc'
  run 'ls|wc', [], cwd: 'chrome-extension'
  run 'ls', ['foobar'], cwd: 'chrome-extension'
  run 'foobar', [], cwd: 'chrome-extension'
  run 'ls index.html', ->
    run 'ls coffeescript'
  run 'ls', ['javascript'], cwd: 'chrome-extension', ->
    run 'ls', ['stylesheets'], cwd: 'chrome-extension', ->
      run 'pwd', ['stylesheets'], cwd: 'chrome-extension', (err, output) ->
        out output
  run 'pwd', cwd: dstJavascriptDir, (err, output) ->
    out output
  run 'ls', cwd: dstJavascriptDir, (err, output) ->
    out output

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
  out 'manifest', manifest
  out 'download_filenames', download_filenames
  out 'filtered_manifest_filenames', filtered_manifest_filenames
  out 'include_test_files', include_test_files
  out 'gather_copy', gather_copy()

task 'copy', 'Copy files to build directory.', (o, callback) ->
  [srcfiles, dstmap] = gather_copy()
  dstdirs = _.keys dstmap
  dstfiles = _.flatten _.values(dstmap), true
  errors = []
  results = []
  create_destinations (e, r) ->
    errors.push e if e?
    results.push r.join(' ')
    out "copy:create_destinations count #{r.length} err #{e?}"
    async.map dstdirs,
      ((key, callback) -> cp dstmap[key].join(' '), key, callback),
      (e, r) ->
        errors.push e if e?
        results.push r.join(' ')
        out "copy:cp count #{r.length} err #{e?}"
        if errors?.length > 0
          console.error errors
          out results
        out 'copy: finished'
        errors = null unless errors.length
        callback? errors, results

create_destinations = (callback) ->
  dstdirs = _.uniq (path.join __dirname, dstDir,
  dir for ext, dir of destination_directories_by_ext)
  async.map dstdirs, mkdir, (err, results) ->
    callback? err, dstdirs

chmod_destinations = (files, write_or_not, callback) ->
  target_ext = _.uniq (_.last file.split('.') for file in files)
  chmodglobs = []
  for ext, dir of destination_directories_by_ext when ext in target_ext
    chmodglobs.push path.join __dirname, dstDir, dir, "*.#{ext}"
  chmodglobs = _.uniq chmodglobs
  fn = if write_or_not then write else nowrite
  async.map chmodglobs, fn, (err, results) ->
    callback? err, results

task 'download', 'Download javascripts to dstExtJavascriptDir',
(options, callback) ->
  task = @name
  errors = []
  results = []
  out "#{task}: start."
  create_destinations (e, r) ->
    out "#{task}:create_destinations  count #{r.length} err #{e?}"
    errors.push e if e?
    results.push r.join(' ')
    out "#{task}:async started"
    async.map download_urls, curl, (e, r) ->
      out "#{task}:map curl", e, r
      errors.push e if e?
      results.push r.join(' ')
      if errors?.length > 0
        console.error errors
        out results
      out '#{task}: finished.'
      errors = null unless errors.length
      callback? errors, results

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
  out gather_compile()

patch_map_file = (file, callback) ->
  task = 'patch_map_file'
  name = path.basename file
  name = name.split('.')[...-1].join('.')
  fs.readFile file, (error, data) ->
    out "#{task}: readFile #{file} error '#{error}'" if trace
    return callback? error, r if error
    map = JSON.parse data
    map.sourceRoot = ".."
    map.sources = [
      "src/#{name}.coffee"
      ]
    fs.writeFile file, JSON.stringify(map, null, 2), (error) ->
      out "#{task}: writeFile #{file} error '#{error}'" if trace
      r = "#{file}"
      r = "error:#{r}" if err?
      return callback? error, r

task 'compile', 'Compile coffeescripts to dstExtJavascriptDir',
(options, callback) ->
  task = @name
  dstdir = path.join __dirname, dstJavascriptDir
  [srcfiles, dstfiles] = gather_compile()
  errors = []
  results = []
  out "#{task}: start."
  create_destinations (e, r) ->
    out "#{task}:create_destinations  count #{r.length} err #{e?}"
    errors.push e if e?
    results.push r.join(' ')
    run "coffee #{coffee_options} #{srcfiles.join(' ')}", (e, r) ->
      out "#{task}: #{r}"
      errors.push e if e?
      results.push r
      mapfiles = (file for file in dstfiles when path.extname(file) is '.map')
      async.map mapfiles, patch_map_file, (e, r) ->
        out "#{task}: patched #{r}."
        errors.push e if e?
        results.push r
        out "#{task}: error '#{e}'. results '#{results.length}'" if trace
        out "#{task}: finished."
        errors = null unless errors.length
        callback? errors, results


task 'site', 'Build Jekyll _site', (options, callback) ->
  task = @name
  errors = []
  results = []
  run "jekyll build --trace", (e, r) ->
    out "#{task}: #{r}."
    errors.push e if e?
    results.push r
    out( "#{task}: finished." )
    errors = null unless errors.length
    callback? errors, results

task 'build', 'Build chrome extension', (options, callback) ->
  task = @name
  errors = []
  results = []
  out "#{task}: starting."
  async.map [
    'compile'
    'download'
    ],
    invoke,
    (e, r) ->
      out "#{task}: terminated early." if e
      out "#{task}: parallel done."
      out "#{task}: error '#{e}'. results '#{results.length}'" if trace
      errors.push e if e?.length
      results.push r
      # copy depends on downloaded files
      invoke 'copy', (e, r) ->
        errors.push e if e?.length
        out "#{task}: error #{e}." if trace
        results.push r
        invoke 'site', (e, r) ->
          errors.push e if e?.length
          out "#{task}: error #{e}." if trace
          results.push r
          invoke 'test', (e, r) ->
            errors.push e if e?.length
            out "#{task}: error #{e}." if trace
            results.push r
            out "#{task}: finished."
            console.error "#{task}: error", errors if errors?.length > 0
            errors = null unless errors.length
            callback? errors, results

gather_test = () ->
  return [ "_site/test.html" ]
  #return [ "#{srcCoffeeDir}/launch_phantom_test.coffee" ]
  #return [ "#{srcCoffeeDir}/launch_zombie_test.coffee" ]


task 'test', 'Run tests', (options, callback) ->
  task = 'test'
  testfiles = gather_test()
  errors = []
  results = []
  mod = "u+x"
  async.map testfiles, (do ->
    (dest, callback) -> return globchmod dest, mod, callback),
    (e, r) ->
      out "#{task}:globchmod #{mod} count #{r.length} err #{e?}."
      errors.push e if e?
      results.push r
      run "node_modules/.bin/mocha-phantomjs
 #{testfiles.join ' ' }", cwd: __dirname,
      (e, r) ->
        errors.push e if e?
        console.error "#{task}:error", errors if errors?.length > 0
        out "#{task}: ", r
        out "#{task}: finished."
        errors = null unless errors.length
        callback? errors, results

task 'gather_watch', ->
  out gather_watch()

gather_watch = ->
  [src, dst] = gather_compile()
  files = src
  [src, dst] = gather_copy()
  files.push.apply files, src
  # watch jekyll html files
  for dir in ['.', '_includes']
    for file in fs.readdirSync dir
      if path.extname(file) is '.html'
        files.push path.join dir, file
  files.push "_config.yml"
  files.push.apply files, gather_test()
  return _.uniq files

task 'watch', 'Watch prod source files and build changes', (o, callback) ->
  process_options o
  task = 'watch'
  out "#{task}: Watching for changes."
  _building = true
  build_done = (err, results) ->
    _building = false
    console.error "#{task}: ", err if err?.length
    out "#{task}: ", results if err?.length and results?.length
    out "#{task}: finished building r:#{results?.length}."

  change = (event, filename) ->
    out "#{task}: #{filename} #{event}"
    unless _building
      _building = true
      invoke 'build', build_done
    else
      out "#{task}: ignoring file watch, building in progress."

  files = gather_watch()
  out "#{task}: #{path.basename file for file in files}."
  invoke 'build', (err, results) ->
    # wait for build to finish
    for file in files
      try
        fs.watch file, persistent: true, change
      catch error
        console.error file, error
    build_done err, results


task 'clean', 'Clean out the build directory', (options, callback) ->
  target = path.join __dirname, dstDir
  run "rm -rf #{target}", (err, output) ->
    util.error err if err?
    out 'clean: finished. ', output
