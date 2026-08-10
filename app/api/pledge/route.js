import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 履歴一覧の取得（管理者向け）
export async function GET(request) {
  try {
    const pledges = await prisma.pledgeRecord.findMany({
      include: {
        employee: {
          select: { name: true, employeeCode: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ pledges }, { status: 200 });
  } catch (error) {
    console.error('Fetch pledges error:', error);
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 誓約の送信（ドライバー向け）
export async function POST(request) {
  try {
    const body = await request.json();
    const { employeeId, date } = body;

    if (!employeeId || !date) {
      return NextResponse.json({ message: '必須項目が不足しています' }, { status: 400 });
    }

    // すでに同じ日の誓約があるか確認
    const existing = await prisma.pledgeRecord.findFirst({
      where: { employeeId, pledgeDate: date }
    });

    if (existing) {
      return NextResponse.json({ message: '既に提出済みです', record: existing }, { status: 200 });
    }

    const record = await prisma.pledgeRecord.create({
      data: { 
        employeeId, 
        pledgeDate: date,
        createdAt: new Date() // サーバー側での受領タイムスタンプを明示的に記録
      }
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error('Submit pledge error:', error);
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
