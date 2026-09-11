import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const people = [
  { id: 1, name: 'Nguyễn Văn A', code: 'NV001', submitted: 4 },
  { id: 2, name: 'Trần Văn B', code: 'NV002', submitted: 3 },
  { id: 3, name: 'Lê Văn C', code: 'NV003', submitted: 2 },
];

const documentTypes = ['CCCD', 'Bằng cấp', 'Chứng chỉ', 'Hợp đồng lao động', 'Giấy khám sức khỏe'];

function App() {
  const [view, setView] = useState('dashboard');
  const [query, setQuery] = useState('');
  const filteredPeople = useMemo(() => people.filter((p) => `${p.name} ${p.code}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">📁 <span>Quản lý hồ sơ</span></div>
        <button className={view === 'dashboard' ? 'nav active' : 'nav'} onClick={() => setView('dashboard')}>Tổng quan</button>
        <button className={view === 'people' ? 'nav active' : 'nav'} onClick={() => setView('people')}>Nhân sự</button>
        <button className={view === 'documents' ? 'nav active' : 'nav'} onClick={() => setView('documents')}>Loại giấy tờ</button>
        <button className={view === 'records' ? 'nav active' : 'nav'} onClick={() => setView('records')}>Hồ sơ</button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><h1>{view === 'dashboard' ? 'Tổng quan' : view === 'people' ? 'Quản lý nhân sự' : view === 'documents' ? 'Loại giấy tờ' : 'Hồ sơ tài liệu'}</h1><p>Hệ thống quản lý hồ sơ</p></div>
          <div className="admin-badge">Admin</div>
        </header>

        {view === 'dashboard' && <Dashboard />}
        {view === 'people' && <People query={query} setQuery={setQuery} people={filteredPeople} />}
        {view === 'documents' && <Documents />}
        {view === 'records' && <Records />}
      </main>
    </div>
  );
}

function Dashboard() {
  return <section>
    <div className="cards">
      <Stat icon="👥" label="Tổng số người" value="100" />
      <Stat icon="📄" label="Loại giấy tờ" value="5" />
      <Stat icon="📁" label="Tài liệu đã nộp" value="—" />
      <Stat icon="⚠️" label="Hồ sơ chưa đủ" value="—" />
    </div>
    <div className="panel"><h2>Luồng làm việc</h2><div className="steps"><span>1. Tạo người</span><span>→</span><span>2. Đăng ký giấy tờ</span><span>→</span><span>3. Gửi mã truy cập</span><span>→</span><span>4. Nhận tài liệu</span></div></div>
    <div className="panel"><h2>Trạng thái</h2><p className="muted">Đây là giao diện MVP (phiên bản đầu tiên). Dữ liệu thật sẽ được nối vào Backend (phần xử lý) và Database (cơ sở dữ liệu) ở bước tiếp theo.</p></div>
  </section>;
}

function Stat({ icon, label, value }) { return <div className="stat"><div className="stat-icon">{icon}</div><div><div className="muted">{label}</div><strong>{value}</strong></div></div>; }

function People({ query, setQuery, people }) {
  return <section className="panel"><div className="toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc mã..." /><button className="primary">+ Thêm người</button></div><table><thead><tr><th>Họ tên</th><th>Mã</th><th>Đã nộp</th><th>Trạng thái</th></tr></thead><tbody>{people.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.code}</td><td>{p.submitted}/5</td><td><span className={p.submitted === 5 ? 'pill ok' : 'pill warn'}>{p.submitted === 5 ? 'Đủ hồ sơ' : 'Còn thiếu'}</span></td></tr>)}</tbody></table></section>;
}

function Documents() { return <section className="panel"><div className="toolbar"><h2>Danh mục giấy tờ</h2><button className="primary">+ Thêm loại giấy tờ</button></div><div className="doc-list">{documentTypes.map((d, i) => <div className="doc-row" key={d}><span>{i + 1}. {d}</span><span className="pill ok">Đang sử dụng</span></div>)}</div></section>; }

function Records() { return <section className="panel"><h2>Hồ sơ theo loại giấy tờ</h2><p className="muted">Chọn một loại giấy tờ để xem danh sách người đã nộp. Chức năng này sẽ kết nối Database ở bước Backend.</p><div className="doc-grid">{documentTypes.map(d => <button className="doc-card" key={d}><span>📄</span><strong>{d}</strong><small>Xem hồ sơ →</small></button>)}</div></section>; }

createRoot(document.getElementById('root')).render(<App />);
