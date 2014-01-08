#!/bin/bash
function copy_chmod() {
   for filename in ${filenames[@]}; do
        file=${filename}.${ext}
        cp -vf $source_dir/$file .

    done
}
(
    cd javascript
    filenames=( "readline" "history" "killring" "pathhandler" "shell" )
    source_dir=../../josh.js/js
    ext="js"

    copy_chmod

    filenames=( "optparse" )
    source_dir=../../josh.js/ext/optparse-js/lib

    copy_chmod

    if [ ! -e jquery.min.js ]; then
        curl -qO "http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.js"
        curl -qO "http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js"
        curl -qO "http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.map"
    fi
    if [ ! -e jquery-ui.min.js ]; then
        curl -qO "http://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js"
        curl -qO "http://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.map"
    fi
    if [ ! -e underscore-min.js ]; then
        curl -qO "http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.2/underscore-min.js"

    fi
    chmod a-w *
)
(
    cd stylesheets
    if [ ! -e source-code-pro.css ]; then
        curl -q "http://fonts.googleapis.com/css?family=Source+Code+Pro" > source-code-pro.css
    fi
    if [ ! -e jquery-ui.css ]; then
        curl -qO "http://code.jquery.com/ui/1.9.2/themes/base/jquery-ui.css"
    fi
    chmod a-w *
)
