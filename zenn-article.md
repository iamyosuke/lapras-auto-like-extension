---
title: "LAPRAS求人サイトで自動いいね！Chrome拡張機能を作ってみた"
emoji: "👍"
type: "tech"
topics: ["chrome拡張機能", "javascript", "自動化", "求人", "lapras"]
published: true
---

# はじめに

転職活動をしていると、求人サイトで気になる求人に「いいね」や「興味あり」ボタンを押すことが多いですよね。でも、たくさんの求人をチェックしていると、一つ一つボタンを押すのが面倒になってきます。

そこで今回は、**LAPRAS求人サイトで自動的に「興味あり」ボタンを押してくれるChrome拡張機能**を作ってみました！

## 作成した拡張機能の機能

![拡張機能のポップアップ画面](https://via.placeholder.com/300x400/007bff/ffffff?text=LAPRAS+Auto+Like)

### 主な機能

- 🎯 LAPRAS求人検索ページで「興味あり」ボタンを自動検出・クリック
- 🔄 すべてのボタンをクリック後、自動的に次のページに移動
- ⚙️ クリック間隔とページ移動間隔の調整可能
- 🚀 自動開始機能（ページ読み込み時に自動実行）
- 🛑 手動での開始/停止制御
- 💾 設定の保存機能

### 対象となるHTML要素

拡張機能は以下のような「興味あり」ボタンを自動的に検出します：

```html
<li class="reaction-btn-wrap">
  <button class="button mini-mode reaction-btn skin-primary-line size-m flat-button">
    <div class="body">
      <div class="row">
        <span class="left-icon">
          <i class="icon"></i>
        </span>
        <span class="label">興味あり</span>
      </div>
    </div>
  </button>
</li>
```

## 技術的な実装

### ファイル構成

```
lapras-extension/
├── manifest.json      # 拡張機能の設定ファイル
├── content.js         # メインの自動化スクリプト
├── popup.html         # ポップアップUI
├── popup.js           # ポップアップの動作制御
├── background.js      # バックグラウンドスクリプト（通信制御）
└── README.md          # 使用方法とインストール手順
```

### manifest.json

Chrome拡張機能の設定ファイルです。Manifest V3を使用しています。

```json
{
  "manifest_version": 3,
  "name": "LAPRAS Auto Like",
  "version": "1.0",
  "description": "LAPRAS求人サイトで自動的にいいねボタンを押すChrome拡張機能",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "https://lapras.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://lapras.com/jobs/search*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "LAPRAS Auto Like"
  }
}
```

### Content Script（content.js）

メインの自動化ロジックを担当します。

```javascript
// いいねボタンを見つける
function findLikeButtons() {
  const buttons = document.querySelectorAll('li.reaction-btn-wrap button.reaction-btn');
  return Array.from(buttons).filter(button => {
    const labelElement = button.querySelector('.label');
    return labelElement && labelElement.textContent.trim() === '興味あり';
  });
}

// ボタンをクリック
function clickButton(button) {
  return new Promise((resolve) => {
    try {
      // スクロールしてボタンを表示
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setTimeout(() => {
        button.click();
        console.log('Button clicked successfully');
        resolve(true);
      }, 500);
    } catch (error) {
      console.error('Error clicking button:', error);
      resolve(false);
    }
  });
}

// すべてのいいねボタンを順次クリック
async function clickAllLikeButtons() {
  const buttons = findLikeButtons();
  let successCount = 0;

  for (let i = 0; i < buttons.length; i++) {
    const success = await clickButton(buttons[i]);
    if (success) successCount++;
    
    // 次のクリックまで待機
    if (i < buttons.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.clickDelay));
    }
  }

  return successCount > 0;
}
```

### Background Script（background.js）

ポップアップとContent Script間の通信を中継します。

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAutoLike' || request.action === 'stopAutoLike') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      }
    });
    return true; // 非同期レスポンスを示す
  }
});
```

## 実装のポイント

### 1. 非同期処理とエラーハンドリング

ボタンのクリック処理は非同期で行い、エラーが発生しても処理を継続できるようにしています。

```javascript
async function clickAllLikeButtons() {
  // 停止フラグをチェック
  if (shouldStop) {
    console.log('Auto-like process stopped by user');
    return false;
  }
  // ... クリック処理
}
```

### 2. ユーザビリティの向上

- **自動スクロール**: ボタンをクリックする前に画面内に表示
- **設定の永続化**: Chrome Storage APIで設定を保存
- **リアルタイム制御**: 実行中でも停止可能

### 3. 安全な実装

- **適切な待機時間**: サーバーに負荷をかけないよう間隔を設定
- **エラー処理**: 予期しないエラーでも拡張機能が停止しない
- **権限の最小化**: 必要最小限の権限のみ要求

## 使用方法

### インストール

1. プロジェクトをダウンロード
2. Chromeで `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. プロジェクトフォルダを選択

### 使い方

#### 自動実行（推奨）
1. LAPRAS求人検索ページにアクセス
2. 拡張機能が自動的に「興味あり」ボタンをクリック開始
3. すべてのボタンをクリック後、自動的に次のページに移動

#### 手動実行
1. 拡張機能のアイコンをクリック
2. 「Start Auto Like」ボタンを押す
3. 必要に応じて「Stop」ボタンで停止

## 設定項目

- **Click Delay**: ボタンクリック間の間隔（デフォルト: 1000ms）
- **Next Page Delay**: ページ遷移後の待機時間（デフォルト: 2000ms）
- **Auto Start**: ページ読み込み時の自動開始（デフォルト: 有効）

## 注意事項とマナー

### 利用時の注意

⚠️ **重要**: この拡張機能を使用する際は、以下の点にご注意ください：

- **利用規約の遵守**: LAPRASの利用規約を必ず確認し、遵守してください
- **適切な間隔**: サーバーに負荷をかけないよう、適切な間隔を設定してください
- **自己責任**: 使用は自己責任でお願いします
- **過度な使用の禁止**: 短時間での大量実行は避けてください

### 推奨設定

- クリック間隔: 1000ms以上
- ページ遷移後待機: 2000ms以上
- 連続使用時間: 適度な休憩を挟む

## まとめ

今回作成したChrome拡張機能により、LAPRAS求人サイトでの「興味あり」ボタンクリックを自動化できました。

### 学んだこと

- **Chrome拡張機能の基本構造**: Manifest V3の使い方
- **Content ScriptとBackground Scriptの連携**: メッセージパッシング
- **非同期処理**: Promise/asyncを使った順次処理
- **ユーザビリティ**: 設定の永続化と直感的なUI

### 今後の改善案

- [ ] 複数の求人サイトに対応
- [ ] より詳細な条件設定（キーワードフィルタリングなど）
- [ ] 統計情報の表示（クリック数、処理時間など）
- [ ] ダークモード対応

転職活動を効率化したい方は、ぜひ試してみてください！
ただし、利用規約を守って、マナーを持って使用することを忘れずに。

## ソースコード

完全なソースコードは以下のGitHubリポジトリで公開しています：
[https://github.com/your-username/lapras-auto-like-extension](https://github.com/your-username/lapras-auto-like-extension)

---

この記事が参考になったら、ぜひ「いいね」をお願いします！（手動で😄）
