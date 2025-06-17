// Popup script for Auto Like for Job Sites extension

// サポートされているサイトかチェック
function isSupportedSite(url) {
  if (!url) return false;
  return url.includes('lapras.com/jobs/search') || 
         url.includes('findy-code.io/recommends') || 
         url.includes('findy-code.io/jobs') ||
         url.includes('findy.co.jp/recommends') || 
         url.includes('findy.co.jp/jobs') ||
         url.includes('jobs.forkwell.com');
}
document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const forkwellApplyBtn = document.getElementById('forkwellApplyBtn');
  const status = document.getElementById('status');
  const clickDelayInput = document.getElementById('clickDelay');
  const nextPageDelayInput = document.getElementById('nextPageDelay');
  const autoStartInput = document.getElementById('autoStart');
  const forkwellStatus = document.getElementById('forkwellStatus');
  const urlCount = document.getElementById('urlCount');
  const viewUrlsBtn = document.getElementById('viewUrlsBtn');
  const clearUrlsBtn = document.getElementById('clearUrlsBtn');
  const urlList = document.getElementById('urlList');
  const urlListContent = document.getElementById('urlListContent');
  const hideUrlsBtn = document.getElementById('hideUrlsBtn');

  let isRunning = false;

  // 設定を読み込み
  loadSettings();

  // イベントリスナーを設定
  startBtn.addEventListener('click', startAutoLike);
  stopBtn.addEventListener('click', stopAutoLike);
  forkwellApplyBtn.addEventListener('click', startForkwellApplications);
  viewUrlsBtn.addEventListener('click', viewCollectedUrls);
  clearUrlsBtn.addEventListener('click', clearCollectedUrls);
  hideUrlsBtn.addEventListener('click', hideUrlList);
  clickDelayInput.addEventListener('change', saveSettings);
  nextPageDelayInput.addEventListener('change', saveSettings);
  autoStartInput.addEventListener('change', saveSettings);

  // URL収集状況を更新
  updateUrlCount();

  // 設定を読み込む
  function loadSettings() {
    chrome.storage.sync.get({
      laprasClickDelay: 1000,
      laprasNextPageDelay: 10000,
      findyClickDelay: 1500,
      findyNextPageDelay: 8000,
      autoStart: true
    }, function(items) {
      // 現在のタブのサイトに応じて設定を表示
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url.includes('findy')) {
          clickDelayInput.value = items.findyClickDelay;
          nextPageDelayInput.value = items.findyNextPageDelay;
        } else {
          // デフォルトはLAPRAS設定
          clickDelayInput.value = items.laprasClickDelay;
          nextPageDelayInput.value = items.laprasNextPageDelay;
        }
        autoStartInput.checked = items.autoStart;
      });
    });
  }

  // 設定を保存する
  function saveSettings() {
    // 現在のタブのサイトに応じて設定を保存
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const currentTab = tabs[0];
      const clickDelay = parseInt(clickDelayInput.value);
      const nextPageDelay = parseInt(nextPageDelayInput.value);
      
      let settings = {
        autoStart: autoStartInput.checked
      };
      
      if (currentTab && currentTab.url.includes('findy')) {
        settings.findyClickDelay = clickDelay;
        settings.findyNextPageDelay = nextPageDelay;
      } else {
        settings.laprasClickDelay = clickDelay;
        settings.laprasNextPageDelay = nextPageDelay;
      }

      chrome.storage.sync.set(settings, function() {
        updateStatus('Settings saved', 'success');
      });
    });
  }

  // 自動いいね開始
  async function startAutoLike() {
    try {
      // 現在のタブを取得
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // LAPRASのジョブ検索ページかチェック
      if (!isSupportedSite(tab.url)) {
        updateStatus('Please navigate to LAPRAS or Findy job search page first', 'error');
        return;
      }

      isRunning = true;
      updateButtonStates();
      updateStatus('Starting auto-like process...', 'info');

      // 設定をコンテンツスクリプトに送信
      const settings = {
        clickDelay: parseInt(clickDelayInput.value),
        nextPageDelay: parseInt(nextPageDelayInput.value)
      };

      // background scriptを経由してメッセージを送信
      chrome.runtime.sendMessage({
        action: 'startAutoLike',
        settings: settings
      }, function(response) {
        if (chrome.runtime.lastError) {
          updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
          isRunning = false;
          updateButtonStates();
        } else if (response && response.error) {
          updateStatus('Error: ' + response.error, 'error');
          isRunning = false;
          updateButtonStates();
        } else if (response && response.status === 'started') {
          updateStatus('Auto-like process started successfully', 'success');
        }
      });

    } catch (error) {
      updateStatus('Error: ' + error.message, 'error');
      isRunning = false;
      updateButtonStates();
    }
  }

  // 自動いいね停止
  async function stopAutoLike() {
    try {
      chrome.runtime.sendMessage({
        action: 'stopAutoLike'
      }, function(response) {
        if (chrome.runtime.lastError) {
          updateStatus('Error stopping: ' + chrome.runtime.lastError.message, 'error');
        } else {
          isRunning = false;
          updateButtonStates();
          updateStatus('Auto-like process stopped', 'info');
        }
      });

    } catch (error) {
      updateStatus('Error stopping: ' + error.message, 'error');
    }
  }

  // Forkwell申込み開始
  async function startForkwellApplications() {
    try {
      updateStatus('Starting Forkwell applications...', 'info');

      // background scriptを経由してメッセージを送信
      chrome.runtime.sendMessage({
        action: 'startForkwellApplications'
      }, function(response) {
        if (chrome.runtime.lastError) {
          updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        } else if (response && response.error) {
          updateStatus('Error: ' + response.error, 'error');
        } else if (response && response.status === 'started') {
          updateStatus('Forkwell application process started successfully', 'success');
        }
      });

    } catch (error) {
      updateStatus('Error: ' + error.message, 'error');
    }
  }

  // ボタンの状態を更新
  function updateButtonStates() {
    startBtn.disabled = isRunning;
    stopBtn.disabled = !isRunning;
    
    if (isRunning) {
      startBtn.textContent = 'Running...';
      startBtn.classList.remove('button-primary');
      startBtn.classList.add('button-secondary');
    } else {
      startBtn.textContent = 'Start Auto Like';
      startBtn.classList.remove('button-secondary');
      startBtn.classList.add('button-primary');
    }
  }

  // ステータスメッセージを更新
  function updateStatus(message, type = 'info') {
    status.textContent = message;
    status.className = `status status-${type}`;
    
    // 成功メッセージは3秒後に消す
    if (type === 'success') {
      setTimeout(() => {
        status.textContent = 'Ready to start auto-liking on LAPRAS or Findy job search pages';
        status.className = 'status status-info';
      }, 3000);
    }
  }

  // URL収集状況を更新
  function updateUrlCount() {
    chrome.storage.local.get({ forkwellJobUrls: [] }, function(result) {
      const urls = result.forkwellJobUrls;
      const companyGroups = {};
      
      urls.forEach(job => {
        if (!companyGroups[job.company]) {
          companyGroups[job.company] = [];
        }
        companyGroups[job.company].push(job);
      });
      
      const totalUrls = urls.length;
      const totalCompanies = Object.keys(companyGroups).length;
      
      urlCount.textContent = `${totalUrls} URLs from ${totalCompanies} companies`;
      
      // URLが収集されている場合はForkwellステータスを表示
      if (totalUrls > 0) {
        forkwellStatus.style.display = 'block';
      } else {
        forkwellStatus.style.display = 'none';
      }
    });
  }

  // 収集されたURLを表示
  function viewCollectedUrls() {
    chrome.storage.local.get({ forkwellJobUrls: [] }, function(result) {
      const urls = result.forkwellJobUrls;
      const companyGroups = {};
      
      urls.forEach(job => {
        if (!companyGroups[job.company]) {
          companyGroups[job.company] = [];
        }
        companyGroups[job.company].push(job);
      });
      
      // popup内に表示
      displayUrlsInPopup(companyGroups);
      
      // consoleにも出力
      console.log('=== Forkwell Collected URLs ===');
      console.log(`Total: ${urls.length} URLs from ${Object.keys(companyGroups).length} companies`);
      console.log('');
      
      Object.keys(companyGroups).forEach(company => {
        const jobs = companyGroups[company];
        console.log(`Company: ${company} (${jobs.length} jobs)`);
        jobs.forEach((job, index) => {
          console.log(`  ${index + 1}. ${job.title}`);
          console.log(`     URL: ${job.url}`);
        });
        console.log('');
      });
      
      updateStatus(`Showing ${urls.length} URLs in popup`, 'success');
    });
  }

  // popup内にURL一覧を表示
  function displayUrlsInPopup(companyGroups) {
    urlListContent.innerHTML = '';
    
    if (Object.keys(companyGroups).length === 0) {
      urlListContent.innerHTML = '<div style="text-align: center; color: #666; font-size: 11px; padding: 20px;">No URLs collected yet</div>';
    } else {
      Object.keys(companyGroups).forEach(company => {
        const jobs = companyGroups[company];
        
        // 会社グループを作成
        const companyDiv = document.createElement('div');
        companyDiv.className = 'company-group';
        
        // 会社名
        const companyName = document.createElement('div');
        companyName.className = 'company-name';
        companyName.textContent = `${company} (${jobs.length} jobs)`;
        companyDiv.appendChild(companyName);
        
        // 求人一覧
        jobs.forEach(job => {
          const jobDiv = document.createElement('div');
          jobDiv.className = 'job-item';
          
          const jobTitle = document.createElement('div');
          jobTitle.className = 'job-title';
          jobTitle.textContent = job.title;
          
          const jobUrl = document.createElement('div');
          jobUrl.className = 'job-url';
          jobUrl.textContent = job.url;
          
          jobDiv.appendChild(jobTitle);
          jobDiv.appendChild(jobUrl);
          companyDiv.appendChild(jobDiv);
        });
        
        urlListContent.appendChild(companyDiv);
      });
    }
    
    // URL一覧を表示
    urlList.style.display = 'block';
  }

  // URL一覧を非表示
  function hideUrlList() {
    urlList.style.display = 'none';
  }

  // 収集されたURLをクリア
  function clearCollectedUrls() {
    if (confirm('Are you sure you want to clear all collected URLs?')) {
      chrome.storage.local.set({ forkwellJobUrls: [] }, function() {
        updateUrlCount();
        hideUrlList(); // URL一覧も非表示にする
        updateStatus('All URLs cleared', 'success');
        console.log('Forkwell URLs cleared');
      });
    }
  }

  // 現在のタブの状態をチェック
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentTab = tabs[0];
    if (currentTab && isSupportedSite(currentTab.url)) {
      updateStatus('Ready to start on supported job search page', 'success');
    } else {
      updateStatus('Navigate to LAPRAS or Findy job search page to use this extension', 'info');
    }
  });
});
