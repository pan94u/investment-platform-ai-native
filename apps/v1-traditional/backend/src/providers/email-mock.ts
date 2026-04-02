import type { EmailProvider, EmailPayload } from './types.js';

/**
 * Mock 邮件提供者 — 日志输出（PoC 默认）
 */
export class MockEmailProvider implements EmailProvider {
  async sendEmail(payload: EmailPayload): Promise<boolean> {
    console.log('─── [MockEmail] 邮件发送 ───');
    console.log(`  主题: ${payload.subject}`);
    console.log(`  收件人: ${payload.to.join(', ')}`);
    console.log(`  抄送: ${payload.cc.join(', ')}`);
    console.log(`  附件: ${payload.attachments.length} 个`);
    console.log(`  正文长度: ${payload.htmlBody.length} 字符`);
    console.log('─── [MockEmail] END ───');
    return true;
  }
}
