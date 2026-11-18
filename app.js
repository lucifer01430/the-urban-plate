const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s),money=n=>'₹'+Math.round(n).toLocaleString('en-IN'),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photos={paneer:'assets/paneer.jpg',noodles:'assets/noodles.jpg',pizza:'assets/pizza.jpg',biryani:'assets/biryani.jpg',dosa:'assets/dosa.jpg',coffee:'assets/coffee.jpg',brownie:'assets/brownie.jpg',burger:'assets/burger.jpg',hero:'assets/hero.jpg'};
const initialMenu=[['Paneer Tikka',249,'Starters','paneer',true],['Veg Hakka Noodles',199,'Main Course','noodles'],['Margherita Pizza',299,'Pizza','pizza',true],['Farmhouse Pizza',349,'Pizza','pizza'],['Veg Biryani',229,'Main Course','biryani',true],['Butter Paneer',279,'Main Course','paneer'],['Masala Dosa',149,'Main Course','dosa'],['Cold Coffee',129,'Beverages','coffee'],['Chocolate Brownie',159,'Desserts','brownie'],['Classic Veg Burger',189,'Burgers','burger']].map((a,i)=>({id:i+1,name:a[0],price:a[1],cat:a[2],img:photos[a[3]],best:!!a[4],veg:true,active:true,cost:Math.round(a[1]*.38),desc:['Smoky, tandoor-grilled paneer with bell peppers, fresh herbs and our signature mint chutney.','A comforting favourite, prepared fresh with handpicked ingredients and a little Urban Plate magic.'][i?1:0],rating:(4.7+(i%3)/10).toFixed(1),time:15+(i%3)*5}));

let db;
try{db=JSON.parse(localStorage.getItem('urbanplate-v1'))}catch{}
if(!db)db={
  menu:initialMenu,
  cart:[],
  orders:[
    {id:'UP1042',table:3,items:[{id:1,name:'Paneer Tikka',price:249,qty:2,note:'Medium spice'},{id:8,name:'Cold Coffee',price:129,qty:2,note:''}],status:2,created:Date.now()-12*60000,priority:true},
    {id:'UP1041',table:8,items:[{id:3,name:'Margherita Pizza',price:299,qty:1,note:'Extra crispy'},{id:9,name:'Chocolate Brownie',price:159,qty:2,note:''}],status:3,created:Date.now()-18*60000},
    {id:'UP1043',table:2,items:[{id:5,name:'Veg Biryani',price:229,qty:2,note:'No onion'}],status:0,created:Date.now()-3*60000}
  ],
  tables:Array.from({length:12},(_,i)=>({id:i+1,status:i===2||i===7||i===1?'occupied':i===5?'reserved':i===10?'billing':'available',guests:i===2?4:i===7?2:0,waiter:'Arjun'})),
  payments:[],
  history:[],
  reservations:[],
  serviceCalls:[],
  reviews:[]
};

// Ensure new schema defaults exist even for legacy local storage
if(!db.reservations||!db.reservations.length){
  db.reservations=[
    {id:'RES-8041',name:'Kabir Sharma',phone:'+91 98765 43210',guests:4,date:new Date().toISOString().slice(0,10),time:'8:00 PM',table:6,area:'Rooftop Garden',occasion:'Anniversary',status:'Confirmed'},
    {id:'RES-8042',name:'Ananya Roy',phone:'+91 98111 22334',guests:2,date:new Date().toISOString().slice(0,10),time:'9:00 PM',table:4,area:'Window View',occasion:'Dinner Date',status:'Confirmed'}
  ];
}
if(!db.serviceCalls)db.serviceCalls=[
  {id:101,table:3,type:'Water Refill',time:Date.now()-4*60000,status:'pending'},
  {id:102,table:8,type:'Extra Cutlery & Napkins',time:Date.now()-9*60000,status:'pending'}
];
if(!db.reviews||!db.reviews.length){
  db.reviews=[
    {id:'REV-101',name:'Rohan Mehra',rating:5,tags:['Superb Flavours','Quick Service'],comment:'Paneer tikka was succulent and biryani aroma was incredible! Seamless ordering from phone.',date:'Today'},
    {id:'REV-102',name:'Simran Kaur',rating:5,tags:['Great Vibe','Courteous Staff'],comment:'Loved the direct digital bill payment and split bill option. Very smooth experience.',date:'Yesterday'},
    {id:'REV-103',name:'Vikram Sethi',rating:4,tags:['Quick Service','Friendly Staff'],comment:'No waiting for waiter to bring menu. Food arrived in 18 minutes hot and fresh.',date:'2 days ago'}
  ];
}

let role='Customer',screen='login',category='All items',search='',table=+(new URLSearchParams(location.search).get('table')||5),selected=1,detailQty=1,filter='All',period='Today',coupon=0,tip=0,payMethod='UPI',sound=true,auto=false,activeOrder=null;
let dietFilter='All',sortFilter='Recommended',reviewRating=5;
let resDate=new Date().toISOString().slice(0,10),resTime='8:00 PM',resArea='Rooftop Garden',resGuests=2;

const cats=db.categories||['Starters','Main Course','Pizza','Burgers','Desserts','Beverages'];
const statuses=['Order Placed','Accepted','Preparing','Ready to Serve','Served','Paid','Rejected'];

const save=()=>{db.categories=cats;localStorage.setItem('urbanplate-v1',JSON.stringify(db))};
const icon=n=>`<i class="bi bi-${n}" aria-hidden="true"></i>`;
const brand=()=>`<div class="brand"><span class="brandmark">${icon('flower1')}</span><span>the urban plate.<small>GOOD FOOD. GOOD TIMES.</small></span></div>`;
const badge=(s,c='')=>`<span class="badge-soft ${c}">${esc(s)}</span>`;
const b=(text,action,cls='btnp')=>`<button class="${cls}" onclick="${action}">${text}</button>`;

function playChime(kind='ding'){
  if(!sound)return;
  try{
    let ctx=new(window.AudioContext||window.webkitAudioContext)();
    let osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    if(kind==='ding'){
      osc.type='sine';
      osc.frequency.setValueAtTime(587.33,ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880,ctx.currentTime+0.12);
      gain.gain.setValueAtTime(0.2,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.35);
      osc.start();osc.stop(ctx.currentTime+0.35);
    }else{
      osc.type='triangle';
      osc.frequency.setValueAtTime(523.25,ctx.currentTime);
      gain.gain.setValueAtTime(0.16,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25);
      osc.start();osc.stop(ctx.currentTime+0.25);
    }
  }catch(e){}
}

function toast(t){
  $('#toast').textContent=t;
  $('#toast').classList.add('show');
  clearTimeout(window.tt);
  window.tt=setTimeout(()=>$('#toast').classList.remove('show'),3000);
}

function modal(html,drawer=false){
  $('#overlay').innerHTML=`<div class="modalback ${drawer?'drawer':''}" onclick="if(event.target===this)closeModal()"><section class="modalpanel" role="dialog" aria-modal="true" aria-label="Restaurant action">${b(icon('x-lg'),'closeModal()','iconbtn close')}${html}</section></div>`;
  setTimeout(()=>$('#overlay button')?.focus(),20);
}

function closeModal(){$('#overlay').innerHTML=''}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

function go(s){screen=s;search='';filter='All';closeModal();render();window.scrollTo(0,0)}
function setRole(r){
  role=r;
  go({Customer:'menu',Waiter:'tables','Kitchen Staff':'kitchen',Owner:'dashboard'}[r]||'menu');
}
function logout(){go('login')}
function chooseRole(r){role=r;renderLogin()}

const navs={
  Customer:[
    ['menu','grid','Explore menu'],
    ['tracking','bag-check','My orders'],
    ['payment','receipt','My bill'],
    ['reservations','calendar-check','Book table'],
    ['table-select','qr-code-scan','Choose table']
  ],
  Waiter:[
    ['tables','grid-1x2','Tables'],
    ['orders','receipt','Orders'],
    ['billing','credit-card','Billing'],
    ['reservations','calendar-check','Reservations']
  ],
  'Kitchen Staff':[
    ['kitchen','columns-gap','Kitchen display']
  ],
  Owner:[
    ['dashboard','grid-1x2','Overview'],
    ['manage','journal-text','Menu management'],
    ['reservations','calendar-check','Reservations']
  ]
};

function render(){
  if(screen==='login'){renderLogin();return}
  const nav=navs[role]||navs.Customer;
  const titles={
    menu:'Digital menu',
    detail:'Food details',
    tracking:'My orders',
    payment:'Payments & bill',
    reservations:'Table reservations',
    'table-select':'Choose your table',
    tables:'Table management',
    orders:'Order management',
    billing:'Bill management',
    kitchen:'Kitchen display',
    dashboard:'Overview & Analytics',
    manage:'Menu management'
  };

  const pendingServiceCount=(db.serviceCalls||[]).filter(s=>s.status==='pending').length;

  $('#app').innerHTML=`
    <div class="shell">
      <aside class="sidebar">
        ${brand()}
        <div class="navlabel">WORKSPACE</div>
        ${nav.map(n=>`
          <button class="navbutton ${screen===n[0]?'active':''}" onclick="go('${n[0]}')">
            ${icon(n[1])}${n[2]}
            ${(role==='Waiter'&&n[0]==='tables'&&pendingServiceCount)?`<span class="badge-soft badge-orange" style="margin-left:auto;font-size:9px">${pendingServiceCount}</span>`:''}
          </button>
        `).join('')}
        <div class="sidefoot">
          <div class="helpbox">
            ${icon('stars')}<br>
            <strong>Investor Pitch Tour</strong>
            <p>Explore this end-to-end restaurant OS demo across all operational roles.</p>
            ${b('Pitch Demo Tour '+icon('arrow-up-right'),'pitchTourModal()','btns full')}
          </div>
          <button class="navbutton" onclick="logout()">${icon('box-arrow-left')} Sign out</button>
          <small style="font-size:9px;padding-left:15px">URBAN PLATE OS · DEMO V2.4</small>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="crumb">Workspace <span style="margin:0 12px">/</span> <strong>${titles[screen]||'The Urban Plate'}</strong></div>
          <div class="topright">
            ${b(icon('stars')+' Pitch Demo','pitchTourModal()','btns pitchbtn')}
            <span class="live">Restaurant open</span>
            <select aria-label="Switch role" onchange="setRole(this.value)">
              ${Object.keys(navs).map(r=>`<option ${role===r?'selected':''}>${r}</option>`).join('')}
            </select>
            ${b(icon('bell'),'notifications()','iconbtn')}
            <div class="avatar">${role==='Owner'?'AK':role==='Waiter'?'AS':role==='Kitchen Staff'?'RK':'YU'}</div>
          </div>
        </header>
        <div class="content">
          ${({
            menu:menuScreen,
            detail:detailScreen,
            tracking:trackingScreen,
            payment:paymentScreen,
            reservations:reservationsScreen,
            'table-select':tableScreen,
            tables:tablesScreen,
            orders:ordersScreen,
            billing:billingScreen,
            kitchen:kitchenScreen,
            dashboard:dashboardScreen,
            manage:manageScreen
          }[screen]||menuScreen)()}
        </div>
      </main>
      <nav class="bottomnav">
        ${nav.map(n=>`<button class="${screen===n[0]?'active':''}" onclick="go('${n[0]}')">${icon(n[1])}${n[2]}</button>`).join('')}
        ${b(icon('arrow-left-right')+'Roles','switcher()','')}
      </nav>
    </div>
    ${screen==='menu'&&db.cart.length?b(icon('bag')+` ${db.cart.reduce((n,x)=>n+x.qty,0)} items · ${money(subtotal(db.cart))} <span style="margin-left:25px">View cart →</span>`,'cartDrawer()','cartfloat'):''}
  `;
}

