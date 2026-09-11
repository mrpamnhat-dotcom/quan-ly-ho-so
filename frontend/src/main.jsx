import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const accessCode = new URLSearchParams(location.search).get('access');

async function request(path, options={}) {
  const r = await fetch(`${API}${path}`, options);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || 'Có lỗi xảy ra');
  return data;
}

function UserPortal() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null);
  const load = () => request(`/api/access/${encodeURIComponent(accessCode)}`).then(setData).catch(e=>setMessage(e.message));
  useEffect(load, []);
  const upload = async (typeId, file) => {
    if (!file) return;
    setBusy(typeId); setMessage('');
    try {
      await request(`/api/access/${encodeURIComponent(accessCode)}/upload/${typeId}`, {method:'POST', body:(()=>{const f=new FormData();f.append('file',file);return f;})()});
      setMessage('Đã tải tài liệu lên thành công.'); load();
    } catch(e) { setMessage(e.message); } finally { setBusy(null); }
  };
  if (!data) return <div className="center">{message || 'Đang tải hồ sơ…'}</div>;
  return <div className="app narrow">
    <header><div><h1>Hồ sơ của bạn</h1><p>{data.person.name} · {data.person.code}</p></div><span className="badge">Cá nhân</span></header>
    {message && <div className="notice">{message}</div>}
    <section className="panel"><h2>Danh sách giấy tờ</h2><p className="muted">Chọn file trên điện thoại hoặc máy tính để nộp. Có thể nộp lại khi cần.</p>
      <div className="doc-list">{data.document_types.map(t=><div className="doc-card" key={t.id}><div><b>{t.name}</b><small>{t.required?'Bắt buộc':'Không bắt buộc'} · {t.submitted?'Đã nộp':'Chưa nộp'}</small>{t.file_name&&<small>File: {t.file_name}</small>}</div><label className="upload-btn">{busy===t.id?'Đang tải…':t.submitted?'Nộp lại':'Chọn file'}<input type="file" disabled={busy!==null} onChange={e=>upload(t.id,e.target.files?.[0])}/></label></div>)}</div>
    </section>
  </div>
}

