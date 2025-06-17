// Auto Like Content Script for LAPRAS and Findy
console.log('Auto Like content script loaded on:', window.location.href);
console.log('Document ready state:', document.readyState);

// サイト判定
function getCurrentSite() {
  const hostname = window.location.hostname;
  if (hostname.includes('lapras.com')) {
    return 'lapras';
  } else if (hostname.includes('findy-code.io') || hostname.includes('findy.co.jp')) {
    return 'findy';
  }
  return 'unknown';
}

// サイト別設定
const SITE_CONFIGS = {
  lapras: {
    buttonSelector: 'li.reaction-btn-wrap button.reaction-btn',
    buttonTextFilter: '興味あり',
    clickDelay: 1000,
    nextPageDelay: 10000,
    maxRetries: 3
  },
  findy: {
    buttonSelector: 'button[data-variant="primary"][data-sub-variant="positive"]',
    buttonTextFilter: 'いいかも',
    clickDelay: 1500,
    nextPageDelay: 8000,
    maxRetries: 3
  }
};

// 現在のサイトに応じた設定を取得
let CONFIG = SITE_CONFIGS[getCurrentSite()] || SITE_CONFIGS.lapras;

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

// いいねボタンを見つける（サイト別対応）
function findLikeButtons() {
  const buttons = document.querySelectorAll(CONFIG.buttonSelector);
  console.log(`Found ${buttons.length} potential buttons`);
  
  const currentSite = getCurrentSite();
  
  return Array.from(buttons).filter(button => {
    // disabledでないことを確認
    if (button.disabled) {
      console.log('Button is disabled, skipping');
      return false;
    }
    
    if (currentSite === 'lapras') {
      // LAPRAS: 「興味あり」テキストを含むボタンのみを対象とする
      const labelElement = button.querySelector('.label');
      return labelElement && labelElement.textContent.trim() === CONFIG.buttonTextFilter;
    } else if (currentSite === 'findy') {
      // Findy: 「いいかも」テキストを含むボタンのみを対象とする
      const buttonText = button.textContent.trim();
      return buttonText.includes(CONFIG.buttonTextFilter);
    }
    return false;
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

// 次のページに移動（サイト別対応）
function goToNextPage() {
  try {
    const currentSite = getCurrentSite();
    
    if (currentSite === 'findy') {
      // Findy: 次へボタンまたはページネーションを探す
      const nextButton = document.querySelector('button[aria-label="次のページ"], a[aria-label="次のページ"], .pagination .next');
      if (nextButton && !nextButton.disabled) {
        console.log('Found next button, clicking it');
        nextButton.click();
        return;
      }
      
      // 次へボタンが見つからない場合は、ページ番号を上げてURLを変更
      const currentUrl = new URL(window.location.href);
      const currentPage = getCurrentPageNumber();
      const nextPage = currentPage + 1;
      currentUrl.searchParams.set('page', nextPage);
      console.log(`Moving to next page via URL: ${currentUrl.toString()}`);
      
      // より安全なページ遷移
      setTimeout(() => {
        window.location.href = currentUrl.toString();
      }, 1000);
    } else {
      // LAPRAS: 従来の方法
      const nextPageUrl = getNextPageUrl();
      console.log(`Moving to next page: ${nextPageUrl}`);
      setTimeout(() => {
        window.location.href = nextPageUrl;
      }, 1000);
    }
  } catch (error) {
    console.error('Error in goToNextPage:', error);
    // エラーが発生した場合は処理を停止
    shouldStop = true;
    isRunning = false;
  }
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
  
  const currentSite = getCurrentSite();
  console.log(`Starting Auto Like process for ${currentSite.toUpperCase()}`);
  
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
