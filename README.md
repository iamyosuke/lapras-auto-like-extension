# Auto Like for Job Sites Chrome Extension

LAPRAS・Findy求人サイトで自動的に「いいね」ボタンを押すChrome拡張機能です。

## 対応サイト

- **LAPRAS** (https://lapras.com) - 「興味あり」ボタンを自動クリック
- **Findy** (https://findy-code.io, https://findy.co.jp) - 「いいかも」ボタンを自動クリック

## 機能

- 各求人サイトで対応するいいねボタンを自動的にクリック
- すべてのボタンをクリック後、自動的に次のページに移動
- サイト別の最適化された設定（クリック間隔、ページ遷移待機時間）
- 自動開始機能のオン/オフ切り替え
- 手動での開始/停止制御

## インストール方法

1. このプロジェクトをダウンロードまたはクローンします
2. Chromeブラウザで `chrome://extensions/` を開きます
3. 右上の「デベロッパーモード」を有効にします
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. このプロジェクトのフォルダを選択します

## 使用方法

### 自動実行（推奨）

1. 対応する求人サイトにアクセス
   - LAPRAS: https://lapras.com/jobs/search
   - Findy: https://findy-code.io または https://findy.co.jp
2. 拡張機能が自動的にいいねボタンをクリック開始
3. すべてのボタンをクリック後、自動的に次のページに移動

### 手動実行

1. 対応する求人サイトにアクセス
2. 拡張機能のアイコンをクリックしてポップアップを開く
3. 「Start Auto Like」ボタンをクリック
4. 必要に応じて「Stop」ボタンで停止

## 設定

拡張機能のポップアップから以下の設定を調整できます：

- **Click Delay**: ボタンクリック間の間隔（ミリ秒）
- **Next Page Delay**: ページ遷移後の待機時間（ミリ秒）
- **Auto Start**: ページ読み込み時の自動開始のオン/オフ

## サイト別の対象要素

### LAPRAS
```html
<li class="reaction-btn-wrap">
  <button class="reaction-btn">
    <span class="label">興味あり</span>
  </button>
</li>
```

### Findy
```html
<button data-variant="primary" data-sub-variant="positive" class="button-v2_component_buttonV2__XAGZT">
  いいかも
</button>
```

## サイト別設定

拡張機能は各サイトに最適化された設定を自動的に適用します：

### LAPRAS
- クリック間隔: 1000ms
- ページ遷移待機: 10000ms
- ボタンセレクター: `li.reaction-btn-wrap button.reaction-btn`

### Findy
- クリック間隔: 1500ms
- ページ遷移待機: 8000ms
- ボタンセレクター: `button[data-variant="primary"][data-sub-variant="positive"]`

## 注意事項

- この拡張機能は対応する求人サイトでのみ動作します
- サイトの利用規約を遵守してご使用ください
- 過度な使用はサーバーに負荷をかける可能性があるため、適切な間隔を設定してください
- 自己責任でご使用ください

## トラブルシューティング

### 拡張機能が動作しない場合

1. ページを再読み込みしてください
2. 拡張機能を無効化/有効化してください
3. Chromeの開発者ツール（F12）でコンソールエラーを確認してください

### ボタンが見つからない場合

- ページが完全に読み込まれるまで待ってください
- サイトの構造が変更された可能性があります

## ファイル構成

```
lapras-extension/
├── manifest.json      # 拡張機能の設定ファイル
├── content.js         # メインの自動化スクリプト（両サイト対応）
├── popup.html         # ポップアップUI
├── popup.js           # ポップアップの動作制御
├── background.js      # バックグラウンドスクリプト（通信制御）
└── README.md          # このファイル
```

## 開発者向け情報

### サイト判定

拡張機能は`window.location.hostname`を使用してサイトを自動判定し、適切な設定を適用します。

### 主要な設定

```javascript
const SITE_CONFIGS = {
  lapras: {
    buttonSelector: 'li.reaction-btn-wrap button.reaction-btn',
    buttonTextFilter: '興味あり',
    clickDelay: 1000,
    nextPageDelay: 10000
  },
  findy: {
    buttonSelector: 'button[data-variant="primary"][data-sub-variant="positive"]',
    buttonTextFilter: 'いいかも',
    clickDelay: 1500,
    nextPageDelay: 8000
  }
};
```

### カスタマイズ

`content.js`の`SITE_CONFIGS`オブジェクトを編集することで、各サイトの動作をカスタマイズできます。

## 更新履歴

- **v1.1**: Findy対応を追加
- **v1.0**: LAPRAS対応の初期リリース

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
