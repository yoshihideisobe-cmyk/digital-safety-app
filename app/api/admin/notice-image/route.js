import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const FILE_NAME = 'notice-active.jpg';
const META_NAME = 'notice-meta.json';

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// 現在設定中の画像情報を取得
export async function GET() {
  try {
    // 1. Prisma DB (NoticeImage) から最新の画像レコードを取得
    const dbNotice = await prisma.noticeImage.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (dbNotice && dbNotice.url) {
      return NextResponse.json({
        hasImage: true,
        imageUrl: dbNotice.url,
        updatedAt: dbNotice.updatedAt
      }, { status: 200 });
    }

    // 2. フォールバック: ローカルファイル確認
    ensureUploadDir();
    const filePath = path.join(UPLOAD_DIR, FILE_NAME);
    const metaPath = path.join(UPLOAD_DIR, META_NAME);

    if (fs.existsSync(filePath)) {
      let updatedAt = Date.now();
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          updatedAt = meta.updatedAt || updatedAt;
        } catch (e) {}
      }
      return NextResponse.json({
        hasImage: true,
        imageUrl: `/uploads/${FILE_NAME}?v=${updatedAt}`,
        updatedAt
      }, { status: 200 });
    }

    return NextResponse.json({ hasImage: false }, { status: 200 });
  } catch (error) {
    console.error('GET notice-image error:', error);
    return NextResponse.json({ message: 'エラーが発生しました' }, { status: 500 });
  }
}

// 画像のアップロード
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: '有効な画像ファイルが選択されていません' }, { status: 400 });
    }

    let imageUrl = '';
    let pathname = '';

    // Vercel Blob トークンが存在する場合は @vercel/blob を使用
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob');
      const blob = await put(`notice-${Date.now()}-${file.name}`, file, {
        access: 'public',
      });
      imageUrl = blob.url;
      pathname = blob.pathname;
    } else {
      // ローカル開発環境等でのディスク保存
      ensureUploadDir();
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(UPLOAD_DIR, FILE_NAME);
      fs.writeFileSync(filePath, buffer);

      const updatedAt = Date.now();
      const metaPath = path.join(UPLOAD_DIR, META_NAME);
      fs.writeFileSync(metaPath, JSON.stringify({ updatedAt, filename: file.name }), 'utf8');

      imageUrl = `/uploads/${FILE_NAME}?v=${updatedAt}`;
      pathname = `/uploads/${FILE_NAME}`;
    }

    // Prisma DB レコードの作成／更新
    const noticeRecord = await prisma.noticeImage.create({
      data: {
        url: imageUrl,
        pathname: pathname,
      }
    });

    return NextResponse.json({
      message: '画像をアップロードしました',
      imageUrl: noticeRecord.url,
      updatedAt: noticeRecord.updatedAt
    }, { status: 200 });
  } catch (error) {
    console.error('POST notice-image error:', error);
    return NextResponse.json({ message: '画像の保存中にエラーが発生しました' }, { status: 500 });
  }
}

// 画像の削除
export async function DELETE() {
  try {
    // Vercel Blob での削除
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import('@vercel/blob');
      const latest = await prisma.noticeImage.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      if (latest && latest.url) {
        try {
          await del(latest.url);
        } catch (e) {
          console.warn('Failed to delete blob:', e);
        }
      }
    }

    // ローカルファイル削除
    ensureUploadDir();
    const filePath = path.join(UPLOAD_DIR, FILE_NAME);
    const metaPath = path.join(UPLOAD_DIR, META_NAME);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

    // DBレコードの全クリア
    await prisma.noticeImage.deleteMany({});

    return NextResponse.json({ message: '画像を削除しました' }, { status: 200 });
  } catch (error) {
    console.error('DELETE notice-image error:', error);
    return NextResponse.json({ message: '画像の削除中にエラーが発生しました' }, { status: 500 });
  }
}
