import Capacitor
import Foundation

/**
 * SSH接続を管理するCapacitorプラグイン
 * 
 * このプラグインはiOS専用で、NMSSH（将来的に統合予定）を使用して
 * SSH接続を確立し、ターミナルセッションを管理します。
 */
@objc(SSHPlugin)
public class SSHPlugin: CAPPlugin {
    /**
     * アクティブなSSHセッションを管理するディクショナリ
     * キー: セッションID、値: SSHSessionオブジェクト
     */
    private var sessions: [String: SSHSession] = [:]
    
    /**
     * SSH接続を確立する
     * 
     * @param call Capacitorプラグインコール
     */
    @objc func connect(_ call: CAPPluginCall) {
        // 必須パラメータの取得
        guard let host = call.getString("host"),
              let username = call.getString("username"),
              let port = call.getInt("port") else {
            call.reject("必須パラメータが不足しています: host, username, port")
            return
        }
        
        // バックグラウンドスレッドで接続処理を実行
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                // セッションIDを生成
                let sessionId = UUID().uuidString
                
                // セッションオブジェクトを作成
                let session = SSHSession(
                    id: sessionId,
                    host: host,
                    port: port,
                    username: username
                )
                
                // 認証情報の設定
                if let password = call.getString("password") {
                    session.authType = .password(password)
                } else if let privateKey = call.getString("privateKey") {
                    let passphrase = call.getString("passphrase")
                    session.authType = .privateKey(key: privateKey, passphrase: passphrase)
                } else {
                    throw SSHError.missingAuthCredentials
                }
                
                // TODO: 実際のSSH接続実装（NMSSH統合後）
                // 現在はモック実装
                self.mockConnect(session: session)
                
                // セッションを保存
                self.sessions[sessionId] = session
                
                // 接続成功を通知
                DispatchQueue.main.async {
                    self.notifyListeners("connectionStateChanged", data: [
                        "sessionId": sessionId,
                        "state": "connected"
                    ])
                    
                    call.resolve([
                        "sessionId": sessionId
                    ])
                }
                
            } catch {
                DispatchQueue.main.async {
                    self.notifyListeners("connectionStateChanged", data: [
                        "state": "error",
                        "error": error.localizedDescription
                    ])
                    
                    call.reject("接続に失敗しました", error.localizedDescription)
                }
            }
        }
    }
    
    /**
     * コマンドを送信する
     * 
     * @param call Capacitorプラグインコール
     */
    @objc func sendCommand(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId"),
              let command = call.getString("command") else {
            call.reject("必須パラメータが不足しています: sessionId, command")
            return
        }
        
        guard let session = sessions[sessionId] else {
            call.reject("無効なセッションID")
            return
        }
        
        // TODO: 実際のコマンド送信実装
        mockSendCommand(session: session, command: command)
        
        call.resolve()
    }
    
    /**
     * ウィンドウサイズを変更する
     * 
     * @param call Capacitorプラグインコール
     */
    @objc func resizeWindow(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId"),
              let cols = call.getInt("cols"),
              let rows = call.getInt("rows") else {
            call.reject("必須パラメータが不足しています: sessionId, cols, rows")
            return
        }
        
        guard let session = sessions[sessionId] else {
            call.reject("無効なセッションID")
            return
        }
        
        session.cols = cols
        session.rows = rows
        
        // TODO: 実際のPTYリサイズ実装
        
        call.resolve()
    }
    
    /**
     * 接続を切断する
     * 
     * @param call Capacitorプラグインコール
     */
    @objc func disconnect(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId") else {
            call.reject("sessionIdが必要です")
            return
        }
        
        guard let session = sessions[sessionId] else {
            call.reject("無効なセッションID")
            return
        }
        
        // TODO: 実際の切断処理
        
        // セッションを削除
        sessions.removeValue(forKey: sessionId)
        
        // 切断を通知
        self.notifyListeners("connectionStateChanged", data: [
            "sessionId": sessionId,
            "state": "disconnected"
        ])
        
        call.resolve()
    }
    
    // MARK: - モック実装（開発用）
    
    private func mockConnect(session: SSHSession) {
        // 接続のシミュレーション
        Thread.sleep(forTimeInterval: 0.5)
        
        print("Mock SSH connection established:")
        print("  Host: \(session.host):\(session.port)")
        print("  Username: \(session.username)")
        print("  Auth: \(session.authType)")
        
        // モックデータストリームを開始
        startMockDataStream(session: session)
    }
    
    private func mockSendCommand(session: SSHSession, command: String) {
        // コマンドのエコーバック
        self.notifyListeners("dataReceived", data: [
            "sessionId": session.id,
            "data": command
        ])
        
        // Enterキーが含まれている場合
        if command.contains("\n") || command.contains("\r") {
            // モックレスポンスを生成
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                let response = self.generateMockResponse(for: command.trimmingCharacters(in: .whitespacesAndNewlines))
                self.notifyListeners("dataReceived", data: [
                    "sessionId": session.id,
                    "data": "\r\n\(response)\r\n$ "
                ])
            }
        }
    }
    
    private func startMockDataStream(session: SSHSession) {
        // 初期プロンプトを送信
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            self.notifyListeners("dataReceived", data: [
                "sessionId": session.id,
                "data": "Welcome to Mock SSH Server\r\n\r\n$ "
            ])
        }
    }
    
    private func generateMockResponse(for command: String) -> String {
        switch command {
        case "ls":
            return "Applications\nDesktop\nDocuments\nDownloads"
        case "pwd":
            return "/Users/mockuser"
        case "whoami":
            return "mockuser"
        case "date":
            return Date().description
        case let cmd where cmd.starts(with: "echo "):
            return String(cmd.dropFirst(5))
        default:
            return "mock: \(command): command not found"
        }
    }
}

// MARK: - SSHSession

/**
 * SSHセッションを表すクラス
 */
class SSHSession {
    let id: String
    let host: String
    let port: Int
    let username: String
    var authType: AuthType = .none
    var rows: Int = 24
    var cols: Int = 80
    
    init(id: String, host: String, port: Int, username: String) {
        self.id = id
        self.host = host
        self.port = port
        self.username = username
    }
}

// MARK: - AuthType

/**
 * SSH認証タイプ
 */
enum AuthType: CustomStringConvertible {
    case none
    case password(String)
    case privateKey(key: String, passphrase: String?)
    
    var description: String {
        switch self {
        case .none:
            return "none"
        case .password:
            return "password"
        case .privateKey:
            return "privateKey"
        }
    }
}

// MARK: - SSHError

/**
 * SSHエラー
 */
enum SSHError: LocalizedError {
    case missingAuthCredentials
    case connectionFailed(String)
    case authenticationFailed
    case sessionNotFound
    
    var errorDescription: String? {
        switch self {
        case .missingAuthCredentials:
            return "認証情報が提供されていません"
        case .connectionFailed(let reason):
            return "接続に失敗しました: \(reason)"
        case .authenticationFailed:
            return "認証に失敗しました"
        case .sessionNotFound:
            return "セッションが見つかりません"
        }
    }
}