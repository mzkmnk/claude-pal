# Claude PAL アーキテクチャ図

## 1. システム全体アーキテクチャ

```mermaid
graph TB
    subgraph "モバイル端末"
        A[Ionic アプリ<br/>Angular 17 + Capacitor 7]
        A1[WebView層]
        A2[ネイティブ層]
        A --> A1
        A --> A2
    end
    
    subgraph "ネットワーク"
        B[Tailscale VPN<br/>または<br/>直接SSH]
    end
    
    subgraph "自宅のMac/Linux"
        C[SSH Server]
        D[Claude Code<br/>インスタンス]
        E[tmux<br/>セッション管理]
        F[Git Worktrees]
        G[ファイルシステム]
        
        C --> E
        E --> D
        D --> F
        D --> G
    end
    
    A2 -.->|Option 1<br/>ネイティブSSH| B
    A1 -->|Option 2<br/>WebSocket| H[Node.js<br/>バックエンド]
    H --> B
    B --> C
    
    style A fill:#3880ff,color:#fff
    style D fill:#ff6b6b,color:#fff
    style E fill:#4ecdc4,color:#fff
```

## 2. コンポーネント詳細アーキテクチャ

```mermaid
graph LR
    subgraph "Ionicアプリケーション"
        UI[UI Components]
        SM[State Management<br/>NgRx]
        SRV[Services]
        
        UI --> SM
        SM --> SRV
        
        subgraph "Services"
            SSH[SSH Service]
            CLAUDE[Claude Service]
            FILE[File Service]
            GIT[Git Service]
            NOTIF[Notification Service]
        end
        
        SRV --> SSH
        SRV --> CLAUDE
        SRV --> FILE
        SRV --> GIT
        SRV --> NOTIF
    end
    
    subgraph "Capacitorプラグイン"
        CAP_SSH[SSH Plugin]
        CAP_PUSH[Push Notifications]
        CAP_STORE[Secure Storage]
    end
    
    SSH --> CAP_SSH
    NOTIF --> CAP_PUSH
    SSH --> CAP_STORE
```

## 3. データフロー図

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant App as Ionicアプリ
    participant SSH as SSH接続
    participant TMX as tmux
    participant Claude as Claude Code
    participant FS as ファイルシステム
    
    User->>App: メッセージ入力
    App->>SSH: SSH接続確立
    SSH->>TMX: セッション選択/作成
    TMX->>Claude: 入力送信
    Claude->>Claude: 処理実行
    Claude->>FS: ファイル操作
    FS-->>Claude: 結果
    Claude-->>TMX: 出力
    TMX-->>SSH: 出力転送
    SSH-->>App: 結果表示
    App-->>User: UI更新
```

## 4. 複数セッション管理フロー

```mermaid
stateDiagram-v2
    [*] --> Idle: アプリ起動
    
    Idle --> Connecting: SSH接続開始
    Connecting --> Connected: 接続成功
    Connecting --> Error: 接続失敗
    Error --> Idle: リトライ
    
    Connected --> SessionList: セッション一覧取得
    
    SessionList --> CreateSession: 新規作成
    SessionList --> SelectSession: 既存選択
    
    CreateSession --> WorktreeSetup: Worktree作成
    WorktreeSetup --> ClaudeStart: Claude起動
    
    SelectSession --> ClaudeAttach: tmuxアタッチ
    
    ClaudeStart --> Active: アクティブ
    ClaudeAttach --> Active: アクティブ
    
    Active --> SendCommand: コマンド送信
    SendCommand --> Active: 結果受信
    
    Active --> SwitchSession: セッション切替
    SwitchSession --> SessionList
    
    Active --> Terminate: 終了
    Terminate --> SessionList
```

## 5. ファイルブラウザーアーキテクチャ

```mermaid
graph TD
    subgraph "UI Layer"
        FB[File Browser<br/>Component]
        FT[File Tree<br/>Component]
        CV[Code Viewer<br/>Component]
        
        FB --> FT
        FB --> CV
    end
    
    subgraph "Service Layer"
        FS[File Service]
        CACHE[Cache Service]
        
        FT --> FS
        CV --> FS
        FS --> CACHE
    end
    
    subgraph "SSH Layer"
        CMD[Command Executor]
        WATCH[File Watcher]
        
        FS --> CMD
        FS --> WATCH
    end
    
    subgraph "Remote System"
        RSYS[File System]
        GIT[Git Repository]
        
        CMD --> RSYS
        CMD --> GIT
        WATCH --> RSYS
    end
