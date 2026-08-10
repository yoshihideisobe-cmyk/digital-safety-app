"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './complete.module.css';

export default function CompletePage() {
  const [dateStr, setDateStr] = useState('');
  const router = useRouter();

  useEffect(() => {
    // ログインチェック
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }

    const today = new Date();
    // YY/MM/DD 形式を作成
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    setDateStr(`${yy}/${mm}/${dd}`);

    // 数秒後に自動でログイン画面に戻す場合は以下を入れるが、配車係の目視用に残すのが通常。
    // そのため、「戻る」ボタンを置いておく
  }, [router]);

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.checkIcon}>✓</div>
        <h1 className={styles.title}>デジタル安全誓約書</h1>
        <h2 className={styles.status}>確認済み</h2>
        <div className={styles.date}>{dateStr}</div>
      </div>
      
      <button className={styles.backBtn} onClick={() => router.push('/driver')}>
        画面を閉じる
      </button>
    </main>
  );
}
