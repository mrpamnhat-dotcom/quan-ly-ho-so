import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QRCodeSVG } from 'qrcode.react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
const ADMIN_PATH = '/admin';
const COMMON_PORTAL_URL = `${window.location.origin}/`;

async function request(path, options = {}) {
  const r = await fetch(`${API}${path}`, options);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || 'Có lỗi xảy ra');
  return data;
}

function Brand({ compact = false }) {
  return <div className={compact ? 'brand compact' : 'brand'}>
    <img src="/logo.jpg" className="brand-logo" alt="Logo Khoa Ngoại Ung Bướu & Chăm sóc giảm nhẹ" />
    <div>
      <div className="brand-title">KHOA NGOẠI UNG BƯỚU & CHĂM SÓC GIẢM NHẸ</div>
      <div className="brand-hospital">BỆNH VIỆN HỮU NGHỊ VIỆT TIỆP</div>
      {!compact && <div className="brand-slogan">Đức trí tận tâm – Nâng tầm chất lượng</div>}
    </div>
  </div>;
}

function PortalLogin({ onLogin }) {
  const [people, setPeople] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [recent] = useState(() => JSON.parse(localStorage.getItem('portal_recent_people') || '[]'));

  const loadPeople = async q => {
    try { setPeople(await request(`/api/portal/people?q=${encodeURIComponent(q)}`)); }
    catch (e) { setMessage(e.message); }
  };
  useEffect(() => { loadPeople(''); }, []);
  const recentPeople = recent.map(r => people.find(p => p.id === r.id) || r);
  const choose = p => { setSelected(p); setQuery(p.name); setPin(''); setMessage(''); };
  const submit = async e => {
    e.preventDefault();
    if (!selected) { setMessage('Hãy chọn tên nhân viên.'); return; }
    setBusy(true); setMessage('');
    try {
      const data = await request('/api/portal/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ person_id: selected.id, pin }) });
      const next = [selected, ...recent.filter(x => x.id !== selected.id)].slice(0, 8);
      localStorage.setItem('portal_recent_people', JSON.stringify(next));
      onLogin(data.token, data.person);
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };
  const visible = query.trim() ? people.slice(0, 8) : recentPeople.slice(0, 8);

  return <div className="center portal-bg"><section className="login panel portal-login">
    <Brand />
    <div className="welcome"><span className="eyebrow">CỔNG NỘP HỒ SƠ</span><h1>Hồ sơ nhân viên</h1><p>Chọn tên của bạn và nhập mã xác thực 6 số để tiếp tục.</p></div>
    {message && <div className="notice">{message}</div>}
    <form onSubmit={submit}>
      <label>Tên nhân viên</label>
      <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null); loadPeople(e.target.value); }} placeholder="Gõ tên hoặc mã nhân viên" autoComplete="off" />
      <div className="person-picker">
        {visible.map(p => <button type="button" className={selected?.id === p.id ? 'person-option selected' : 'person-option'} key={p.id} onClick={() => choose(p)}><span><b>{p.name}</b><small>{p.code}</small></span><span className="chevron">›</span></button>)}
        {query && people.length === 0 && <div className="empty">Không tìm thấy nhân viên.</div>}
        {!query && visible.length === 0 && <div className="empty">Bắt đầu gõ tên để tìm nhân viên.</div>}
      </div>
      <label>Mã xác thực 6 số</label>
      <input className="pin-input" required inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" />
      <button className="primary large" disabled={busy}>{busy ? 'Đang xác thực…' : 'Vào hồ sơ  →'}</button>
    </form>
    <div className="security-note">🔒 Mã xác thực do quản trị viên cấp. Nếu quên mã, vui lòng liên hệ Admin.</div>
    <a className="admin-link" href={ADMIN_PATH}>Khu vực quản trị viên</a>
  </section></div>;
}

