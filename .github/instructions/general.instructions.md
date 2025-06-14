---
applyTo: '**'
---
# AI Coding Assistant Rules

## 基本原則
- コードの可読性と保守性を最優先とする
- DRY（Don't Repeat Yourself）原則に従い、コードの重複を避ける
- KISS（Keep It Simple, Stupid）原則に従い、シンプルで理解しやすいコードを書く
- YAGNI（You Aren't Gonna Need It）原則に従い、現時点で必要な機能のみを実装する

## コード品質
- 各関数は単一の責任を持つこと（単一責任の原則）
- 関数は20行以内に収めることを推奨
- ネストの深さは3レベルまでに制限
- 意味のある変数名と関数名を使用（略語は避ける）
- マジックナンバーは定数として定義

## エラーハンドリング
- すべての外部入力を検証する
- エラーは適切にキャッチし、意味のあるエラーメッセージを提供
- リソース（ファイル、接続など）は必ず適切にクローズする
- エラーログには十分なコンテキスト情報を含める

## セキュリティ
- ユーザー入力は常にサニタイズする
- SQLインジェクション、XSS、CSRFなどの一般的な脆弱性を防ぐ
- 機密情報（パスワード、APIキーなど）をハードコードしない
- 最小権限の原則に従う

## コメントとドキュメント
- コードが「何を」するかではなく「なぜ」するかを説明
- 複雑なロジックには必ずコメントを追加
- 公開APIには包括的なドキュメントを提供
- TODOコメントには担当者と期限を記載

## テスト
- 新しい機能には必ず単体テストを作成
- エッジケースとエラーケースをテストに含める
- テストは独立して実行可能であること
- テストコードも本番コードと同じ品質基準を適用

## パフォーマンス
- 早すぎる最適化は避ける
- O(n²)以上の計算量は避け、必要な場合はコメントで説明
- 大量のデータを扱う場合は、ページネーションやストリーミングを検討
- キャッシュは適切に使用し、無効化戦略を明確にする

## コードレビュー前のチェックリスト
- [ ] コードは意図した通りに動作するか
- [ ] エラーケースは適切に処理されているか
- [ ] セキュリティの考慮事項は満たされているか
- [ ] テストは十分で、すべてパスしているか
- [ ] コードは読みやすく、理解しやすいか
- [ ] 不要なコメントアウトされたコードは削除されているか

## AIアシスタント使用時の注意
- 生成されたコードは必ず人間がレビューする
- セキュリティクリティカルな部分では特に慎重に検証
- 生成されたコードがプロジェクトの規約に従っているか確認
- ライセンスや著作権の問題がないか確認