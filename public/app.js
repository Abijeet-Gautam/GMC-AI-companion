const root = document.querySelector('#app');
const notice = document.querySelector('#notice');
const params = new URLSearchParams(location.search);
const page = location.pathname === '/chat' ? 'chat' : location.pathname === '/admin' ? 'admin' : 'screen';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const get = (items,id) => items.find(item=>item.id===id);
const date = value => new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Asia/Thimphu'}).format(value);
const mode = value => value==='ai' ? 'OpenAI' : 'Approved guide';
let info, chamber, section='home', timer, turns=[], busy=false, visitExpired=false, chatError='', overall=0;
let admin, tab='news', newsEdit, revision, feedbackFilter='all';
let toastTimer;
const labels = {home:'Welcome',explore:'Explore',news:'News',ratings:'Satisfaction'};
function toast(message) {
  notice.textContent=message;
  notice.hidden=false;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>notice.hidden=true,4200);
}
async function api(path, method='GET', body) {
  const response = await fetch(path,{method,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
  if (!response.ok) {
    const data = await response.json().catch(()=>({}));
    throw Object.assign(new Error(data.error || 'The app is unavailable. Please retry.'),{status:response.status});
  }
  return response.json();
}
const button = (label, attrs='', variant='') => '<button class="button '+variant+'" '+attrs+'>'+label+'</button>';
function mast(mark,tail='') {
  return '<header class="mast"><a class="brand" href="/screen"><span class="brand-mark" aria-hidden="true">✳</span><span>GELEPHU<span class="subbrand">MINDFULNESS CITY</span></span></a><span class="mast-divider"></span><span class="mast-label">'+mark+'</span>'+tail+'</header>';
}
const avatar = (c,cls='') => '<svg class="avatar '+cls+'" viewBox="0 0 160 160" role="img" aria-label="'+esc(c.guide)+'"><use href="/avatars.svg#'+c.id+'"></use></svg>';
function guides(items, selected) {
  return '<div class="guide-grid">'+items.map(c=>'<button class="guide" type="button" data-chamber="'+c.id+'" style="--guide:'+c.color+'" aria-pressed="'+(selected===c.id)+'">'+avatar(c)+'<span class="guide-copy"><small>'+esc(c.label)+'</small><strong>'+esc(c.name)+'</strong><span>'+esc(c.description)+'</span></span><span class="guide-arrow" aria-hidden="true">↗</span></button>').join('')+'</div>';
}
function newsCards(items) {
  if (!items.length) return '<p class="empty">No announcements have been published.</p>';
  return '<div class="news-grid">'+items.map(item=>'<article class="paper news-card"><p class="eyebrow">'+(item.origin==='official'?'Official GMC news':'Staff announcement')+'</p><h3>'+esc(item.title)+'</h3><p>'+esc(item.body)+'</p>'+(item.url?'<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">Read at source ↗</a>':'')+'</article>').join('')+'</div>';
}
function rating(s) {
  return s.count ? '<strong>'+s.average.toFixed(1)+'<small> / 5</small></strong><span>'+s.count+' visitor '+(s.count===1?'rating':'ratings')+'</span>' : '<strong>—</strong><span>No ratings yet</span>';
}
function qr(c) {
  const suffix=c?'?chamber='+c.id:'';
  const mobile=info.base+'/chat'+suffix;
  return '<aside class="scan-card"><p class="eyebrow"><span class="dot"></span> CONTINUE ON YOUR PHONE</p><img src="/api/qr'+suffix+'" alt="Scan the QR code to open the GMC companion" width="224" height="224"><div><strong>Meet your GMC guide</strong><p>Open your camera and scan the code.</p><a href="'+esc(mobile)+'">'+esc(mobile.replace(/^https?:\/\//,''))+'</a>'+(info.local?'<small class="local-note">Local preview link. Set PUBLIC_BASE_URL for scanning from another device.</small>':'')+'</div></aside>';
}
function screen() {
  const chosen=get(info.chambers,chamber);
  const story=get(info.highlights,chamber);
  root.innerHTML=mast('EXPERIENCE CENTRE','<span class="chip mast-right"><span class="dot"></span> VISITOR DESK</span>')+
    '<main id="main" class="screen-wrap"><nav class="touch-nav" aria-label="Touch navigation">'+Object.entries(labels).map(([id,label])=>button(label,'type="button" data-section="'+id+'" aria-pressed="'+(section===id)+'"','nav-button')).join('')+'</nav>'+
    '<div class="screen-layout"><div class="screen-body">'+(section==='home'?
      '<section class="hero"><div class="hero-inner"><p class="eyebrow">BHUTAN · EXPERIENCE CENTRE</p><h1>Discover<br>Gelephu<br><em>Mindfulness City</em></h1><p>Explore the ideas, places and people shaping GMC. Choose a chamber or scan to start a conversation.</p>'+button('Explore the chambers <span>→</span>','type="button" data-section="explore"','primary')+'</div></section>'+
      '<section class="touch-summary"><article><span class="eyebrow">THE EXHIBITION</span><h2>Four chambers</h2><p>See the vision, masterplan, economy and community through four different guides.</p></article><article><span class="eyebrow">VISITOR SATISFACTION</span><div class="rating compact">'+rating(info.satisfaction)+'</div></article></section>':
      section==='explore'?'<section class="section-intro"><p class="eyebrow">THE EXHIBITION</p><h1>Explore the chambers</h1><p>Choose a story to preview on this screen. Scan its QR code to ask a question on your phone.</p></section>'+guides(info.chambers,chamber)+(story?'<article class="paper story"><p class="eyebrow">'+esc(chosen.name)+'</p><h2>'+esc(story.title)+'</h2><p>'+esc(story.text)+'</p></article>':''):
      section==='news'?'<section class="section-intro"><p class="eyebrow">FROM GELEPHU</p><h1>News and announcements</h1></section>'+newsCards(info.news):
      '<section class="section-intro"><p class="eyebrow">VISITOR EXPERIENCE</p><h1>Overall satisfaction</h1><p>Ratings are submitted by visitors using the GMC companion.</p></section><div class="paper rating">'+rating(info.satisfaction)+'</div>')+'</div>'+qr(section==='explore'?chosen:null)+'</div></main>'+
    '<footer class="site-footer"><span>GMC AI COMPANION</span><span>EXPERIENCE CENTRE PROTOTYPE</span></footer>';
}
function idle() {
  clearTimeout(timer);
  if (section!=='home') timer=setTimeout(()=>{ section='home'; chamber=undefined; screen(); },60_000);
}
function messages(c) {
  const list=turns.filter(turn=>turn.chamber===c.id);
  return list.map(turn=>'<div class="message question"><span>You</span><p>'+esc(turn.question)+'</p></div><div class="message answer"><span>'+esc(c.guide)+' · '+mode(turn.mode)+'</span><p>'+esc(turn.text)+'</p>'+
    (turn.sources.length?'<ul class="sources">'+turn.sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a></li>').join('')+'</ul>':'')+
    (turn.redirect?button('Switch to '+esc(get(info.chambers,turn.redirect)?.name),'type="button" data-chamber="'+esc(turn.redirect)+'"','soft'):'')+
    '<details class="answer-feedback"><summary>Rate this answer</summary><form data-form="answer" data-id="'+turn.id+'"><label>Optional note <input name="comment" maxlength="500" placeholder="What could be clearer?"></label><div class="actions">'+button('Helpful','type="submit" name="score" value="1"','soft')+button('Needs improvement','type="submit" name="score" value="0"','soft')+'</div></form></details></div>').join('');
}
function chat(scroll=false, focus=false) {
  const c=get(info.chambers,chamber);
  root.innerHTML=mast('MOBILE COMPANION','<span class="mast-right"><a href="/screen">Reception ↗</a></span>')+
    '<main id="main" class="chat-wrap">'+(!c?'<section class="chat-intro"><p class="eyebrow">EXPLORE AT YOUR PACE</p><h1>Choose your chamber</h1><p>Four guides, four ways to explore Gelephu Mindfulness City.</p></section>'+guides(info.chambers):'<section class="chat-head" style="--guide:'+c.color+'">'+avatar(c,'chat-avatar')+
    '<div><p class="eyebrow">'+esc(c.label)+'</p><h1>'+esc(c.name)+'</h1><p>'+esc(c.guide)+' · Your chamber guide</p></div>'+button('Change chamber','type="button" data-action="picker"','soft')+'</section>'+
    '<section class="conversation" aria-label="Conversation" id="conversation"><div class="message answer"><span>'+esc(c.guide)+'</span><p>Welcome. Ask me about '+esc(c.name)+', or start with this question.</p>'+
    button(esc(c.question),'type="button" data-action="starter" '+(busy||visitExpired?'disabled':''),'soft')+'</div>'+messages(c)+(busy?'<p class="waiting" role="status">Preparing an answer…</p>':'')+'</section>'+
    '<form class="composer" data-form="chat"><label for="question">Ask a question</label><div><input id="question" name="message" maxlength="900" placeholder="Type your question…" required '+(busy||visitExpired?'disabled':'')+'>'+button('Send <span aria-hidden="true">↑</span>','type="submit" '+(busy||visitExpired?'disabled':''),'primary')+'</div></form>'+
    (chatError?'<p class="chat-error" role="alert">'+esc(chatError)+'</p>':'')+
    '<p class="privacy-note">Questions may be sent to OpenAI. Avoid sharing personal information. This visit remembers recent messages in each chamber.</p>'+
    '<details class="satisfaction"><summary>Rate your visit</summary><form data-form="satisfaction"><label>Overall satisfaction <select name="score" required><option value="">Choose a rating</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'" '+(overall===n?'selected':'')+'>'+n+' / 5</option>').join('')+'</select></label><label>Optional comment <textarea name="comment" maxlength="500" rows="2"></textarea></label>'+button('Save rating','type="submit"','primary')+'</form></details>'+
    button('Start a new visit','type="button" data-action="reset"','plain'))+'</main>';
  if (scroll) { const log=document.querySelector('#conversation'); if (log) log.scrollTop=log.scrollHeight; }
  if (focus && !busy && !visitExpired) document.querySelector('#question')?.focus({preventScroll:true});
}
const options = (items,selected) => items.map(([value,label])=>'<option value="'+esc(value)+'" '+(value===selected?'selected':'')+'>'+esc(label)+'</option>').join('');
const selectChamber = id => options(info.chambers.map(c=>[c.id,c.name]),id);
const field = (label,name,value='',attrs='') => '<label>'+label+'<input name="'+name+'" value="'+esc(value)+'" '+attrs+'></label>';
const status = value => '<span class="status '+esc(value)+'">'+esc(value)+'</span>';
function staff() {
  root.innerHTML=mast('STAFF CONSOLE','<span class="mast-right"><a href="/screen">Reception ↗</a></span>')+
    '<main id="main" class="admin-wrap">'+(!admin?
      '<section class="paper login"><p class="eyebrow">RESTRICTED ACCESS</p><h1>Staff sign-in</h1><p>Use the password provisioned for this GMC Companion installation.</p><form data-form="login">'+field('Staff password','password','','type="password" autocomplete="current-password" required')+button('Sign in','type="submit"','primary')+'</form></section>':
      '<div class="admin-head"><div><p class="eyebrow">CONTENT AND VISITOR EXPERIENCE</p><h1>Staff dashboard</h1></div>'+button('Sign out','type="button" data-action="logout"','soft')+'</div>'+
      '<div class="metrics"><article class="paper"><small>Overall satisfaction</small><div class="rating compact">'+rating(admin.satisfaction)+'</div></article><article class="paper"><small>Answer helpfulness</small><strong>'+(admin.helpful.count?Math.round(admin.helpful.helpful*100/admin.helpful.count)+'%':'—')+'</strong><span>'+admin.helpful.count+' answer ratings</span></article><article class="paper"><small>Chat turns by chamber</small><ul>'+info.chambers.map(c=>'<li>'+esc(c.name)+' <strong>'+(admin.engagement.find(item=>item.chamber===c.id)?.count || 0)+'</strong></li>').join('')+'</ul></article></div>'+
      '<p class="privacy-note">Metrics cover all stored ratings and chat turns.</p><nav class="touch-nav" aria-label="Staff sections">'+[['news','News queue'],['feedback','Feedback inbox'],['knowledge','Knowledge']].map(([id,label])=>button(label,'type="button" data-tab="'+id+'" aria-pressed="'+(tab===id)+'"','nav-button')).join('')+'</nav>'+
      (tab==='news'?staffNews():tab==='feedback'?staffFeedback():staffKnowledge()))+'</main>';
}
function staffNews() {
  const item=newsEdit || {};
  return '<div class="admin-columns"><section class="paper editor"><p class="eyebrow">PUBLIC CONTENT</p><h2>'+(item.id?'Edit announcement':'New announcement')+'</h2><form data-form="news">'+
    field('Headline','title',item.title,'required maxlength="140"')+
    '<label>Summary<textarea name="body" maxlength="650" rows="4">'+esc(item.body)+'</textarea></label>'+
    '<label>Origin<select name="origin">'+options([['staff','Staff announcement'],['official','Official GMC news']],item.origin)+'</select></label>'+
    field('Source link','url',item.url,'type="url" placeholder="https://www.gmc.bt/…"')+
    '<label>Status<select name="state">'+options([['draft','Draft'],['published','Published'],['archived','Archived']],item.state)+'</select></label><div class="actions">'+button('Save announcement','type="submit"','primary')+
    (item.id?button('Cancel edit','type="button" data-action="cancel-news"','soft'):'')+'</div></form></section>'+
    '<section><div class="section-row"><h2>News queue</h2>'+button('Import GMC headlines','type="button" data-action="sync"','soft')+'</div><p class="privacy-note">Imported links become drafts. Review the title and source before publishing.</p>'+
    admin.news.map(item=>'<article class="paper queue-item"><div>'+status(item.state)+' <small>'+esc(item.origin)+' · '+date(item.updated)+'</small><h3>'+esc(item.title)+'</h3>'+(item.url?'<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">Source ↗</a>':'')+'</div>'+button('Edit','type="button" data-news="'+item.id+'"','soft')+'</article>').join('')+'</section></div>';
}
function staffFeedback() {
  const rows=admin.feedback.filter(item=>feedbackFilter==='all'||item.status===feedbackFilter);
  return '<section><div class="section-row"><h2>Feedback inbox</h2><label class="inline">Filter <select id="feedback-filter">'+options([['all','All statuses'],['new','New'],['reviewing','Reviewing'],['resolved','Resolved']],feedbackFilter)+'</select></label></div>'+
    (!rows.length?'<p class="empty">No feedback in this view yet.</p>':rows.map(item=>'<article class="paper feedback-item">'+status(item.status)+' <small>'+esc(get(info.chambers,item.chamber)?.name || 'General')+' · '+date(item.created)+'</small><h3>'+(item.kind==='satisfaction'?item.score+' / 5 overall':item.score?'Helpful answer':'Answer needs improvement')+'</h3>'+
    (item.comment?'<p>'+esc(item.comment)+'</p>':'')+(item.sources!=='[]'?'<p>Answer sources: '+JSON.parse(item.sources).map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a>').join(', ')+'</p>':'')+
    '<form class="actions" data-form="review" data-id="'+item.id+'"><label class="inline">Review status <select name="status">'+options([['new','New'],['reviewing','Reviewing'],['resolved','Resolved']],item.status)+'</select></label>'+button('Save','type="submit"','soft')+'</form></article>').join(''))+'</section>';
}
function staffKnowledge() {
  const item=revision || {};
  return '<div class="admin-columns"><section class="paper editor"><p class="eyebrow">CHAMBER KNOWLEDGE</p><h2>'+(item.id?'Draft a correction':'New knowledge draft')+'</h2>'+
    '<form data-form="knowledge"><label>Chamber<select name="chamber" '+(item.id?'disabled':'')+'>'+selectChamber(item.chamber)+'</select></label>'+
    field('Title','title',item.title,'required maxlength="120"')+'<label>Verified excerpt<textarea name="body" required maxlength="1000" rows="5">'+esc(item.body)+'</textarea></label>'+
    field('Primary source link','url',item.url,'type="url" required')+field('Search words','tags',item.tags,'required maxlength="200" placeholder="masterplan housing roads"')+
    '<div class="actions">'+button('Save draft','type="submit"','primary')+(item.id?button('Cancel correction','type="button" data-action="cancel-knowledge"','soft'):'')+'</div></form></section>'+
    '<section><h2>Knowledge versions</h2><p class="privacy-note">Only published excerpts reach visitors. Publishing a correction archives the version it replaces.</p>'+
    admin.knowledge.map(item=>'<article class="paper queue-item"><div>'+status(item.state)+' <small>'+esc(get(info.chambers,item.chamber)?.name)+'</small><h3>'+esc(item.title)+'</h3><p>'+esc(item.body)+'</p><a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">Primary source ↗</a></div>'+
    (item.state==='draft'?button('Publish','type="button" data-publish="'+item.id+'"','primary'):item.state==='published'?button('Revise','type="button" data-revise="'+item.id+'"','soft'):'')+'</article>').join('')+'</section></div>';
}
async function refreshStaff() {
  try { admin=await api('/api/staff/dashboard'); }
  catch(error) { if (error.status!==401) throw error; admin=null; }
  staff();
}
async function ask(message) {
  if (busy || visitExpired) return;
  busy=true; chatError=''; chat(true);
  try { turns.push(await api('/api/chat','POST',{chamber,message})); }
  catch (error) { chatError=error.message; visitExpired=error.status===401; }
  finally {
    busy=false; chat(true,true);
    if (chatError && !visitExpired) { const input=document.querySelector('#question'); if(input) input.value=message; }
  }
}
async function reset() {
  await api('/api/session','DELETE');
  await api('/api/session','POST');
  turns=[]; overall=0; visitExpired=false; chatError=''; chamber=undefined;
  history.replaceState(null,'','/chat');
  chat();
  toast('Started a new visit.');
}
root.addEventListener('click',async event=>{
  const control=event.target.closest('button');
  if (!control || control.type==='submit') return;
  const data=control.dataset;
  try {
    if (page==='screen') {
      if (data.section) { section=data.section; chamber=undefined; screen(); }
      if (get(info.chambers,data.chamber)) { chamber=data.chamber; screen(); }
      idle();
    } else if (page==='chat') {
      if (busy) return;
      if (data.chamber) { chamber=data.chamber; chat(true,true); }
      if (data.action==='picker') { chamber=undefined; chat(); }
      if (data.action==='starter') await ask(get(info.chambers,chamber).question);
      if (data.action==='reset') await reset();
    } else if (admin) {
      if (data.tab) { tab=data.tab; staff(); }
      if (data.news) { newsEdit=get(admin.news,Number(data.news)); staff(); document.querySelector('.editor input')?.focus(); }
      if (data.revise) { revision=get(admin.knowledge,Number(data.revise)); staff(); document.querySelector('.editor input')?.focus(); }
      if (data.action==='cancel-news') { newsEdit=null; staff(); }
      if (data.action==='cancel-knowledge') { revision=null; staff(); }
      if (data.action==='logout') { await api('/api/staff/logout','POST'); newsEdit=null; revision=null; await refreshStaff(); }
      if (data.action==='sync') {
        control.disabled=true;
        const result=await api('/api/staff/news/sync','POST');
        await refreshStaff();
        toast(result.added+' new draft'+(result.added===1?'':'s')+' imported.');
      }
      if (data.publish) {
        control.disabled=true;
        await api('/api/staff/knowledge/publish','POST',{id:Number(data.publish)});
        await refreshStaff(); toast('Knowledge revision published.');
      }
    }
  } catch(error) { control.disabled=false; toast(error.message); }
});
root.addEventListener('change',event=>{
  if (event.target.id==='feedback-filter') { feedbackFilter=event.target.value; staff(); document.querySelector('#feedback-filter')?.focus(); }
});
root.addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.target;
  const data=Object.fromEntries(new FormData(form,event.submitter));
  const kind=form.dataset.form;
  const submitters=[...form.querySelectorAll('button[type=submit]')];
  for (const item of submitters) item.disabled=true;
  try {
    if (kind==='chat') return await ask(data.message);
    if (kind==='answer') {
      await api('/api/feedback/answer','PUT',{...data,id:Number(form.dataset.id),score:Number(data.score)});
      form.closest('details').open=false; toast('Answer rating saved.');
    }
    if (kind==='satisfaction') {
      await api('/api/feedback/satisfaction','PUT',{...data,chamber,score:Number(data.score)});
      overall=Number(data.score); form.closest('details').open=false; toast('Thanks. Your visit rating was saved.');
    }
    if (kind==='login') { await api('/api/staff/login','POST',data); await refreshStaff(); }
    if (kind==='news') { await api('/api/staff/news','POST',{...data,id:newsEdit?.id}); newsEdit=null; await refreshStaff(); toast('Announcement saved.'); }
    if (kind==='knowledge') { await api('/api/staff/knowledge','POST',{...data,chamber:revision?.chamber || data.chamber,replaces:revision?.id}); revision=null; await refreshStaff(); toast('Knowledge draft saved for review.'); }
    if (kind==='review') { await api('/api/staff/feedback','POST',{...data,id:Number(form.dataset.id)}); await refreshStaff(); toast('Review status saved.'); }
  } catch(error) { toast(error.message); }
  finally { for (const item of submitters) item.disabled=false; }
});
async function boot() {
  info=await api('/api/info');
  if (page==='screen') {
    screen();
    root.addEventListener('pointerdown',idle);
    root.addEventListener('keydown',idle);
    setInterval(async()=>{
      try {
        const incoming=await api('/api/info');
        if (JSON.stringify(incoming)!==JSON.stringify(info)) {
          const focus=document.activeElement?.dataset.section;
          info=incoming; screen();
          if (focus) root.querySelector('[data-section="'+focus+'"]')?.focus({preventScroll:true});
        }
      } catch { /* Keep the last successful data on the display. */ }
    },30_000);
  } else if (page==='chat') {
    await api('/api/session','POST');
    turns=(await api('/api/history')).turns;
    chamber=get(info.chambers,params.get('chamber'))?.id;
    chat();
  } else await refreshStaff();
}
boot().catch(error=>{ root.innerHTML='<main class="chat-wrap"><h1>Unable to open the companion</h1><p>'+esc(error.message)+'</p><a href="'+location.pathname+'">Reload ↻</a></main>'; });

