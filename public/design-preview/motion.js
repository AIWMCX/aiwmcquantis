/* Quantis motion study. Original implementation based on observed Sadewa behavior.
   No Webflow runtime, trackers, global scroll interception, or payment handlers. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  const timers = new Set();
  const defer = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const motion = () => !paused && !reduced.matches;
  const shuffle = list => list.map(v => ({ v, n: Math.random() })).sort((a,b) => a.n-b.n).map(x => x.v);
  const motionButton = document.querySelector('.motion-toggle');
  const videos = [...document.querySelectorAll('video')];
  function updateMotion() {
    root.classList.toggle('motion-paused', !motion());
    motionButton.textContent = motion() ? 'Pause motion' : 'Enable motion';
    motionButton.setAttribute('aria-pressed', String(!motion()));
    if (!motion()) videos.forEach(v => v.pause());
    else videos.filter(v => {const r=v.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).forEach(v => v.play().catch(() => {}));
  }
  motionButton.addEventListener('click', () => {paused=!paused;updateMotion();});
  reduced.addEventListener('change', () => {paused=reduced.matches;updateMotion();});
  updateMotion();
  document.querySelector('.theme').addEventListener('click', function () {
    const light = root.dataset.theme !== 'light';
    root.dataset.theme = light ? 'light' : 'navy';
    this.setAttribute('aria-pressed', String(light));
    this.setAttribute('aria-label', light ? 'Switch to navy theme' : 'Switch to light theme');
  });
  const menuButton=document.querySelector('.menu-toggle'),menu=document.querySelector('.mobile-menu');
  function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.textContent='Menu +';}
  menuButton.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));menuButton.textContent=menu.hidden?'Menu +':'Close −';});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus();}});
  document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!menuButton.contains(e.target))closeMenu();});
  matchMedia('(min-width: 761px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
  function splitWords(el){
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    let n=0;nodes.forEach(node=>{const f=document.createDocumentFragment();node.textContent.split(/(\s+)/).forEach(word=>{if(!word.trim()){f.append(document.createTextNode(word));return;}const span=document.createElement('span');span.className='word';span.style.setProperty('--i',n++);span.textContent=word;f.append(span);});node.replaceWith(f);});
  }
  const headings=[...document.querySelectorAll('h1,h2')].filter(el=>!el.closest('dialog,.principle-carousel'));
  headings.forEach(splitWords);
  // Progressive enhancement: static text stays readable if setup fails.
  root.classList.add('motion-ready');
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('words-visible','in-view');revealObserver.unobserve(entry.target);}}),{threshold:.12});
  headings.forEach(el=>revealObserver.observe(el));
  document.querySelectorAll('.comparison').forEach(el=>revealObserver.observe(el));
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+#';
  const scrambleRuns=new WeakMap();
  function scramble(el,text=el.dataset.original||el.textContent){
    el.dataset.original=text;
    const run=(scrambleRuns.get(el)||0)+1;scrambleRuns.set(el,run);
    if(!motion()){el.textContent=text;return;}
    el.replaceChildren();const spoken=document.createElement('span');spoken.className='sr-only';spoken.textContent=text;
    const visual=document.createElement('span');visual.className='scramble-visual';visual.setAttribute('aria-hidden','true');el.append(spoken,visual);
    const start=performance.now(), duration=300+text.length*30;
    function tick(){if(scrambleRuns.get(el)!==run)return;const elapsed=performance.now()-start;if(elapsed>=duration||!motion()){visual.textContent=text;return;}visual.textContent=[...text].map((c,i)=>/\s/.test(c)||elapsed>300+i*30?c:alphabet[Math.floor(Math.random()*alphabet.length)]).join('');defer(tick,40);}
    tick();
  }
  const scrambleObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){scramble(e.target);scrambleObserver.unobserve(e.target);}}),{threshold:.6});
  document.querySelectorAll('.eyebrow').forEach(el=>scrambleObserver.observe(el));
  document.querySelectorAll('.nav-links a').forEach(el=>{el.addEventListener('pointerenter',()=>scramble(el));el.addEventListener('focus',()=>scramble(el));});
  function grid(count,cls){const g=document.createElement('span');g.className='pixel-grid '+cls;g.setAttribute('aria-hidden','true');shuffle(Array.from({length:count},(_,i)=>i)).forEach(order=>{const p=document.createElement('i');p.style.setProperty('--order',order);g.append(p);});return g;}
  document.querySelectorAll('.split').forEach(el=>{
    [...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()).forEach(n=>{const label=document.createElement('span');label.className='button-label';label.textContent=n.textContent;n.replaceWith(label);});
    el.querySelectorAll(':scope > span:not(.button-label)').forEach(a=>a.classList.add('button-arrow'));
    el.append(grid(12,''));
  });
  const pixelObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)return;pixelObserver.unobserve(e.target);if(!motion())return;const g=grid(48,'image-pixels');e.target.append(g);requestAnimationFrame(()=>requestAnimationFrame(()=>g.classList.add('cleared')));defer(()=>g.remove(),550);}),{threshold:.25});
  document.querySelectorAll('.pixel-reveal').forEach(el=>pixelObserver.observe(el));
  const videoObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting&&motion())e.target.play().catch(()=>{});else e.target.pause();}),{threshold:.1});
  videos.forEach(v=>videoObserver.observe(v));
  // Continuous ticker duplicates are hidden from assistive technology.
  const ticker=document.querySelector('.ticker-track');[...ticker.children].forEach(el=>{const copy=el.cloneNode(true);copy.setAttribute('aria-hidden','true');ticker.append(copy);});
  const steps=[...document.querySelectorAll('.approach-step')],images=[...document.querySelectorAll('.approach-image')],reel=document.querySelector('.number-reel'),art=document.querySelector('.approach-art');
  let currentStep=0,swapToken=0;
  function activateStep(index){if(index===currentStep)return;currentStep=index;const token=++swapToken;reel.style.transform=`translateY(-${index*reel.firstElementChild.getBoundingClientRect().height}px)`;art.querySelectorAll('.pixel-grid').forEach(g=>g.remove());
    if(!motion()){images.forEach((im,i)=>im.classList.toggle('active',i===index));return;}
    const g=grid(48,'image-pixels');g.querySelectorAll('i').forEach(p=>{p.style.opacity='0';p.style.transitionDelay=`${Number(p.style.getPropertyValue('--order'))*5}ms`;});art.append(g);
    requestAnimationFrame(()=>g.querySelectorAll('i').forEach(p=>p.style.opacity='1'));
    defer(()=>{if(token!==swapToken)return;images.forEach((im,i)=>im.classList.toggle('active',i===index));g.querySelectorAll('i').forEach(p=>p.style.opacity='0');defer(()=>g.remove(),300);},280);
  }
  const comparisonStory=document.querySelector('.comparison-story');
  const nav=document.querySelector('.nav'),pain=document.querySelector('.painpoint'),chips=[...document.querySelectorAll('.pain-chip')];let lastY=scrollY,pending=false;
  function updateScroll(){pending=false;const y=scrollY,delta=y-lastY;
    if(Math.abs(delta)>10){nav.classList.toggle('nav-hidden',motion()&&delta>0&&y>150&&menu.hidden);lastY=y;}
    if(motion()&&innerWidth>760){const r=comparisonStory.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0){const progress=Math.max(0,Math.min(1,(60-r.top)/(comparisonStory.offsetHeight-innerHeight*.85)));comparisonStory.style.setProperty('--compare-progress',progress);}}
    const guide=innerWidth<=760?Math.max(270,innerHeight*.55):innerHeight*.6;
    let index=0;steps.forEach((step,i)=>{if(step.getBoundingClientRect().top<guide)index=i;});activateStep(index);
    if(motion()&&innerWidth>760){const rect=pain.getBoundingClientRect();if(rect.top<innerHeight&&rect.bottom>0){const progress=Math.max(0,Math.min(1,-rect.top/(pain.offsetHeight-innerHeight)));chips.forEach((chip,i)=>chip.style.setProperty('--chip-y',`${-progress*(150+i*25)}px`));}}
  }
  function scheduleScroll(){if(!pending){pending=true;requestAnimationFrame(updateScroll);}}
  addEventListener('scroll',scheduleScroll,{passive:true});addEventListener('resize',()=>{reel.style.transform=`translateY(-${currentStep*reel.firstElementChild.getBoundingClientRect().height}px)`;scheduleScroll();});updateScroll();
  const principles=['A forecast is only as useful as the assumptions you can explain.','Revenue is not cash. The timing of receipts and payments can change the decision.','Break-even is not payback. Covering operating costs does not recover the initial investment.'];let principle=0;
  function slide(dir){principle=(principle+dir+principles.length)%principles.length;const el=document.querySelector('#principle-text');el.textContent=principles[principle];if(motion())el.animate([{opacity:0,transform:'translateX(20px)'},{opacity:1,transform:'none'}],{duration:450,easing:'ease-out'});document.querySelector('#principle-count').textContent=`0${principle+1} / 03`;}
  document.querySelector('.carousel-prev').addEventListener('click',()=>slide(-1));document.querySelector('.carousel-next').addEventListener('click',()=>slide(1));
  document.querySelectorAll('[data-period]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelectorAll('.plan-period').forEach(el=>scramble(el,button.dataset.period==='annual'?'Annual billing':'Monthly billing'));}));
  const dialog=document.querySelector('.demo-dialog'),showreel=document.querySelector('.showreel');
  showreel.addEventListener('click',()=>dialog.showModal());document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>showreel.focus());
  if(matchMedia('(hover:hover) and (pointer:fine)').matches){const hint=document.createElement('div');hint.className='cursor-hint';hint.setAttribute('aria-hidden','true');document.body.append(hint);document.querySelectorAll('[data-cursor]').forEach(el=>{el.addEventListener('pointerenter',()=>{if(motion()){hint.textContent=el.dataset.cursor;hint.style.display='block';}});el.addEventListener('pointermove',e=>hint.style.transform=`translate(${e.clientX+18}px,${e.clientY+18}px)`);el.addEventListener('pointerleave',()=>hint.style.display='none');});}
  addEventListener('pagehide',()=>{timers.forEach(clearTimeout);timers.clear();videos.forEach(v=>v.pause());});
})();
