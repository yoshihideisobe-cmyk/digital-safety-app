import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 40日以上経過したデータを削除するAPI
export async function DELETE(request) {
  try {
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

    const result = await prisma.pledgeRecord.deleteMany({
      where: {
        createdAt: {
          lt: fortyDaysAgo,
        },
      },
    });

    // 安全確認項目のマスタデータも古ければ削除
    await prisma.safetyItem.deleteMany({
      where: {
        createdAt: {
          lt: fortyDaysAgo,
        },
      },
    });

    return NextResponse.json({ message: '古いデータを削除しました', count: result.count }, { status: 200 });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
