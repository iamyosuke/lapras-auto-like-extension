// Popup script for LAPRAS Auto Like extension
document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const status = document.getElementById('status');
  const clickDelayInput = document.getElementById('clickDelay');
  const nextPageDelayInput = document.getElementById('nextPageDelay');
  const autoStartInput = document.getElementById('autoStart');

  let isRunning = false;

  // 設定を読み込み
  loadSettings();

  // イベントリスナーを設定
  startBtn.addEventListener('click', startAutoLike);
  stopBtn.addEventListener('click', stopAutoLike);
  clickDelayInput.addEventListener('change', saveSettings);
  nextPageDelayInput.addEventListener('change', saveSettings);
  autoStartInput.addEventListener('change', saveSettings);

  // 設定を読み込む
  function loadSettings() {
    chrome.storage.sync.get({
      clickDelay: 1000,
      nextPageDelay: 2000,
      autoStart: true
    }, function(items) {
      clickDelayInput.value = items.clickDelay;
      nextPageDelayInput.value = items.nextPageDelay;
      autoStartInput.checked = items.autoStart;
    });
  }

  // 設定を保存する
  function saveSettings() {
    const settings = {
      clickDelay: parseInt(clickDelayInput.value),
      nextPageDelay: parseInt(nextPageDelayInput.value),
      autoStart: autoStartInput.checked
    };

    chrome.storage.sync.set(settings, function() {
      updateStatus('Settings saved', 'success');
    });
  }

  // 自動いいね開始
  async function startAutoLike() {
    try {
      // 現在のタブを取得
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // LAPRASのジョブ検索ページかチェック
      if (!tab.url.includes('lapras.com/jobs/search')) {
        updateStatus('Please navigate to LAPRAS job search page first', 'error');
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
        status.textContent = 'Ready to start auto-liking on LAPRAS job search pages';
        status.className = 'status status-info';
      }, 3000);
    }
  }

  // 現在のタブの状態をチェック
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentTab = tabs[0];
    if (currentTab && currentTab.url.includes('lapras.com/jobs/search')) {
      updateStatus('Ready to start on LAPRAS job search page', 'success');
    } else {
      updateStatus('Navigate to LAPRAS job search page to use this extension', 'info');
    }
  });
});
