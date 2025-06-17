# LAPRAS Auto Like Chrome Extension

LAPRAS求人サイトで自動的に「興味あり」ボタンを押すChrome拡張機能です。

## 機能

- LAPRAS求人検索ページで「興味あり」ボタンを自動的にクリック
- すべてのボタンをクリック後、自動的に次のページに移動
- クリック間隔とページ移動間隔の調整可能
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

1. LAPRAS求人検索ページ（https://lapras.com/jobs/search）にアクセス
2. 拡張機能が自動的に「興味あり」ボタンをクリック開始
3. すべてのボタンをクリック後、自動的に次のページに移動

### 手動実行

1. LAPRAS求人検索ページにアクセス
2. 拡張機能のアイコンをクリックしてポップアップを開く
3. 「Start Auto Like」ボタンをクリック
4. 必要に応じて「Stop」ボタンで停止

## 設定

拡張機能のポップアップから以下の設定を調整できます：

- **Click Delay**: ボタンクリック間の間隔（ミリ秒）
- **Next Page Delay**: ページ遷移後の待機時間（ミリ秒）
- **Auto Start**: ページ読み込み時の自動開始のオン/オフ

## 対象要素

以下のHTML要素を自動的に検出してクリックします：

```html
<li data-v-44ff4845="" class="reaction-btn-wrap">
  <button data-v-ef3a5852="" data-v-48b1cc01="" data-v-44ff4845="" 
          class="button mini-mode reaction-btn skin-primary-line size-m flat-button">
    <div data-v-ef3a5852="" class="body">
      <div data-v-48b1cc01="" class="row">
        <span data-v-48b1cc01="" class="left-icon">
          <i data-v-d54d8182="" data-v-44ff4845="" class="icon"></i>
        </span>
        <span data-v-48b1cc01="" class="label">興味あり</span>
      </div>
    </div>
  </button>
</li>
```

## 注意事項

- この拡張機能はLAPRAS求人検索ページ（https://lapras.com/jobs/search*）でのみ動作します
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
- LAPRASのサイト構造が変更された可能性があります

## ファイル構成

```
lapras-extension/
├── manifest.json      # 拡張機能の設定ファイル
├── content.js         # メインの自動化スクリプト
├── popup.html         # ポップアップUI
├── popup.js           # ポップアップの動作制御
├── background.js      # バックグラウンドスクリプト（通信制御）
└── README.md          # このファイル
```

## 開発者向け情報

### 主要な設定

- `buttonSelector`: 対象ボタンのCSSセレクター
- `clickDelay`: ボタンクリック間隔（デフォルト: 1000ms）
- `nextPageDelay`: 次ページ移動待機時間（デフォルト: 2000ms）

### カスタマイズ

`content.js`の`CONFIG`オブジェクトを編集することで、動作をカスタマイズできます。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
