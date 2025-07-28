//
//  SSHPluginTests.swift
//  AppTests
//
//  SSHPluginのユニットテスト
//

import XCTest
import Capacitor
@testable import App

/**
 * SSHPluginのテストクラス
 * 
 * SSH接続機能、コマンド送信、ウィンドウリサイズ、切断処理のテストを実施
 */
class SSHPluginTests: XCTestCase {
    
    var plugin: SSHPlugin!
    
    override func setUp() {
        super.setUp()
        plugin = SSHPlugin()
    }
    
    override func tearDown() {
        plugin = nil
        super.tearDown()
    }
    
    /**
     * 必須パラメータが不足している場合のconnectメソッドのテスト
     */
    func test接続時の必須パラメータ不足エラー() {
        let call = CAPPluginCall(callbackId: "test", options: [:], success: { _ in
            XCTFail("成功すべきではない")
        }, error: { error in
            XCTAssertNotNil(error)
            XCTAssertTrue(error.message?.contains("必須パラメータが不足") ?? false)
        })
        
        plugin.connect(call)
    }
    
    /**
     * 認証情報が提供されていない場合のconnectメソッドのテスト
     */
    func test認証情報未提供エラー() {
        let expectation = self.expectation(description: "認証エラー")
        
        let call = CAPPluginCall(callbackId: "test", options: [
            "host": "test.example.com",
            "username": "testuser",
            "port": 22
        ], success: { _ in
            XCTFail("成功すべきではない")
        }, error: { error in
            XCTAssertNotNil(error)
            expectation.fulfill()
        })
        
        plugin.connect(call)
        
        waitForExpectations(timeout: 5)
    }
    
    /**
     * パスワード認証での接続テスト（モック）
     */
    func testパスワード認証での接続() {
        let expectation = self.expectation(description: "接続成功")
        
        let call = CAPPluginCall(callbackId: "test", options: [
            "host": "test.example.com",
            "username": "testuser",
            "port": 22,
            "password": "testpassword"
        ], success: { result in
            XCTAssertNotNil(result)
            if let sessionId = result["sessionId"] as? String {
                XCTAssertFalse(sessionId.isEmpty)
            } else {
                XCTFail("sessionIdが返されなかった")
            }
            expectation.fulfill()
        }, error: { _ in
            XCTFail("エラーになるべきではない")
        })
        
        plugin.connect(call)
        
        waitForExpectations(timeout: 5)
    }
    
    /**
     * sendCommandメソッドの必須パラメータテスト
     */
    func testコマンド送信の必須パラメータ確認() {
        let call = CAPPluginCall(callbackId: "test", options: [:], success: { _ in
            XCTFail("成功すべきではない")
        }, error: { error in
            XCTAssertNotNil(error)
            XCTAssertTrue(error.message?.contains("必須パラメータが不足") ?? false)
        })
        
        plugin.sendCommand(call)
    }
    
    /**
     * 無効なセッションIDでのコマンド送信テスト
     */
    func test無効なセッションIDでのコマンド送信() {
        let call = CAPPluginCall(callbackId: "test", options: [
            "sessionId": "invalid-session-id",
            "command": "ls -la"
        ], success: { _ in
            XCTFail("成功すべきではない")
        }, error: { error in
            XCTAssertNotNil(error)
            XCTAssertTrue(error.message?.contains("無効なセッションID") ?? false)
        })
        
        plugin.sendCommand(call)
    }
    
    /**
     * resizeWindowメソッドの必須パラメータテスト
     */
    func testウィンドウリサイズの必須パラメータ確認() {
        let call = CAPPluginCall(callbackId: "test", options: [
            "sessionId": "test-session"
        ], success: { _ in
            XCTFail("成功すべきではない")
        }, error: { error in
            XCTAssertNotNil(error)
            XCTAssertTrue(error.message?.contains("必須パラメータが不足") ?? false)
        })
        
        plugin.resizeWindow(call)
    }
    
    /**
     * disconnectメソッドの必須パラメータテスト
     */
    func test切断時のセッションID必須確認() {
        let call = CAPPluginCall(callbackId: "test", options: [:], success: { _ in
            XCTFail("成功すべきではない")
        }, error: { error in
            XCTAssertNotNil(error)
            XCTAssertTrue(error.message?.contains("sessionIdが必要") ?? false)
        })
        
        plugin.disconnect(call)
    }
    
    /**
     * AuthTypeのdescriptionプロパティテスト
     */
    func test認証タイプの文字列表現() {
        XCTAssertEqual(AuthType.none.description, "none")
        XCTAssertEqual(AuthType.password("test").description, "password")
        XCTAssertEqual(AuthType.privateKey(key: "key", passphrase: nil).description, "privateKey")
    }
    
    /**
     * SSHErrorのerrorDescriptionプロパティテスト
     */
    func testSSHエラーメッセージ() {
        XCTAssertEqual(SSHError.missingAuthCredentials.errorDescription, "認証情報が提供されていません")
        XCTAssertEqual(SSHError.authenticationFailed.errorDescription, "認証に失敗しました")
        XCTAssertEqual(SSHError.sessionNotFound.errorDescription, "セッションが見つかりません")
        XCTAssertEqual(SSHError.connectionFailed("タイムアウト").errorDescription, "接続に失敗しました: タイムアウト")
    }
}

// MARK: - CAPPluginCallのモック拡張

extension CAPPluginCall {
    convenience init(callbackId: String, 
                    options: [String: Any], 
                    success: @escaping (PluginCallResultData) -> Void,
                    error: @escaping (CAPPluginCallError) -> Void) {
        self.init()
        self.callbackId = callbackId
        self.options = options
        self.successHandler = success
        self.errorHandler = error
    }
}