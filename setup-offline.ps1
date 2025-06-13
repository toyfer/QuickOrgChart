# =============================================================================
# オフライン環境用フォントセットアップスクリプト
# Font Awesome & Noto Sans JP フォントファイルの自動ダウンロード
# =============================================================================

# 設定値
$FontAwesomeVersion = "6.0.0"
$FontsDirectory = "assets/fonts"
$BaseUrl = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/$FontAwesomeVersion/webfonts"

# ダウンロード対象ファイル定義
$FontAwesomeFiles = @(
    "fa-solid-900.woff2",
    "fa-regular-400.woff2", 
    "fa-brands-400.woff2"
)

$NotoSansJPFiles = @(
    @{
        url = "https://fonts.gstatic.com/s/notosansjp/v52/nwpBtLGrOAZMl5nNBqU3r_kPDdyhUhQ6jg.woff"
        file = "NotoSansJP-Light.woff"
    },
    @{
        url = "https://fonts.gstatic.com/s/notosansjp/v52/nwpBtLGrOAZMl5nNBqU3r_kPDdmhUhQ6jg.woff"
        file = "NotoSansJP-Regular.woff"
    },
    @{
        url = "https://fonts.gstatic.com/s/notosansjp/v52/nwpBtLGrOAZMl5nNBqU3r_kPDdShUhQ6jg.woff"
        file = "NotoSansJP-Medium.woff"
    },
    @{
        url = "https://fonts.gstatic.com/s/notosansjp/v52/nwpBtLGrOAZMl5nNBqU3r_kPDdGhUhQ6jg.woff"
        file = "NotoSansJP-Bold.woff"
    }
)

# =============================================================================
# 関数定義
# =============================================================================

# ディレクトリ作成
function Initialize-FontsDirectory {
    if (-not (Test-Path $FontsDirectory)) {
        New-Item -ItemType Directory -Path $FontsDirectory -Force | Out-Null
        Write-Host "ディレクトリを作成しました: $FontsDirectory" -ForegroundColor Green
    }
}

# Font Awesomeファイルダウンロード
function Download-FontAwesome {
    Write-Host ""
    Write-Host "Font Awesome フォントをダウンロード中..." -ForegroundColor Yellow
    
    foreach ($file in $FontAwesomeFiles) {
        $url = "$BaseUrl/$file"
        $output = "$FontsDirectory/$file"
        
        try {
            Write-Host "ダウンロード中: $file"
            Invoke-WebRequest -Uri $url -OutFile $output -ErrorAction Stop
            Write-Host "完了: $file" -ForegroundColor Green
        }
        catch {
            Write-Host "エラー: $file のダウンロードに失敗しました - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Noto Sans JPファイルダウンロード
function Download-NotoSansJP {
    Write-Host ""
    Write-Host "Noto Sans JP フォントをダウンロード中..." -ForegroundColor Yellow
    
    foreach ($font in $NotoSansJPFiles) {
        $output = "$FontsDirectory/$($font.file)"
        
        try {
            Write-Host "ダウンロード中: $($font.file)"
            Invoke-WebRequest -Uri $font.url -OutFile $output -ErrorAction Stop
            Write-Host "完了: $($font.file)" -ForegroundColor Green
        }
        catch {
            Write-Host "エラー: $($font.file) のダウンロードに失敗しました - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# 結果表示
function Show-CompletionMessage {
    Write-Host ""
    Write-Host "すべてのフォントファイルのダウンロードが完了しました!" -ForegroundColor Green
    Write-Host ""
    Write-Host "オフライン環境での使用準備が整いました。" -ForegroundColor Cyan
    Write-Host "以下のファイルが $FontsDirectory に配置されています:" -ForegroundColor Cyan    Get-ChildItem -Path $FontsDirectory -Filter "*.woff*" | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Gray
    }
}

# =============================================================================
# メイン処理実行
# =============================================================================

Write-Host "Font Awesome & Noto Sans JP フォントファイルをダウンロード中..."

Initialize-FontsDirectory
Download-FontAwesome
Download-NotoSansJP
Show-CompletionMessage
