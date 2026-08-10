import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import iconv from 'iconv-lite';

const prisma = new PrismaClient();

// 文字コード判定とデコード
function decodeCSV(buffer) {
  // UTF-8 のBOMチェック (EF BB BF)
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return iconv.decode(buffer, 'utf-8');
  }

  // デコードしてみて文字化け (U+FFFD) がないか判定
  const utf8Str = iconv.decode(buffer, 'utf-8');
  if (!utf8Str.includes('\uFFFD')) {
    return utf8Str;
  }

  // 文字化けがある場合は Shift-JIS としてデコード
  return iconv.decode(buffer, 'shift_jis');
}

// 簡易的なCSV行パース (ダブルクォーテーション考慮)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ message: 'ファイルがアップロードされていません' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // デコード
    const csvText = decodeCSV(buffer);

    // 行分割
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return NextResponse.json({ message: 'CSVデータが空です' }, { status: 400 });
    }

    let successCount = 0;
    let skipCount = 0;

    // 直列で順次アップサート (SQLiteのロック防止)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cols = parseCSVLine(line);

      // カラムが不足している行はスキップ
      if (cols.length < 2) {
        skipCount++;
        continue;
      }

      const employeeCode = cols[0];
      const name = cols[1];
      const adminCol = cols[2] ? cols[2].toLowerCase() : '';

      // ヘッダー行のスキップ判定
      if (
        i === 0 &&
        (employeeCode.includes('社員番号') ||
          employeeCode.includes('コード') ||
          employeeCode.includes('code') ||
          name.includes('氏名') ||
          name.includes('社員名'))
      ) {
        skipCount++;
        continue;
      }

      if (!employeeCode || !name) {
        skipCount++;
        continue;
      }

      // 管理者権限の判定値: "1", "あり", "true", "yes", "管理者", "有" など
      const isAdmin = 
        adminCol === '1' ||
        adminCol === 'あり' ||
        adminCol === 'true' ||
        adminCol === 'yes' ||
        adminCol === '管理者' ||
        adminCol === '有';

      await prisma.employee.upsert({
        where: { employeeCode },
        update: {
          name,
          isAdmin,
          isDeleted: false // すでに削除されていた社員をインポートで復活
        },
        create: {
          employeeCode,
          name,
          isAdmin
        }
      });

      successCount++;
    }

    return NextResponse.json({
      message: `インポートが完了しました。`,
      successCount,
      skipCount
    }, { status: 200 });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ message: 'CSVのインポート中にエラーが発生しました' }, { status: 500 });
  }
}