function UserPortal({ token, person, onLogout }) {
  const [data, setData] = useState(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(null);
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const load = () => request('/api/portal/me', { headers }).then(setData).catch(e => { setMessage(e.message); if (e.message.includes('Phiên')) onLogout(); });
  useEffect(load, []);
  const upload = async (typeId, file) => {
    if (!file) return; setBusy(typeId); setMessage('');
    try { const f = new FormData(); f.append('file', file); await request(`/api/portal/upload/${typeId}`, { method: 'POST', headers, body: f }); setMessage('Đã tải tài liệu lên thành công.'); load(); }
    catch (e) { setMessage(e.message); } finally { setBusy(null); }
  };
  if (!data) return <div className="center">{message || 'Đang tải hồ sơ…'}</div>;
  const submitted = data.document_types.filter(t => t.submitted).length;
  const total = data.document_types.length;
  const percent = total ? Math.round((submitted / total) * 100) : 0;
  return <div className="app narrow">
    <header className="app-header"><Brand compact /><button className="ghost" onClick={onLogout}>Đăng xuất</button></header>
    <section className="profile-hero panel"><div><span className="eyebrow">HỒ SƠ CÁ NHÂN</span><h1>{person.name}</h1><p>{person.code}{person.title ? ` · ${person.title}` : ''}{person.role ? ` · ${person.role}` : ''}</p></div><div className="completion"><div className="completion-value">{percent}%</div><small>đã hoàn thành</small></div></section>
    {message && <div className="notice">{message}</div>}
    <section className="panel"><div className="section-heading"><div><h2>Danh sách giấy tờ</h2><p className="muted">Nộp đúng loại giấy tờ tương ứng. Bạn có thể nộp lại khi cần.</p></div><span className="badge">{submitted}/{total}</span></div>
      <div className="progress"><span style={{ width: `${percent}%` }} /></div>
      <div className="doc-list">{data.document_types.map(t => <div className="doc-card" key={t.id}><div className="doc-info"><span className={t.submitted ? 'status-dot done' : 'status-dot'}></span><div><b>{t.name}</b><small>{t.submitted ? 'Đã nộp' : t.required ? 'Chưa nộp · Bắt buộc' : 'Chưa nộp · Không bắt buộc'}</small>{t.file_name && <small className="file-name">📄 {t.file_name}</small>}</div></div><label className="upload-btn">{busy === t.id ? 'Đang tải…' : t.submitted ? 'Nộp lại' : 'Chọn file'}<input type="file" disabled={busy !== null} onChange={e => upload(t.id, e.target.files?.[0])} /></label></div>)}</div>
    </section>
  </div>;
}

function StatCard({ value, label, tone = '' }) { return <div className={`stat-card ${tone}`}><div className="stat-icon">{tone === 'success' ? '✓' : tone === 'warning' ? '!' : '•'}</div><b>{value}</b><span>{label}</span></div>; }

function AdminApp() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || ''), [login, setLogin] = useState({ username: 'admin', password: '' }), [tab, setTab] = useState('dashboard');
  const [people, setPeople] = useState([]), [types, setTypes] = useState([]), [docs, setDocs] = useState([]), [overview, setOverview] = useState(null);
  const [peopleQuery, setPeopleQuery] = useState(''), [docsQuery, setDocsQuery] = useState(''), [docTypeFilter, setDocTypeFilter] = useState(''), [personFilter, setPersonFilter] = useState('');
  const [personForm, setPersonForm] = useState({ name: '', code: '', phone: '' }), [typeForm, setTypeForm] = useState({ name: '', required: true }), [message, setMessage] = useState(''), [newPin, setNewPin] = useState(null), [detail, setDetail] = useState(null);
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);
  const load = async () => {
    try {
      const [o, p, t, d] = await Promise.all([request('/api/admin/overview', { headers }), request(`/api/people?q=${encodeURIComponent(peopleQuery)}`, { headers }), request('/api/document-types', { headers }), request(`/api/admin/documents?q=${encodeURIComponent(docsQuery)}${personFilter ? `&person_id=${personFilter}` : ''}${docTypeFilter ? `&document_type_id=${docTypeFilter}` : ''}`, { headers })]);
      setOverview(o); setPeople(p); setTypes(t); setDocs(d);
    } catch (e) { if (e.message.includes('đăng nhập')) { localStorage.removeItem('admin_token'); setToken(''); } setMessage(e.message); }
  };
  useEffect(() => { if (token) load(); }, [token, peopleQuery, docsQuery, personFilter, docTypeFilter]);
  const doLogin = async e => { e.preventDefault(); try { const d = await request('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(login) }); localStorage.setItem('admin_token', d.token); setToken(d.token); setMessage('Đăng nhập thành công.'); } catch (e) { setMessage(e.message); } };
  const addPerson = async e => { e.preventDefault(); try { const d = await request('/api/people', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(personForm) }); setPersonForm({ name: '', code: '', phone: '' }); setNewPin({ name: d.name, code: d.code, pin: d.pin }); setMessage(`Đã tạo ${d.name}.`); load(); } catch (e) { setMessage(e.message); } };
  const resetPin = async p => { try { const d = await request(`/api/people/${p.id}/reset-pin`, { method: 'POST', headers }); setNewPin({ name: p.name, code: p.code, pin: d.pin }); setMessage(`Đã tạo mã xác thực mới cho ${p.name}.`); } catch (e) { setMessage(e.message); } };
  const addType = async e => { e.preventDefault(); try { const d = await request('/api/document-types', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(typeForm) }); setTypeForm({ name: '', required: true }); setMessage(`Đã thêm ${d.name}`); load(); } catch (e) { setMessage(e.message); } };
  const showPerson = async p => { try { setDetail(await request(`/api/admin/person/${p.id}`, { headers })); } catch (e) { setMessage(e.message); } };
  const logout = async () => { await request('/api/admin/logout', { method: 'POST', headers }).catch(() => {}); localStorage.removeItem('admin_token'); setToken(''); };

  if (!token) return <div className="center portal-bg"><section className="login panel"><Brand /><div className="welcome"><span className="eyebrow">KHU VỰC QUẢN TRỊ</span><h1>Quản lý hồ sơ</h1><p>Đăng nhập để quản lý nhân viên, giấy tờ và tiến độ hồ sơ.</p></div>{message && <div className="notice">{message}</div>}<form onSubmit={doLogin}><input value={login.username} onChange={e => setLogin({ ...login, username: e.target.value })} placeholder="Tài khoản" /><input type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} placeholder="Mật khẩu" /><button className="primary large">Đăng nhập  →</button></form><small className="muted">Môi trường demo: admin / change-me. Khi triển khai thực tế, hãy đổi mật khẩu.</small><a className="admin-link" href="/">← Trang nộp hồ sơ</a></section></div>;

  const completion = overview?.completion_percent || 0;
  return <div className="app">
    <header className="app-header"><Brand compact /><button className="ghost" onClick={logout}>Đăng xuất</button></header>
    <section className="admin-hero"><div><span className="eyebrow">BẢNG ĐIỀU HÀNH</span><h1>Quản lý hồ sơ nhân viên</h1><p>Theo dõi tiến độ tiếp nhận hồ sơ của toàn khoa.</p></div><div className="qr-mini"><QRCodeSVG value={COMMON_PORTAL_URL} size={82} includeMargin /><span>QR dùng chung</span></div></section>
    {newPin && <div className="notice pin-notice"><b>Mã xác thực mới — chỉ hiển thị lần này</b><strong>{newPin.name} ({newPin.code}): {newPin.pin}</strong><span>Hãy giao mã này cho đúng nhân viên. Mã không được lưu dạng rõ trong hệ thống.</span><button className="ghost" onClick={() => setNewPin(null)}>Đóng</button></div>}
    {message && <div className="notice">{message}</div>}
    <nav className="tabs">{[['dashboard','Tổng quan'],['people','Nhân viên'],['types','Loại giấy tờ'],['docs','Tài liệu']].map(([id,label]) => <button className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}>{label}</button>)}</nav>

    {tab === 'dashboard' && <main><section className="stats"><StatCard value={overview?.people ?? 0} label="Nhân viên" /><StatCard value={overview?.document_types ?? 0} label="Loại giấy tờ" /><StatCard value={overview?.missing ?? 0} label="Hồ sơ bắt buộc còn thiếu" tone="warning" /><StatCard value={`${completion}%`} label="Tiến độ chung" tone="success" /></section><section className="dashboard-grid"><div className="panel"><div className="section-heading"><div><h2>Tiến độ toàn khoa</h2><p className="muted">Tổng số tài liệu bắt buộc đã được nộp.</p></div><b className="big-percent">{completion}%</b></div><div className="progress thick"><span style={{ width: `${completion}%` }} /></div><div className="progress-meta"><span>Đã nộp <b>{overview?.submitted || 0}</b></span><span>Cần nộp <b>{overview?.expected || 0}</b></span></div></div><div className="panel qr-card"><div><span className="eyebrow">TRUY CẬP NHANH</span><h2>QR dùng chung</h2><p className="muted">Một mã QR cho tất cả nhân viên.</p><code>{COMMON_PORTAL_URL}</code></div><QRCodeSVG value={COMMON_PORTAL_URL} size={150} includeMargin /></div></section></main>}

    {tab === 'people' && <main className="grid"><section className="panel"><h2>Thêm nhân viên</h2><p className="muted">Mã xác thực 6 số được hệ thống tự sinh.</p><form onSubmit={addPerson}><input required placeholder="Họ và tên" value={personForm.name} onChange={e => setPersonForm({ ...personForm, name: e.target.value })} /><input required placeholder="Mã nhân viên, ví dụ NV052" value={personForm.code} onChange={e => setPersonForm({ ...personForm, code: e.target.value })} /><input placeholder="Số điện thoại" value={personForm.phone} onChange={e => setPersonForm({ ...personForm, phone: e.target.value })} /><button className="primary">+ Thêm nhân viên</button></form></section><section className="panel"><div className="section-heading"><div><h2>Danh sách nhân viên</h2><p className="muted">Hiện có {people.length} kết quả.</p></div></div><input placeholder="🔎  Tìm theo tên, mã hoặc SĐT" value={peopleQuery} onChange={e => setPeopleQuery(e.target.value)} /><div className="list">{people.map(p => <div className="row" key={p.id}><button className="person-main" onClick={() => showPerson(p)}><span className="avatar">{p.name?.charAt(0)}</span><span><b>{p.name}</b><small>{p.code} · {p.title || 'Chưa có chức danh'} · {p.role || 'Chưa có chức vụ'}</small><small>Đã nộp {p.submitted_count || 0} tài liệu</small></span></button><div className="row-actions"><button className="secondary" onClick={() => resetPin(p)}>Tạo lại mã</button><button className="danger" onClick={async () => { if (!confirm(`Xóa ${p.name}?`)) return; try { await request(`/api/people/${p.id}`, { method: 'DELETE', headers }); setMessage('Đã xóa nhân viên.'); load(); } catch (e) { setMessage(e.message); } }}>Xóa</button></div></div>)}</div></section></main>}

    {tab === 'types' && <main className="grid"><section className="panel"><h2>Thêm loại giấy tờ</h2><form onSubmit={addType}><input required placeholder="Ví dụ: CCCD" value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} /><label className="check"><input type="checkbox" checked={typeForm.required} onChange={e => setTypeForm({ ...typeForm, required: e.target.checked })} /> Bắt buộc</label><button className="primary">+ Thêm loại giấy tờ</button></form></section><section className="panel"><h2>Danh sách loại giấy tờ</h2><div className="list">{types.map(t => <div className="row" key={t.id}><div><b>{t.name}</b><small>{t.required ? 'Bắt buộc' : 'Không bắt buộc'}</small></div><button className="danger" onClick={async () => { if (!confirm(`Xóa loại ${t.name}?`)) return; try { await request(`/api/document-types/${t.id}`, { method: 'DELETE', headers }); setMessage('Đã xóa loại giấy tờ.'); load(); } catch (e) { setMessage(e.message); } }}>Xóa</button></div>)}</div></section></main>}

    {detail && <PersonModal detail={detail} onClose={() => setDetail(null)} />}

    {tab === 'docs' && <main><section className="panel"><div className="section-heading"><div><h2>Tài liệu đã nộp</h2><p className="muted">Tra cứu và tải hồ sơ từ hệ thống.</p></div></div><div className="filters"><input placeholder="🔎  Tìm người, loại hoặc tên file" value={docsQuery} onChange={e => setDocsQuery(e.target.value)} /><select value={personFilter} onChange={e => setPersonFilter(e.target.value)}><option value="">Tất cả nhân viên</option>{people.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select><select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}><option value="">Tất cả loại giấy tờ</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>Nhân viên</th><th>Loại giấy tờ</th><th>File</th><th>Thời gian</th><th></th></tr></thead><tbody>{docs.map(d => <tr key={d.id}><td><b>{d.person_name}</b><small>{d.person_code}</small></td><td>{d.document_type_name}</td><td>{d.file_name}</td><td>{d.uploaded_at}</td><td><button className="secondary" onClick={async () => { try { const r = await fetch(`${API}/api/admin/document/${d.id}/download`, { headers }); if (!r.ok) throw new Error('Không tải được file'); const blob = await r.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = d.file_name; a.click(); URL.revokeObjectURL(url); } catch (e) { setMessage(e.message); } }}>Tải file</button></td></tr>)}</tbody></table></div></section></main>}
  </div>;
}

