const js = require('@eslint/js');
const { FlatCompat } = require('@eslint/eslintrc');
const path = require('path');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended
});

module.exports = [
  // 無視するパターン
  {
    ignores: [
      'projects/**/*',
      'node_modules/**/*',
      'dist/**/*',
      'www/**/*',
      '.angular/**/*',
      '*.min.js',
      '*.config.js',
      'src/app/tab3/tab3.page.html',
    ]
  },

  // TypeScriptファイル用の設定
  ...compat.extends(
    'plugin:@angular-eslint/recommended',
    'plugin:@angular-eslint/template/process-inline-templates',
    'prettier'
  ).map(config => ({
    ...config,
    files: ['**/*.ts'],
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        project: path.join(__dirname, 'tsconfig.json'),
        createDefaultProgram: true
      }
    }
  })),

  // TypeScriptファイル用のカスタムルール
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/component-class-suffix': [
        'error',
        {
          suffixes: ['Page', 'Component']
        }
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case'
        }
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase'
        }
      ]
    }
  },

  // HTMLファイル用の設定
  ...compat.extends(
    'plugin:@angular-eslint/template/recommended'
  ).map(config => ({
    ...config,
    files: ['**/*.html']
  })),

  // HTMLファイル用のカスタムルール（現在は空）
  {
    files: ['**/*.html'],
    rules: {}
  }
];