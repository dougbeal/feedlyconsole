//var jquery = "http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js";
var jquery = "http://ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.js";
var scripts = [ 
    "http://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js",
    "http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.2/underscore-min.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/killring.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/history.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/readline.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/shell.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/pathhandler.js",
    "http://dougbeal.github.io/feedlyconsole/josh.js/js/example.js"
];


function scriptsLoaded()
{ 
    window.console.log("scripts loaded, feedlyconsole.js complete");
    window.console.log(jQuery('head'));
}

function callbackjQuery()
{
    debugger;
    jQuery.when.apply(jQuery, jQuery.map(scripts, jQuery.getScript)).done(scriptsLoaded);

}

function loadjQuery(url, callback)
{
    // Adding the script tag to the head as suggested before
    var head = document.getElementsByTagName('head')[0];
    if (typeof jQuery == 'undefined')
    {
        window.console.log('loading jQuery');
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        
        // Then bind the event to the callback function.
        // There are several events for cross browser compatibility.
        script.onreadystatechange = callback;
        script.onload = callback;
        
        // Fire the loading
        head.appendChild(script);
    }
    else
    {
        window.console.log('jQuery already loaded');
        callback();
    }
}

loadjQuery(jquery, callbackjQuery);
window.console.log("file feedlyconsole.js");