```

## 6. プッシュ通知フロー

```mermaid
sequenceDiagram
    participant CC as Claude Code
    participant MON as Monitor Service
    participant FCM as Firebase Cloud Messaging
    participant APP as モバイルアプリ
    participant USER as ユーザー
    
    CC->>CC: タスク実行中
    MON->>CC: 出力監視 (5秒毎)
    CC-->>MON: 出力データ
    MON->>MON: 完了パターン検出
    
    alt タスク完了検出
        MON->>FCM: 通知送信要求
        FCM->>APP: プッシュ通知
        APP->>USER: 通知表示
        USER->>APP: 通知タップ
        APP->>APP: セッション画面へ遷移
    end
```

## 7. セキュリティアーキテクチャ

```mermaid
graph TB
    subgraph "モバイルアプリ"
        UI[ユーザーインターフェース]
        SEC[Secure Storage]
        AUTH[認証サービス]
    end
    
    subgraph "セキュリティ層"
        ENC[暗号化]
        KEY[SSH鍵管理]
        TOKEN[JWTトークン]
    end
    
    subgraph "通信"
        WSS[WebSocket Secure]
        SSH_T[SSH Tunnel]
    end
    
    subgraph "リモートシステム"
        SSHD[SSH Server]
        CLAUDE[Claude Code]
    end
    
    UI --> AUTH
    AUTH --> SEC
    SEC --> KEY
    KEY --> ENC
    ENC --> SSH_T
    
    UI --> TOKEN
    TOKEN --> WSS
    
    WSS --> SSHD
    SSH_T --> SSHD
    SSHD --> CLAUDE
    
    style ENC fill:#ff6b6b,color:#fff
    style KEY fill:#ff6b6b,color:#fff
    style TOKEN fill:#ff6b6b,color:#fff
```

## 8. 開発環境セットアップフロー

```mermaid
graph LR
    START[開始] --> IONIC[Ionic CLI<br/>インストール]
    IONIC --> PROJECT[プロジェクト<br/>作成]
    PROJECT --> DEPS[依存関係<br/>インストール]
    
    DEPS --> CAP[Capacitor<br/>設定]
    CAP --> PLATFORM[プラットフォーム<br/>追加]
    
    PLATFORM --> IOS[iOS設定]
    PLATFORM --> ANDROID[Android設定]
    
    IOS --> XCODE[Xcode<br/>設定]
    ANDROID --> STUDIO[Android Studio<br/>設定]
    
    XCODE --> BUILD1[ビルド]
    STUDIO --> BUILD2[ビルド]
    
    BUILD1 --> TEST[テスト実行]
    BUILD2 --> TEST
    
    TEST --> END[完了]
    
    style START fill:#4ecdc4,color:#fff
    style END fill:#4ecdc4,color:#fff
```

## 9. エラーハンドリングフロー

```mermaid
stateDiagram-v2
    [*] --> Normal: 正常動作
    
    Normal --> SSHError: SSH接続エラー
    Normal --> NetworkError: ネットワークエラー
    Normal --> ClaudeError: Claude Codeエラー
    
    SSHError --> Reconnect: 自動再接続
    NetworkError --> Offline: オフラインモード
    ClaudeError --> RestartClaude: Claude再起動
    
    Reconnect --> Normal: 成功
    Reconnect --> Manual: 失敗
    
    Offline --> CacheMode: キャッシュ表示
    CacheMode --> Normal: 接続回復
    
    RestartClaude --> Normal: 成功
    RestartClaude --> Manual: 失敗
    
    Manual --> UserAction: ユーザー操作待ち
    UserAction --> Normal: 解決
```

## 10. パフォーマンス最適化戦略

```mermaid
graph TD
    subgraph "フロントエンド最適化"
        LAZY[Lazy Loading<br/>モジュール]
        VIRTUAL[Virtual Scroll<br/>大量データ]
        CACHE_UI[UI Cache<br/>IndexedDB]
    end
    
    subgraph "通信最適化"
        COMPRESS[データ圧縮<br/>gzip]
        BATCH[バッチ処理<br/>コマンド集約]
        DEBOUNCE[Debounce<br/>入力制御]
    end
    
    subgraph "バックエンド最適化"
        POOL[接続プール<br/>SSH再利用]
        STREAM[ストリーミング<br/>大容量ファイル]
        DIFF[差分更新<br/>変更箇所のみ]
    end
    
    LAZY --> Performance[高速化]
    VIRTUAL --> Performance
    CACHE_UI --> Performance
    
    COMPRESS --> Performance
    BATCH --> Performance
    DEBOUNCE --> Performance
    
    POOL --> Performance
    STREAM --> Performance
    DIFF --> Performance
    
    style Performance fill:#4ecdc4,color:#fff
```