function title(t,sub,act=''){
  return `<div class="titlebar"><div><h1>${t}</h1><p>${sub}</p></div>${act}</div>`;
}

function switcher(){
  modal(`
    <h2>Your workspace, your way.</h2>
    <p>Switch roles to follow an order through the restaurant.</p>
    ${Object.keys(navs).map(r=>b(r+icon('arrow-right'),`setRole('${r}')`,'btns full mb-2')).join('')}
  `);
}

function notifications(){
  let pending=(db.serviceCalls||[]).filter(s=>s.status==='pending');
  modal(`
    <h2>Activity & Alert Feed</h2>
    ${pending.length?`
      <div style="background:#fff7f2;border:1px solid #f8dfd1;padding:12px;border-radius:9px;margin-bottom:16px">
        <strong style="color:var(--accent);font-size:12px">${icon('bell-fill')} ${pending.length} Active Table Service Requests</strong>
        <p style="font-size:11px;margin:4px 0 0">Floor staff attention needed at tables: ${pending.map(p=>'T'+p.table).join(', ')}</p>
      </div>
    `:''}
    ${db.orders.slice().reverse().map(o=>`
      <div class="foodrow">
        <span class="avatar">${icon('receipt')}</span>
        <div>
          <strong>${o.id} · Table ${String(o.table).padStart(2,'0')}</strong>
          <small>${statuses[o.status]} · ${Math.floor((Date.now()-o.created)/60000)} min ago</small>
        </div>
      </div>
    `).join('')}
  `);
}

function pitchTourModal(){
  modal(`
    <div class="pitch-modal">
      <div class="eyebrow" style="color:var(--accent);font-weight:800">${icon('stars')} THE URBAN PLATE OS · INVESTOR DEMO WALKTHROUGH</div>
      <h2 style="font-size:24px;margin:8px 0 4px">The Next-Gen Operating System for Modern Dining</h2>
      <p style="font-size:12px;color:#6d7066;line-height:1.5">A unified, zero-hardware platform connecting diners, floor staff, kitchen operations, and restaurant owners in real time.</p>
      
      <div class="stats mt-3" style="grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
        <div class="cardbox stat" style="padding:12px 14px">
          <div class="stathead" style="font-size:10px">Table Turnaround</div>
          <div class="number" style="font-size:22px;color:var(--green);margin:6px 0">-28%</div>
          <div class="trend" style="font-size:9px">Faster seat rotation</div>
        </div>
        <div class="cardbox stat" style="padding:12px 14px">
          <div class="stathead" style="font-size:10px">Average Order Value</div>
          <div class="number" style="font-size:22px;color:var(--accent);margin:6px 0">+18.4%</div>
          <div class="trend" style="font-size:9px">Visual add-ons & upsells</div>
        </div>
        <div class="cardbox stat" style="padding:12px 14px">
          <div class="stathead" style="font-size:10px">POS Hardware Capex</div>
          <div class="number" style="font-size:22px;margin:6px 0">₹0</div>
          <div class="trend" style="font-size:9px">100% Browser native</div>
        </div>
      </div>

      <h3 style="font-size:14px;margin-bottom:6px">Interactive 4-Stage Demo Tour</h3>
      <p style="font-size:11px;color:#85887c;margin-bottom:12px">Click any stage below to jump straight into the role and experience the synchronized lifecycle:</p>

      <div class="pitch-steps">
        <div class="pitch-step" onclick="setRole('Customer');go('menu');closeModal()">
          <span class="step-num">1</span>
          <div>
            <strong>1. Customer QR Self-Order & Booking</strong>
            <small>Interactive photo menu, portion/spice customization, table reservations, live order tracker, and UPI bill payment.</small>
          </div>
          <button class="btns" style="font-size:11px;padding:7px 12px">Launch →</button>
        </div>
        <div class="pitch-step" onclick="setRole('Kitchen Staff');go('kitchen');closeModal()">
          <span class="step-num">2</span>
          <div>
            <strong>2. Kitchen Display System (KDS)</strong>
            <small>Zero paper tickets, live elapsed prep countdowns, overdue indicators, station routing, and kitchen chime notifications.</small>
          </div>
          <button class="btns" style="font-size:11px;padding:7px 12px">Launch →</button>
        </div>
        <div class="pitch-step" onclick="setRole('Waiter');go('tables');closeModal()">
          <span class="step-num">3</span>
          <div>
            <strong>3. Waiter Floor Station & Service Calls</strong>
            <small>Live table states (Available, Occupied, Billing), table service alerts (Water, Cutlery), and split billing.</small>
          </div>
          <button class="btns" style="font-size:11px;padding:7px 12px">Launch →</button>
        </div>
        <div class="pitch-step" onclick="setRole('Owner');go('dashboard');closeModal()">
          <span class="step-num">4</span>
          <div>
            <strong>4. Owner Executive Intelligence & Unit Economics</strong>
            <small>Real-time GMV, food cost margin (COGS: 35%), peak hour velocity, CSV export, and guest NPS reviews.</small>
          </div>
          <button class="btns" style="font-size:11px;padding:7px 12px">Launch →</button>
        </div>
      </div>

      <div class="flex between mt-3" style="padding-top:10px;border-top:1px solid #ebece4">
        <small style="font-size:10px;color:var(--muted)">Target Market: ₹38,000 Cr Dine-in Tech TAM · SaaS + FinTech</small>
        ${b('Close Tour','closeModal()','btnp')}
      </div>
    </div>
  `);
}

function renderLogin(){
  $('#app').innerHTML=`
    <main class="login">
      <section class="loginart">
        <img src="${photos.hero}" alt="Warm and inviting restaurant interior">
        ${brand()}
        <div class="loginquote">
          <div class="eyebrow" style="color:#d9d4b6">WELCOME TO THE URBAN PLATE</div>
          <h1>Good food.<br>Great company.<br>Seamless service.</h1>
          <p>A thoughtfully connected dining experience, from the first order to the last bite.</p>
          <small style="color:#c7d1bb">CRAFTED WITH CARE. SERVED WITH HEART.</small>
        </div>
      </section>
      <section class="loginpanel">
        <form class="loginform" onsubmit="event.preventDefault();login()">
          <span class="eyebrow">YOUR TABLE IS WAITING</span>
          <h1>Welcome back.</h1>
          <p>Make yourself at home. Choose your workspace.</p>
          <div class="roles">
            ${[['Customer','cup-hot'],['Waiter','person-badge'],['Kitchen Staff','fire'],['Owner','bar-chart']].map(r=>`
              <button type="button" class="role ${role===r[0]?'active':''}" onclick="chooseRole('${r[0]}')">
                ${icon(r[1])}${r[0]}
              </button>
            `).join('')}
          </div>
          <div class="field">
            <label for="username">Email or username</label>
            <input id="username" class="input" placeholder="you@urbanplate.com" autocomplete="username" value="${esc(localStorage.getItem('up-remember')||'')}">
          </div>
          <div class="field">
            <label for="password">Password</label>
            <div class="password">
              <input id="password" class="input" type="password" placeholder="Enter your password" autocomplete="current-password">
              <button class="iconbtn" type="button" aria-label="Show or hide password" onclick="let p=$('#password');p.type=p.type==='password'?'text':'password'">${icon('eye')}</button>
            </div>
          </div>
          <div class="flex between" style="margin:20px 0 25px;font-size:11px">
            <label><input id="remember" type="checkbox" style="accent-color:var(--accent)"> Remember me</label>
            <span class="muted">No password needed for demo</span>
          </div>
          <button class="btnp full" type="submit" style="padding:14px">
            Enter ${role==='Customer'?'restaurant':role==='Owner'?'dashboard':'workspace'} <span style="float:right">→</span>
          </button>
          <div class="demoinfo">
            ${icon('stars')} <strong>Investor Demo Mode:</strong> Choose any role above or click "Pitch Demo" anytime to explore the full lifecycle.
          </div>
          <p style="font-size:10px;text-align:center;margin-top:32px">THE URBAN PLATE · RESTAURANT OS V2.4</p>
        </form>
      </section>
    </main>
  `;
}

function login(){
  if($('#remember').checked)localStorage.setItem('up-remember',$('#username').value);
  else localStorage.removeItem('up-remember');
  setRole(role);
}

