"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!employeeCode.trim()) {
      setError('社員コードを入力してください');
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode }),
      });

      const data = await res.json();

      if (res.ok) {
        const isAdmin = Boolean(data.user.isAdmin) || data.user.isAdmin === 'true' || data.user.isAdmin === 1 || data.user.isAdmin === '1';
        const userToSave = {
          ...data.user,
          isAdmin
        };
        // 簡易的にローカルストレージに保存
        localStorage.setItem('user', JSON.stringify(userToSave));
        
        if (isAdmin) {
          router.push('/admin');
        } else {
          router.push('/driver');
        }
      } else {
        setError(data.message || 'ログインに失敗しました');
      }
    } catch (err) {
      setError('通信エラーが発生しました');
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>デジタル安全宣言</h1>
        <p className={styles.subtitle}>社員コードを入力して出庫準備を行ってください</p>
        
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="employeeCode">社員コード</label>
            <input
              type="text"
              id="employeeCode"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="例: 1001"
              autoComplete="off"
            />
          </div>
          
          {error && <p className={styles.error}>{error}</p>}
          
          <button type="submit" className={styles.submitBtn}>
            ログイン
          </button>
        </form>
      </div>
    </main>
  );
}
