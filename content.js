// Auto Like Content Script for LAPRAS, Findy, and Forkwell
console.log('Auto Like content script loaded on:', window.location.href);
console.log('Document ready state:', document.readyState);

// サイト判定
function getCurrentSite() {
  const hostname = window.location.hostname;
  if (hostname.includes('lapras.com')) {
    return 'lapras';
  } else if (hostname.includes('findy-code.io') || hostname.includes('findy.co.jp')) {
    return 'findy';
  } else if (hostname.includes('jobs.forkwell.com')) {
    return 'forkwell';
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
  },
  forkwell: {
    linkSelector: 'a.link-inherit.job-list__link',
    clickDelay: 1000,
    nextPageDelay: 5000,
    maxRetries: 3
  }
};

// 現在のサイトに応じた設定を取得
let CONFIG = SITE_CONFIGS[getCurrentSite()] || SITE_CONFIGS.lapras;

// 実行状態管理
let isRunning = false;
let shouldStop = false;

// Forkwell用のURL収集機能
async function collectForkwellJobUrls() {
  const links = document.querySelectorAll(CONFIG.linkSelector);
  console.log(`Found ${links.length} job links`);
  
  const jobUrls = [];
  const companyGroups = {};
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('/')) {
      const fullUrl = `https://jobs.forkwell.com${href}`;
      const urlParts = href.split('/');
      const companyName = urlParts[1]; // /companyname/jobs/xxxxx の companyname部分
      
      if (!companyGroups[companyName]) {
        companyGroups[companyName] = [];
      }
      
      companyGroups[companyName].push({
        url: fullUrl,
        title: link.textContent.trim(),
        company: companyName
      });
      
      jobUrls.push({
        url: fullUrl,
        title: link.textContent.trim(),
        company: companyName
      });
    }
  });
  
  console.log(`Collected ${jobUrls.length} job URLs from ${Object.keys(companyGroups).length} companies`);
  
  // storageに保存
  await saveForkwellUrls(jobUrls);
  
  // popupに更新を通知
  chrome.runtime.sendMessage({
    action: 'updateUrlCount',
    data: {
      totalUrls: jobUrls.length,
      newUrls: jobUrls.length
    }
  });
  
  return jobUrls.length > 0;
}

// ForkwellのURLをstorageに保存
function saveForkwellUrls(urls) {
  return new Promise(resolve => {
    chrome.storage.local.get({ forkwellJobUrls: [] }, function(result) {
      const existingUrls = result.forkwellJobUrls;
      const newUrls = urls.filter(url => 
        !existingUrls.some(existing => existing.url === url.url)
      );
      
      if (newUrls.length > 0) {
        const updatedUrls = [...existingUrls, ...newUrls];
        chrome.storage.local.set({ forkwellJobUrls: updatedUrls }, function() {
          console.log(`Saved ${newUrls.length} new URLs to storage. Total: ${updatedUrls.length}`);
          resolve();
        });
      } else {
        console.log('No new URLs to save');
        resolve();
      }
    });
  });
}

// 会社別にグループ化されたURLを取得
function getForkwellUrlsByCompany() {
  return new Promise(resolve => {
    chrome.storage.local.get({ forkwellJobUrls: [] }, function(result) {
      const urls = result.forkwellJobUrls;
      const companyGroups = {};
      
      urls.forEach(job => {
        if (!companyGroups[job.company]) {
          companyGroups[job.company] = [];
        }
        companyGroups[job.company].push(job);
      });
      
      resolve(companyGroups);
    });
  });
}