function menuScreen(){
  return `
    ${title(
      'Something delicious awaits.',
      'Freshly made. Thoughtfully served. Just for you.',
      `<div class="flex">
        ${b(icon('calendar-check')+' Book Table',"go('reservations')",'btns')}
        ${b(icon('qr-code')+'Table '+String(table).padStart(2,'0'),"go('table-select')",'btns')}
      </div>`
    )}
    
    <div class="menuhero">
      <img src="${photos.biryani}" alt="Fragrant biryani">
      <div class="eyebrow">CHEF'S SPECIAL SELECTION</div>
      <h1>Big on flavour.<br>Made with love.</h1>
      <p>Discover our artisanal hand-crafted creations, prepared fresh on order with handpicked farm spices.</p>
      <div class="flex mt-2">
        <span class="badge-soft">${icon('clock')} Open today · 11 AM – 11 PM</span>
        <span class="badge-soft badge-orange">${icon('geo-alt')} Table ${String(table).padStart(2,'0')} · Dine-in active</span>
      </div>
    </div>

    <div class="searchrow">
      <input type="search" placeholder="Search for your cravings (biryani, pizza, coffee)…" aria-label="Search menu" value="${esc(search)}" oninput="search=this.value;refreshFood()">
      <select class="sortselect" aria-label="Sort dishes" onchange="sortFilter=this.value;refreshFood()">
        <option ${sortFilter==='Recommended'?'selected':''}>Recommended</option>
        <option ${sortFilter==='Price: Low to High'?'selected':''}>Price: Low to High</option>
        <option ${sortFilter==='Price: High to Low'?'selected':''}>Price: High to Low</option>
        <option ${sortFilter==='Top Rated'?'selected':''}>Top Rated</option>
      </select>
      <span class="pagehint">${icon('geo-alt')} The Urban Plate · Flagship</span>
    </div>

    <div class="dietchips">
      ${['All','🌱 Pure Veg','🍗 Non-Veg','⭐ Bestsellers'].map(df=>`
        <button class="dietchip ${dietFilter===df?'active':''}" onclick="dietFilter='${df}';refreshFood()">${df}</button>
      `).join('')}
    </div>

    <div class="categories">
      ${['All items',...cats].map(c=>`
        <button class="chip ${c===category?'active':''}" onclick="category=${esc(JSON.stringify(c))};render()">${esc(c)}</button>
      `).join('')}
    </div>

    <div class="flex between mb-3">
      <h2 style="font-size:19px">${category==='All items'?'Handcrafted favourites':category}</h2>
      <span class="muted" style="font-size:11px">100% Fresh ingredients · Made to order</span>
    </div>

    <div class="foodgrid" id="foods">${foodCards()}</div>
  `;
}

function foodCards(){
  let list=db.menu.filter(x=>x.active&&(category==='All items'||x.cat===category)&&x.name.toLowerCase().includes(search.toLowerCase()));
  if(dietFilter==='🌱 Pure Veg')list=list.filter(x=>x.veg);
  else if(dietFilter==='🍗 Non-Veg')list=list.filter(x=>!x.veg);
  else if(dietFilter==='⭐ Bestsellers')list=list.filter(x=>x.best);

  if(sortFilter==='Price: Low to High')list.sort((a,b)=>a.price-b.price);
  else if(sortFilter==='Price: High to Low')list.sort((a,b)=>b.price-a.price);
  else if(sortFilter==='Top Rated')list.sort((a,b)=>b.rating-a.rating);

  return list.length?list.map(x=>`
    <article class="foodcard">
      <div class="foodphoto" role="button" tabindex="0" onclick="openFood(${x.id})" onkeydown="if(event.key==='Enter')openFood(${x.id})">
        <img src="${esc(x.img)}" alt="${esc(x.name)}" loading="lazy">
        ${x.best?badge('★ Bestseller'):''}
      </div>
      <div class="foodinfo">
        <small style="font-size:9px"><span class="veg ${x.veg?'':'nonveg'}"></span>${x.veg?'VEGETARIAN':'NON-VEGETARIAN'}</small>
        <h3><a href="#" onclick="event.preventDefault();openFood(${x.id})">${esc(x.name)}</a></h3>
        <div class="foodmeta">
          <span style="color:#8d8b4a">★ ${x.rating||'4.8'}</span>
          <span>·</span>
          <span>${x.time||20}–${(x.time||20)+5} min</span>
          <span>· ${esc(x.cat)}</span>
        </div>
        <div class="flex between">
          <strong class="price">${money(x.price)}</strong>
          ${b('ADD +',`quickAdd(${x.id})`,'addbtn')}
        </div>
      </div>
    </article>
  `).join(''):`<div class="empty">No dishes found matching your cravings. Try another keyword or filter.</div>`;
}

function refreshFood(){
  let el=$('#foods');
  if(el)el.innerHTML=foodCards();
}

function openFood(id){selected=id;detailQty=1;go('detail')}

function detailScreen(){
  let x=db.menu.find(x=>x.id===selected)||db.menu[0];
  return `
    ${b(icon('arrow-left')+'Back to menu',"go('menu')",'btns mb-4')}
    <div class="detail">
      <img src="${esc(x.img)}" alt="${esc(x.name)}">
      <section>
        <div class="eyebrow">${esc(x.cat)}</div>
        <h1 style="margin:16px 0">${esc(x.name)}</h1>
        <div class="flex">
          ${badge('★ '+(x.rating||'4.8'))}
          <span class="muted">${x.time||20} min prep · <span class="veg ${x.veg?'':'nonveg'}"></span>${x.veg?'Vegetarian':'Non-vegetarian'}</span>
        </div>
        <p style="margin:20px 0">${esc(x.desc)}</p>
        <h2>${money(x.price)}</h2>
        <div class="field">
          <label>Spice level</label>
          ${['Mild','Medium','Hot'].map((s,i)=>`
            <label class="choice"><input type="radio" name="spice" value="${s}" ${i===1?'checked':''}>${s}</label>
          `).join('')}
        </div>
        <div class="field">
          <label>Portion size</label>
          <select id="size" aria-label="Portion size">
            <option value="0">Regular portion</option>
            <option value="80">Large portion (+₹80)</option>
          </select>
        </div>
        <div class="field">
          <label>Chef's Add-ons</label>
          <label class="choice"><input class="addon" type="checkbox" value="40" data-name="Extra cheese">Extra artisan cheese +₹40</label>
          <label class="choice"><input class="addon" type="checkbox" value="30" data-name="Herbed Toppings">Herbed toppings +₹30</label>
          <label class="choice mt-2"><input class="addon" type="checkbox" value="60" data-name="Garlic bread accompaniment">Garlic bread +₹60</label>
        </div>
        <div class="field">
          <label for="note">Kitchen cooking notes</label>
          <textarea id="note" placeholder="Any allergy or culinary preference? (e.g. less oil, extra crispy, no onion)" rows="2"></textarea>
        </div>
        <div class="flex between mt-4">
          <div class="counter">
            <button aria-label="Decrease quantity" onclick="detailQty=Math.max(1,detailQty-1);$('#dq').textContent=detailQty">−</button>
            <span id="dq">1</span>
            <button aria-label="Increase quantity" onclick="detailQty++;$('#dq').textContent=detailQty">+</button>
          </div>
          ${b(icon('bag-plus')+'Add to cart','customAdd()')}
        </div>
      </section>
    </div>
  `;
}

function addItem(x,qty=1,extra=0,note=''){
  let key=x.id+'-'+extra+'-'+note,old=db.cart.find(i=>i.key===key);
  if(old)old.qty+=qty;
  else db.cart.push({key,id:x.id,name:x.name,img:x.img,price:+x.price+extra,qty,note});
  save();
  playChime('ding');
}

function quickAdd(id){
  addItem(db.menu.find(x=>x.id===id));
  render();
  toast('Deliciousness added to your order bag');
}

function customAdd(){
  let x=db.menu.find(x=>x.id===selected),addons=[...document.querySelectorAll('.addon:checked')];
  addItem(
    x,
    detailQty,
    +$('#size').value+addons.reduce((a,x)=>a+ +x.value,0),
    [$('input[name=spice]:checked').value+' spice',+$('#size').value?'Large':'Regular',...addons.map(x=>x.dataset.name),$('#note').value].filter(Boolean).join(' · ')
  );
  go('menu');
  cartDrawer();
}

function subtotal(items){return items.reduce((a,x)=>a+x.price*x.qty,0)}
function totals(items,discount=0,service=0,tipAmt=0){
  let sub=subtotal(items),off=sub*discount/100,charge=(sub-off)*service/100,tax=(sub-off+charge)*.05;
  return {sub,off,charge,tax,tip:tipAmt,total:sub-off+charge+tax+tipAmt};
}

function totalHtml(items,discount=0,service=0,tipAmt=0){
  let t=totals(items,discount,service,tipAmt);
  return `
    <div class="billline"><span>Subtotal</span><span>${money(t.sub)}</span></div>
    ${discount?`<div class="billline"><span>Discount (${discount}%)</span><span>− ${money(t.off)}</span></div>`:''}
    ${service?`<div class="billline"><span>Service charge (${service}%)</span><span>${money(t.charge)}</span></div>`:''}
    <div class="billline"><span>CGST · 2.5%</span><span>${money(t.tax/2)}</span></div>
    <div class="billline"><span>SGST · 2.5%</span><span>${money(t.tax/2)}</span></div>
    ${tipAmt?`<div class="billline" style="color:var(--accent);font-weight:700"><span>Staff Tip (Gratuity)</span><span>+ ${money(tipAmt)}</span></div>`:''}
    <div class="billline billtotal"><span>Total amount</span><span>${money(t.total)}</span></div>
  `;
}

function cartDrawer(){
  modal(`
    <div class="eyebrow">TABLE ${String(table).padStart(2,'0')} · LIVE ORDER BAG</div>
    <h2 class="mt-2">Your Good Food Bag</h2>
    <p>${db.cart.length} item(s) selected for your table</p>
    <div style="flex:1;max-height:360px;overflow:auto;margin:12px 0">
      ${db.cart.length?db.cart.map((x,i)=>`
        <div class="foodrow">
          <img src="${esc(x.img)}" alt="${esc(x.name)}">
          <div style="flex:1">
            <strong>${esc(x.name)}</strong>
            <small>${esc(x.note||'Chef special')}</small>
            <small style="font-weight:700;color:var(--dark)">${money(x.price)}</small>
            <div class="counter mt-2">
              <button onclick="cartQty(${i},-1)">−</button>
              <span>${x.qty}</span>
              <button onclick="cartQty(${i},1)">+</button>
            </div>
          </div>
          ${b(icon('trash'),`removeCart(${i})`,'iconbtn')}
        </div>
      `).join(''):'<div class="empty">Your order bag is currently empty. Explore the menu to pick dishes.</div>'}
    </div>
    ${totalHtml(db.cart)}
    ${b('Place order directly to kitchen '+icon('arrow-right'),'placeOrder()','btnp full')}
    <small style="text-align:center;margin-top:12px;color:var(--muted)">Instant kitchen routing · Zero wait time</small>
  `,true);
}

function cartQty(i,d){
  db.cart[i].qty=Math.max(1,db.cart[i].qty+d);
  save();
  cartDrawer();
}

function removeCart(i){
  db.cart.splice(i,1);
  save();
  cartDrawer();
  if(!db.cart.length)render();
}

function placeOrder(){
  if(!db.cart.length){toast('Add dishes to get started');return}
  let o={
    id:'UP'+(1044+db.orders.length-3),
    table,
    items:JSON.parse(JSON.stringify(db.cart)),
    status:0,
    created:Date.now(),
    priority:false
  };
  db.orders.push(o);
  activeOrder=o.id;
  db.cart=[];
  let tbl=db.tables.find(x=>x.id===table);
  if(tbl)tbl.status='occupied';
  save();
  playChime('ding');
  go('tracking');
  modal(`
    <div class="success">
      ${icon('check2')}
      <h2>Order Sent to Kitchen!</h2>
      <p>Order #${o.id} for Table ${String(table).padStart(2,'0')} has been sent directly to the live Kitchen Display System.</p>
      <div class="flex" style="justify-content:center;gap:12px;margin-top:20px">
        ${b('Track my live order','closeModal()')}
        ${b('View Kitchen KDS',"setRole('Kitchen Staff');closeModal()",'btns')}
      </div>
    </div>
  `);
}

