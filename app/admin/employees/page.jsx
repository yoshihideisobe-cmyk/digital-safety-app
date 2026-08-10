"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './employees.module.css';

export default function EmployeesPage() {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // 個別追加用
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  // インライン編集用
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/'); return; }
    const parsedUser = JSON.parse(userData);
    const isUserAdmin = Boolean(parsedUser.isAdmin) || parsedUser.isAdmin === 'true' || parsedUser.isAdmin === 1 || parsedUser.isAdmin === '1';
    if (!isUserAdmin) {
      alert('管理者権限がありません');
      router.push('/');
      return;
    }
    setUser(parsedUser);
    fetchEmployees();
  }, [router]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // CSVインポート
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setImportResult({ success: res.ok, message: data.message, count: data.successCount, skip: data.skipCount });
      if (res.ok) fetchEmployees();
    } catch (err) {
      setImportResult({ success: false, message: 'インポート中にエラーが発生しました' });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // 個別追加
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCode || !newName) return alert('社員番号と社員名は必須です');
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode: newCode, name: newName, isAdmin: newIsAdmin }),
      });
      if (res.ok) {
        setNewCode(''); setNewName(''); setNewIsAdmin(false);
        fetchEmployees();
      } else {
        const data = await res.json();
        alert(data.message || '追加に失敗しました');
      }
    } catch {
      alert('エラーが発生しました');
    }
  };

  // 編集開始
  const startEdit = (emp) => {
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditIsAdmin(emp.isAdmin);
  };

  // 編集保存
  const handleSaveEdit = async (id) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editName, isAdmin: editIsAdmin }),
      });
      if (res.ok) {
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, name: editName, isAdmin: editIsAdmin } : e));
        setEditingId(null);
      } else {
        alert('更新に失敗しました');
      }
    } catch {
      alert('エラーが発生しました');
    }
  };

  // 論理削除
  const handleDelete = async (id, name) => {
    if (!confirm(`「${name}」を削除しますか？\n（この社員はログインできなくなります）`)) return;
    try {
      const res = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDeleted: true }),
      });
      if (res.ok) {
        setEmployees(prev => prev.filter(e => e.id !== id));
      } else {
        alert('削除に失敗しました');
      }
    } catch {
      alert('エラーが発生しました');
    }
  };

  if (loading || !user) return <div className={styles.loading}>読み込み中...</div>;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>社員マスタ管理</div>
        <div className={styles.headerRight}>
          <button onClick={() => router.push('/admin')} className={styles.navBtn}>← ダッシュボード</button>
          <button onClick={() => { localStorage.removeItem('user'); router.push('/'); }} className={styles.logoutBtn}>ログアウト</button>
        </div>
      </header>

      <div className={styles.content}>
        {/* CSVインポートパネル */}
        <div className={styles.panel}>
          <h2>CSVインポート（一括登録）</h2>
          <p className={styles.description}>
            CSV形式（列順: <strong>社員番号, 社員名, 管理者権限</strong>）のファイルをアップロードしてください。<br />
            管理者権限列は「1」「あり」「TRUE」などの場合に管理者として登録されます。<br />
            ShiftJIS（Excel出力）・UTF-8どちらも対応しています。1行目をヘッダー行として自動判定します。
          </p>
          <div className={styles.importArea}>
            <label className={styles.fileLabel}>
              <span>{importing ? 'インポート中...' : 'CSVファイルを選択'}</span>
              <input type="file" accept=".csv,.txt" onChange={handleImport} disabled={importing} className={styles.fileInput} />
            </label>
          </div>
          {importResult && (
            <div className={`${styles.importResult} ${importResult.success ? styles.resultSuccess : styles.resultError}`}>
              {importResult.message}
              {importResult.success && ` （登録: ${importResult.count}件 / スキップ: ${importResult.skip}件）`}
            </div>
          )}
          <div className={styles.csvSample}>
            <details>
              <summary>CSVサンプルを見る</summary>
              <pre className={styles.pre}>{`社員番号,社員名,管理者権限
1001,山田 太郎,
1002,鈴木 次郎,
1003,佐藤 花子,1`}</pre>
            </details>
          </div>
        </div>

        {/* 個別追加パネル */}
        <div className={styles.panel}>
          <h2>社員の個別追加</h2>
          <form onSubmit={handleAdd} className={styles.addForm}>
            <div className={styles.inputGroup}>
              <label>社員番号</label>
              <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="例: 1002" />
            </div>
            <div className={styles.inputGroup}>
              <label>社員名</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="例: 鈴木 次郎" />
            </div>
            <div className={styles.inputGroupCheckbox}>
              <label>
                <input type="checkbox" checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} />
                管理者権限
              </label>
            </div>
            <button type="submit" className={styles.btn}>追加する</button>
          </form>
        </div>

        {/* 社員一覧パネル */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>社員一覧（有効な社員のみ）</h2>
            <span className={styles.badge}>{employees.length}名</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>社員番号</th>
                  <th>社員名</th>
                  <th>管理者権限</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className={editingId === emp.id ? styles.editingRow : ''}>
                    <td className={styles.codeCell}>{emp.employeeCode}</td>
                    <td>
                      {editingId === emp.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className={styles.editInput}
                        />
                      ) : emp.name}
                    </td>
                    <td>
                      {editingId === emp.id ? (
                        <label className={styles.checkLabel}>
                          <input type="checkbox" checked={editIsAdmin} onChange={e => setEditIsAdmin(e.target.checked)} />
                          管理者
                        </label>
                      ) : (
                        <span className={emp.isAdmin ? styles.adminBadge : styles.driverBadge}>
                          {emp.isAdmin ? '管理者' : '一般'}
                        </span>
                      )}
                    </td>
                    <td className={styles.actionCell}>
                      {editingId === emp.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(emp.id)} className={`${styles.actionBtn} ${styles.saveBtn}`}>保存</button>
                          <button onClick={() => setEditingId(null)} className={`${styles.actionBtn} ${styles.cancelBtn}`}>取消</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(emp)} className={`${styles.actionBtn} ${styles.editBtn}`}>編集</button>
                          <button onClick={() => handleDelete(emp.id, emp.name)} className={`${styles.actionBtn} ${styles.deleteBtn}`}>削除</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan="4" className={styles.emptyRow}>社員が登録されていません</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
