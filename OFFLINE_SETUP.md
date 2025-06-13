# オフライン環境での利用について

このアプリケーションをオフライン環境で利用するには、以下の外部リソースをローカルに配置する必要があります。

## 必要なリソース

### 1. Font Awesome フォントファイル

Font Awesome CSSファイル（`assets/css/fontawesome.min.css`）は既に配置済みですが、実際のフォントファイルも必要です。

以下のフォントファイルを `assets/fonts/` ディレクトリに配置してください：

- `fa-solid-900.woff2`
- `fa-regular-400.woff2`
- `fa-brands-400.woff2`

これらのファイルは以下のURLからダウンロードできます：
- https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/

### 2. Noto Sans JP フォントファイル

以下のフォントファイルを `assets/fonts/` ディレクトリに配置してください：

- `NotoSansJP-Light.woff2` (300)
- `NotoSansJP-Regular.woff2` (400)  
- `NotoSansJP-Medium.woff2` (500)
- `NotoSansJP-Bold.woff2` (700)

これらのファイルは Google Fonts からダウンロードできます：
- https://fonts.google.com/specimen/Noto+Sans+JP

## ファイルダウンロードスクリプト

PowerShellを使用してフォントファイルを一括ダウンロードする場合：

```powershell
# Font Awesome フォントファイルをダウンロード
$fontAwesomeFiles = @(
    "fa-solid-900.woff2",
    "fa-regular-400.woff2", 
    "fa-brands-400.woff2"
)

foreach ($file in $fontAwesomeFiles) {
    $url = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/$file"
    $output = "assets/fonts/$file"
    Invoke-WebRequest -Uri $url -OutFile $output
    Write-Host "Downloaded: $file"
}
```

## ディレクトリ構造

```
orgchartor/
├── index.html
├── main.js
├── style.css
├── sample.csv
├── 仕様書.md
├── assets/
│   ├── css/
│   │   ├── fontawesome.min.css
│   │   └── noto-sans-jp.css
│   └── fonts/
│       ├── fa-solid-900.woff2
│       ├── fa-regular-400.woff2
│       ├── fa-brands-400.woff2
│       ├── NotoSansJP-Light.woff2
│       ├── NotoSansJP-Regular.woff2
│       ├── NotoSansJP-Medium.woff2
│       └── NotoSansJP-Bold.woff2
└── OFFLINE_SETUP.md
```

## 確認方法

1. すべてのファイルが配置されているか確認
2. ブラウザでindex.htmlを開く
3. ネットワーク接続を無効にして動作確認
4. アイコンとフォントが正しく表示されることを確認
