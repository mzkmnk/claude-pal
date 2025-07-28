import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageComponent } from './message.component';
import { Message, MessageType } from './message.interface';
import { By } from '@angular/platform-browser';

describe('MessageComponent', () => {
  let component: MessageComponent;
  let fixture: ComponentFixture<MessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MessageComponent);
    component = fixture.componentInstance;
  });

  it('コンポーネントが作成されること', () => {
    expect(component).toBeTruthy();
  });

  describe('メッセージタイプ別の表示', () => {
    it('ユーザーメッセージが正しく表示されること', () => {
      const message: Message = {
        id: '1',
        type: MessageType.USER,
        content: 'これはユーザーメッセージです',
        timestamp: new Date(),
      };

      fixture.componentRef.setInput('message', message);
      fixture.detectChanges();

      const messageElement = fixture.debugElement.query(
        By.css('.message-user')
      );
      expect(messageElement).toBeTruthy();
      expect(messageElement.nativeElement.textContent).toContain(
        'これはユーザーメッセージです'
      );
    });

    it('Claude出力が正しく表示されること', () => {
      const message: Message = {
        id: '2',
        type: MessageType.CLAUDE,
        content: 'これはClaudeからの出力です',
        timestamp: new Date(),
      };

      fixture.componentRef.setInput('message', message);
      fixture.detectChanges();

      const messageElement = fixture.debugElement.query(
        By.css('.message-claude')
      );
      expect(messageElement).toBeTruthy();
      expect(messageElement.nativeElement.textContent).toContain(
        'これはClaudeからの出力です'
      );
    });

    it('システムメッセージが正しく表示されること', () => {
      const message: Message = {
        id: '3',
        type: MessageType.SYSTEM,
        content: 'システムメッセージです',
        timestamp: new Date(),
      };

      fixture.componentRef.setInput('message', message);
      fixture.detectChanges();

      const messageElement = fixture.debugElement.query(
        By.css('.message-system')
      );
      expect(messageElement).toBeTruthy();
      expect(messageElement.nativeElement.textContent).toContain(
        'システムメッセージです'
      );
    });

    it('エラーメッセージが正しく表示されること', () => {
      const message: Message = {
        id: '4',
        type: MessageType.ERROR,
        content: 'エラーが発生しました',
        timestamp: new Date(),
      };

      fixture.componentRef.setInput('message', message);
      fixture.detectChanges();

      const messageElement = fixture.debugElement.query(
        By.css('.message-error')
      );
      expect(messageElement).toBeTruthy();
      expect(messageElement.nativeElement.textContent).toContain(
        'エラーが発生しました'
      );
    });
  });

  describe('コードハイライト機能', () => {
    it('コードブロックがハイライトされること', () => {
      const message: Message = {
        id: '5',
        type: MessageType.CLAUDE,
        content:
          '```typescript\nconst greeting = "Hello, World!";\nconsole.log(greeting);\n```',
        timestamp: new Date(),
        codeLanguage: 'typescript',
      };

      fixture.componentRef.setInput('message', message);
      fixture.detectChanges();

      const codeElement = fixture.debugElement.query(By.css('pre code'));
      expect(codeElement).toBeTruthy();
    });
  });

  describe('タイムスタンプ表示', () => {
    it('タイムスタンプが正しく表示されること', () => {
      const timestamp = new Date('2024-01-01T10:30:00');
      const message: Message = {
        id: '6',
        type: MessageType.USER,
        content: 'テストメッセージ',
        timestamp: timestamp,
      };

      fixture.componentRef.setInput('message', message);
      fixture.detectChanges();

      const timestampElement = fixture.debugElement.query(
        By.css('.message-timestamp')
      );
      expect(timestampElement).toBeTruthy();
      expect(timestampElement.nativeElement.textContent).toContain('10:30');
    });
  });

  describe('アニメーション', () => {
    it('メッセージ表示時にアニメーションクラスが適用されること', () => {
      const message: Message = {
        id: '7',
        type: MessageType.USER,
        content: 'アニメーションテスト',
        timestamp: new Date(),
      };

      fixture.componentRef.setInput('message', message);
      fixture.detectChanges();

      const hostElement = fixture.nativeElement;
      expect(hostElement.classList.contains('message-wrapper')).toBeTruthy();
      expect(hostElement.classList.contains('message-animate-in')).toBeTruthy();
    });
  });
});
