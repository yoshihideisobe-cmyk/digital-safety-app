// .env および .env.local から環境変数を自動読み込み
try {
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env' });
} catch (e) {
  // dotenv読み込み失敗時はプロセス環境変数を使用
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('username:password')) {
    console.warn('⚠️ DATABASE_URL is not properly configured. Skipping seed data insertion.');
    return;
  }

  console.log('Connecting to database and verifying seed data...');

  // 1. 社員データの登録（1001: 山田 太郎）
  const emp1001 = await prisma.employee.findUnique({
    where: { employeeCode: '1001' }
  });

  if (!emp1001) {
    await prisma.employee.create({
      data: {
        employeeCode: '1001',
        name: '山田 太郎',
        isAdmin: false,
      }
    });
    console.log('✔ Created driver employee: 1001 (山田 太郎)');
  } else {
    console.log('ℹ Driver employee 1001 already exists. Skipped creation.');
  }

  // 2. 管理者データの登録（admin: システム管理者）
  const adminEmp = await prisma.employee.findUnique({
    where: { employeeCode: 'admin' }
  });

  if (!adminEmp) {
    await prisma.employee.create({
      data: {
        employeeCode: 'admin',
        name: 'システム管理者',
        isAdmin: true,
      }
    });
    console.log('✔ Created admin employee: admin (システム管理者)');
  } else {
    console.log('ℹ Admin employee admin already exists. Skipped creation.');
  }

  // 3. サンプルの安全確認項目を登録
  const today = new Date();
  const sampleItems = [
    'アルコールチェックを実施し、酒気帯びはありません。',
    '車両の日常点検（タイヤ、灯火類、ブレーキ等）を完了しました。',
    '本日の体調は良好で、安全運転に支障はありません。'
  ];

  for (let i = 0; i < 3; i++) {
    const target = new Date(today);
    target.setDate(target.getDate() + i);
    const dateStr = target.toISOString().split('T')[0];

    for (const text of sampleItems) {
      const exists = await prisma.safetyItem.findFirst({
        where: { targetDate: dateStr, content: text }
      });
      if (!exists) {
        await prisma.safetyItem.create({
          data: { targetDate: dateStr, content: text }
        });
      }
    }
  }

  console.log('✔ Seed data process completed successfully.');
}

main()
  .catch((e) => {
    console.warn('⚠️ Seeding skipped during build (connection issue or unconfigured DB):', e.message || e);
    // ビルド（next build）を失敗させないため、エラー時でもステータス0で安全終了
    process.exit(0);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (e) {}
  });
