import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QRCodeSVG} from 'qrcode.react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const PORTAL_PATH = '/';
const ADMIN_PATH = '/admin';
const COMMON_PORTAL_URL = `${window.location.origin}${PORTAL_PATH}`;

async function request(path, options={}) {
  const r = await fetch(`${API}${path}`, options);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || 'Có lỗi xảy ra');
  return data;
}

function PortalLogin({onLogin}) {
  const [people,setPeople]=useState([]);
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState(null);
  const [pin,setPin]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [recent,setRecent]=useState(()=>JSON.parse(localStorage.getItem('portal_recent_people')||'[]'));

  const loadPeople=async q=>{
    try { const data=await request(`/api/portal/people?q=${encodeURIComponent(q)}`); setPeople(data); }
    catch(e){setMessage(e.message)}
  };
  useEffect(()=>{loadPeople('')},[]);
  const filtered = query.trim() ? people : recent.map(r=>people.find(p=>p.id===r.id)||r);
  const choose = p => { setSelected(p); setQuery(p.name); setPin(''); setMessage(''); };
  const submit=async e=>{
    e.preventDefault(); if(!selected){setMessage('Hãy chọn tên nhân viên.');return}
    setBusy(true); setMessage('');
    try {
      const data=await request('/api/portal/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person_id:selected.id,pin})});
      const next=[selected,...recent.filter(x=>x.id!==selected.id)].slice(0,8);
      localStorage.setItem('portal_recent_people',JSON.stringify(next));
      onLogin(data.token,data.person);
    } catch(e){setMessage(e.message)} finally{setBusy(false)}
  };
  return <div className="center"><section className="panel login portal-login">
    <div className="portal-mark">📄</div><h1>Nộp hồ sơ</h1>
    <p className="muted">Quét QR chung, chọn tên của bạn và nhập mã xác thực 6 số.</p>
    {message&&<div className="notice">{message}</div>}
    <form onSubmit={submit}>
      <label>Tên nhân viên</label>
      <input value={query} onChange={e=>{setQuery(e.target.value);setSelected(null);loadPeople(e.target.value)}} placeholder="Gõ tên hoặc mã nhân viên" autoComplete="off" />
      <div className="person-picker">
        {(query.trim()?people:filtered).slice(0,8).map(p=><button type="button" className={selected?.id===p.id?'person-option selected':'person-option'} key={p.id} onClick={()=>choose(p)}><span>{p.name}</span><small>{p.code}</small></button>)}
        {query && people.length===0 && <div className="empty">Không tìm thấy nhân viên.</div>}
      </div>
      <label>Mã xác thực</label>
      <input required inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6 chữ số" />
      <button className="primary" disabled={busy}>{busy?'Đang xác thực…':'Vào hồ sơ'}</button>
    </form>
    <p className="hint">Mã xác thực do Admin (quản trị viên) cấp. Nếu quên mã, hãy liên hệ Admin.</p>
    <a className="admin-link" href={ADMIN_PATH}>Khu vực Admin</a>
  </section></div>
}

function UserPortal({token,person,onLogout}) {
  const [data,setData]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(null);
  const headers=useMemo(()=>({Authorization:`Bearer ${token}`}),[token]);
  const load=()=>request('/api/portal/me',{headers}).then(setData).catch(e=>{setMessage(e.message);if(e.message.includes('Phiên'))onLogout()});
  useEffect(load,[]);
  const upload=async(typeId,file)=>{
    if(!file)return;setBusy(typeId);setMessage('');
    try{const f=new FormData();f.append('file',file);await request(`/api/portal/upload/${typeId}`,{method:'POST',headers,body:f});setMessage('Đã tải tài liệu lên thành công.');load()}
    catch(e){setMessage(e.message)}finally{setBusy(null)}
  };
  if(!data)return <div className="center">{message||'Đang tải hồ sơ…'}</div>;
  return <div className="app narrow"><header><div><h1>Hồ sơ của bạn</h1><p>{person.name} · {person.code}</p></div><button className="ghost" onClick={onLogout}>Thoát</button></header>
    {message&&<div className="notice">{message}</div>}
    <section className="panel"><h2>Danh sách giấy tờ</h2><p className="muted">Chọn file trên điện thoại hoặc máy tính để nộp. Có thể nộp lại khi cần.</p>
      <div className="doc-list">{data.document_types.map(t=><div className="doc-card" key={t.id}><div><b>{t.name}</b><small>{t.required?'Bắt buộc':'Không bắt buộc'} · {t.submitted?'Đã nộp':'Chưa nộp'}</small>{t.file_name&&<small>File: {t.file_name}</small>}</div><label className="upload-btn">{busy===t.id?'Đang tải…':t.submitted?'Nộp lại':'Chọn file'}<input type="file" disabled={busy!==null} onChange={e=>upload(t.id,e.target.files?.[0])}/></label></div>)}</div>
    </section></div>
}

function AdminApp(){
  const [token,setToken]=useState(localStorage.getItem('admin_token')||''),[login,setLogin]=useState({username:'admin',password:''}),[tab,setTab]=useState('dashboard');
  const [people,setPeople]=useState([]),[types,setTypes]=useState([]),[docs,setDocs]=useState([]),[overview,setOverview]=useState(null);
  const [peopleQuery,setPeopleQuery]=useState(''),[docsQuery,setDocsQuery]=useState(''),[docTypeFilter,setDocTypeFilter]=useState(''),[personFilter,setPersonFilter]=useState('');
  const [personForm,setPersonForm]=useState({name:'',code:'',phone:''}),[typeForm,setTypeForm]=useState({name:'',required:true}),[message,setMessage]=useState(''),[newPin,setNewPin]=useState(null);
  const headers=useMemo(()=>token?{Authorization:`Bearer ${token}`}:{},[token]);
  const load=async()=>{try{const [o,p,t,d]=await Promise.all([request('/api/admin/overview',{headers}),request(`/api/people?q=${encodeURIComponent(peopleQuery)}`,{headers}),request('/api/document-types',{headers}),request(`/api/admin/documents?q=${encodeURIComponent(docsQuery)}${personFilter?`&person_id=${personFilter}`:''}${docTypeFilter?`&document_type_id=${docTypeFilter}`:''}`,{headers})]);setOverview(o);setPeople(p);setTypes(t);setDocs(d)}catch(e){if(e.message.includes('đăng nhập')){localStorage.removeItem('admin_token');setToken('')}setMessage(e.message)}};
  useEffect(()=>{if(token)load()},[token,peopleQuery,docsQuery,personFilter,docTypeFilter]);
  const doLogin=async e=>{e.preventDefault();try{const d=await request('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(login)});localStorage.setItem('admin_token',d.token);setToken(d.token);setMessage('Đăng nhập thành công.')}catch(e){setMessage(e.message)}};
  const addPerson=async e=>{e.preventDefault();try{const d=await request('/api/people',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(personForm)});setPersonForm({name:'',code:'',phone:''});setNewPin({name:d.name,code:d.code,pin:d.pin});setMessage(`Đã tạo ${d.name}.`);load()}catch(e){setMessage(e.message)}};
  const resetPin=async p=>{try{const d=await request(`/api/people/${p.id}/reset-pin`,{method:'POST',headers});setNewPin({name:p.name,code:p.code,pin:d.pin});setMessage(`Đã tạo mã xác thực mới cho ${p.name}.`)}catch(e){setMessage(e.message)}};
  const addType=async e=>{e.preventDefault();try{const d=await request('/api/document-types',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(typeForm)});setTypeForm({name:'',required:true});setMessage(`Đã thêm ${d.name}`);load()}catch(e){setMessage(e.message)}};
  const logout=async()=>{await request('/api/admin/logout',{method:'POST',headers}).catch(()=>{});localStorage.removeItem('admin_token');setToken('')};
  if(!token)return <div className="center"><section className="login panel"><h1>Quản lý hồ sơ</h1><p className="muted">Đăng nhập Admin (quản trị viên)</p>{message&&<div className="notice">{message}</div>}<form onSubmit={doLogin}><input value={login.username} onChange={e=>setLogin({...login,username:e.target.value})} placeholder="Tài khoản"/><input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} placeholder="Mật khẩu"/><button className="primary">Đăng nhập</button></form><small className="muted">Môi trường demo: admin / change-me. Khi Deploy (đưa lên Internet), hãy đổi ngay bằng biến môi trường.</small><a className="admin-link" href={PORTAL_PATH}>← Trang nộp hồ sơ</a></section></div>;
  return <div className="app"><header><div><h1>Quản lý hồ sơ</h1><p>Admin (quản trị viên)</p></div><button className="ghost" onClick={logout}>Đăng xuất</button></header>
    <section className="qr-panel panel"><div><h2>QR dùng chung</h2><p className="muted">In hoặc gửi QR này cho tất cả nhân viên. Mọi người dùng cùng một link.</p><code>{COMMON_PORTAL_URL}</code></div><QRCodeSVG value={COMMON_PORTAL_URL} size={130} includeMargin /></section>
    {newPin&&<div className="notice pin-notice"><b>Mã xác thực mới — chỉ hiển thị lần này</b><strong>{newPin.name} ({newPin.code}): {newPin.pin}</strong><span>Hãy giao mã này cho đúng nhân viên. Mã không được lưu dạng rõ trong hệ thống.</span><button className="ghost" onClick={()=>setNewPin(null)}>Đóng</button></div>}
    <nav>{[['dashboard','Tổng quan'],['people','Nhân viên'],['types','Loại giấy tờ'],['docs','Tài liệu']].map(([id,label])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}</nav>{message&&<div className="notice">{message}</div>}
    {tab==='dashboard'&&<main><section className="cards"><div className="card"><b>{overview?.people??0}</b><span>Nhân viên</span></div><div className="card"><b>{overview?.document_types??0}</b><span>Loại giấy tờ</span></div><div className="card"><b>{overview?.missing??0}</b><span>Hồ sơ bắt buộc chưa nộp</span></div></section><section className="panel"><h2>Tiến độ</h2><div className="progress"><span style={{width:`${overview?.completion_percent||0}%`}}></span></div><b>{overview?.completion_percent||0}%</b><p className="muted">Đã nộp {overview?.submitted||0} tài liệu bắt buộc trên tổng số hồ sơ cần nộp.</p></section></main>}
    {tab==='people'&&<main className="grid"><section className="panel"><h2>Thêm nhân viên</h2><p className="muted">Hệ thống tự sinh mã xác thực 6 số.</p><form onSubmit={addPerson}><input required placeholder="Họ và tên" value={personForm.name} onChange={e=>setPersonForm({...personForm,name:e.target.value})}/><input required placeholder="Mã nhân viên, ví dụ NV002" value={personForm.code} onChange={e=>setPersonForm({...personForm,code:e.target.value})}/><input placeholder="Số điện thoại" value={personForm.phone} onChange={e=>setPersonForm({...personForm,phone:e.target.value})}/><button className="primary">Thêm nhân viên</button></form></section><section className="panel"><h2>Danh sách nhân viên</h2><input placeholder="Tìm theo tên, mã hoặc SĐT" value={peopleQuery} onChange={e=>setPeopleQuery(e.target.value)}/><div className="list">{people.map(p=><div className="row" key={p.id}><div><b>{p.name}</b><small>{p.code} · {p.phone||'Chưa có SĐT'} · Đã nộp {p.submitted_count}</small></div><div className="row-actions"><button className="secondary" onClick={()=>resetPin(p)}>Tạo lại mã</button><button className="danger" onClick={async()=>{if(!confirm(`Xóa ${p.name}?`))return;try{await request(`/api/people/${p.id}`,{method:'DELETE',headers});setMessage('Đã xóa nhân viên.');load()}catch(e){setMessage(e.message)}}}>Xóa</button></div></div>)}</div></section></main>}
    {tab==='types'&&<main className="grid"><section className="panel"><h2>Thêm loại giấy tờ</h2><form onSubmit={addType}><input required placeholder="Ví dụ: CCCD" value={typeForm.name} onChange={e=>setTypeForm({...typeForm,name:e.target.value})}/><label><input type="checkbox" checked={typeForm.required} onChange={e=>setTypeForm({...typeForm,required:e.target.checked})}/> Bắt buộc</label><button className="primary">Thêm loại giấy tờ</button></form></section><section className="panel"><h2>Danh sách loại giấy tờ</h2><div className="list">{types.map(t=><div className="row" key={t.id}><div><b>{t.name}</b><small>{t.required?'Bắt buộc':'Không bắt buộc'}</small></div><button className="danger" onClick={async()=>{if(!confirm(`Xóa loại ${t.name}?`))return;try{await request(`/api/document-types/${t.id}`,{method:'DELETE',headers});setMessage('Đã xóa loại giấy tờ.');load()}catch(e){setMessage(e.message)}}}>Xóa</button></div>)}</div></section></main>}
    {tab==='docs'&&<main><section className="panel"><h2>Tài liệu đã nộp</h2><div className="filters"><input placeholder="Tìm người, loại hoặc tên file" value={docsQuery} onChange={e=>setDocsQuery(e.target.value)}/><select value={personFilter} onChange={e=>setPersonFilter(e.target.value)}><option value="">Tất cả nhân viên</option>{people.map(p=><option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select><select value={docTypeFilter} onChange={e=>setDocTypeFilter(e.target.value)}><option value="">Tất cả loại giấy tờ</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>Nhân viên</th><th>Loại giấy tờ</th><th>File</th><th>Thời gian</th><th></th></tr></thead><tbody>{docs.map(d=><tr key={d.id}><td>{d.person_name}<small>{d.person_code}</small></td><td>{d.document_type_name}</td><td>{d.file_name}</td><td>{d.uploaded_at}</td><td><button className="secondary" onClick={async()=>{try{const r=await fetch(`${API}/api/admin/document/${d.id}/download`,{headers});if(!r.ok)throw new Error('Không tải được file');const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=d.file_name;a.click();URL.revokeObjectURL(url)}catch(e){setMessage(e.message)}}}>Tải file</button></td></tr>)}</tbody></table></div></section></main>}
  </div>
}

function App(){
  const [portalToken,setPortalToken]=useState(sessionStorage.getItem('portal_token')||'');
  const [person,setPerson]=useState(()=>JSON.parse(sessionStorage.getItem('portal_person')||'null'));
  const logout=()=>{sessionStorage.removeItem('portal_token');sessionStorage.removeItem('portal_person');setPortalToken('');setPerson(null)};
  if(location.pathname===ADMIN_PATH)return <AdminApp/>;
  if(portalToken&&person)return <UserPortal token={portalToken} person={person} onLogout={logout}/>;
  return <PortalLogin onLogin={(t,p)=>{sessionStorage.setItem('portal_token',t);sessionStorage.setItem('portal_person',JSON.stringify(p));setPortalToken(t);setPerson(p)}}/>;
}

createRoot(document.getElementById('root')).render(<App/>);
