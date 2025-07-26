# Angular 20 重要な変更点と注意事項

## Angular 20の主要な変更点（2025年5月リリース）

### 必須要件
- **Node.js 20以上**が必須（v18のサポート終了）
- **TypeScript 5.8**が必須
- **Zone.js**のサポートが非推奨に

### 新機能と安定化
1. **Zonelessモード**が開発者プレビューに
   - `provideExperimentalZonelessChangeDetection` → `provideZonelessChangeDetection`に名称変更
   - Zone.jsを使わないChange Detectionが可能に

2. **Signalsの安定化**
   - `signal`、`effect`、`linkedSignal`が安定版に
   - Signal-basedのクエリとインプットも安定化
   - `afterRender()` → `afterEveryRender()`に名称変更

3. **構造ディレクティブの非推奨化**
   - `*ngIf`、`*ngFor`、`*ngSwitch`が正式に非推奨
   - 代わりに制御フロー構文（`@if`、`@for`、`@switch`）を使用

### 非推奨と削除
1. **@angular/platform-browser-dynamic**パッケージが非推奨
   - `@angular/platform-browser`を使用するよう推奨
   - 自動マイグレーションスキーマは未提供

2. **HammerJS統合の非推奨化**
   - HammerJSは8年間更新されていないため
   - 将来的にフレームワークから削除予定

### マイグレーション時の注意点
1. **破壊的変更**が多数含まれる
2. **手動でのインポート更新**が必要な箇所あり
3. **テストコードの更新**が必要な場合がある

## 推奨事項
- 新規プロジェクトではSignalsとZonelessモードの採用を検討
- 既存プロジェクトは段階的なマイグレーションを推奨
- 構造ディレクティブから制御フロー構文への移行を開始