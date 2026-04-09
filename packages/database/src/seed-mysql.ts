import { db, client } from './connection.js';
import { approvalConfigs, emailCcConfigs, userRoles } from './schema/index.js';

async function seed() {
  console.log('Seeding MySQL...');

  // 审批节点配置
  const configs = [
    { id: 'ac-finance-1', groupName: 'finance', userId: '20111223', userName: '孙泽琦', userEmail: 'sunzeqi@haier.com' },
    { id: 'ac-hr-1', groupName: 'hr', userId: '20111223', userName: '孙泽琦', userEmail: 'sunzeqi@haier.com' },
    { id: 'ac-strategy-1', groupName: 'strategy', userId: '20111223', userName: '孙泽琦', userEmail: 'sunzeqi@haier.com' },
    { id: 'ac-legal-1', groupName: 'legal', userId: '20111223', userName: '孙泽琦', userEmail: 'sunzeqi@haier.com' },
    { id: 'ac-audit-1', groupName: 'audit', userId: '20111223', userName: '孙泽琦', userEmail: 'sunzeqi@haier.com' },
    { id: 'ac-confirmation-1', groupName: 'confirmation', userId: '20111223', userName: '孙泽琦', userEmail: 'sunzeqi@haier.com' },
  ];

  await db.delete(approvalConfigs);
  await db.insert(approvalConfigs).values(configs);
  console.log(`  ✅ approval configs: ${configs.length}`);

  // 邮件抄送
  const ccs = [
    { id: 'ecc-finance-1', groupName: 'finance', name: '宫伟', email: 'gongw@haier.com' },
    { id: 'ecc-finance-2', groupName: 'finance', name: '张蕾', email: 'zhanglei.gxcw@haier.com' },
    { id: 'ecc-strategy-1', groupName: 'strategy', name: '黄雯瑶', email: 'huangweny@haier.com' },
    { id: 'ecc-strategy-2', groupName: 'strategy', name: '徐妙晨', email: 'xumch@haier.com' },
    { id: 'ecc-strategy-3', groupName: 'strategy', name: '曹智', email: 'caozhi@haier.com' },
    { id: 'ecc-strategy-4', groupName: 'strategy', name: '赵远亮', email: 'zhaoyuanliang@haier.com' },
    { id: 'ecc-legal-1', groupName: 'legal', name: '张翠美', email: 'zhangcm@haier.com' },
    { id: 'ecc-legal-2', groupName: 'legal', name: '王杰斯', email: 'wangjiesi@haier.com' },
  ];

  await db.delete(emailCcConfigs);
  await db.insert(emailCcConfigs).values(ccs);
  console.log(`  ✅ email cc configs: ${ccs.length}`);

  // 管理员
  await db.delete(userRoles);
  await db.insert(userRoles).values({ empCode: '20111223', role: 'admin', createdBy: '20111223' });
  console.log('  ✅ user_roles: admin 20111223');

  console.log('Seed done.');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