// Forkwell申込み処理
async function processForkwellApplications() {
  console.log('Starting Forkwell application process...');
  
  const companyGroups = await getForkwellUrlsByCompany();
  const companies = Object.keys(companyGroups);
  
  console.log(`Processing ${companies.length} companies`);
  
  for (let i = 0; i < companies.length; i++) {
    if (shouldStop) {
      console.log('Application process stopped by user');
      break;
    }
    
    const company = companies[i];
    const jobs = companyGroups[company];
    
    console.log(`Processing company ${i + 1}/${companies.length}: ${company} (${jobs.length} jobs)`);
    
    // 会社の最初の求人ページに移動
    const firstJob = jobs[0];
    console.log(`Navigating to: ${firstJob.url}`);
    
    // ページ移動
    window.location.href = firstJob.url;
    
    // ページ読み込み完了まで待機（タイムアウト付き）
    await new Promise(resolve => {
      const timeout = setTimeout(() => {
        console.log('Page load timeout, proceeding anyway...');
        resolve();
      }, 15000); // 15秒でタイムアウト
      
      const checkLoaded = () => {
        if (window.location.href === firstJob.url && document.readyState === 'complete') {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkLoaded, 1000);
        }
      };
      checkLoaded();
    });
    
    // 申込みボタンを探してクリック（タイムアウト付き）
    const applicationResult = await Promise.race([
      clickForkwellApplicationButton(firstJob.url),
      new Promise(resolve => {
        setTimeout(() => {
          console.log('Application timeout, moving to next job...');
          resolve(false);
        }, 10000); // 10秒でタイムアウト
      })
    ]);
    
    // 結果をログ出力
    if (applicationResult) {
      console.log(`Successfully applied to: ${firstJob.url}`);
    } else {
      console.log(`Failed or skipped application for: ${firstJob.url}`);
    }
    
    // 次の会社まで待機
    if (i < companies.length - 1) {
      console.log('Waiting before processing next company...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('Forkwell application process completed');
}

// 送信済みURLを記録する
async function recordSubmittedUrl(url) {
  return new Promise(resolve => {
    chrome.storage.local.get({ forkwellSubmittedUrls: [] }, function(result) {
      const submittedUrls = result.forkwellSubmittedUrls;
      
      if (!submittedUrls.includes(url)) {
        submittedUrls.push(url);
        chrome.storage.local.set({ forkwellSubmittedUrls: submittedUrls }, function() {
          console.log(`Recorded submitted URL: ${url}`);
          console.log(`Total submitted URLs: ${submittedUrls.length}`);
          resolve();
        });
      } else {
        console.log(`URL already recorded: ${url}`);
        resolve();
      }
    });
  });
}

// Forkwell申込みボタンをクリック
async function clickForkwellApplicationButton(jobUrl) {
  console.log('Looking for application button...');
  
  try {
    // 「話を聞きたい」ボタンを探す
    const talkButton = document.querySelector('button.btn.btn-special');
    
    if (!talkButton) {
      console.log('Talk button not found, skipping this job');
      return false;
    }
    
    if (talkButton.disabled) {
      console.log('Talk button is disabled, skipping this job');
      return false;
    }
    
    if (!talkButton.textContent.includes('話を聞きたい')) {
      console.log('Talk button text does not match expected text, skipping this job');
      return false;
    }
    
    console.log('Found "話を聞きたい" button, clicking...');
    talkButton.click();
    
    // モーダルまたはフォームが表示されるまで待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 「送信」ボタンを探す
    const submitButton = document.querySelector('button.button.btn.btn-primary.ga-track-with-applikation');
    
    if (!submitButton) {
      console.log('Submit button not found, skipping this job');
      return false;
    }
    
    if (submitButton.disabled) {
      console.log('Submit button is disabled, skipping this job');
      return false;
    }
    
    if (!submitButton.textContent.includes('送信')) {
      console.log('Submit button text does not match expected text, skipping this job');
      return false;
    }
    
    console.log('Found "送信" button, clicking...');
    submitButton.click();
    
    // 送信完了まで待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 送信成功したURLを記録
    if (jobUrl) {
      await recordSubmittedUrl(jobUrl);
    }
    
    console.log('Application submitted successfully');
    return true;
    
  } catch (error) {
    console.error('Error in clickForkwellApplicationButton:', error);
    console.log('Skipping this job due to error');
    return false;
  }
}

// 現在のページ番号を取得
function getCurrentPageNumber() {
  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get('page');
  
  // pageパラメーターがない場合は1ページ目とする
  if (!pageParam) {
    return 1;
  }
  
  const pageNumber = parseInt(pageParam);
  return isNaN(pageNumber) ? 1 : pageNumber;
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
    
    // 最初のクリック以外は待機時間を設ける
    if (i < buttons.length - 1) {
      // 最初のボタン（i=0）の後はdelayを適用
      if (i === 0) {
        console.log('First button clicked, no delay for next click');
      } else {
        console.log(`Waiting ${CONFIG.clickDelay}ms before next click...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.clickDelay));
      }
    }
  }

  console.log(`Clicked ${successCount}/${buttons.length} buttons successfully`);
  return successCount > 0;
}

// 次のページに移動（サイト別対応）
function goToNextPage() {
  try {
    const currentSite = getCurrentSite();
    const currentPage = getCurrentPageNumber();
    console.log(`Current page number: ${currentPage}`);
    
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
      const nextPage = currentPage + 1;
      currentUrl.searchParams.set('page', nextPage);
      console.log(`Moving from page ${currentPage} to page ${nextPage}`);
      console.log(`Next page URL: ${currentUrl.toString()}`);
      
      // より安全なページ遷移
      setTimeout(() => {
        window.location.href = currentUrl.toString();
      }, 1000);
    } else if (currentSite === 'forkwell') {
   
      
      // 次へボタンが見つからない場合は、ページ番号を上げてURLを変更
      const currentUrl = new URL(window.location.href);
      const nextPage = currentPage + 1;
      currentUrl.searchParams.set('page', nextPage);
      console.log(`Moving from page ${currentPage} to page ${nextPage}`);
      console.log(`Next page URL: ${currentUrl.toString()}`);
      
      setTimeout(() => {
        window.location.href = currentUrl.toString();
      }, 1000);
    } else {
      // LAPRAS: 従来の方法
      const nextPageUrl = getNextPageUrl();
      console.log(`Moving from page ${currentPage} to page ${currentPage + 1}`);
      console.log(`Next page URL: ${nextPageUrl}`);
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

// ページ読み込み後にボタンを定期的に探す
function waitForButtonsToAppear() {
  return new Promise(resolve => {
    const checkInterval = 1000; // 1秒間隔でチェック
    const maxWaitTime = 30000; // 最大30秒待機
    let elapsedTime = 0;
    
    console.log('Waiting for buttons to appear...');
    
    const intervalId = setInterval(() => {
      const currentSite = getCurrentSite();
      
      if (currentSite === 'forkwell') {
        // Forkwellの場合はリンクを探す
        const links = document.querySelectorAll(CONFIG.linkSelector);
        console.log(`Checking for links... Found ${links.length} job links`);
        
        if (links.length > 0) {
          console.log('Links found! Starting process...');
          clearInterval(intervalId);
          resolve();
          return;
        }
      } else {
        // LAPRASとFindyの場合はボタンを探す
        const buttons = document.querySelectorAll(CONFIG.buttonSelector);
        const validButtons = Array.from(buttons).filter(button => {
          if (button.disabled) return false;
          
          if (currentSite === 'lapras') {
            const labelElement = button.querySelector('.label');
            return labelElement && labelElement.textContent.trim() === CONFIG.buttonTextFilter;
          } else if (currentSite === 'findy') {
            const buttonText = button.textContent.trim();
            return buttonText.includes(CONFIG.buttonTextFilter);
          }
          return false;
        });
        
        console.log(`Checking for buttons... Found ${validButtons.length} valid buttons`);
        
        if (validButtons.length > 0) {
          console.log('Buttons found! Starting process...');
          clearInterval(intervalId);
          resolve();
          return;
        }
      }
      
      elapsedTime += checkInterval;
      if (elapsedTime >= maxWaitTime) {
        console.log('Max wait time reached, proceeding anyway...');
        clearInterval(intervalId);
        resolve();
      }
    }, checkInterval);
  });
}

// storageから設定を読み込み
function loadSettingsFromStorage() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      laprasClickDelay: 1000,
      laprasNextPageDelay: 10000,
      findyClickDelay: 1500,
      findyNextPageDelay: 8000
    }, function(items) {
      const currentSite = getCurrentSite();
      
      if (currentSite === 'findy') {
        CONFIG.clickDelay = items.findyClickDelay;
        CONFIG.nextPageDelay = items.findyNextPageDelay;
        console.log(`Loaded Findy settings: clickDelay=${CONFIG.clickDelay}, nextPageDelay=${CONFIG.nextPageDelay}`);
      } else {
        CONFIG.clickDelay = items.laprasClickDelay;
        CONFIG.nextPageDelay = items.laprasNextPageDelay;
        console.log(`Loaded LAPRAS settings: clickDelay=${CONFIG.clickDelay}, nextPageDelay=${CONFIG.nextPageDelay}`);
      }
      
      resolve();
    });
  });
}

// メイン処理
async function main(customSettings = null) {
  if (isRunning) {
    console.log('Auto process is already running');
    return;
  }

  isRunning = true;
  shouldStop = false;
  
  const currentSite = getCurrentSite();
  console.log(`Starting process for ${currentSite.toUpperCase()}`);
  
  // storageから設定を読み込み
  await loadSettingsFromStorage();
  
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

  // ボタンまたはリンクが表示されるまで待機
  await waitForButtonsToAppear();

  try {
    if (currentSite === 'forkwell') {
      // ForkwellのURL収集処理
      const success = await collectForkwellJobUrls();
      
      if (!shouldStop) {
        if (success) {
          console.log('URLs collected, moving to next page');
        } else {
          console.log('No URLs found, but still moving to next page');
        }
        goToNextPage();
      } else {
        console.log('Process was stopped, staying on current page');
      }
    } else {
      // LAPRASとFindyのいいね処理
      const success = await clickAllLikeButtons();
      
      if (!shouldStop) {
        if (success) {
          console.log('All buttons clicked, moving to next page');
        } else {
          console.log('No buttons found or clicked, but still moving to next page');
        }
        goToNextPage();
      } else {
        console.log('Process was stopped, staying on current page');
      }
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
    console.log('Starting auto process with settings:', request.settings);
    main(request.settings);
    sendResponse({ status: 'started' });
  } else if (request.action === 'stopAutoLike') {
    shouldStop = true;
    isRunning = false;
    console.log('Stop signal received');
    sendResponse({ status: 'stopped' });
  } else if (request.action === 'startForkwellApplications') {
    console.log('Starting Forkwell applications');
    processForkwellApplications();
    sendResponse({ status: 'started' });
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
      console.log('Auto-start is enabled, starting auto process');
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
