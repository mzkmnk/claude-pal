import Capacitor
import Foundation
import SwiftSH

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
    private var sessions: [String: SSHSession] = []
    
    /**
     * SwiftSHのSSHShellオブジェクトを管理するディクショナリ
     * キー: セッションID、値: SSHShellオブジェクト
     */
    private var sshConnections: [String: SSHShell] = [:]
    
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
                
                // SwiftSHを使用してSSH接続を確立
                try self.connectWithSwiftSH(session: session)
                
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
        
        // SwiftSHを使用してコマンドを送信
        sendCommandWithSwiftSH(session: session, command: command)
        
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
        
        // SwiftSHのシェルのPTYサイズを更新
        if let shell = sshConnections[sessionId] {
            shell.setTerminalSize(width: UInt16(cols), height: UInt16(rows))
        }
        
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
        
        // SwiftSHの接続を切断
        if let shell = sshConnections[sessionId] {
            shell.disconnect { _ in
                print("セッション \(sessionId) を切断しました")
            }
        }
        
        // セッションを削除
        sessions.removeValue(forKey: sessionId)
        sshConnections.removeValue(forKey: sessionId)
        
        // 切断を通知
        self.notifyListeners("connectionStateChanged", data: [
            "sessionId": sessionId,
            "state": "disconnected"
        ])
        
        call.resolve()
    }
    
    // MARK: - SwiftSH実装
    
    /**
     * SwiftSHを使用してSSH接続を確立する
     * 
     * @param session SSHセッション
     * @throws SSHError SSH接続エラー
     */
    private func connectWithSwiftSH(session: SSHSession) throws {
        // 認証チャレンジを作成
        let challenge: AuthenticationChallenge
        
        switch session.authType {
        case .password(let password):
            challenge = .byPassword(username: session.username, password: password)
        case .privateKey(let key, let passphrase):
            // プライベートキーを一時ファイルに保存
            let tempKeyPath = NSTemporaryDirectory() + "temp_ssh_key_\(session.id)"
            do {
                try key.write(toFile: tempKeyPath, atomically: true, encoding: .utf8)
                // ファイルのパーミッションを600に設定
                try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: tempKeyPath)
                
                challenge = .byPublicKeyFromFile(
                    username: session.username,
                    password: passphrase ?? "",
                    publicKey: "",  // 公開鍵は省略可能
                    privateKey: tempKeyPath
                )
                
                // 接続後に一時ファイルを削除
                DispatchQueue.global().asyncAfter(deadline: .now() + 5) {
                    try? FileManager.default.removeItem(atPath: tempKeyPath)
                }
            } catch {
                throw SSHError.authenticationFailed
            }
        case .none:
            throw SSHError.missingAuthCredentials
        }
        
        // ターミナル設定
        let terminal = Terminal("xterm-256color", width: UInt16(session.cols), height: UInt16(session.rows))
        
        do {
            // SSHShellを作成
            let shell = try SSHShell(host: session.host, port: UInt16(session.port), terminal: terminal)
            
            // 接続と認証をチェーンして実行
            shell.withCallback { [weak self] (data, error) in
                guard let self = self else { return }
                
                if let error = error {
                    print("SSHエラー: \(error)")
                    DispatchQueue.main.async {
                        self.notifyListeners("connectionStateChanged", data: [
                            "sessionId": session.id,
                            "state": "error",
                            "error": error.localizedDescription
                        ])
                    }
                    return
                }
                
                if let data = data {
                    let text = String(data: data, encoding: .utf8) ?? ""
                    DispatchQueue.main.async {
                        self.notifyListeners("dataReceived", data: [
                            "sessionId": session.id,
                            "data": text
                        ])
                    }
                }
            }
            .connect()
            .authenticate(challenge)
            .open { [weak self] error in
                guard let self = self else { return }
                
                if let error = error {
                    print("シェルオープンエラー: \(error)")
                    DispatchQueue.main.async {
                        self.notifyListeners("connectionStateChanged", data: [
                            "sessionId": session.id,
                            "state": "error",
                            "error": error.localizedDescription
                        ])
                    }
                } else {
                    // 接続成功
                    self.sshConnections[session.id] = shell
                    
                    DispatchQueue.main.async {
                        self.notifyListeners("connectionStateChanged", data: [
                            "sessionId": session.id,
                            "state": "connected"
                        ])
                    }
                }
            }
        } catch {
            throw SSHError.connectionFailed(error.localizedDescription)
        }
    }
    
    /**
     * SwiftSHを使用してコマンドを送信する
     * 
     * @param session SSHセッション
     * @param command 送信するコマンド
     */
    private func sendCommandWithSwiftSH(session: SSHSession, command: String) {
        guard let shell = sshConnections[session.id] else {
            print("SSH接続が見つかりません: \(session.id)")
            return
        }
        
        // シェルにコマンドを送信
        shell.write(command) { error in
            if let error = error {
                print("コマンド送信エラー: \(error)")
            }
        }
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