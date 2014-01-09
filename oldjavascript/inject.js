// no jquery, since this is injected into an uncertain environment
(function() {

    function supress(event) {
        if(document.getElementById('shell-container') !== null &&
           document.getElementById('shell-container').style.display === 'block')
        {
            //event.preventDefault();
            event.stopPropagation();
            //event.stopImmediatePropagation();
            event.cancelBubble = true;
            console.debug('[feedlyconsole/inject] supressing key');
            return false;   
        } else {
            console.debug('[feedlyconsole/inject] not supressing key');
            return true;
        }
    }
    target = document.getElementById('shell-panel') || document.getElementsByTagName('body')[0];
    if(target.length === 0) {
        console.error('[feedlyconsole/inject] no body found');
    }
    console.log('[feedlyconsole/inject] supressing %O', target);
    target.addEventListener('keydown', supress);
    target.addEventListener('keypress', supress);
})();
console.log('[feedlyconsole/inject] injected inject.js');

/* call from content script
function inject() {
    // inject after readline is initilized
    $(document).ready( function() {
        var file = 'inject.js';
        // supress keydown, keypress when console is active
        console.debug("[feedlyconsole] injecting " + file);
        var script = $('<script/>', {
            src: chrome.extension.getURL(file),
            type: 'text/javascript'
        });

        script.ready( function() {
            console.debug("[feedlyconsole] loaded inject.js %O", script);
        });
        $('head').prepend(script);

    });
}
inject()
}
