"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './driver.module.css';

// デフォルトの基本誓約項目
const DEFAULT_PLEDGE_ITEM = {
  id: 'default-base-pledge',
  content: '安全ルールを守り、コンプライアンスを守って、今日も1日仕事に臨みます',
  isDefault: true,
};

export default function DriverPage() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([DEFAULT_PLEDGE_ITEM]);
  const [checkedItems, setCheckedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [noticeImage, setNoticeImage] = useState(null);
  const [noticeImgError, setNoticeImgError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 保留中のオフラインデータをサーバーへ自動再送
  const syncPendingPledges = async () => {
    try {
      const pending = JSON.parse(localStorage.getItem('pending_pledges') || '[]');
      if (pending.length === 0) return;

      const remaining = [];
      for (const item of pending) {
        try {
          const res = await fetch('/api/pledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: item.employeeId, date: item.date }),
          });
          if (!res.ok && res.status !== 503) {
            remaining.push(item);
          }
        } catch (e) {
          remaining.push(item);
        }
      }
      localStorage.setItem('pending_pledges', JSON.stringify(remaining));
    } catch (e) {
      console.error('Offline pledge sync error:', e);
    }
  };

  useEffect(() => {
    // ログインチェック
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // オンライン復帰時の自動再送処理を登録
    syncPendingPledges();
    const handleOnline = () => {
      syncPendingPledges();
    };
    window.addEventListener('online', handleOnline);

    // Service Worker からのメッセージ受信
    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'SYNC_OFFLINE_PLEDGES') {
        syncPendingPledges();
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // 事故防止啓発画像の取得
    fetch('/api/admin/notice-image')
      .then(res => res.json())
      .then(data => {
        if (data.hasImage) {
          setNoticeImage(data.imageUrl);
        } else {
          setNoticeImage('/images/notice.jpg');
        }
      })
      .catch(() => {
        setNoticeImage('/images/notice.jpg');
      });

    // 今日の項目を取得
    const today = new Date().toISOString().split('T')[0];
    fetch(`/api/items?date=${today}`)
      .then(res => res.json())
      .then(data => {
        const fetchedItems = data.items || [];
        setItems([DEFAULT_PLEDGE_ITEM, ...fetchedItems]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setItems([DEFAULT_PLEDGE_ITEM]);
        setLoading(false);
      });

    return () => {
      window.removeEventListener('online', handleOnline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [router]);

  const handleCheck = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const allChecked = items.length > 0 && items.every(item => checkedItems[item.id]);

  const saveOfflinePledge = (pledgeData) => {
    try {
      const pending = JSON.parse(localStorage.getItem('pending_pledges') || '[]');
      pending.push(pledgeData);
      localStorage.setItem('pending_pledges', JSON.stringify(pending));

      // Background Sync の登録試行
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(reg => {
          reg.sync.register('sync-pledges').catch(err => console.log('Sync registration failed', err));
        });
      }
    } catch (e) {
      console.error('Failed to save offline pledge:', e);
    }
  };

  const handleSubmit = async () => {
    if (!allChecked || isSubmitting) return;
    setIsSubmitting(true);

    const today = new Date().toISOString().split('T')[0];
    const pledgeData = { employeeId: user.id, date: today, timestamp: Date.now() };

    // オフライン時の直接ハンドリング
    if (!navigator.onLine) {
      saveOfflinePledge(pledgeData);
      alert('通信がオフラインです。誓約データは端末内に保存され、通信復帰時に自動送信されます。');
      router.push('/driver/complete');
      return;
    }

    try {
      const res = await fetch('/api/pledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: user.id, date: today }),
      });

      if (res.ok) {
        router.push('/driver/complete');
      } else {
        saveOfflinePledge(pledgeData);
        alert('通信エラーのため誓約データを端末内に保存しました。通信復帰時に自動送信されます。');
        router.push('/driver/complete');
      }
    } catch (err) {
      saveOfflinePledge(pledgeData);
      alert('通信エラーが発生したため、誓約データを端末内に保存しました。通信復帰時に自動送信されます。');
      router.push('/driver/complete');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) return <div className={styles.loading}>読み込み中...</div>;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.userInfo}>{user.name} 様</div>
        <button onClick={() => { localStorage.removeItem('user'); router.push('/'); }} className={styles.logoutBtn}>
          ログアウト
        </button>
      </header>
      
      <div className={styles.content}>
        <h1 className={styles.title}>本日の安全確認項目</h1>
        <p className={styles.date}>{new Date().toLocaleDateString('ja-JP')} 出庫前確認</p>

        {/* 事故防止啓発画像（MFTBC施策）表示エリア */}
        <div className={styles.noticeArea}>
          <div className={styles.noticeHeader}>
            <span className={styles.noticeBadge}>MFTBC事故防止施策</span>
            <span className={styles.noticeTitle}>安全運転・事故再発防止 強化期間中</span>
          </div>
          {!noticeImgError && noticeImage ? (
            <img 
              src={noticeImage} 
              alt="事故防止啓発ポスター" 
              className={styles.noticeImage}
              onError={() => {
                if (noticeImage !== '/images/notice.jpg') {
                  setNoticeImage('/images/notice.jpg');
                } else {
                  setNoticeImgError(true);
                }
              }}
            />
          ) : (
            <div className={styles.noticePlaceholder}>
              <div className={styles.placeholderIcon}>⚠️</div>
              <div className={styles.placeholderText}>
                <strong>事故再発防止 啓発エリア</strong>
                <p>出庫前の全点検項目を確実に確認し、安全最優先で運行してください。</p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.checkList}>
          {items.map(item => (
            <label key={item.id} className={`${styles.checkItem} ${checkedItems[item.id] ? styles.checked : ''}`}>
              <input
                type="checkbox"
                checked={!!checkedItems[item.id]}
                onChange={() => handleCheck(item.id)}
                className={styles.checkbox}
              />
              <span className={styles.checkText}>{item.content}</span>
            </label>
          ))}
        </div>

        <button 
          className={styles.submitBtn} 
          disabled={!allChecked || items.length === 0 || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? '送信中...' : '誓約して送信する'}
        </button>
      </div>
    </main>
  );
}
