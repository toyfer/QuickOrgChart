# QuickOrgChart

[![JavaScript](https://img.shields.io/badge/javascript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/html5-semantic-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5)

## 🎯 これは何？

**QuickOrgChart**は、CSVファイルから組織図を簡単に作成できるWebツールです。

### 解決する問題

- **組織図を作るのが面倒**: PowerPointで図を描いたり、専用ソフトを覚えるのは大変
- **データの更新が大変**: 人事異動のたびに手動で図を更新するのは非効率
- **共有しにくい**: 作った組織図を他の人と共有するのが困難
- **検索できない**: 大きな組織で特定の人や部署を探すのに時間がかかる

### このツールの特徴

- **CSVファイルをドロップするだけ** - ExcelやGoogleスプレッドシートで作ったCSVをブラウザにドラッグ&ドロップ
- **自動で階層化** - 部・課・係など任意の階層を自動判定してツリー表示
- **検索機能付き** - 組織名や人名をタイプするだけで瞬時に検索・移動
- **HTMLでエクスポート** - 作った組織図をHTMLファイルとして保存・共有可能
- **完全オフライン** - サーバー不要、データは外部に送信されない

### CSVファイルの形式

```csv
部コード,部名,課コード,課名,係コード,係名,氏名,職員番号,役職コード,役職
A01,総務部,B01,人事課,,,山田太郎,10001,100,課長
A01,総務部,B01,人事課,C01,給与係,佐藤花子,10002,200,主任
A01,総務部,B01,人事課,C01,給与係,鈴木一郎,10003,300,一般
```

こんな感じのCSVファイルを用意するだけで、自動的に組織図が生成されます。

## 📁 ファイル構成

```
orgchartor/
├── index.html          # メインページ
├── main.js             # JavaScript
├── style.css           # スタイル
├── sample.csv          # サンプルデータ
├── specification.md    # 詳細仕様
└── assets/             # フォント・アイコン
```

## 🚀 使い方

1. `index.html` をブラウザで開く
2. CSVファイルをドラッグ&ドロップ
3. 組織図が表示される
4. 検索したり、HTMLでエクスポートしたり

詳しい使い方や技術仕様は [specification.md](specification.md) を参照してください。

## 📄 ライセンス

MIT License - 自由に使ってください。
