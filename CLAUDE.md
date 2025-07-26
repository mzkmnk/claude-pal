# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This is currently an empty project directory with no codebase structure established yet. 

When the project is initialized, this file should be updated with:
1. Commands for building, linting, and testing
2. High-level architecture and code structure
3. Key development workflows specific to this project

Until then, Claude Code should help with:
- Setting up the initial project structure
- Choosing appropriate frameworks and tools
- Creating the foundational architecture

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
[t-wada](https://github.com/twada)が推奨するTDDプラクティスに従う：

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