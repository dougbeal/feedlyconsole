fs = require 'fs'
span = require('child_process').spawn

srcCoffeeDir = 'coffee-script'
dstJavascriptDir = 'chrome-extension/javascript'

coffeeFiles = [
        'feedlyconsole'
        ]

options = "--output #{dstJavascriptDir} --map --compile #{file}"

copySearchPath = [
        'josh.js/js'
        'josh.js/ext/optparse-js/lib'
        ]
manifest = JSON.parse fs.readFileSync("chrome-extension/manifest.json", "utf8")
content_scripts = manifest["content_scripts"]
manifest_js = []
manifest_js.push js for js in content_script['js'] for content_script in content_scripts
console.log 'feedlyconsole' in coffeeFiles, manifest_js.length, coffeeFiles.length
copy_files = []
copy_files.push file for file in manifest_js when file.split('.')[...-1].join('.') not in coffeeFiles

console.log copy_files
task 'test', 'Print out internal state', ->
        console.log "copy_files #{copy_files}."


task 'copy', 'Copy submodule javascript to dstJavascriptDir', ->
        for path in copySearchPath then do (path) ->
                for file in fs.readdirSync(path) when file in copy_files then do (file) ->
                        dst = "#{dstJavascriptDir}/#{file}"
                        spawn('cp', ["-fv", "#{path}/#{file}", dst])
                        spawn('chmod', ["a-w", dst])

                        
task 'watch', 'Watch prod source files and build changes', ->
    util.log "Watching for changes in #{srcrcCoffeeDir}"

    for file in coffeeFiles then do (file) ->
        fs.watchFile "#{srcCoffeeDir}/#{file}.coffee", (curr, prev) ->
            if +curr.mtime isnt +prev.mtime
                util.log "Saw change in #{srcCoffeeDir}/#{file}.coffee"
                invoke 'build'
