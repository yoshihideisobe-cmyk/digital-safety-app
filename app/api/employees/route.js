import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 社員一覧の取得 (削除されていない社員のみ)
export async function GET(request) {
  try {
    const employees = await prisma.employee.findMany({
      where: { isDeleted: false },
      orderBy: { employeeCode: 'asc' }
    });
    return NextResponse.json({ employees }, { status: 200 });
  } catch (error) {
    console.error('Fetch employees error:', error);
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 社員の個別追加/更新 (手動追加用)
export async function POST(request) {
  try {
    const body = await request.json();
    const { employeeCode, name, isAdmin } = body;

    if (!employeeCode || !name) {
      return NextResponse.json({ message: '社員番号と社員名は必須です' }, { status: 400 });
    }

    const employee = await prisma.employee.upsert({
      where: { employeeCode },
      update: {
        name,
        isAdmin: !!isAdmin,
        isDeleted: false // 削除されていた場合は復活させる
      },
      create: {
        employeeCode,
        name,
        isAdmin: !!isAdmin
      }
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 社員の手動編集・論理削除
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, name, isAdmin, isDeleted } = body;

    if (!id) {
      return NextResponse.json({ message: 'IDが必要です' }, { status: 400 });
    }

    // 更新データの作成
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (isAdmin !== undefined) updateData.isAdmin = !!isAdmin;
    if (isDeleted !== undefined) updateData.isDeleted = !!isDeleted;

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ employee }, { status: 200 });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
