fs = require 'fs'
spawn = require('child_process').spawn

srcCoffeeDir = 'coffee-script'
dstDir = 'chrome-extension'
dstJavascriptDir = 'chrome-extension/javascript'

coffeeFiles = [
        'feedlyconsole'
        ]

options = "--output #{dstJavascriptDir} --map --compile #{file}"

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
        js: 'javascript'
        map: 'javascript'
        css: 'stylesheets'

manifest = JSON.parse fs.readFileSync("chrome-extension/manifest.json", "utf8")
content_scripts = manifest["content_scripts"]
manifest_js = []
manifest_js.push js for js in content_script['js'] for content_script in content_scripts
copy_files = []
copy_files.push file.split('/').pop() for file in manifest_js when file.split('.')[...-1].join('.') not in coffeeFiles

run = (cmd, args, opts = []) ->
        child = spawn cmd, args
        child.stdout.on 'data', (data) ->
                console.log cmd, args, data.toString() if data
        child.stderr.on 'data', (data) ->
                console.log cmd, args, data.toString() if data

                
cp_chmod = (src, dst) ->
        run 'mkdir', ["-p", dst.split('/')[...-1].join('/')]
        run 'cp', ["-fv", src, dst]
        run 'chmod', ["-v", "a-w", dst]

curl = (url) ->
        ext = url.split('.')[-1]
        filename = url.split('/')[-1]
        dstByType = download_dst[ext]
        dst_dir = "#{dstDir}/#{dstByType}"
        path = "#{dstDir}/#{dstByType}/#{filename}"
        console.log url, ext, filename, dstByType, dst_dir, path
        run 'mkdir', ["-p", dst_dir]        
        fs.exists path, (exists) ->
                run 'curl', ['-sqO', url], cwd: dst_dir unless exists
 
task 'test', 'Print out internal state', ->
        console.log "copy_files #{copy_files}."


task 'copy', 'Copy submodule javascript to dstJavascriptDir', ->
        console.log "copy #{copy_files}"
        for path in copySearchPath then do (path) ->
                console.log path
                for file in fs.readdirSync(path) when file in copy_files then do (file) ->
                        console.log file
                        cp_chmod "#{path}/#{file}", "#{dstJavascriptDir}/#{file}"

task 'download', 'Download necessary javascript files for inclusion into the extension', ->
        for url in download_urls then do (url) ->
                console.log "url #{url}"
                curl url

task 'watch', 'Watch prod source files and build changes', ->
    util.log "Watching for changes in #{srcrcCoffeeDir}"

    for file in coffeeFiles then do (file) ->
        fs.watchFile "#{srcCoffeeDir}/#{file}.coffee", (curr, prev) ->
            if +curr.mtime isnt +prev.mtime
                util.log "Saw change in #{srcCoffeeDir}/#{file}.coffee"
                invoke 'build'
