import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const body = await request.json();
    const { employeeCode } = body;

    if (!employeeCode) {
      return NextResponse.json({ message: '社員コードが必要です' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeCode }
    });

    if (!employee || employee.isDeleted) {
      return NextResponse.json({ message: '社員が見つからないか、削除されています' }, { status: 404 });
    }

    const formattedEmployee = {
      ...employee,
      isAdmin: Boolean(employee.isAdmin) || employee.isAdmin === 'true' || employee.isAdmin === 1 || employee.isAdmin === '1'
    };

    return NextResponse.json({ user: formattedEmployee }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
