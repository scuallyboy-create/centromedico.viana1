(async function(){
const sb=window.vianaSupabase,$=s=>document.querySelector(s);if(!sb)return;
const session=(await sb.auth.getSession()).data.session;if(!session){location.href='admin.html';return}
const p=(await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle()).data;
const e=(await sb.from('employees').select('*').eq('user_id',session.user.id).maybeSingle()).data;
if(!p||!e){$('#portalError').hidden=false;$('#portalError').textContent='A conta ainda não está associada a um profissional. Solicite a associação ao administrador.';return}
$('#userName').textContent=e.name;$('#userRole').textContent=e.role_title||p.role;$('#avatar').src=e.photo_url||'assets/placeholder.svg';
if(['doctor','nurse','technician'].includes(p.role))$('#patientModule').hidden=false;
if(p.role==='doctor')$('#medicalModule').hidden=false;
const today=()=>new Date().toLocaleDateString('en-CA');
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
async function loadSchedule(){
 const r=await sb.from('schedules').select('*').eq('employee_id',e.id).eq('work_date',today()).maybeSingle();if(r.error)return;
 const d=r.data;
 $('#todayStatus').textContent=d?({on_duty:'Em serviço',off:'Fora de serviço',absent:'Ausente',leave:'Em licença'}[d.status]||d.status):'Sem escala registada hoje';
 $('#shiftTime').textContent=d?.start_time&&d?.end_time?d.start_time.slice(0,5)+' — '+d.end_time.slice(0,5):'Horário não definido';
 if(d){$('#scheduleForm [name="work_date"]').value=d.work_date;$('#scheduleForm [name="start_time"]').value=d.start_time?.slice(0,5)||'';$('#scheduleForm [name="end_time"]').value=d.end_time?.slice(0,5)||'';$('#scheduleForm [name="status"]').value=d.status;$('#scheduleForm [name="notes"]').value=d.notes||''}
}
async function loadPatients(){
 const r=await sb.from('patients').select('id,patient_number,full_name,phone,created_at').or(`created_by.eq.${session.user.id},assigned_employee_id.eq.${e.id}`).order('created_at',{ascending:false}).limit(50);if(r.error)return;
 $('#patientCount').textContent=String(r.data.length).padStart(2,'0');
 $('#patientList').innerHTML=r.data.length?r.data.map(x=>`<div class="patient"><strong>${esc(x.full_name)}</strong><small>${esc(x.patient_number||'Sem número')} · ${esc(x.phone||'Sem telefone')}</small></div>`).join(''):'<p>Sem pacientes associados.</p>';
}
$('#scheduleForm').addEventListener('submit',async ev=>{ev.preventDefault();const d=Object.fromEntries(new FormData(ev.currentTarget));const r=await sb.from('schedules').upsert({employee_id:e.id,work_date:d.work_date,start_time:d.start_time||null,end_time:d.end_time||null,status:d.status,notes:d.notes||null,updated_at:new Date().toISOString()},{onConflict:'employee_id,work_date'});$('#scheduleMessage').textContent=r.error?'Erro ao guardar.':'Escala actualizada.';if(!r.error)loadSchedule()});
$('#patientForm')?.addEventListener('submit',async ev=>{ev.preventDefault();const d=Object.fromEntries(new FormData(ev.currentTarget));const r=await sb.from('patients').insert({full_name:d.full_name,birth_date:d.birth_date||null,sex:d.sex||null,phone:d.phone||null,address:d.address||null,assigned_employee_id:e.id,created_by:session.user.id});$('#patientMessage').textContent=r.error?'Erro ao registar paciente.':'Paciente registado.';if(!r.error){ev.currentTarget.reset();loadPatients()}});
$('#logout').onclick=async()=>{await sb.auth.signOut();location.href='admin.html'};
$('#todayDate').textContent=new Intl.DateTimeFormat('pt-AO',{dateStyle:'full'}).format(new Date());
loadSchedule();loadPatients();
})();