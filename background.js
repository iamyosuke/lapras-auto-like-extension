// Background script for LAPRAS Auto Like extension
console.log('LAPRAS Auto Like background script loaded');

// インストール時の処理
chrome.runtime.onInstalled.addListener(() => {
  console.log('LAPRAS Auto Like extension installed');
});

// メッセージの中継処理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  // popupからcontent scriptへのメッセージを中継
  if (request.action === 'startAutoLike' || request.action === 'stopAutoLike') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const tab = tabs[0];
        console.log('Sending message to tab:', tab.id, 'URL:', tab.url);
        
        // LAPRAS求人検索ページかチェック
        if (!tab.url || !tab.url.includes('lapras.com/jobs/search')) {
          console.error('Not on LAPRAS job search page:', tab.url);
          sendResponse({ error: 'Please navigate to LAPRAS job search page first' });
          return;
        }
        
        chrome.tabs.sendMessage(tab.id, request, (response) => {
          if (chrome.runtime.lastError) {
            const errorMessage = chrome.runtime.lastError.message || 'Unknown error occurred';
            console.error('Error sending message to content script:', errorMessage);
            console.log('Tab URL:', tab.url);
            console.log('Tab status:', tab.status);
            
            // Content scriptが読み込まれていない可能性がある場合の対処
            if (errorMessage.includes('Could not establish connection')) {
              sendResponse({ error: 'Content script not loaded. Please refresh the page and try again.' });
            } else {
              sendResponse({ error: errorMessage });
            }
          } else {
            console.log('Message sent successfully, response:', response);
            sendResponse(response || { status: 'no_response' });
          }
        });
      } else {
        console.error('No active tab found');
        sendResponse({ error: 'No active tab found' });
      }
    });
    return true; // 非同期レスポンスを示す
  }
});

// タブの更新を監視
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // LAPRAS求人検索ページが読み込まれた時の処理
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('lapras.com/jobs/search')) {
    console.log('LAPRAS job search page loaded:', tab.url);
  }
});