function AdminApp() {
  const [token,setToken]=useState(localStorage.getItem('admin_token')||'');
  const [login,setLogin]=useState({username:'admin',password:''});
  const [tab,setTab]=useState('dashboard');
  const [people,setPeople]=useState([]), [types,setTypes]=useState([]), [docs,setDocs]=useState([]), [overview,setOverview]=useState(null);
  const [peopleQuery,setPeopleQuery]=useState('');
  const [docsQuery,setDocsQuery]=useState('');
  const [docTypeFilter,setDocTypeFilter]=useState('');
  const [personFilter,setPersonFilter]=useState('');
  const [personForm,setPersonForm]=useState({name:'',code:'',phone:''});
  const [typeForm,setTypeForm]=useState({name:'',required:true});
  const [message,setMessage]=useState('');
  const headers=useMemo(()=>token?{Authorization:`Bearer ${token}`}:{},[token]);
  const load=async()=>{try{const [o,p,t,d]=await Promise.all([request('/api/admin/overview',{headers}),request(`/api/people?q=${encodeURIComponent(peopleQuery)}`,{headers}),request('/api/document-types',{headers}),request(`/api/admin/documents?q=${encodeURIComponent(docsQuery)}${personFilter?`&person_id=${personFilter}`:''}${docTypeFilter?`&document_type_id=${docTypeFilter}`:''}`,{headers})]);setOverview(o);setPeople(p);setTypes(t);setDocs(d);}catch(e){if(e.message.includes('đăng nhập')){localStorage.removeItem('admin_token');setToken('')}setMessage(e.message)}};
  useEffect(()=>{if(token)load()},[token, peopleQuery, docsQuery, personFilter, docTypeFilter]);
  const doLogin=async e=>{e.preventDefault();try{const d=await request('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(login)});localStorage.setItem('admin_token',d.token);setToken(d.token);setMessage('Đăng nhập thành công.')}catch(e){setMessage(e.message)}};
  const addPerson=async e=>{e.preventDefault();try{const d=await request('/api/people',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(personForm)});setPersonForm({name:'',code:'',phone:''});setMessage(`Đã tạo ${d.name}. Mã truy cập: ${d.access_code}`);load()}catch(e){setMessage(e.message)}};
  const addType=async e=>{e.preventDefault();try{const d=await request('/api/document-types',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(typeForm)});setTypeForm({name:'',required:true});setMessage(`Đã thêm ${d.name}`);load()}catch(e){setMessage(e.message)}};
  const logout=async()=>{await request('/api/admin/logout',{method:'POST',headers}).catch(()=>{});localStorage.removeItem('admin_token');setToken('');};
  if(!token) return <div className="center"><section className="login panel"><h1>Quản lý hồ sơ</h1><p className="muted">Đăng nhập Admin (quản trị viên)</p>{message&&<div className="notice">{message}</div>}<form onSubmit={doLogin}><input value={login.username} onChange={e=>setLogin({...login,username:e.target.value})} placeholder="Tài khoản"/><input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} placeholder="Mật khẩu"/><button className="primary">Đăng nhập</button></form><small className="muted">Mặc định môi trường demo: admin / change-me. Khi Deploy (đưa lên Internet), hãy đổi ngay bằng biến môi trường.</small></section></div>;
  return <div className="app"><header><div><h1>Quản lý hồ sơ</h1><p>Admin (quản trị viên)</p></div><button className="ghost" onClick={logout}>Đăng xuất</button></header><nav>{[['dashboard','Tổng quan'],['people','Người'],['types','Loại giấy tờ'],['docs','Tài liệu']].map(([id,label])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}</nav>{message&&<div className="notice">{message}</div>}
    {tab==='dashboard'&&<main><section className="cards"><div className="card"><b>{overview?.people??0}</b><span>Người</span></div><div className="card"><b>{overview?.document_types??0}</b><span>Loại giấy tờ</span></div><div className="card"><b>{overview?.missing??0}</b><span>Hồ sơ bắt buộc chưa nộp</span></div></section><section className="panel"><h2>Tiến độ</h2><div className="progress"><span style={{width:`${overview?.completion_percent||0}%`}}></span></div><b>{overview?.completion_percent||0}%</b><p className="muted">Đã nộp {overview?.submitted||0} tài liệu bắt buộc trên tổng số hồ sơ cần nộp.</p></section></main>}
    {tab==='people'&&<main className="grid"><section className="panel"><h2>Thêm người</h2><form onSubmit={addPerson}><input required placeholder="Họ và tên" value={personForm.name} onChange={e=>setPersonForm({...personForm,name:e.target.value})}/><input required placeholder="Mã người, ví dụ NV002" value={personForm.code} onChange={e=>setPersonForm({...personForm,code:e.target.value})}/><input placeholder="Số điện thoại" value={personForm.phone} onChange={e=>setPersonForm({...personForm,phone:e.target.value})}/><button className="primary">Thêm người</button></form></section><section className="panel"><h2>Danh sách người</h2><input placeholder="Tìm theo tên, mã hoặc SĐT" value={peopleQuery} onChange={e=>setPeopleQuery(e.target.value)}/><div className="list">{people.map(p=><div className="row" key={p.id}><div><b>{p.name}</b><small>{p.code} · {p.phone||'Chưa có SĐT'} · Đã nộp {p.submitted_count}</small></div><div className="row-actions"><code>{location.origin}{location.pathname}?access={p.access_code}</code><button className="danger" onClick={async()=>{if(!confirm(`Xóa ${p.name}?`))return;try{await request(`/api/people/${p.id}`,{method:'DELETE',headers});setMessage('Đã xóa người.');load()}catch(e){setMessage(e.message)}}}>Xóa</button></div></div>)}</div></section></main>}
    {tab==='types'&&<main className="grid"><section className="panel"><h2>Thêm loại giấy tờ</h2><form onSubmit={addType}><input required placeholder="Ví dụ: CCCD" value={typeForm.name} onChange={e=>setTypeForm({...typeForm,name:e.target.value})}/><label><input type="checkbox" checked={typeForm.required} onChange={e=>setTypeForm({...typeForm,required:e.target.checked})}/> Bắt buộc</label><button className="primary">Thêm loại giấy tờ</button></form></section><section className="panel"><h2>Danh sách loại giấy tờ</h2><div className="list">{types.map(t=><div className="row" key={t.id}><div><b>{t.name}</b><small>{t.required?'Bắt buộc':'Không bắt buộc'}</small></div><button className="danger" onClick={async()=>{if(!confirm(`Xóa loại ${t.name}?`))return;try{await request(`/api/document-types/${t.id}`,{method:'DELETE',headers});setMessage('Đã xóa loại giấy tờ.');load()}catch(e){setMessage(e.message)}}}>Xóa</button></div>)}</div></section></main>}
    {tab==='docs'&&<main><section className="panel"><h2>Tài liệu đã nộp</h2><div className="filters"><input placeholder="Tìm người, loại hoặc tên file" value={docsQuery} onChange={e=>setDocsQuery(e.target.value)}/><select value={personFilter} onChange={e=>setPersonFilter(e.target.value)}><option value="">Tất cả người</option>{people.map(p=><option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select><select value={docTypeFilter} onChange={e=>setDocTypeFilter(e.target.value)}><option value="">Tất cả loại giấy tờ</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>Người</th><th>Loại giấy tờ</th><th>File</th><th>Thời gian</th></tr></thead><tbody>{docs.map(d=><tr key={d.id}><td>{d.person_name}<small>{d.person_code}</small></td><td>{d.document_type_name}</td><td>{d.file_name}</td><td>{d.uploaded_at}</td></tr>)}</tbody></table></div></section></main>}
  </div>
}

createRoot(document.getElementById('root')).render(accessCode ? <UserPortal/> : <AdminApp/>);
