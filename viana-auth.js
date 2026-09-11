(function(){
const sb=window.vianaSupabase;if(!sb)return;
window.VianaAuth={
 async session(){return (await sb.auth.getSession()).data.session||null},
 async profile(){const s=await this.session();if(!s)return null;return (await sb.from('profiles').select('*').eq('id',s.user.id).maybeSingle()).data},
 async employee(){const s=await this.session();if(!s)return null;return (await sb.from('employees').select('*').eq('user_id',s.user.id).maybeSingle()).data},
 async signOut(){await sb.auth.signOut();location.href='admin.html'}
};
})();