(async function(){
const sb=window.vianaSupabase, $=s=>document.querySelector(s);
if(!sb)return;

let session=(await sb.auth.getSession()).data.session;

async function boot(){
  if(!session){$('#loginPanel').hidden=false;$('#adminApp').hidden=true;return;}
  const {data:p}=await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle();
  if(!p || p.role!=='admin' || !p.active){
    await sb.auth.signOut(); session=null;
    $('#loginError').textContent='Esta conta não possui permissões de administrador.';
    return;
  }
  $('#loginPanel').hidden=true;$('#adminApp').hidden=false;
  $('#adminName').textContent=p.full_name||session.user.email;
  refresh();
}

$('#loginForm').addEventListener('submit',async e=>{
 e.preventDefault();$('#loginError').textContent='A iniciar sessão…';
 const r=await sb.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});
 if(r.error){$('#loginError').textContent='E-mail ou palavra-passe inválidos.';return;}
 session=r.data.session;boot();
});
$('#logout').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('#refresh').onclick=refresh;

$('#siteToggle').onchange=async e=>{
 const active=e.target.checked;
 const r=await sb.from('site_settings').update({site_active:active,updated_at:new Date().toISOString()}).eq('id',true);
 $('#siteLabel').textContent=active?'Activo':'Suspenso';
 $('#siteMessage').textContent=r.error?'Não foi possível guardar.':'Estado actualizado no Supabase.';
};

async function refresh(){
 const today=new Date().toLocaleDateString('en-CA');
 const [e,f,s,set]=await Promise.all([
   sb.from('employees').select('*').order('name'),
   sb.from('feedback').select('*').order('created_at',{ascending:false}).limit(30),
   sb.from('schedules').select('*').eq('work_date',today),
   sb.from('site_settings').select('*').eq('id',true).single()
 ]);
 const employees=e.data||[], feedback=f.data||[], schedules=s.data||[];
 $('#employeeCount').textContent=String(employees.length).padStart(2,'0');
 $('#feedbackCount').textContent=String(feedback.length).padStart(2,'0');
 $('#dutyCount').textContent=String(schedules.filter(x=>x.status==='on_duty').length).padStart(2,'0');
 if(set.data){$('#siteToggle').checked=!!set.data.site_active;$('#siteLabel').textContent=set.data.site_active?'Activo':'Suspenso';}
 renderEmployees(employees);renderFeedback(feedback);
}

function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function renderEmployees(list){
 const q=($('#employeeSearch').value||'').toLocaleLowerCase('pt');
 list=list.filter(e=>[e.name,e.role_title,e.category,e.employee_code].filter(Boolean).join(' ').toLocaleLowerCase('pt').includes(q));
 $('#employeeTable').innerHTML=list.map(e=>`<tr>
 <td><strong>${esc(e.name)}</strong><small>${esc(e.employee_code)}</small></td>
 <td>${esc(e.role_title||'—')}</td><td>${esc(e.category||'—')}</td>
 <td><span class="status ${e.status}">${e.status==='active'?'Activo':'Suspenso'}</span></td>
 <td><button class="mini" data-id="${e.id}" data-status="${e.status}">${e.status==='active'?'Suspender':'Activar'}</button></td>
 </tr>`).join('')||'<tr><td colspan="5">Nenhum profissional encontrado.</td></tr>';
 $('#employeeTable').querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{
   const status=b.dataset.status==='active'?'suspended':'active';
   const r=await sb.from('employees').update({status,updated_at:new Date().toISOString()}).eq('id',b.dataset.id);
   if(r.error)alert('Não foi possível actualizar o profissional.'); else refresh();
 });
}
function renderFeedback(list){
 $('#feedbackList').innerHTML=list.length?list.map(f=>`<article><strong>${esc(f.message_type)}</strong><small>${esc(f.first_name)} ${esc(f.last_name)} · ${esc(f.email)} · ${esc(f.phone)}</small><p>${esc(f.message)}</p></article>`).join(''):'<p>Nenhuma participação recebida.</p>';
}
$('#employeeSearch').addEventListener('input',refresh);
boot();
})();