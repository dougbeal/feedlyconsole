// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
    if( /.*feedly.com.*/.test(tab.url)) {
        // ... show the page action.
        console.log( "checkForValidUrl " + tab.id + "/" + tab.url);
        activatePageActionTab(tab);

    }
}

function activatePageActionTab(tab) {
    msg = "show pageAction icon and send url " + tab.url + " to " + tab.id;
    action = "icon_active";
    console.log(msg);
    chrome.pageAction.show(tab.id);
    chrome.tabs.sendMessage(tab.id, 
                            {
                                "action": action,
                                "url": tab.url,
                                "id": tab.id,
                                "msg": msg
                            },
                            function(response) {
                                console.log("response: " + msg);
                            });
    grabCookies(tab);
}

function activatePageActionTabs(tabs) {
    tabs.forEach(activatePageActionTab);
}


function activateConsole(tab){
    msg = "toggle console " + tab.url + " to " + tab.id;
    action = "toggle_console";
    console.log(msg);
    chrome.tabs.sendMessage(tab.id, 
                            {
                                "action": action,
                                "url": tab.url,
                                "id": tab.id,
                                "msg": msg
                            },
                            function(response) {
                                console.log("response: " + msg);
                            });
    grabCookies(tab);
}

function grabCookies(tab){
    domain = tab.url.split('/')[2];
    filter = { "name":"session@cloud", 
               "domain":domain 
             };
    chrome.cookies.getAll(filter, function(cookies) {
            for (var i in cookies) {
                //console.log(JSON.stringify(cookies[i]));
                values=JSON.parse(cookies[i].value);
                //console.log(JSON.stringify(values));

                action = "cookie_feedlytoken";
                msg = action + " " + tab.url + " to " + tab.id + " " + filter;
                console.log(msg);
                chrome.tabs.sendMessage(tab.id, 
                                        {
                                            "action": action,
                                            "url": tab.url,
                                            "id": tab.id,
                                            "feedlytoken":values.feedlyToken,
                                            "msg": msg
                                        },
                                        function(response) {
                                            console.log("response: " + msg);
                                        });
            }
        });
}
chrome.pageAction.onClicked.addListener(activateConsole);
chrome.commands.onCommand.addListener(function(command) {
    console.log('Command:', command);
});
// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);

// activate pageaction on existing urls
chrome.tabs.query( {'url': '*://*.feedly.com/*'}, activatePageActionTabs);
