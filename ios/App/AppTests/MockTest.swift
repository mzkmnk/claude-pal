//
//  MockTest.swift
//  AppTests
//
//  基本的なテストの動作確認用
//

import XCTest

class MockTest: XCTestCase {
    
    func testExample() {
        XCTAssertEqual(1 + 1, 2)
    }
    
    func testAlwaysPass() {
        XCTAssertTrue(true)
    }
}