function currentOrder(){
  return db.orders.find(o=>o.id===activeOrder)||db.orders.filter(o=>o.table===table&&o.status!==6).at(-1);
}

function orderItems(o,edit=false){
  return o.items.map((x,i)=>`
    <div class="foodrow">
      <div style="flex:1">
        <strong>${x.qty} × ${esc(x.name)}</strong>
        <small>${esc(x.note||'Freshly prepared')}</small>
      </div>
      ${edit?`
        <div class="counter">
          <button onclick="billQty('${o.id}',${i},-1)">−</button>
          <span>${x.qty}</span>
          <button onclick="billQty('${o.id}',${i},1)">+</button>
        </div>
        ${b(icon('trash'),`billRemove('${o.id}',${i})`,'iconbtn')}
      `:''}
      <span class="amount">${money(x.price*x.qty)}</span>
    </div>
  `).join('');
}

function requestService(type){
  if(!db.serviceCalls)db.serviceCalls=[];
  let sc={id:Date.now(),table,type,time:Date.now(),status:'pending'};
  db.serviceCalls.push(sc);
  db.history.push({text:`${type} requested at Table ${table}`,at:Date.now()});
  save();
  playChime('ding');
  toast(`Waiter Arjun notified: ${type} for Table ${table}`);
  render();
}

function resolveService(id){
  let sc=(db.serviceCalls||[]).find(s=>s.id===id);
  if(sc){
    sc.status='resolved';
    save();
    playChime('ding');
    toast(`Table ${sc.table} service request cleared`);
    render();
  }
}

