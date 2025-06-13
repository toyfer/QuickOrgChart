# =============================================================================
# �I�t���C�����p�t�H���g�Z�b�g�A�b�v�X�N���v�g
# Font Awesome & Noto Sans JP �t�H���g�t�@�C���̎����_�E�����[�h
# =============================================================================

# �ݒ�l
$FontAwesomeVersion = "6.0.0"
$FontsDirectory = "assets/fonts"
$BaseUrl = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/$FontAwesomeVersion/webfonts"

# �_�E�����[�h�Ώۃt�@�C����`
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
# �֐���`
# =============================================================================

# �f�B���N�g���쐬
function Initialize-FontsDirectory {
    if (-not (Test-Path $FontsDirectory)) {
        New-Item -ItemType Directory -Path $FontsDirectory -Force | Out-Null
        Write-Host "�f�B���N�g�����쐬���܂���: $FontsDirectory" -ForegroundColor Green
    }
}

# Font Awesome�t�@�C���_�E�����[�h
function Download-FontAwesome {
    Write-Host ""
    Write-Host "Font Awesome �t�H���g���_�E�����[�h��..." -ForegroundColor Yellow
    
    foreach ($file in $FontAwesomeFiles) {
        $url = "$BaseUrl/$file"
        $output = "$FontsDirectory/$file"
        
        try {
            Write-Host "�_�E�����[�h��: $file"
            Invoke-WebRequest -Uri $url -OutFile $output -ErrorAction Stop
            Write-Host "����: $file" -ForegroundColor Green
        }
        catch {
            Write-Host "�G���[: $file �̃_�E�����[�h�Ɏ��s���܂��� - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Noto Sans JP�t�@�C���_�E�����[�h
function Download-NotoSansJP {
    Write-Host ""
    Write-Host "Noto Sans JP �t�H���g���_�E�����[�h��..." -ForegroundColor Yellow
    
    foreach ($font in $NotoSansJPFiles) {
        $output = "$FontsDirectory/$($font.file)"
        
        try {
            Write-Host "�_�E�����[�h��: $($font.file)"
            Invoke-WebRequest -Uri $font.url -OutFile $output -ErrorAction Stop
            Write-Host "����: $($font.file)" -ForegroundColor Green
        }
        catch {
            Write-Host "�G���[: $($font.file) �̃_�E�����[�h�Ɏ��s���܂��� - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# ���ʕ\��
function Show-CompletionMessage {
    Write-Host ""
    Write-Host "���ׂẴt�H���g�t�@�C���̃_�E�����[�h���������܂���!" -ForegroundColor Green
    Write-Host ""
    Write-Host "�I�t���C�����ł̎g�p�����������܂����B" -ForegroundColor Cyan
    Write-Host "�ȉ��̃t�@�C���� $FontsDirectory �ɔz�u����Ă��܂�:" -ForegroundColor Cyan    Get-ChildItem -Path $FontsDirectory -Filter "*.woff*" | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Gray
    }
}

# =============================================================================
# ���C���������s
# =============================================================================

Write-Host "Font Awesome & Noto Sans JP �t�H���g�t�@�C�����_�E�����[�h��..."

Initialize-FontsDirectory
Download-FontAwesome
Download-NotoSansJP
Show-CompletionMessage
