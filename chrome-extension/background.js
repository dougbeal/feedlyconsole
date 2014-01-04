// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
    // If the letter 'g' is found in the tab's URL...
    if( /.*feedly.com.*/.test(tab.url)) {
        // ... show the page action.
        activatePageActionTab(tab);

    }
};

function activatePageActionTab(tab) {
    chrome.pageAction.show(tab.id);
}

function activatePageActionTabs(tabs) {
    tabs.forEach(activatePageActionTab);
}





// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);

chrome.tabs.query( {'url': '*://*.feedly.com/*'}, activatePageActionTabs);
