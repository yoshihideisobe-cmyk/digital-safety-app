const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.employee.upsert({
    where: { employeeCode: '1001' },
    update: {},
    create: {
      employeeCode: '1001',
      name: '山田 太郎',
      isAdmin: false,
    },
  });

  await prisma.employee.upsert({
    where: { employeeCode: 'admin' },
    update: {},
    create: {
      employeeCode: 'admin',
      name: 'システム管理者',
      isAdmin: true,
    },
  });

  // サンプルの確認項目を当日から3日分くらい登録
  const today = new Date();
  for (let i = 0; i < 3; i++) {
    const target = new Date(today);
    target.setDate(target.getDate() + i);
    const dateStr = target.toISOString().split('T')[0];

    const items = [
      'アルコールチェックを実施し、酒気帯びはありません。',
      '車両の日常点検（タイヤ、灯火類、ブレーキ等）を完了しました。',
      '本日の体調は良好で、安全運転に支障はありません。'
    ];

    for (const text of items) {
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

  console.log('Seed data inserted.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
