"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [pledges, setPledges] = useState([]);
  const [items, setItems] = useState([]); // 安全確認項目一覧
  const [loading, setLoading] = useState(true);

  // 項目の追加用ステート
  const [targetDate, setTargetDate] = useState('');
  const [content, setContent] = useState('');

  // 事故防止画像用ステート
  const [noticeImage, setNoticeImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const router = useRouter();

  useEffect(() => {
    // ログインチェック (ADMINのみ許可)
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(userData);
    const isUserAdmin = Boolean(parsedUser.isAdmin) || parsedUser.isAdmin === 'true' || parsedUser.isAdmin === 1 || parsedUser.isAdmin === '1';
    if (!isUserAdmin) {
      alert('管理者権限がありません');
      router.push('/');
      return;
    }
    setUser(parsedUser);

    Promise.all([fetchPledges(), fetchItems(), fetchNoticeImage()]).finally(() => {
      setLoading(false);
    });
  }, [router]);

  const fetchPledges = async () => {
    try {
      const res = await fetch('/api/pledge');
      const data = await res.json();
      setPledges(data.pledges || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items?all=true');
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNoticeImage = async () => {
    try {
      const res = await fetch('/api/admin/notice-image');
      const data = await res.json();
      if (res.ok && data.hasImage) {
        setNoticeImage(data.imageUrl);
      } else {
        setNoticeImage(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!targetDate || !content) return alert('日付と内容を入力してください');

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate, content }),
      });
      if (res.ok) {
        alert('項目を追加しました');
        setContent('');
        fetchItems(); // リストを再読み込み
      } else {
        alert('追加に失敗しました');
      }
    } catch (err) {
      alert('エラーが発生しました');
    }
  };

  // 項目の編集用ステート
  const [editingId, setEditingId] = useState(null);
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditTargetDate(item.targetDate);
    setEditContent(item.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTargetDate('');
    setEditContent('');
  };

  const handleSaveEditItem = async (id) => {
    if (!editTargetDate || !editContent) return alert('日付と内容を入力してください');
    try {
      const res = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, targetDate: editTargetDate, content: editContent }),
      });
      if (res.ok) {
        alert('項目を更新しました');
        setEditingId(null);
        fetchItems();
      } else {
        alert('更新に失敗しました');
      }
    } catch (err) {
      alert('エラーが発生しました');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('本当にこの安全確認項目を削除しますか？\n（過去の誓約履歴データは削除されません）')) return;

    try {
      const res = await fetch('/api/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        // ページをリロードせずにリストから該当項目を除外
        setItems(prevItems => prevItems.filter(item => item.id !== id));
      } else {
        alert('削除に失敗しました');
      }
    } catch (err) {
      alert('エラーが発生しました');
    }
  };

  const handleUploadNoticeImage = async (e) => {
    e.preventDefault();
    if (!imageFile) return alert('アップロードする画像ファイルを選択してください');

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      const res = await fetch('/api/admin/notice-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert('啓発画像をアップロードしました');
        setNoticeImage(data.imageUrl);
        setImageFile(null);
      } else {
        alert(data.message || 'アップロードに失敗しました');
      }
    } catch (err) {
      alert('エラーが発生しました');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteNoticeImage = async () => {
    if (!confirm('現在設定されている事故防止画像を削除しますか？')) return;

    try {
      const res = await fetch('/api/admin/notice-image', {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('画像を削除しました');
        setNoticeImage(null);
      } else {
        alert('削除に失敗しました');
      }
    } catch (err) {
      alert('エラーが発生しました');
    }
  };

  const handleDownloadCsv = () => {
    if (pledges.length === 0) return alert('データがありません');
    
    const headers = ['社員コード', '社員名', '対象日', '送信日時'];
    const rows = pledges.map(p => [
      p.employee.employeeCode,
      p.employee.name,
      p.pledgeDate,
      new Date(p.createdAt).toLocaleString('ja-JP')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // BOMを追加してExcelで文字化けしないようにする
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `安全誓約履歴_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCleanup = async () => {
    if (!confirm('40日以上経過したデータを削除します。よろしいですか？')) return;
    
    try {
      const res = await fetch('/api/cleanup', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        alert(`${data.count}件の古いデータを削除しました`);
        fetchPledges();
      }
    } catch (err) {
      alert('エラーが発生しました');
    }
  };

  if (loading || !user) return <div className={styles.loading}>読み込み中...</div>;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>管理者ダッシュボード</div>
        <div className={styles.headerRight}>
          <button onClick={() => router.push('/admin/employees')} className={styles.navBtn}>
            社員マスタ管理
          </button>
          <span className={styles.userName}>{user.name}</span>
          <button onClick={() => { localStorage.removeItem('user'); router.push('/'); }} className={styles.logoutBtn}>
            ログアウト
          </button>
        </div>
      </header>
      
      <div className={styles.content}>
        {/* 事故防止画像（啓発画像）の設定パネル */}
        <div className={styles.panel}>
          <h2>事故防止画像（啓発画像）の設定</h2>
          <p className={styles.description}>
            ドライバーの出庫前安全誓約画面に表示される啓発画像をアップロード・変更できます。<br />
            新しい画像をアップロードすると即座にドライバー画面に適用され、更新されるまで常時表示されます。
          </p>

          <div className={styles.imageConfigArea}>
            <div className={styles.imagePreviewBox}>
              <span className={styles.previewLabel}>現在設定中の画像プレビュー</span>
              {noticeImage ? (
                <div className={styles.previewImageWrapper}>
                  <img src={noticeImage} alt="啓発画像プレビュー" className={styles.previewImage} />
                  <button onClick={handleDeleteNoticeImage} className={styles.deleteImageBtn}>画像を削除</button>
                </div>
              ) : (
                <div className={styles.noImagePreview}>
                  <span>画像は設定されていません（標準プレースホルダー表示中）</span>
                </div>
              )}
            </div>

            <form onSubmit={handleUploadNoticeImage} className={styles.imageUploadForm}>
              <div className={styles.inputGroup}>
                <label>新しい画像を選択（JPEG / PNG等）</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setImageFile(e.target.files?.[0] || null)}
                  className={styles.fileInput}
                />
              </div>
              <button 
                type="submit" 
                className={styles.btn} 
                disabled={!imageFile || uploadingImage}
              >
                {uploadingImage ? 'アップロード中...' : '画像をアップロード・適用'}
              </button>
            </form>
          </div>
        </div>

        <div className={styles.panelsGrid}>
          {/* 左側：項目追加パネル */}
          <div className={styles.panel}>
            <h2>安全確認項目の追加</h2>
            <form onSubmit={handleAddItem} className={styles.verticalForm}>
              <div className={styles.inputGroup}>
                <label>対象日</label>
                <input 
                  type="date" 
                  value={targetDate} 
                  onChange={e => setTargetDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>確認内容</label>
                <textarea 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  placeholder="アルコールチェックを実施しましたか？等" 
                  rows="3"
                  className={styles.textarea}
                />
              </div>
              <button type="submit" className={styles.btn}>追加する</button>
            </form>
          </div>

          {/* 右側：登録済み確認項目一覧パネル */}
          <div className={styles.panel}>
            <h2>登録済みの安全確認項目 (有効分)</h2>
            <div className={styles.itemsListWrapper}>
              {items.length === 0 ? (
                <p className={styles.noData}>登録済みの項目はありません。</p>
              ) : (
                <div className={styles.itemsList}>
                  {items.map(item => (
                    <div key={item.id} className={`${styles.itemRow} ${editingId === item.id ? styles.editingItemRow : ''}`}>
                      {editingId === item.id ? (
                        <div className={styles.editForm}>
                          <div className={styles.inputGroupSmall}>
                            <label>対象日</label>
                            <input 
                              type="date" 
                              value={editTargetDate} 
                              onChange={e => setEditTargetDate(e.target.value)} 
                              className={styles.editInputDate}
                            />
                          </div>
                          <div className={styles.inputGroupSmall}>
                            <label>確認内容</label>
                            <textarea 
                              value={editContent} 
                              onChange={e => setEditContent(e.target.value)} 
                              className={styles.editTextarea}
                              rows="2"
                            />
                          </div>
                          <div className={styles.itemActionGroup}>
                            <button onClick={() => handleSaveEditItem(item.id)} className={styles.saveBtn}>保存</button>
                            <button onClick={handleCancelEdit} className={styles.cancelBtn}>取消</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.itemInfo}>
                            <span className={styles.itemDate}>{item.targetDate}</span>
                            <p className={styles.itemContent}>{item.content}</p>
                          </div>
                          <div className={styles.itemActionGroup}>
                            <button 
                              onClick={() => handleStartEdit(item)} 
                              className={styles.editBtn}
                              title="編集"
                            >
                              編集
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item.id)} 
                              className={styles.deleteBtn}
                              title="削除"
                            >
                              削除
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 履歴パネル */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>誓約履歴 (直近40日)</h2>
            <div className={styles.actions}>
              <button onClick={handleDownloadCsv} className={`${styles.btn} ${styles.btnOutline}`}>CSVダウンロード</button>
              <button onClick={handleCleanup} className={`${styles.btn} ${styles.btnDanger}`}>古いデータを整理</button>
            </div>
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>対象日</th>
                  <th>社員コード</th>
                  <th>氏名</th>
                  <th>送信日時</th>
                </tr>
              </thead>
              <tbody>
                {pledges.map(p => (
                  <tr key={p.id}>
                    <td>{p.pledgeDate}</td>
                    <td>{p.employee.employeeCode}</td>
                    <td>{p.employee.name}</td>
                    <td>{new Date(p.createdAt).toLocaleString('ja-JP')}</td>
                  </tr>
                ))}
                {pledges.length === 0 && (
                  <tr>
                    <td colSpan="4" className={styles.emptyRow}>データがありません</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
