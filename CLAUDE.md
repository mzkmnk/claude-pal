# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Claude PAL - モバイル端末からSSH経由でClaude Codeを操作するIonicアプリケーション

### プロジェクト概要
- **目的**: SSH鍵の安全な管理とClaude Code用に最適化されたターミナルUIの提供
- **技術スタック**: Ionic 8.6 + Angular 20 + Capacitor 7.4
- **対応プラットフォーム**: iOS、Android、Web（PWA）

### 実装計画とタスク管理

**重要**: 実装を進める際は、以下のTODOファイルを参照し、完了したタスクにチェックを付けてください。

1. **アーキテクチャと技術スタック**: `.claude/plan/01_architecture_and_tech_stack.md`
2. **実装TODO**: `.claude/plan/02_implementation_todo.md`
3. **クイックスタート**: `.claude/plan/03_quick_start_guide.md`

#### タスク完了時の更新方法
```bash
# TODOファイルを編集して、完了したタスクにチェックを付ける
# 例: - [ ] タスク名 → - [x] タスク名
```

### ビルドコマンド
```bash
# 開発サーバー起動
ionic serve

# iOS向けビルド
ionic capacitor build ios

# Android向けビルド
ionic capacitor build android

# テスト実行
npm test

# リント
npm run lint
```

### ディレクトリ構造
- `src/app/core/` - コアサービス（SSH、鍵管理など）
- `src/app/shared/` - 共有コンポーネント
- `src/app/features/` - 機能別モジュール
- `.claude/plan/` - 実装計画書
- `.claude/research/` - 技術調査資料

## コーディング規約

### 型安全性
- **any型の使用禁止**: 型安全性を保つため、`any`型は一切使用しない
  - ❌ `const data: any = response`
  - ✅ `const data: ResponseData = response`
  - どうしても型が不明な場合は`unknown`を使用し、型ガードで絞り込む
- **型推論の活用**: 明示的な型注釈は必要な場合のみ
- **strictモード**: TypeScriptのstrictモードを常に有効にする

### 単一責任の原則
- **1関数1つの責務**: 各関数は単一の明確な責任を持つこと
- **1ファイル1関数/クラス**: 各ファイルには1つの主要な関数またはクラスのみを含めること
- **バレルインポート禁止**: `index.ts`などを使った再エクスポートは行わない
  - ❌ `export * from './types'` 
  - ✅ `import { SpecificType } from './types/SpecificType'`

### ファイル構成例
```typescript
// ❌ 悪い例: 複数の責務を持つファイル
// src/utils/index.ts
export function validateEmail() { ... }
export function formatDate() { ... }
export function parseJson() { ... }

// ✅ 良い例: 単一責務のファイル
// src/utils/validateEmail.ts
export function validateEmail(email: string): boolean {
  // 単一の責務: メールアドレスの検証
}

// src/utils/formatDate.ts  
export function formatDate(date: Date): string {
  // 単一の責務: 日付のフォーマット
}
```

### テスト駆動開発（TDD）
**重要**: 実装する際は[t-wada](https://github.com/twada)が推奨するTDDで実装してください。

1. **Red**: 失敗するテストを最初に書く
2. **Green**: テストを通す最小限のコードを実装
3. **Refactor**: コードをリファクタリング

#### TDDサイクル例
```typescript
// 1. Red: 失敗するテストを書く
// src/utils/__tests__/validateEmail.test.ts
import { validateEmail } from '../validateEmail';

describe('validateEmail', () => {
  it('正しいメールアドレスを検証する', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });
});

// 2. Green: 最小限の実装
// src/utils/validateEmail.ts
export function validateEmail(email: string): boolean {
  return email.includes('@');
}

// 3. Refactor: 実装を改善
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

### テストの命名規則
- テストファイル: `{対象ファイル名}.test.ts`
- テストの説明: 日本語で期待される振る舞いを記述
- `it('〜すること')` の形式で記述

## Language Settings / 言語設定

**IMPORTANT / 重要**: In this project, Claude Code must ALWAYS respond in Japanese. Technical terms can remain in English.

このプロジェクトでは、Claude Codeは**必ず**日本語で返答してください。技術用語は英語のままで問題ありません。

### Examples / 例:

- ✅ 「componentを作成しました」
- ✅ 「TypeScriptの型定義を追加しました」
- ❌ "I've created a new component"
- ❌ "Added TypeScript type definitions"

## Pull Request Guidelines / PR作成ガイドライン

**IMPORTANT**: このプロジェクトでは、すべてのPull Requestは必ずDraftとして作成してください。

### PR作成時のルール:
- 必ず `gh pr create --draft` を使用すること
- PRタイトルは日本語で記述
- PR本文も日本語で記述（技術用語は英語OK）

### 例:
```bash
gh pr create --draft --title "feat: Termux Native Module実装" --body "## 概要
Termux連携のためのNative Module実装

## 変更内容
- TermuxModule.ktの実装
- JavaScript側のブリッジ追加
- テストコード追加"
```

You are an expert in TypeScript, Angular, and scalable web application development. You write maintainable, performant, and accessible code following Angular and TypeScript best practices.
## TypeScript Best Practices
- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
## Angular Best Practices
- Always use standalone components over NgModules
- Do NOT set `standalone: true` inside the `@Component`, `@Directive` and `@Pipe` decorators
- Use signals for state management
- Implement lazy loading for feature routes
- Use `NgOptimizedImage` for all static images.
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
## Components
- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- DO NOT use `ngStyle`, use `style` bindings instead
## State Management
- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead
## Templates
- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
## Services
- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection