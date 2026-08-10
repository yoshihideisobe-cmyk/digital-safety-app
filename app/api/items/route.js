import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 指定日のアイテムを取得 (削除されていないもののみ)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const all = searchParams.get('all');

  try {
    if (all === 'true') {
      const items = await prisma.safetyItem.findMany({
        where: { isDeleted: false },
        orderBy: [
          { targetDate: 'asc' },
          { createdAt: 'asc' }
        ]
      });
      return NextResponse.json({ items }, { status: 200 });
    }

    if (!date) {
      return NextResponse.json({ message: '日付が必要です' }, { status: 400 });
    }

    const items = await prisma.safetyItem.findMany({
      where: { 
        targetDate: date,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'エラーが発生しました' }, { status: 500 });
  }
}

// アイテムの登録（管理者向け）
export async function POST(request) {
  try {
    const body = await request.json();
    const { targetDate, content } = body;

    if (!targetDate || !content) {
      return NextResponse.json({ message: '必須項目が不足しています' }, { status: 400 });
    }

    const item = await prisma.safetyItem.create({
      data: { targetDate, content }
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'エラーが発生しました' }, { status: 500 });
  }
}

// アイテムの論理削除（管理者向け）
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ message: 'IDが必要です' }, { status: 400 });
    }

    const item = await prisma.safetyItem.update({
      where: { id },
      data: { isDeleted: true }
    });

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    console.error('Delete item error:', error);
    return NextResponse.json({ message: 'エラーが発生しました' }, { status: 500 });
  }
}

// アイテムの更新（管理者向け）
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, targetDate, content } = body;

    if (!id || !targetDate || !content) {
      return NextResponse.json({ message: '必須項目が不足しています' }, { status: 400 });
    }

    const item = await prisma.safetyItem.update({
      where: { id },
      data: { targetDate, content }
    });

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    console.error('Update item error:', error);
    return NextResponse.json({ message: 'エラーが発生しました' }, { status: 500 });
  }
}

