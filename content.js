// LAPRAS Auto Like Content Script
console.log('LAPRAS Auto Like content script loaded on:', window.location.href);
console.log('Document ready state:', document.readyState);

// 設定
let CONFIG = {
  buttonSelector: 'li.reaction-btn-wrap button.reaction-btn',
  clickDelay: 1000, // 1秒間隔でクリック
  nextPageDelay: 10000, // ページ遷移後の待機時間
  maxRetries: 3 // 最大リトライ回数
};

// 実行状態管理
let isRunning = false;
let shouldStop = false;

// 現在のページ番号を取得
function getCurrentPageNumber() {
  const urlParams = new URLSearchParams(window.location.search);
  return parseInt(urlParams.get('page')) || 1;
}

// 次のページのURLを生成
function getNextPageUrl() {
  const currentUrl = new URL(window.location.href);
  const currentPage = getCurrentPageNumber();
  currentUrl.searchParams.set('page', currentPage + 1);
  return currentUrl.toString();
}

// いいねボタンを見つける
function findLikeButtons() {
  const buttons = document.querySelectorAll(CONFIG.buttonSelector);
  console.log(`Found ${buttons.length} like buttons`);
  return Array.from(buttons).filter(button => {
    // 「興味あり」テキストを含むボタンのみを対象とする
    const labelElement = button.querySelector('.label');
    return labelElement && labelElement.textContent.trim() === '興味あり';
  });
}

// ボタンをクリック
function clickButton(button) {
  return new Promise((resolve) => {
    try {
      // ボタンが表示されているかチェック
      if (button.offsetParent === null) {
        console.log('Button is not visible, skipping');
        resolve(false);
        return;
      }

      // スクロールしてボタンを表示
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setTimeout(() => {
        try {
          button.click();
          console.log('Button clicked successfully');
          resolve(true);
        } catch (error) {
          console.error('Error clicking button:', error);
          resolve(false);
        }
      }, 500);
    } catch (error) {
      console.error('Error in clickButton:', error);
      resolve(false);
    }
  });
}

// すべてのいいねボタンを順次クリック
async function clickAllLikeButtons() {
  const buttons = findLikeButtons();
  
  if (buttons.length === 0) {
    console.log('No like buttons found');
    return false;
  }

  console.log(`Starting to click ${buttons.length} buttons`);
  let successCount = 0;

  for (let i = 0; i < buttons.length; i++) {
    // 停止フラグをチェック
    if (shouldStop) {
      console.log('Auto-like process stopped by user');
      return false;
    }

    const button = buttons[i];
    console.log(`Clicking button ${i + 1}/${buttons.length}`);
    
    const success = await clickButton(button);
    if (success) {
      successCount++;
    }
    
    // 次のクリックまで待機
    if (i < buttons.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.clickDelay));
    }
  }

  console.log(`Clicked ${successCount}/${buttons.length} buttons successfully`);
  return successCount > 0;
}

// 次のページに移動
function goToNextPage() {
  const nextPageUrl = getNextPageUrl();
  console.log(`Moving to next page: ${nextPageUrl}`);
  window.location.href = nextPageUrl;
}

// ページ遷移後の待機処理
function waitAfterPageLoad() {
  return new Promise(resolve => {
    setTimeout(resolve, CONFIG.nextPageDelay);
  });
}

// メイン処理
async function main(customSettings = null) {
  if (isRunning) {
    console.log('Auto-like process is already running');
    return;
  }

  isRunning = true;
  shouldStop = false;
  
  console.log('Starting LAPRAS Auto Like process');
  
  // カスタム設定があれば適用
  if (customSettings) {
    CONFIG.clickDelay = customSettings.clickDelay || CONFIG.clickDelay;
    CONFIG.nextPageDelay = customSettings.nextPageDelay || CONFIG.nextPageDelay;
  }
  
  // ページが完全に読み込まれるまで待機
  if (document.readyState !== 'complete') {
    await new Promise(resolve => {
      window.addEventListener('load', resolve);
    });
  }

  // ページ遷移後の待機処理
  await waitAfterPageLoad();

  try {
    const success = await clickAllLikeButtons();
    
    if (success && !shouldStop) {
      console.log('All buttons clicked, moving to next page');
      
      if (!shouldStop) {
        goToNextPage();
      }
    } else {
      console.log('No buttons were clicked or process was stopped, staying on current page');
    }
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    isRunning = false;
  }
}

// 拡張機能からのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'startAutoLike') {
    console.log('Starting auto-like with settings:', request.settings);
    main(request.settings);
    sendResponse({ status: 'started' });
  } else if (request.action === 'stopAutoLike') {
    shouldStop = true;
    isRunning = false;
    console.log('Stop signal received');
    sendResponse({ status: 'stopped' });
  } else {
    console.log('Unknown action received:', request.action);
    sendResponse({ status: 'unknown_action' });
  }
  
  return true; // 非同期レスポンスを示す
});

// 自動開始設定をチェックして実行
function checkAutoStart() {
  chrome.storage.sync.get({ autoStart: true }, function(items) {
    if (items.autoStart) {
      console.log('Auto-start is enabled, starting auto-like process');
      setTimeout(() => main(), 1000);
    } else {
      console.log('Auto-start is disabled, waiting for manual start');
    }
  });
}

// ページ読み込み完了後の処理
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAutoStart);
} else {
  checkAutoStart();
}
