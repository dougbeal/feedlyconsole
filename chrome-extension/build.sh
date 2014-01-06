#!/bin/bash
(
    cd javascript
    cp -vf ../../josh.js/js/{readline,history,killring,pathhandler,shell}.js .
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
)
(
    cd stylesheets
    if [ ! -e source-code-pro.css ]; then
        curl -q "http://fonts.googleapis.com/css?family=Source+Code+Pro" > source-code-pro.css
    fi

)

