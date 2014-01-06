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
