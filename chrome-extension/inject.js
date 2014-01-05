(function() {
    function supress(event) {
        if(document.getElementById('shell-container') !== null &&
           document.getElementById('shell-container').style.display === "block")
        {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.cancelBubble = true;
            console.log("[feedlyconsole/inject] supressing key");
            return false;   
        }
    }
    Object.defineProperty(document.documentElement, 'onkeydown', {
        value: supress,
        writable: false,     /* Cannot be overwritten, default false */
        configurable: false, /* Cannot be deleted, or modified */
        enumerable: true     /* Does not really matter. If true, it's visible in
                                a for-loop. If false, it's not*/
    });
    Object.defineProperty(document.documentElement, 'onpress', {
        value: supress,
        writable: false,     /* Cannot be overwritten, default false */
        configurable: false, /* Cannot be deleted, or modified */
        enumerable: true     /* Does not really matter. If true, it's visible in
                                a for-loop. If false, it's not*/
    });
})();