function PersonModal({ detail, onClose }) {
  if (!detail) return null;
  const p = detail.person; const submitted = detail.documents.filter(d => d.submitted).length; const total = detail.documents.length; const percent = total ? Math.round((submitted / total) * 100) : 0;
  return <div className="modal-backdrop" onClick={onClose}><section className="modal panel" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><span className="eyebrow">CHI TIẾT NHÂN VIÊN</span><h2>{p.name}</h2><p className="muted">{p.code}{p.title ? ` · ${p.title}` : ''}{p.role ? ` · ${p.role}` : ''}</p><div className="detail-progress"><b>{percent}%</b><div className="progress"><span style={{ width: `${percent}%` }} /></div></div><div className="detail-list">{detail.documents.map(d => <div className="detail-item" key={d.document_type_id}><span className={d.submitted ? 'status-dot done' : 'status-dot'}></span><div><b>{d.name}</b><small>{d.submitted ? `Đã nộp · ${d.file_name || ''}` : d.required ? 'Chưa nộp · Bắt buộc' : 'Chưa nộp'}</small></div></div>)}</div></section></div>;
}

function App() {
  const [portalToken, setPortalToken] = useState(sessionStorage.getItem('portal_token') || '');
  const [person, setPerson] = useState(() => JSON.parse(sessionStorage.getItem('portal_person') || 'null'));
  const logout = () => { sessionStorage.removeItem('portal_token'); sessionStorage.removeItem('portal_person'); setPortalToken(''); setPerson(null); };
  if (location.pathname === ADMIN_PATH) return <AdminApp />;
  if (portalToken && person) return <UserPortal token={portalToken} person={person} onLogout={logout} />;
  return <PortalLogin onLogin={(t, p) => { sessionStorage.setItem('portal_token', t); sessionStorage.setItem('portal_person', JSON.stringify(p)); setPortalToken(t); setPerson(p); }} />;
}

createRoot(document.getElementById('root')).render(<App />);