function trackingScreen(){
  let o=currentOrder();
  if(!o)return title('Every good meal has a story.','Your live kitchen order will appear here.')+`
    <div class="cardbox empty">
      ${icon('bag')}
      <h2 class="mt-3">Your dining journey starts with an order.</h2>
      <p>Explore our handcrafted menu and order your favourite dishes.</p>
      ${b('Explore digital menu',"go('menu')")}
    </div>
  `;

  let elapsedMinutes=Math.floor((Date.now()-o.created)/60000);
  let estMinutes=Math.max(2,20-elapsedMinutes);

  return `
    ${title('Good things are cooking.',`Order #${o.id} · Table ${String(o.table).padStart(2,'0')}`,badge(o.status>=3?'Ready to Serve':`Est. ${estMinutes} min remaining`))}
    
    <div class="cardbox">
      <div class="flex between">
        <div>
          <h2 style="font-size:20px">${o.status>=4?statuses[o.status]:'Cooking fresh with care'}</h2>
          <small class="muted">Live status synchronized with kitchen display</small>
        </div>
        ${badge(statuses[o.status],o.status===2?'badge-orange':o.status>=3?'':'')}
      </div>

      <div class="progresssteps">
        ${statuses.slice(0,4).map((s,i)=>`
          <div class="step ${o.status>=i?'done':''}">
            ${icon(['check2','clipboard-check','fire','bell'][i])}
            ${s}
          </div>
        `).join('')}
      </div>

      ${orderItems(o)}
      ${totalHtml(o.items)}

      <div class="flex mt-3" style="flex-wrap:wrap;gap:10px">
        ${b(icon('arrow-repeat')+' Simulate next kitchen stage',`advance('${o.id}')`,'btns')}
        ${b(icon('receipt')+' Request bill',`requestBill('${o.id}')`)}
      </div>
      <p style="font-size:10px;margin:15px 0 0;color:var(--muted)">Demo controls allow you to step through Kitchen KDS and Waiter states in real time.</p>
    </div>

    <div class="cardbox mt-4">
      <div class="flex between mb-2">
        <h3>${icon('bell')} Quick Table Assistance</h3>
        <span class="muted" style="font-size:11px">Table ${String(table).padStart(2,'0')} · Assigned to Arjun</span>
      </div>
      <p style="font-size:11px;margin-bottom:14px">One tap to alert the floor staff without waiting or calling out:</p>
      <div class="quick-service-grid">
        <button class="service-action-btn" onclick="requestService('Water Refill')">${icon('droplet')} Water Refill</button>
        <button class="service-action-btn" onclick="requestService('Extra Cutlery & Napkins')">${icon('slash-circle')} Cutlery & Napkins</button>
        <button class="service-action-btn" onclick="requestService('Clear Table')">${icon('stars')} Clear Table</button>
        <button class="service-action-btn" onclick="requestService('Call Waiter')">${icon('person-raised-hand')} Call Waiter</button>
      </div>
    </div>

    <h2 class="mt-4" style="font-size:18px">Table Order History</h2>
    ${db.orders.filter(x=>x.table===table&&x.id!==o.id).map(x=>`
      <div class="cardbox flex between mt-2">
        <span>#${x.id} · ${statuses[x.status]}</span>
        <strong>${money(totals(x.items).total)}</strong>
      </div>
    `).join('')||'<p style="font-size:12px;color:var(--muted)">No previous orders at this table.</p>'}
  `;
}

function advance(id){
  let o=db.orders.find(x=>x.id===id);
  if(o.status<4){
    o.status++;
    save();
    playChime('ding');
    render();
    toast('Order updated: '+statuses[o.status]);
  }else toast('This order has already been served');
}

function assistance(){
  requestService('Call Waiter');
}

function requestBill(id){
  let t=db.tables.find(x=>x.id===table);
  if(t)t.status='billing';
  save();
  go('payment');
}

function receiptOrder(){
  return role==='Waiter'?db.orders.filter(x=>x.table===table&&x.status!==6).at(-1):currentOrder();
}

function paymentScreen(){return billingContent(false)}
function billingScreen(){return billingContent(true)}

function billingContent(edit){
  let o=receiptOrder();
  return title(
    edit?'Guest Billing & Settlement.':'The Final Little Detail.',
    edit?'Generate, split, and settle table checks in real time.':'Thank you for sharing your meal with us at The Urban Plate.',
    edit?`<select aria-label="Select table" onchange="table=+this.value;coupon=0;tip=0;render()">${db.tables.map(t=>`<option value="${t.id}" ${table===t.id?'selected':''}>Table ${String(t.id).padStart(2,'0')}</option>`).join('')}</select>`:''
  )+(!o?`
    <div class="cardbox empty">
      ${icon('receipt')}
      <h2 class="mt-3">No active bill to settle.</h2>
      <p>${edit?'Select an occupied table with active orders.':'Your bill will be ready once you order from the menu.'}</p>
      ${b(edit?'View floor tables':'Browse menu',edit?"go('tables')":"go('menu')")}
    </div>
  `:`
    <div class="receipt cardbox" id="receipt">
      <div class="receiptlogo">
        ${brand()}
        <p class="mt-3 mb-1">Lucknow · Fresh Flavours, Seamless Experience</p>
        <small>Table ${String(table).padStart(2,'0')} · Bill #${o.id} · ${new Date(o.created).toLocaleDateString('en-IN')}</small>
      </div>

      ${o.status===5?`
        <div class="success">
          ${icon('check2')}
          <h2>Paid & Settled!</h2>
          <p>Payment completed via ${esc(o.method)} · Thank you!</p>
          <div class="transaction-id">${o.transaction}</div>
        </div>
      `:''}

      ${orderItems(o,edit&&o.status!==5)}
      ${totalHtml(o.items,o.status===5?o.discount:coupon,o.status===5?o.service:(edit?5:0),o.status===5?o.tip:tip)}

      ${o.status!==5?`
        <div class="field mt-3">
          <label>${edit?'Discount percentage applied':'Promo / Coupon code'}</label>
          <div class="flex">
            <input class="input" id="coupon" placeholder="${edit?'Enter discount % (e.g. 10)':'Use coupon URBAN10 for 10% off'}" ${edit?'type="number" min="0" max="50"':''}>
            ${b('Apply',`applyCoupon(${edit})`,'btns')}
          </div>
        </div>

        ${!edit?`
          <div class="field mt-3">
            <label>${icon('heart')} Add a token of appreciation for the service team?</label>
            <div class="tip-options">
              ${[0,30,50,100,200].map(amt=>`
                <button type="button" class="chip ${tip===amt?'active':''}" onclick="tip=${amt};render()">${amt===0?'No Tip':money(amt)}</button>
              `).join('')}
            </div>
          </div>
        `:''}

        <div class="paymentchoice">
          ${['UPI','Cash','Card','Split Payment'].map(m=>`
            <label class="choice">
              <input type="radio" name="method" ${payMethod===m?'checked':''} onchange="payMethod='${m}';render()">
              ${m}
            </label>
          `).join('')}
        </div>

        ${payMethod==='Split Payment'?`
          <div class="field" style="background:#f9f9f5;padding:14px;border-radius:9px">
            <label>Split evenly between guests</label>
            <input id="splitGuests" class="input" type="number" min="2" max="20" value="2" oninput="$('#splitAmount').textContent=money(${totals(o.items,coupon,edit?5:0,tip).total}/Math.max(2,+this.value))">
            <p class="mt-2" style="font-size:12px;color:var(--dark)">Each guest pays: <strong id="splitAmount" style="font-size:16px;color:var(--accent)">${money(totals(o.items,coupon,edit?5:0,tip).total/2)}</strong></p>
          </div>
        `:''}

        ${b(edit?'Mark bill as paid':'Pay '+money(totals(o.items,coupon,0,tip).total),`pay('${o.id}',${edit})`,'btnp full mt-3')}
        ${edit?b('Generate print-ready invoice','toast(\'Invoice prepared\');window.print()','btns full mt-2'):''}
        <small style="display:block;text-align:center;margin-top:12px;color:var(--muted)">Demo settlement · No actual card/bank charges occur</small>
      `:''}

      <div class="flex mt-3">
        ${b(icon('printer')+' Print receipt','window.print()','btns full')}
        ${b(icon('download')+' Download TXT',`downloadBill('${o.id}')`,'btns full')}
      </div>
    </div>
  `);
}

function applyCoupon(edit){
  let v=$('#coupon').value.trim();
  if(edit){
    if(!v||+v<0||+v>50){toast('Enter discount between 0 and 50%');return}
    coupon=+v;
  }else{
    if(v.toUpperCase()!=='URBAN10'){toast('Use promo code URBAN10 for 10% off');return}
    coupon=10;
  }
  render();
  playChime('ding');
  toast('10% discount applied successfully!');
}

function billQty(id,i,d){
  let o=db.orders.find(x=>x.id===id);
  o.items[i].qty=Math.max(1,o.items[i].qty+d);
  save();render();
}

function billRemove(id,i){
  modal(`
    <h2>Remove item from bill?</h2>
    <p>This will update the table's total balance.</p>
    ${b('Remove item',`confirmRemove('${id}',${i})`)} ${b('Keep dish','closeModal()','btns')}
  `);
}

function confirmRemove(id,i){
  db.orders.find(x=>x.id===id).items.splice(i,1);
  save();closeModal();render();
}

function pay(id,edit){
  let o=db.orders.find(x=>x.id===id);
  if(!o.items.length){toast('Cannot pay an empty bill');return}
  o.discount=coupon;
  o.service=edit?5:0;
  o.tip=tip;
  o.status=5;
  o.transaction='TXN'+Date.now().toString().slice(-8);
  o.method=payMethod;
  o.paidTotal=totals(o.items,coupon,edit?5:0,tip).total;
  db.payments.push({id:o.transaction,order:id,amount:o.paidTotal,method:payMethod,date:Date.now(),table:o.table});
  let tbl=db.tables.find(t=>t.id===o.table);
  if(tbl)tbl.status='available';
  save();
  playChime('ding');
  render();

  modal(`
    <div class="success">
      ${icon('check2')}
      <h2>Meal Settled Perfectly!</h2>
      <p>Payment of ${money(o.paidTotal)} was successful via ${payMethod}.<br>Thank you for dining at The Urban Plate.</p>
      <div class="transaction-id" style="margin:8px 0">${o.transaction}</div>
      
      <div class="cardbox mt-4" style="text-align:left;background:#fbfbf7">
        <h3 style="font-size:15px;margin-bottom:6px">${icon('star-fill')} How was your dining experience?</h3>
        <p style="font-size:11px;margin-bottom:12px;color:var(--muted)">Your feedback goes directly to our executive chef and floor managers.</p>
        
        <div class="star-rating mb-3" id="starrating">
          ${[1,2,3,4,5].map(st=>`
            <button type="button" class="starbtn ${st<=reviewRating?'active':''}" onclick="setRating(${st})"><i class="bi bi-star-fill"></i></button>
          `).join('')}
        </div>
        
        <div class="feedback-tags mb-3">
          ${['Flavourful Food','Lightning Service','Lovely Ambience','Courteous Staff'].map(tg=>`
            <label class="choice" style="font-size:10px;margin-bottom:6px"><input type="checkbox" class="feedtag" value="${tg}"> ${tg}</label>
          `).join('')}
        </div>
        
        <textarea id="feedbacknote" class="input" rows="2" placeholder="Any compliments or suggestions for our culinary team?"></textarea>
        ${b('Submit review & return to menu',`submitFeedback('${o.id}')`,'btnp full mt-3')}
      </div>
      
      <div class="mt-3">${b('Close receipt','closeModal()','btns full')}</div>
    </div>
  `);
}

function setRating(r){
  reviewRating=r;
  $$('#starrating .starbtn').forEach((btn,i)=>{
    if(i<r)btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function submitFeedback(orderId){
  let note=$('#feedbacknote')?.value?.trim()||'Exquisite food and memorable service.';
  let selectedTags=[...$$('.feedtag:checked')].map(t=>t.value);
  if(!selectedTags.length)selectedTags=['Flavourful Food','Lightning Service'];
  
  if(!db.reviews)db.reviews=[];
  db.reviews.unshift({
    id:'REV-'+Date.now().toString().slice(-4),
    name:'Table '+String(table).padStart(2,'0')+' Diner',
    rating:reviewRating,
    tags:selectedTags,
    comment:note,
    date:'Just now'
  });
  save();
  playChime('ding');
  closeModal();
  toast('Thank you for your feedback! It helps us shine.');
}

function downloadBill(id){
  let o=db.orders.find(x=>x.id===id),t=totals(o.items,o.discount??coupon,o.service??(role==='Waiter'?5:0),o.tip??tip);
  let txt=[
    '==============================',
    '       THE URBAN PLATE',
    '  Good Food. Seamless Service.',
    '==============================',
    'Order: '+o.id+' | Table: '+o.table,
    'Date: '+new Date(o.created).toLocaleString('en-IN'),
    '------------------------------',
    ...o.items.map(x=>x.qty+' x '+x.name.padEnd(20)+' '+money(x.price*x.qty)),
    '------------------------------',
    'Subtotal:       '+money(t.sub),
    'Discount:       −'+money(t.off),
    'CGST (2.5%):    '+money(t.tax/2),
    'SGST (2.5%):    '+money(t.tax/2),
    (t.charge?'Service charge: '+money(t.charge):''),
    (t.tip?'Staff Gratuity: '+money(t.tip):''),
    '------------------------------',
    'TOTAL PAID:     '+money(o.paidTotal||t.total),
    'Payment Method: '+(o.method||payMethod),
    'Txn ID:         '+(o.transaction||'DEMO-UNPAID'),
    '==============================',
    'Thank you for dining with us!'
  ].filter(Boolean).join('\n');

  let a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain;charset=utf-8'}));
  a.download=o.id+'-receipt.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

// -------------------------------------------------------------
// RESERVATIONS SYSTEM (Missing Screen Added)
// -------------------------------------------------------------
function reservationsScreen(){
  let isStaff=role==='Waiter'||role==='Owner';
  let activeRes=db.reservations||[];

  return `
    ${title(
      isStaff?'Floor Reservations Management':'Book Your Table in Seconds',
      isStaff?'Track guest bookings, seating allocations, and arrivals.':'Reserve a curated dining experience for you and your guests.',
      !isStaff?b(icon('plus-lg')+' New Booking',"$('#resname')?.focus()",'btns'):b(icon('arrow-repeat')+' Floor Map',"go('tables')",'btns')
    )}

    ${isStaff?`
      <div class="stats mb-4">
        ${[
          ['Total bookings',activeRes.length,'calendar-check'],
          ['Guests expected',activeRes.reduce((a,r)=>a+(+r.guests||2),0),'people'],
          ['Rooftop tables',activeRes.filter(r=>r.area==='Rooftop Garden').length,'sun'],
          ['Special occasions',activeRes.filter(r=>r.occasion!=='Casual Dining').length,'gift']
        ].map(x=>`
          <div class="cardbox stat">
            <div class="stathead">${x[0]}${icon(x[2])}</div>
            <div class="number">${x[1]}</div>
          </div>
        `).join('')}
      </div>
    `:''}

    <div class="res-grid">
      <section class="cardbox">
        <div class="flex between mb-3">
          <h2 style="font-size:19px">Reserve a Table</h2>
          <span class="badge-soft badge-orange">Instant Confirmation</span>
        </div>
        <p style="font-size:11px;color:var(--muted);margin-bottom:18px">Skip the line and enjoy seamless table assignment on arrival.</p>

        <form onsubmit="event.preventDefault();bookReservation()">
          <div class="field">
            <label>Select Date</label>
            <div class="slot-chips mb-2">
              ${[
                ['Today',new Date().toISOString().slice(0,10)],
                ['Tomorrow',new Date(Date.now()+86400000).toISOString().slice(0,10)],
                ['Weekend',new Date(Date.now()+2*86400000).toISOString().slice(0,10)]
              ].map(d=>`
                <button type="button" class="slot-btn ${resDate===d[1]?'active':''}" onclick="resDate='${d[1]}';render()">${d[0]}</button>
              `).join('')}
            </div>
            <input type="date" id="resdate" class="input" value="${resDate}" onchange="resDate=this.value">
          </div>

          <div class="field">
            <label>Dining Time Slot</label>
            <div class="slot-chips">
              ${['12:30 PM','1:30 PM','2:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM','9:30 PM'].map(t=>`
                <button type="button" class="slot-btn ${resTime===t?'active':''}" onclick="resTime='${t}';render()">${t}</button>
              `).join('')}
            </div>
          </div>

          <div class="row">
            <div class="field col-6">
              <label>Party Size</label>
              <select id="resguests" class="input" onchange="resGuests=+this.value">
                ${[1,2,3,4,5,6,8,10,12].map(g=>`<option value="${g}" ${resGuests===g?'selected':''}>${g} ${g===1?'Guest':'Guests'}</option>`).join('')}
              </select>
            </div>
            <div class="field col-6">
              <label>Seating Preference</label>
              <select id="resarea" class="input" onchange="resArea=this.value">
                ${['Rooftop Garden','Window View','Indoor Main Hall','Private Dining Booth'].map(a=>`<option ${resArea===a?'selected':''}>${a}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="field">
            <label>Occasion (Optional)</label>
            <select id="resoccasion" class="input">
              <option>Casual Dining</option>
              <option>Birthday Celebration</option>
              <option>Anniversary Dinner</option>
              <option>Business Meeting</option>
              <option>Romantic Date</option>
            </select>
          </div>

          <div class="field">
            <label>Guest Full Name</label>
            <input id="resname" class="input" placeholder="e.g. Aryan Mehra" required maxlength="50">
          </div>

          <div class="field">
            <label>Phone Number (for SMS & WhatsApp pass)</label>
            <input id="resphone" class="input" placeholder="+91 98765 00000" required>
          </div>

          <div class="field">
            <label>Special Culinary or Table Notes</label>
            <input id="resnotes" class="input" placeholder="e.g. High chair needed, quiet corner, flower arrangement">
          </div>

          <button class="btnp full mt-3" type="submit" style="padding:13px">
            Confirm Table Reservation ${icon('arrow-right')}
          </button>
        </form>
      </section>

      <section>
        <div class="cardbox">
          <div class="flex between mb-3">
            <h2 style="font-size:18px">Active Reservations</h2>
            <span class="badge-soft">${activeRes.length} Bookings</span>
          </div>

          <div class="reslist">
            ${activeRes.map(r=>`
              <div class="cardbox mb-3" style="border-left:4px solid var(--accent);padding:14px">
                <div class="flex between">
                  <strong>${esc(r.name)}</strong>
                  ${badge(r.status||'Confirmed')}
                </div>
                <p style="font-size:11px;margin:6px 0">
                  ${icon('calendar')} ${r.date} · ${icon('clock')} ${r.time} · ${icon('people')} ${r.guests} guests
                </p>
                <div class="flex between mt-2" style="font-size:11px">
                  <span class="muted">${icon('geo-alt')} ${r.area} · Table ${r.table}</span>
                  <small style="color:var(--accent);font-weight:700">${r.occasion}</small>
                </div>
                ${isStaff?`
                  <div class="flex mt-3" style="gap:8px">
                    ${b(icon('check2')+' Seat Guest',`checkinGuest('${r.id}',${r.table})`,'btnp full')}
                    ${b(icon('x-lg')+' Cancel',`cancelReservation('${r.id}')`,'btns full')}
                  </div>
                `:''}
              </div>
            `).join('')||'<div class="empty"><p>No reservations found. Book your table now!</p></div>'}
          </div>
        </div>
      </section>
    </div>
  `;
}

function bookReservation(){
  let name=$('#resname').value.trim();
  let phone=$('#resphone').value.trim();
  let notes=$('#resnotes').value.trim();
  let occasion=$('#resoccasion').value;
  if(!name){toast('Please provide your name');return}
  if(!phone){toast('Please provide your phone number');return}

  // Find suitable available table or default
  let openTable=db.tables.find(t=>t.status==='available')||db.tables[5];
  let newRes={
    id:'RES-'+(8040+db.reservations.length+1),
    name,
    phone,
    guests:resGuests,
    date:resDate,
    time:resTime,
    area:resArea,
    occasion,
    notes,
    table:openTable.id,
    status:'Confirmed',
    created:Date.now()
  };

  openTable.status='reserved';
  db.reservations.unshift(newRes);
  save();
  playChime('ding');
  render();

  modal(`
    <div class="success">
      ${icon('check2')}
      <h2>Reservation Confirmed!</h2>
      <p>Table ${String(openTable.id).padStart(2,'0')} (${resArea}) has been reserved for <strong>${esc(name)}</strong> on ${resDate} at ${resTime}.</p>
      <div class="cardbox mt-3" style="text-align:left;background:#fbfbf8">
        <div class="flex between">
          <strong>Booking Code</strong>
          <span style="font-family:monospace;font-weight:800;color:var(--accent)">${newRes.id}</span>
        </div>
        <div class="billline"><span>Guests</span><span>${resGuests} guests</span></div>
        <div class="billline"><span>Seating Zone</span><span>${resArea}</span></div>
        <div class="billline"><span>Occasion</span><span>${occasion}</span></div>
      </div>
      <div class="flex mt-4" style="justify-content:center;gap:12px">
        ${b('Browse Digital Menu',"go('menu')")}
        ${b('Close','closeModal()','btns')}
      </div>
    </div>
  `);
}

function checkinGuest(id,tableNum){
  let r=db.reservations.find(x=>x.id===id);
  if(r)r.status='Seated';
  let t=db.tables.find(x=>x.id===tableNum);
  if(t)t.status='occupied';
  save();
  playChime('ding');
  toast(`Guest ${r?.name||''} seated at Table ${tableNum}`);
  render();
}

function cancelReservation(id){
  db.reservations=db.reservations.filter(x=>x.id!==id);
  save();
  toast('Reservation cancelled');
  render();
}

// -------------------------------------------------------------
// TABLE SELECTION & FLOOR OPS
// -------------------------------------------------------------
function tableScreen(){
  return title('Find your happy place.','Select your table to open its digital menu.')+`
    <div class="tablegrid">
      ${db.tables.map(t=>`
        <button class="cardbox tablecard ${t.status}" onclick="selectTable(${t.id})">
          <span class="badge-soft">${icon('qr-code')}</span>
          <div class="tablenum">${String(t.id).padStart(2,'0')}</div>
          <p>Table ${String(t.id).padStart(2,'0')} · ${t.id===table?'Your current table':'Tap to browse menu'}</p>
          <span class="muted" style="font-size:10px">urbanplate / ?table=${t.id}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function selectTable(id){
  table=id;
  activeOrder=null;
  let u=new URL(location);
  u.searchParams.set('table',id);
  history.replaceState({},'',u);
  go('menu');
  playChime('ding');
  toast('You’re seated at Table '+String(id).padStart(2,'0'));
}

function serviceAlertsHtml(){
  let pending=(db.serviceCalls||[]).filter(s=>s.status==='pending');
  if(!pending.length)return '';
  return `
    <div class="servicebanner cardbox mb-4">
      <div class="flex between">
        <div>
          <strong style="color:var(--accent);font-size:13px">${icon('bell-fill')} Live Table Service Requests (${pending.length} pending)</strong>
          <p style="font-size:11px;margin:3px 0 0">Guests need quick assistance at their tables.</p>
        </div>
        <span class="badge-soft badge-orange">Real-time floor sync</span>
      </div>
      <div class="servicelist mt-3">
        ${pending.map(c=>`
          <div class="foodrow between" style="padding:10px 0">
            <div>
              <strong>Table ${String(c.table).padStart(2,'0')} · ${esc(c.type)}</strong>
              <small>${Math.floor((Date.now()-c.time)/60000)} min ago</small>
            </div>
            ${b(icon('check2')+' Resolve',`resolveService(${c.id})`,'btnp')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function tablesScreen(){
  let count=s=>db.tables.filter(t=>t.status===s).length;
  return `
    ${title('Great service starts here.','A live overview of floor seating, server assignments, and active orders.',b(icon('plus-lg')+'New order',"newOrder(5)"))}
    ${serviceAlertsHtml()}
    <div class="stats">
      ${[
        ['Available',count('available'),'grid'],
        ['Occupied',count('occupied'),'people'],
        ['Reserved',count('reserved'),'calendar-check'],
        ['Billing requested',count('billing'),'receipt']
      ].map(x=>`
        <div class="cardbox stat">
          <div class="stathead">${x[0]}${icon(x[2])}</div>
          <div class="number">${x[1]}</div>
        </div>
      `).join('')}
    </div>

    <div class="searchrow">
      <input type="search" placeholder="Find a table…" aria-label="Search tables" oninput="search=this.value;$('#tablegrid').innerHTML=tableCards()">
      <select aria-label="Filter table status" onchange="filter=this.value;render()">
        ${['All','Available','Occupied','Reserved','Billing'].map(s=>`<option ${filter===s?'selected':''}>${s}</option>`).join('')}
      </select>
      <span class="live">Live floor overview</span>
    </div>

    <div class="tablegrid" id="tablegrid">${tableCards()}</div>
  `;
}

function tableCards(){
  return db.tables.filter(t=>(filter==='All'||t.status===filter.toLowerCase())&&String(t.id).padStart(2,'0').includes(search)).map(t=>{
    let orders=db.orders.filter(o=>o.table===t.id&&o.status<5);
    return `
      <button class="cardbox tablecard ${t.status}" onclick="tableDetail(${t.id})">
        <div class="flex between">
          ${badge(t.status==='billing'?'Bill requested':t.status,t.status==='occupied'?'badge-orange':'')}
          ${icon('three-dots')}
        </div>
        <div class="tablenum">T${String(t.id).padStart(2,'0')}</div>
        <p>${icon('people')} ${t.guests||2} guests <span style="float:right">${orders.length?Math.floor((Date.now()-orders[0].created)/60000)+' min':'—'}</span></p>
        <div class="flex between">
          <strong>${orders.length?money(orders.reduce((a,o)=>a+subtotal(o.items),0)):'Ready for guests'}</strong>
          <small>${t.waiter}</small>
        </div>
      </button>
    `;
  }).join('');
}

function tableDetail(id){
  table=id;
  let t=db.tables.find(t=>t.id===id);
  modal(`
    <span class="eyebrow">FLOOR OVERVIEW</span>
    <h2 class="mt-2">Table ${String(id).padStart(2,'0')}</h2>
    <p>${t.status} · ${t.guests||2} guests</p>
    <div class="field">
      <label>Assign waiter</label>
      <select id="waiter">${['Arjun','Neha','Rahul','Priya'].map(w=>`<option ${w===t.waiter?'selected':''}>${w}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label>Table status</label>
      <select id="tstatus">${['available','occupied','reserved','billing'].map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}</select>
    </div>
    <div class="field">
      <label>Number of guests</label>
      <input id="guests" class="input" type="number" min="1" max="12" value="${t.guests||2}">
    </div>
    ${b('Save table',`saveTable(${id})`,'btnp full')}
    ${b('Start new order',`newOrder(${id})`,'btns full mt-2')}
    ${b('View bill',"go('billing')",'btns full mt-2')}
  `);
}

function saveTable(id){
  let t=db.tables.find(t=>t.id===id);
  t.waiter=$('#waiter').value;
  t.status=$('#tstatus').value;
  t.guests=+$('#guests').value;
  save();closeModal();render();toast('Table updated');
}

function newOrder(id){
  table=id;
  role='Customer';
  go('menu');
  toast('Taking an order for Table '+id);
}

// -------------------------------------------------------------
// ORDERS & KITCHEN KDS
// -------------------------------------------------------------
function ordersScreen(){
  return `
    ${title('Every order, in good hands.','Keep kitchen tickets and floor service in absolute sync.')}
    ${serviceAlertsHtml()}
    <div class="searchrow">
      <input type="search" aria-label="Search orders" placeholder="Search order or table…" oninput="search=this.value;$('#orderlist').innerHTML=orderCards()">
      <select aria-label="Order status" onchange="filter=this.value;render()">
        ${['All',...statuses.slice(0,6),'Rejected'].map(s=>`<option ${filter===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="orderlist" id="orderlist">${orderCards()}</div>
  `;
}

function orderCards(){
  return db.orders.filter(o=>(filter==='All'||statuses[o.status]===filter)&&(o.id.toLowerCase().includes(search.toLowerCase())||String(o.table).includes(search))).slice().reverse().map(o=>`
    <div class="ordercard ${o.priority?'priority':''}">
      <div class="flex between">
        <strong>#${o.id} · T${String(o.table).padStart(2,'0')}</strong>
        ${badge(statuses[o.status],o.status===0?'badge-orange':'')}
      </div>
      <p>${Math.floor((Date.now()-o.created)/60000)} min ago ${o.priority?'· <span style="color:#bd5738">Priority order</span>':''}</p>
      ${orderItems(o)}
      <div class="flex between mt-3">
        <strong>${money(subtotal(o.items))}</strong>
        <div class="flex">
          ${o.status===0?b('Reject',`rejectOrder('${o.id}')`,'btns')+b('Accept',`statusOrder('${o.id}',1)`):o.status<4?b(o.status===3?'Mark served':'Kitchen update',o.status===3?`statusOrder('${o.id}',4)`:`kitchenUpdate('${o.id}')`):badge(statuses[o.status])}
        </div>
      </div>
      ${o.status<5?`<div class="mt-3">${b('+ Add dishes',`addToExisting('${o.id}')`,'btns')}</div>`:''}
    </div>
  `).join('')||'<div class="empty">No orders match your search.</div>';
}

function statusOrder(id,s){
  let o=db.orders.find(o=>o.id===id);
  o.status=s;
  save();
  playChime('ding');
  render();
  toast('#'+id+' · '+statuses[s]);
}

function rejectOrder(id){
  modal(`
    <h2>Reject this order?</h2>
    <p>The order will leave the active kitchen queue.</p>
    ${b('Reject order',`closeModal();statusOrder('${id}',6)`)} ${b('Keep order','closeModal()','btns')}
  `);
}

function kitchenUpdate(id){
  db.history.push({text:'Kitchen update requested for '+id,at:Date.now()});
  save();toast('Kitchen has been asked for an update on #'+id);
}

function addToExisting(id){
  modal(`
    <h2>Add extra dishes</h2>
    <p>Add an item to order #${id}.</p>
    <select id="additional">${db.menu.filter(x=>x.active).map(x=>`<option value="${x.id}">${esc(x.name)} · ${money(x.price)}</option>`).join('')}</select>
    ${b('Add to order',`appendItem('${id}')`,'btnp full mt-3')}
  `);
}

function appendItem(id){
  let x=db.menu.find(x=>x.id===+$('#additional').value),o=db.orders.find(x=>x.id===id);
  o.items.push({id:x.id,name:x.name,price:x.price,qty:1,note:'Added by waiter'});
  o.status=0;
  save();closeModal();render();toast('Dish added and kitchen notified');
}

function kitchenScreen(){
  let groups=[[0,1],[2],[3]];
  return title(
    'A little heat. A lot of heart.',
    'Live kitchen display system (KDS) — dispatching tickets with zero lag.',
    `<div class="flex">
      ${b(icon(sound?'volume-up':'volume-mute'),"sound=!sound;render()",'iconbtn')}
      ${b(auto?'Pause demo':'Auto demo',"auto=!auto;render()",'btns')}
    </div>`
  )+`
    <div class="flex between mb-4">
      <span class="live">${db.orders.filter(o=>o.status<4).length} active tickets · Live Kitchen Sync</span>
      <small>Auto demo ${auto?'on · advances stages every 15s':'off'}</small>
    </div>
    <div class="kanban">
      ${groups.map((g,j)=>`
        <section class="kanbancol">
          <div class="flex between">
            <h3>${['New Orders','Preparing','Ready to Serve'][j]}</h3>
            ${badge(db.orders.filter(o=>g.includes(o.status)).length+' tickets')}
          </div>
          ${db.orders.filter(o=>g.includes(o.status)).map(o=>`
            <article class="ordercard ${o.priority?'priority':''}">
              <div class="flex between">
                <h3>T${String(o.table).padStart(2,'0')}</h3>
                <small>#${o.id}</small>
              </div>
              <p>
                ${o.priority?'⚑ PRIORITY · ':''}
                <span class="timer" data-created="${o.created}">${Math.floor((Date.now()-o.created)/60000)} min</span>
                ${Date.now()-o.created>20*60000?'<span class="badge-red">· Overdue</span>':''}
              </p>
              <ul>
                ${o.items.map(x=>`
                  <li>
                    <strong>${x.qty} × ${esc(x.name)}</strong>
                    ${x.note?`<small style="display:block;color:#b57d5d">${esc(x.note)}</small>`:''}
                  </li>
                `).join('')}
              </ul>
              ${b(
                o.status===0?'Accept order':o.status===1?'Start preparing':o.status===2?'Mark as ready':'Waiting for service',
                o.status<3?`statusOrder('${o.id}',${o.status+1})`:`toast('Floor staff will collect and serve')`,
                j===2?'btns full':'btnp full'
              )}
            </article>
          `).join('')||'<div class="empty"><p>A clear board. A happy kitchen.</p></div>'}
        </section>
      `).join('')}
    </div>
  `;
}

setInterval(()=>{
  document.querySelectorAll('.timer').forEach(e=>e.textContent=Math.floor((Date.now()-e.dataset.created)/60000)+' min');
  if(auto&&screen==='kitchen'){
    let o=db.orders.find(x=>x.status<3);
    if(o)statusOrder(o.id,o.status+1);
  }
},15000);

// -------------------------------------------------------------
// OWNER DASHBOARD & INVESTOR INTELLIGENCE
// -------------------------------------------------------------
function dashboardScreen(){
  let now=new Date().toISOString().slice(0,10),date=window.reportDate||now,mult=period==='Week'?6.4:1,base=date===now?42850:38120;
  let paid=db.payments.filter(p=>new Date(p.date).toISOString().slice(0,10)===date);
  let revenue=Math.round(base*mult)+paid.reduce((a,p)=>a+p.amount,0);
  let n=Math.round((date===now?128:114)*mult)+paid.length;
  let reviews=db.reviews||[];

  return `
    ${title(
      'A good day, on a plate.',
      'Welcome back, Aditya. Real-time metrics for The Urban Plate.',
      `<div class="flex">
        <input type="date" class="input" style="width:150px;font-size:11px" aria-label="Report date" value="${date}" onchange="window.reportDate=this.value;render()">
        ${b(icon('download')+' Export Sales CSV','exportSales()','btns')}
      </div>`
    )}

    <div class="stats">
      ${[
        ['Today’s revenue',money(revenue),'currency-rupee','12.8'],
        ['Total orders',n,'bag-check','8.2'],
        ['Average order value',money(revenue/n),'receipt','4.3'],
        ['Happy customers',Math.round(n*1.7),'people','10.6']
      ].map(x=>`
        <div class="cardbox stat">
          <div class="stathead">${x[0]}${icon(x[2])}</div>
          <div class="number">${x[1]}</div>
          <div class="trend">↗ ${x[3]}% <span>vs. previous period</span></div>
        </div>
      `).join('')}
    </div>

    <!-- Investor Snapshot & Unit Economics -->
    <div class="cardbox mb-4" style="background:linear-gradient(135deg,#ffffff 0%,#fbf9f6 100%);border-color:#e6ded7">
      <div class="flex between mb-3">
        <div>
          <strong style="font-size:14px;color:var(--accent)">${icon('stars')} Investor Unit Economics & Operational Efficiency</strong>
          <p style="font-size:11px;margin:3px 0 0">Key metrics showcasing margin expansion through automated dine-in tech.</p>
        </div>
        <span class="badge-soft">SaaS Metrics</span>
      </div>
      <div class="stats mb-0" style="margin-bottom:0">
        <div class="cardbox stat" style="background:#fff;padding:15px">
          <div class="stathead">Gross Profit Margin</div>
          <div class="number" style="font-size:24px;color:var(--green)">65.2%</div>
          <div class="trend">COGS: 34.8% · Food cost target met</div>
        </div>
        <div class="cardbox stat" style="background:#fff;padding:15px">
          <div class="stathead">Avg Dining Duration</div>
          <div class="number" style="font-size:24px">41 min</div>
          <div class="trend" style="color:var(--green)">↓ 14 min faster vs paper menu</div>
        </div>
        <div class="cardbox stat" style="background:#fff;padding:15px">
          <div class="stathead">Digital Adoption</div>
          <div class="number" style="font-size:24px;color:var(--accent)">91.4%</div>
          <div class="trend">Orders placed via table QR</div>
        </div>
        <div class="cardbox stat" style="background:#fff;padding:15px">
          <div class="stathead">Guest CSAT / NPS</div>
          <div class="number" style="font-size:24px">4.9 ★</div>
          <div class="trend" style="color:var(--green)">+78 World-class NPS score</div>
        </div>
      </div>
    </div>

    <div class="dashgrid">
      <section class="cardbox">
        <div class="flex between">
          <div>
            <h3>Sales Overview</h3>
            <small style="font-size:10px">Hourly revenue breakdown and dine-in peak patterns.</small>
          </div>
          <div class="charttabs">
            ${['Today','Week'].map(p=>b(p,`period='${p}';render()`,period===p?'active':'')).join('')}
          </div>
        </div>
        <div class="flex mt-3">
          <strong style="font:800 24px Manrope">${money(revenue)}</strong>
          ${badge('↗ 12.8% vs last week')}
        </div>
        <div class="chartbox">
          <div class="gridlines">
            ${['₹12k','₹9k','₹6k','₹3k','₹0'].map(v=>'<div>'+v+'</div>').join('')}
          </div>
          <div class="bars">
            ${(period==='Today'?[27,42,35,77,94,59,73,49]:[43,62,51,85,94,76,69]).map((v,i)=>`
              <div class="barcol">
                <div class="bar" style="height:${v*.86}%" title="${money(v*120*mult)}" role="img" aria-label="${money(v*120*mult)} sales"></div>
                <small>${period==='Today'?['10 AM','12 PM','2 PM','4 PM','6 PM','8 PM','10 PM','11 PM'][i]:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</small>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="flex between" style="font-size:9px;color:#9b9e91">
          <span>● Hourly Revenue Velocity</span>
          <span>Peak dinner rush: ${period==='Today'?'6 PM – 9 PM':'Friday & Saturday'}</span>
        </div>
      </section>

      <section class="cardbox">
        <div class="flex between">
          <h3>Customer Favourites</h3>
          ${icon('three-dots')}
        </div>
        <p style="font-size:10px;margin:5px 0 10px">Highest grossing menu items this week.</p>
        ${[1,3,5,6].map((id,i)=>{
          let x=db.menu.find(x=>x.id===id)||db.menu[i];
          let count=[32,26,23,18][i];
          return `
            <div class="foodrow">
              <img src="${esc(x.img)}" alt="${esc(x.name)}">
              <div>
                <strong>${esc(x.name)}</strong>
                <small>${count} orders · ${esc(x.cat)}</small>
              </div>
              <span class="amount">${money(x.price*count)}</span>
            </div>
          `;
        }).join('')}
        <div class="mt-3">
          ${b('Manage menu & pricing '+icon('arrow-up-right'),"go('manage')",'btns full')}
        </div>
      </section>
    </div>

    <div class="lowergrid">
      <section class="cardbox">
        <div class="flex between">
          <div>
            <h3>Live Guest Reviews & Sentiment</h3>
            <small style="font-size:10px">Collected in real time after digital bill settlements.</small>
          </div>
          <span class="badge-soft">4.9 ★ Rating</span>
        </div>
        <div class="reviewlist mt-2">
          ${reviews.slice(0,3).map(r=>`
            <div class="reviewcard">
              <div class="flex between">
                <strong>${esc(r.name)}</strong>
                <span style="color:#f39c12;font-size:12px">★ ${r.rating}.0</span>
              </div>
              <div class="flex mt-1" style="gap:5px;flex-wrap:wrap">
                ${(r.tags||[]).map(t=>`<span class="badge-soft" style="font-size:9px">${t}</span>`).join('')}
              </div>
              <p>${esc(r.comment)}</p>
              <small class="muted">${r.date}</small>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="cardbox">
        <h3>Payment Channel Breakdown</h3>
        <p style="font-size:10px;margin-top:4px">Zero-reconciliation payment gateway mix.</p>
        ${[['UPI (QR Direct)',52,'#b76c50'],['Credit/Debit Cards',31,'#889987'],['Cash Settlement',17,'#c6b78e']].map(([s,v,c])=>`
          <div class="payrow">
            <div class="flex between" style="font-size:11px">
              <span><span style="color:${c}">●</span> ${s} (${v}%)</span>
              <strong>${money(revenue*v/100)}</strong>
            </div>
            <div class="track"><span style="width:${v}%;background:${c}"></span></div>
          </div>
        `).join('')}
      </section>
    </div>

    <div class="lowergrid">
      <section class="cardbox">
        <div class="flex between">
          <div>
            <h3>Recent Settlements</h3>
            <small style="font-size:10px">Audited ledger entries.</small>
          </div>
        </div>
        <div class="tablewrap">
          <table>
            <thead>
              <tr><th>Order</th><th>Table</th><th>Channel</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${[...paid.slice().reverse(),{order:'UP1040',table:4,method:'UPI',amount:1248},{order:'UP1039',table:7,method:'Card',amount:865},{order:'UP1038',table:2,method:'Cash',amount:1575}].slice(0,5).map(p=>`
                <tr>
                  <td><strong>#${esc(p.order)}</strong></td>
                  <td>Table ${String(p.table).padStart(2,'0')}</td>
                  <td>${icon(p.method==='UPI'?'phone':p.method==='Card'?'credit-card':'cash')} ${esc(p.method)}</td>
                  <td><strong>${money(p.amount)}</strong></td>
                  <td>${badge('Settled')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <section class="cardbox">
        <h3>Operational Summary</h3>
        ${[
          ['Active Kitchen Tickets',db.orders.filter(o=>o.status<4).length],
          ['Ready for Floor Delivery',db.orders.filter(o=>o.status===3).length],
          ['Tables Currently Occupied',db.tables.filter(t=>t.status==='occupied').length],
          ['Today’s Completed Covers',n]
        ].map(x=>`
          <div class="billline"><span>${x[0]}</span><strong>${x[1]}</strong></div>
        `).join('')}
        <small style="margin-top:10px;display:block">Synchronized seamlessly with floor tablets and kitchen terminals.</small>
      </section>
    </div>
  `;
}

function exportSales(){
  let csv='Order,Table,Method,Amount,Date\n'+(db.payments||[]).map(p=>[p.order,p.table,p.method,p.amount,new Date(p.date).toISOString()].join(',')).join('\n');
  let a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='urban-plate-transactions.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Transaction ledger exported to CSV');
}

// -------------------------------------------------------------
// MENU MANAGEMENT SCREEN
// -------------------------------------------------------------
function manageScreen(){
  return title(
    'A menu worth coming back for.',
    'Fine-tune pricing, costs, ingredients, and dish availability.',
    b(icon('plus-lg')+'Add new dish','editFood()')
  )+`
    <div class="stats">
      ${[
        ['Total dishes',db.menu.length],
        ['Available now',db.menu.filter(x=>x.active).length],
        ['Unavailable',db.menu.filter(x=>!x.active).length],
        ['Categories',new Set(db.menu.map(x=>x.cat)).size]
      ].map(x=>`
        <div class="cardbox stat">
          <div class="stathead">${x[0]}${icon('journal-text')}</div>
          <div class="number">${x[1]}</div>
        </div>
      `).join('')}
    </div>

    <div class="cardbox">
      <div class="searchrow">
        <input type="search" aria-label="Search dishes" placeholder="Find a dish…" oninput="search=this.value;$('#menubody').innerHTML=adminRows()">
        <select aria-label="Filter category" onchange="filter=this.value;render()">
          ${['All',...new Set([...cats,...db.menu.map(x=>x.cat)])].map(c=>`<option ${filter===c?'selected':''}>${esc(c)}</option>`).join('')}
        </select>
        ${b(icon('folder-plus')+' New Category','addCategory()','btns')}
      </div>
      <div class="tablewrap">
        <table>
          <thead>
            <tr><th>DISH</th><th>CATEGORY</th><th>SELLING PRICE</th><th>FOOD COST</th><th>AVAILABILITY</th><th>ACTIONS</th></tr>
          </thead>
          <tbody id="menubody">${adminRows()}</tbody>
        </table>
      </div>
    </div>
  `;
}

function adminRows(){
  return db.menu.filter(x=>(filter==='All'||x.cat===filter)&&x.name.toLowerCase().includes(search.toLowerCase())).map(x=>`
    <tr>
      <td>
        <div class="flex">
          <img class="menuadminimg" src="${esc(x.img)}" alt="${esc(x.name)}">
          <div>
            <strong>${esc(x.name)}</strong>
            <small style="display:block;font-size:9px">${x.veg?'Vegetarian':'Non-vegetarian'} ${x.best?'· ★ Bestseller':''}</small>
          </div>
        </div>
      </td>
      <td>${esc(x.cat)}</td>
      <td><strong>${money(x.price)}</strong></td>
      <td>${money(x.cost)} <small style="color:var(--muted)">(${Math.round(x.cost/x.price*100)}% COGS)</small></td>
      <td>
        <button class="chip" style="padding:6px 11px;color:${x.active?'#4a7f58':'#aa7d69'}" onclick="toggleFood(${x.id})">
          ${x.active?'● Available':'○ Unavailable'}
        </button>
      </td>
      <td>
        ${b(icon('pencil'),`editFood(${x.id})`,'iconbtn')}
        ${b(icon('trash'),`deleteFood(${x.id})`,'iconbtn')}
      </td>
    </tr>
  `).join('')||'<tr><td colspan="6">No dishes found.</td></tr>';
}

function toggleFood(id){
  let x=db.menu.find(x=>x.id===id);
  x.active=!x.active;
  save();render();toast('Dish availability updated');
}

function editFood(id){
  let x=db.menu.find(x=>x.id===id)||{name:'',desc:'',cat:'Starters',price:'',cost:'',img:photos.paneer,veg:true,active:true,best:false};
  modal(`
    <h2>${id?'Edit Dish Details':'Create New Culinary Dish'}</h2>
    <p>${id?'Update pricing, description, or culinary properties.':'Add an exciting item to the restaurant menu.'}</p>
    <form onsubmit="event.preventDefault();saveFood(${id||0})">
      <div class="field">
        <label>Food name</label>
        <input class="input" id="fname" value="${esc(x.name)}" required maxlength="70">
      </div>
      <div class="field">
        <label>Description</label>
        <textarea id="fdesc" required>${esc(x.desc)}</textarea>
      </div>
      <div class="field">
        <label>Category</label>
        <select id="fcat">
          ${[...new Set([...cats,...db.menu.map(x=>x.cat)])].map(c=>`<option ${x.cat===c?'selected':''}>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="row">
        <div class="field col-6">
          <label>Selling Price (₹)</label>
          <input id="fprice" class="input" type="number" min="1" max="100000" step=".01" value="${x.price}" required>
        </div>
        <div class="field col-6">
          <label>Cost of Goods Sold / COGS (₹)</label>
          <input id="fcost" class="input" type="number" min="0" step=".01" value="${x.cost}" required>
        </div>
      </div>
      <div class="field">
        <label>Image URL or Asset Path</label>
        <input id="fimg" class="input" type="text" value="${esc(x.img)}" oninput="$('#fpreview').src=this.value" required>
        <img id="fpreview" alt="Food image preview" src="${esc(x.img)}" style="width:100%;height:120px;object-fit:cover;border-radius:7px;margin-top:10px">
      </div>
      <div class="flex" style="flex-wrap:wrap;gap:12px">
        <label class="choice"><input id="fveg" type="checkbox" ${x.veg?'checked':''}> Vegetarian</label>
        <label class="choice"><input id="factive" type="checkbox" ${x.active?'checked':''}> Active on Menu</label>
        <label class="choice"><input id="fbest" type="checkbox" ${x.best?'checked':''}> Chef Bestseller</label>
      </div>
      <button class="btnp full mt-4" type="submit">Save Dish</button>
    </form>
  `);
}

function saveFood(id){
  let existing=db.menu.find(x=>x.id===id);
  let x={
    id:id||Math.max(...db.menu.map(x=>x.id))+1,
    name:$('#fname').value.trim(),
    desc:$('#fdesc').value.trim(),
    cat:$('#fcat').value,
    price:+$('#fprice').value,
    cost:+$('#fcost').value,
    img:$('#fimg').value,
    veg:$('#fveg').checked,
    active:$('#factive').checked,
    best:$('#fbest').checked,
    rating:existing?.rating||'4.8',
    time:existing?.time||20
  };
  if(!/^https?:\/\//.test(x.img)&&!/^assets\/[a-z0-9-]+\.(jpg|png|webp)$/.test(x.img)){
    toast('Use a valid image URL or local asset path');
    return;
  }
  if(!x.name){toast('Please enter a dish name');return}
  if(existing)Object.assign(existing,x);
  else db.menu.push(x);
  save();closeModal();render();toast('Menu updated successfully');
}

function deleteFood(id){
  modal(`
    <h2>Remove this dish?</h2>
    <p>It will be deactivated from the guest menu immediately.</p>
    ${b('Delete dish',`db.menu=db.menu.filter(x=>x.id!==${id});save();closeModal();render();toast('Dish removed')`)}
    ${b('Keep dish','closeModal()','btns')}
  `);
}

function addCategory(){
  modal(`
    <h2>Add New Menu Category</h2>
    <p>Create a fresh category for your culinary offerings.</p>
    <form onsubmit="event.preventDefault();let c=$('#newcat').value.trim();if(c&&!cats.includes(c)){cats.push(c);save();closeModal();render();toast('Category added')}else toast('Choose a unique category name')">
      <input id="newcat" class="input" required maxlength="35" placeholder="e.g. Sourdough Breads, Cocktails">
      <button class="btnp full mt-3">Add Category</button>
    </form>
  `);
}

// -------------------------------------------------------------
// EVENT LISTENERS & BOOTSTRAP
// -------------------------------------------------------------
window.addEventListener('storage',e=>{
  if(e.key==='urbanplate-v1'){
    db=JSON.parse(e.newValue);
    render();
  }
});

document.addEventListener('error',e=>{
  if(e.target.tagName==='IMG'&&!e.target.dataset.fallback){
    e.target.dataset.fallback='1';
    e.target.src='assets/food-fallback.svg';
  }
},true);

render();
