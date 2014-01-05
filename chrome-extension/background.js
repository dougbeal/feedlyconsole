// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
    // If the letter 'g' is found in the tab's URL...
    if( /.*feedly.com.*/.test(tab.url)) {
        // ... show the page action.
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
    chrome.cookies.getAll({"name":"session@cloud"}, function(cookies) {
        for (var i in cookies) {
            console.log(JSON.stringify(cookies[i]));
            console.log(JSON.stringify(JSON.parse(cookies[i].value)));
        }
    });
}
chrome.pageAction.onClicked.addListener(activateConsole);

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);

// activate pageaction on existing urls
chrome.tabs.query( {'url': '*://*.feedly.com/*'}, activatePageActionTabs);
