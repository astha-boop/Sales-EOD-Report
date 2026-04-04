// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAoKOi3QMrRP_IA0k79FUZTdNx-R8e0iQI",
  authDomain: "sales-dashboard-dfd46.firebaseapp.com",
  projectId: "sales-dashboard-dfd46",
  storageBucket: "sales-dashboard-dfd46.firebasestorage.app",
  messagingSenderId: "71986678784",
  appId: "1:71986678784:web:28441bebaaf78154751ce5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth(); 

// --- STATE MANAGEMENT ---
let state = { funnel: [] };
let extraTasks = []; 
let revenueEntries = []; 
let formLeads = []; 
let globalLeads = []; 
let druLogs = []; 

let currentFormState = { calls: '', tt: '', sched: '', done: '', followups: '', prospects: '', blockers: '' };

let eodData = {
  activeTeam: null,
  activeMember: null,
  teams: [
    { id: 't1', name: 'Skyclaw', lead: 'Gauri', icon: '🦅', color: '#e2cbd2', members: ['Gauri', 'Himanshi', 'Nidhi', 'Geetanjali', 'Surya'] },
    { id: 't2', name: 'Emberclaw', lead: 'Srijan', icon: '🔥', color: '#cdd3ee', members: ['Srijan', 'Shivam', 'Ishika', 'Shadab', 'Avantika', 'Pranjal'] },
    { id: 't3', name: 'Roarcrest', lead: 'Priyam', icon: '🦁', color: '#a2c4e7', members: ['Priyam', 'Ankit', 'Puneet', 'Yuvraj', 'Gurpreet', 'Priyanshita'] },
    { id: 't4', name: 'Ironhorn', lead: 'Rishabh', icon: '🦏', color: '#c8dbd9', members: ['Rishabh', 'Mohit', 'Satish', 'Riddhi', 'Shivani'] },
    { id: 't5', name: 'Titancrest', lead: 'Nitin', icon: '🐘', color: '#d0e5cd', members: ['Nitin', 'Ankit Singh', 'Kamal', 'Anjali', 'Kanupriya', 'Dikshya'] },
    { id: 't6', name: 'Velora', lead: 'Akash', icon: '🐼', color: '#fbe2c5', members: ['Akash', 'Bharat', 'Abhishek', 'Satya', 'Ayush'] },
    { id: 't7', name: 'Nightclaw', lead: 'Shiwangi', icon: '🐺', color: '#6fa8dc', members: ['Shiwangi', 'Farha', 'Khushboo', 'Prabhat', 'Surendra'] },
    { id: 't8', name: 'Phoenix', lead: 'Kalpana', icon: '🐦‍🔥', color: '#b6d7a8', members: ['Kalpana', 'Prajwal', 'Ritul', 'Abhinav', 'Aniket'] },
    { id: 't9', name: 'Re-Training', lead: 'Kishlay', icon: '📚', color: '#cccccc', members: ['Priya', 'Hitesh'] }
  ]
};

const SECTION_META = {
  'home-leaderboard': ['Top Performers', 'Live daily revenue and DRU leaderboard'],
  'teams-eod': ['EOD Report', 'Manage team rosters and efficiency tracking'],
  's1': ['Daily Metrics', 'Track Daily Required Units (DRU) and Daily Punched Revenue (DPR)'],
  's2': ['Funnel Breakdown', 'Section 2 · Visualise pipeline drop off']
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('report-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  
  auth.onAuthStateChanged((user) => {
    if (user) {
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('main-app').style.display = 'flex';
      document.getElementById('topbar-user').textContent = user.email;
      
      eodRenderHome();
      initDruForm(); 
      listenToFirebase();
    } else {
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('main-app').style.display = 'none';
    }
  });
});

function handleLogin() {
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  const errBox = document.getElementById('login-error');
  auth.signInWithEmailAndPassword(email, pass).catch(e => { errBox.style.display = 'block'; errBox.textContent = e.message; });
}
function handleLogout() { auth.signOut(); }

function listenToFirebase() {
  db.collection("globalLeads").onSnapshot((snapshot) => {
    globalLeads = [];
    snapshot.forEach((doc) => { globalLeads.push({ id: doc.id, ...doc.data() }); });
    if(document.getElementById('eod-view-team').style.display === 'block') eodRenderRoster();
    renderFunnel();
    renderLeaderboard(); 
  });

  db.collection("druLogs").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
    druLogs = [];
    snapshot.forEach((doc) => { druLogs.push({ id: doc.id, ...doc.data() }); });
    renderDruLogs();
    renderLeaderboard(); 
  });
}

function getNum(id) { return parseFloat(document.getElementById(id)?.value) || 0; }
function getStr(id) { return document.getElementById(id)?.value?.trim() || ''; }

function switchSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (el) el.classList.add('active');
  if (SECTION_META[id]) {
    document.getElementById('topbar-title').textContent = SECTION_META[id][0];
    document.getElementById('topbar-sub').textContent = SECTION_META[id][1];
  }
}

// --- TAB 0: LEADERBOARD ---
function renderLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;
  
  let teamStats = {};
  druLogs.forEach(log => {
    if(!teamStats[log.teamName]) {
      teamStats[log.teamName] = { name: log.teamName, icon: log.teamIcon, revenue: 0, dru: 0 };
    }
    teamStats[log.teamName].revenue += log.collected;
    teamStats[log.teamName].dru += log.druAchieved;
  });

  let sortedTeams = Object.values(teamStats).sort((a, b) => b.revenue - a.revenue);

  if (sortedTeams.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text3); padding:40px;">No revenue logged yet today. EOD operations will populate the leaderboard.</div>`;
    return;
  }

  container.innerHTML = `<div class="leaderboard-grid">` + sortedTeams.map((team, index) => {
    const rank = index + 1;
    let rankClass = rank <= 3 ? `rank-${rank}` : '';
    let rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    
    return `
      <div class="rank-card ${rankClass}">
        <div class="rank-number">${rankDisplay}</div>
        <div class="rank-details">
          <div class="rank-name">${team.icon} ${team.name}</div>
          <div class="rank-team">Team Leaderboard</div>
        </div>
        <div class="rank-stats">
          <div class="rank-revenue">₹${team.revenue.toLocaleString('en-IN')}</div>
          <div class="rank-dru">${team.dru} DRU Achieved</div>
        </div>
      </div>
    `;
  }).join('') + `</div>`;
}

// --- TAB 1: TEAMS EOD LOGIC ---
function eodRenderHome() {
  const grid = document.getElementById('eod-team-grid');
  grid.innerHTML = eodData.teams.map(t => `
    <div class="card" style="cursor:pointer; text-align:center; border-top: 4px solid ${t.color};" onclick="eodOpenTeam('${t.id}')">
      <div style="font-size: 32px; margin-bottom: 10px;">${t.icon}</div>
      <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 800; color: var(--white);">${t.name}</div>
      <div style="font-size: 11px; color: var(--text3); text-transform: uppercase;">Lead: ${t.lead}</div>
      <div style="font-size: 12px; margin-top: 8px; color: var(--cyan);">${t.members.length} Members</div>
    </div>
  `).join('');
}

function eodGoHome() {
  document.getElementById('eod-view-home').style.display = 'block';
  document.getElementById('eod-view-team').style.display = 'none';
  document.getElementById('eod-view-form').style.display = 'none';
}

function eodOpenTeam(teamId) {
  eodData.activeTeam = eodData.teams.find(t => t.id === teamId);
  document.getElementById('eod-view-home').style.display = 'none';
  document.getElementById('eod-view-team').style.display = 'block';
  document.getElementById('eod-team-view-title').innerHTML = `${eodData.activeTeam.icon} ${eodData.activeTeam.name}`;
  eodRenderRoster();
}

function eodGoToTeam() {
  document.getElementById('eod-view-team').style.display = 'block';
  document.getElementById('eod-view-form').style.display = 'none';
  eodRenderRoster(); 
}

function eodRenderRoster() {
  const grid = document.getElementById('eod-member-grid');
  grid.innerHTML = eodData.activeTeam.members.map(m => {
    const memberLeads = globalLeads.filter(l => l.owner === m && l.teamId === eodData.activeTeam.id);
    let leadsHTML = memberLeads.map(l => {
      let statusColor = l.status === 'Done' ? 'var(--green)' : l.status === 'Negative' ? 'var(--red)' : 'var(--amber)';
      let actionButtons = l.status === 'Pending' ? `
        <div style="display:flex; gap:5px; margin-top:6px;">
          <button onclick="event.stopPropagation(); updateLeadStatus('${l.id}', 'Done')" style="flex:1; background:rgba(61,203,122,0.15); color:var(--green); border:1px solid rgba(61,203,122,0.3); border-radius:3px; font-size:10px; padding:4px; cursor:pointer; font-weight:bold;">✓ Done</button>
          <button onclick="event.stopPropagation(); updateLeadStatus('${l.id}', 'Negative')" style="flex:1; background:rgba(232,64,64,0.15); color:var(--red); border:1px solid rgba(232,64,64,0.3); border-radius:3px; font-size:10px; padding:4px; cursor:pointer; font-weight:bold;">✕ Negative</button>
        </div>
      ` : `<div style="font-size:10px; margin-top:6px; font-weight:bold; color:${statusColor}; text-align: center; padding: 2px; background: ${statusColor}22; border-radius: 3px;">${l.status.toUpperCase()}</div>`;

      return `
        <div style="text-align:left; background:var(--bg3); border-left: 3px solid ${statusColor}; padding: 8px; border-radius: 4px; margin-top: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          <div style="font-size: 12px; font-weight: 700; color:var(--white);">${l.name}</div>
          <div style="font-size: 10px; color:var(--text2); display:flex; justify-content:space-between; margin-top:2px;">
            <span>📞 ${l.phone}</span>
            <span style="color:var(--cyan); font-weight: 500;">${l.type}</span>
          </div>
          ${actionButtons}
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="position:relative; text-align:center; padding: 16px;">
        <div style="font-weight: 600; font-size: 16px; color: var(--white); margin-bottom: 8px;">${m}</div>
        <button onclick="eodOpenForm('${m}')" class="btn btn-sm btn-accent" style="width:100%; margin-bottom: 5px;">Fill EOD Report</button>
        <button onclick="event.stopPropagation(); eodRemoveMember('${m}')" style="position:absolute; top:5px; right:8px; background:none; border:none; color:var(--text3); cursor:pointer;">✕</button>
        <div style="margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px;">
          <div style="font-size:10px; color:var(--text3); text-transform:uppercase;">Active Leads</div>
          ${leadsHTML || '<div style="font-size:10px; color:var(--text3); margin-top:5px;">None</div>'}
        </div>
      </div>
    `;
  }).join('');
}

function updateLeadStatus(id, newStatus) { db.collection("globalLeads").doc(id).update({ status: newStatus }); }

function eodAddMember() {
  const nameInput = document.getElementById('new-member-name');
  if (!nameInput.value.trim()) return;
  eodData.activeTeam.members.push(nameInput.value.trim());
  nameInput.value = '';
  initDruForm(); eodRenderRoster();
}
function eodRemoveMember(name) {
  if (confirm(`Remove ${name}?`)) {
    eodData.activeTeam.members = eodData.activeTeam.members.filter(m => m !== name);
    initDruForm(); eodRenderRoster();
  }
}

function eodOpenForm(memberName) {
  eodData.activeMember = memberName;
  extraTasks = []; revenueEntries = []; formLeads = []; 
  currentFormState = { calls: '', tt: '', sched: '', done: '', followups: '', prospects: '', blockers: '' };
  
  document.getElementById('eod-view-team').style.display = 'none';
  document.getElementById('eod-view-form').style.display = 'block';
  document.getElementById('eod-form-title').textContent = `${memberName}'s EOD Report`;
  eodRenderFormHTML();
}

function syncFormState() {
  currentFormState.calls = document.getElementById('eod-calls')?.value || '';
  currentFormState.tt = document.getElementById('eod-tt')?.value || '';
  currentFormState.sched = document.getElementById('eod-sched')?.value || '';
  currentFormState.done = document.getElementById('eod-done')?.value || '';
  currentFormState.followups = document.getElementById('eod-followups')?.value || '';
  currentFormState.prospects = document.getElementById('eod-prospects')?.value || '';
  currentFormState.blockers = document.getElementById('eod-blockers')?.value || '';
}

function eodRenderFormHTML() {
  const container = document.getElementById('eod-form-container');
  let formLeadsHTML = formLeads.map((l, index) => `
    <div style="display:flex; gap:10px; margin-bottom: 8px;">
      <select onchange="updateFormLead(${index}, 'type', this.value)" style="background: var(--bg3); border: 1px solid var(--border); color: white; padding: 5px; border-radius: 4px;"><option value="Prospect" ${l.type === 'Prospect' ? 'selected' : ''}>Prospect</option><option value="Follow-up" ${l.type === 'Follow-up' ? 'selected' : ''}>Follow-up</option></select>
      <input type="text" value="${l.name}" oninput="updateFormLead(${index}, 'name', this.value)" placeholder="Client Name" style="flex:1; background: var(--bg3); border: 1px solid var(--border); color: white; padding: 5px 10px; border-radius: 4px;" />
      <input type="text" value="${l.phone}" oninput="updateFormLead(${index}, 'phone', this.value)" placeholder="Phone Number" style="flex:1; background: var(--bg3); border: 1px solid var(--border); color: white; padding: 5px 10px; border-radius: 4px;" />
      <button onclick="removeFormLead(${index})" class="btn btn-sm btn-danger">✕</button>
    </div>
  `).join('');
  let extraTasksHTML = extraTasks.map((t, index) => `
    <div style="display:flex; gap:10px; margin-bottom: 8px;">
      <input type="text" value="${t.name}" onchange="updateTask(${index}, 'name', this.value)" placeholder="Task description" style="flex:2; background: var(--bg3); border: 1px solid var(--border); color: white; padding: 5px 10px; border-radius: 4px;" />
      <input type="number" value="${t.minutes}" onchange="updateTask(${index}, 'minutes', this.value)" placeholder="Minutes" style="flex:1; background: var(--bg3); border: 1px solid var(--border); color: white; padding: 5px 10px; border-radius: 4px;" />
      <button onclick="removeTask(${index})" class="btn btn-sm btn-danger">✕</button>
    </div>
  `).join('');
  let revenueHTML = revenueEntries.map((r, index) => `
    <div style="display:flex; gap:10px; margin-bottom: 8px;">
      <input type="text" value="${r.client}" oninput="updateRevenue(${index}, 'client', this.value)" placeholder="Client / Deal Name" style="flex:2; background: var(--bg3); border: 1px solid var(--border); color: white; padding: 5px 10px; border-radius: 4px;" />
      <input type="number" value="${r.amount}" oninput="updateRevenue(${index}, 'amount', this.value)" placeholder="Amount (₹)" style="flex:1; background: var(--bg3); border: 1px solid var(--border); color: white; padding: 5px 10px; border-radius: 4px;" />
      <button onclick="removeRevenue(${index})" class="btn btn-sm btn-danger">✕</button>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">Daily Sales Activity</div>
      <div class="form-grid">
        <div class="form-group"><label>Calls Done</label><input type="number" id="eod-calls" value="${currentFormState.calls}" oninput="calcEfficiency()" placeholder="Target: 200" /></div>
        <div class="form-group"><label>Talk Time (min)</label><input type="number" id="eod-tt" value="${currentFormState.tt}" oninput="calcEfficiency()" placeholder="Target: 180" /></div>
        <div class="form-group"><label>Demo/VC Scheduled</label><input type="number" id="eod-sched" value="${currentFormState.sched}" oninput="syncFormState()" placeholder="0" /></div>
        <div class="form-group"><label>Demo/VC Done</label><input type="number" id="eod-done" value="${currentFormState.done}" oninput="syncFormState()" placeholder="0" /></div>
        <div class="form-group"><label>Follow-ups Made</label><input type="number" id="eod-followups" value="${currentFormState.followups}" oninput="syncFormState()" placeholder="0" /></div>
        <div class="form-group"><label>Prospects Made</label><input type="number" id="eod-prospects" value="${currentFormState.prospects}" oninput="syncFormState()" placeholder="0" /></div>
      </div>
    </div>
    <div class="card card-accent-cyan">
      <div class="card-title" style="color: var(--cyan);">Track Specific Leads</div>
      <p style="font-size:11px; color:var(--text3); margin-bottom:10px;">Log specific Prospects or Follow-ups. These will appear on your Dashboard.</p>
      <div id="form-leads-list">${formLeadsHTML}</div>
      <button class="btn btn-sm" style="border-color: var(--cyan); color: var(--cyan);" onclick="addFormLead()">+ Log a Lead</button>
    </div>
    <div class="card">
      <div class="card-title" style="color: var(--green);">Revenue Collected Today</div>
      <div id="revenue-list">${revenueHTML}</div>
      <button class="btn btn-sm" style="border-color: var(--green); color: var(--green);" onclick="addRevenue()">+ Add Revenue</button>
      <div style="text-align: right; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px; margin-top: 10px; color: var(--white);">Total: <span style="color: var(--green);">₹<span id="rev-total">0</span></span></div>
    </div>
    <div class="card">
      <div class="card-title">Additional Tasks</div>
      <div id="extra-tasks-list">${extraTasksHTML}</div>
      <button class="btn btn-sm" onclick="addTask()">+ Add Task</button>
    </div>
    <div class="card card-accent-orange">
      <div class="card-title">Blockers & Challenges</div>
      <textarea id="eod-blockers" rows="3" oninput="syncFormState()" placeholder="e.g. Lead quality was poor today..." style="width:100%; background: var(--bg3); border: 1px solid var(--border); color: white; padding: 10px; border-radius: 4px; font-family: inherit; resize: vertical;">${currentFormState.blockers}</textarea>
    </div>
    <div class="card card-accent-cyan" id="efficiency-dashboard">
      <div class="card-title">Efficiency Calculator</div>
      <div style="display:flex; gap: 20px; flex-wrap: wrap;">
        <div style="flex:1; background: var(--bg3); padding: 16px; border-radius: var(--radius);"><div style="font-size:10px; color:var(--text3); text-transform:uppercase;">Total Productive Time</div><div id="calc-time" style="font-size: 24px; font-weight:bold; color:var(--white);">0.0 hrs</div></div>
        <div style="flex:1; background: var(--bg3); padding: 16px; border-radius: var(--radius);"><div style="font-size:10px; color:var(--text3); text-transform:uppercase;">Efficiency %</div><div id="calc-pct" style="font-size: 24px; font-weight:bold; color:var(--white);">0%</div><div style="font-size:10px; color:var(--text3); margin-top:2px;">Based on 7-hour day</div></div>
      </div>
      <div style="margin-top: 16px; display:flex; gap: 10px;">
        <span id="badge-benchmark" style="padding: 4px 10px; font-size:11px; font-weight:bold; border-radius: 20px; background: rgba(232,64,64,0.1); color: var(--red);">✗ Core Benchmark Not Met</span>
        <span id="badge-highly" style="padding: 4px 10px; font-size:11px; font-weight:bold; border-radius: 20px; background: rgba(232,64,64,0.1); color: var(--red);">✗ Under 3.5hrs</span>
      </div>
    </div>
    <button class="btn btn-accent" style="width:100%; padding: 12px; margin-bottom: 20px;" onclick="submitFinalEOD()">Submit ${eodData.activeMember}'s Report</button>
  `;
  calcEfficiency(); updateRevenueTotal();
}

function addFormLead() { syncFormState(); formLeads.push({ type: 'Prospect', name: '', phone: '' }); eodRenderFormHTML(); }
function updateFormLead(index, field, value) { formLeads[index][field] = value; }
function removeFormLead(index) { syncFormState(); formLeads.splice(index, 1); eodRenderFormHTML(); }
function addTask() { syncFormState(); extraTasks.push({ name: '', minutes: 0 }); eodRenderFormHTML(); }
function updateTask(index, field, value) { extraTasks[index][field] = field === 'minutes' ? parseFloat(value) || 0 : value; calcEfficiency(); }
function removeTask(index) { syncFormState(); extraTasks.splice(index, 1); eodRenderFormHTML(); }
function addRevenue() { syncFormState(); revenueEntries.push({ client: '', amount: '' }); eodRenderFormHTML(); }
function updateRevenue(index, field, value) { revenueEntries[index][field] = field === 'amount' ? parseFloat(value) || 0 : value; updateRevenueTotal(); }
function removeRevenue(index) { syncFormState(); revenueEntries.splice(index, 1); eodRenderFormHTML(); }
function updateRevenueTotal() { const total = revenueEntries.reduce((sum, rev) => sum + (parseFloat(rev.amount) || 0), 0); const totalEl = document.getElementById('rev-total'); if (totalEl) totalEl.textContent = total.toLocaleString('en-IN'); }

function calcEfficiency() {
  syncFormState();
  const calls = parseFloat(currentFormState.calls) || 0; const talkTimeMins = parseFloat(currentFormState.tt) || 0;
  const totalProductiveHours = (talkTimeMins / 60) + (extraTasks.reduce((sum, task) => sum + task.minutes, 0) / 60);
  const efficiencyPct = Math.min((totalProductiveHours / 7) * 100, 100).toFixed(0);

  document.getElementById('calc-time').textContent = totalProductiveHours.toFixed(1) + ' hrs';
  document.getElementById('calc-pct').textContent = efficiencyPct + '%';
  const badgeBench = document.getElementById('badge-benchmark'); const badgeHighly = document.getElementById('badge-highly');

  if (calls >= 200 || talkTimeMins >= 180) { badgeBench.textContent = '✓ Core Benchmark Met'; badgeBench.style.background = 'rgba(61,203,122,0.15)'; badgeBench.style.color = 'var(--green)'; } 
  else { badgeBench.textContent = `✗ Missed Core`; badgeBench.style.background = 'rgba(232,64,64,0.1)'; badgeBench.style.color = 'var(--red)'; }

  if (totalProductiveHours >= 3.5) { badgeHighly.textContent = '⚡ Highly Efficient'; badgeHighly.style.background = 'rgba(41,171,226,0.15)'; badgeHighly.style.color = 'var(--cyan)'; document.getElementById('calc-pct').style.color = 'var(--cyan)'; } 
  else { badgeHighly.textContent = '✗ Under 3.5hrs'; badgeHighly.style.background = 'rgba(232,64,64,0.1)'; badgeHighly.style.color = 'var(--red)'; document.getElementById('calc-pct').style.color = 'var(--white)'; }
}

function submitFinalEOD() { 
  syncFormState(); 
  const prospectsClaimed = parseFloat(currentFormState.prospects) || 0; const followupsClaimed = parseFloat(currentFormState.followups) || 0;

  if (prospectsClaimed > 0 || followupsClaimed > 0) {
    const loggedProspects = formLeads.filter(l => l.type === 'Prospect' && l.name.trim() !== '').length;
    const loggedFollowups = formLeads.filter(l => l.type === 'Follow-up' && l.name.trim() !== '').length;
    if (prospectsClaimed > 0 && loggedProspects === 0) return alert(`⚠️ ERROR: You claimed ${prospectsClaimed} Prospect(s), but didn't log any names.`);
    if (followupsClaimed > 0 && loggedFollowups === 0) return alert(`⚠️ ERROR: You claimed ${followupsClaimed} Follow-up(s), but didn't log any names.`);
  }

  for (let i = 0; i < formLeads.length; i++) {
    const lead = formLeads[i];
    if (lead.name.trim() !== '') {
      if (lead.phone.replace(/\D/g, '').length !== 10) return alert(`⚠️ ERROR: Phone number for "${lead.name}" must be exactly 10 digits.`);
    }
  }

  formLeads.forEach(l => {
    if(l.name.trim() !== '') db.collection("globalLeads").add({ type: l.type, name: l.name, phone: l.phone, status: 'Pending', owner: eodData.activeMember, teamId: eodData.activeTeam.id, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
  });
  
  formLeads = []; alert(`✅ ${eodData.activeMember}'s EOD submitted successfully!`); eodGoToTeam(); 
}

// --- TAB 2: DRU & DPR TRACKER ---
function initDruForm() {
  const teamSelect = document.getElementById('dru-team');
  if (!teamSelect) return;
  teamSelect.innerHTML = '<option value="">Select Team</option>' + eodData.teams.map(t => `<option value="${t.id}">${t.icon} ${t.name}</option>`).join('');
}

function addDruLog() {
  const teamId = document.getElementById('dru-team').value;
  if (!teamId) return alert('Please select a team.');
  const team = eodData.teams.find(t => t.id === teamId);
  db.collection("druLogs").add({ teamIcon: team.icon, teamName: team.name, druTarget: getNum('dru-target'), druAchieved: getNum('dru-achieved'), dprTarget: getNum('dru-dpr-target'), collected: getNum('dru-collected'), timestamp: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById('dru-team').value = ''; document.getElementById('dru-target').value = ''; document.getElementById('dru-achieved').value = ''; document.getElementById('dru-dpr-target').value = ''; document.getElementById('dru-collected').value = '';
}

function updateDruProgress(id, type) {
  const log = druLogs.find(l => l.id === id); if (!log) return;
  if (type === 'dru') { let val = prompt(`Enter DRU achieved for ${log.teamName}:`, log.druAchieved); if (val !== null) db.collection("druLogs").doc(id).update({ druAchieved: parseFloat(val) || 0 }); } 
  else { let val = prompt(`Enter Revenue collected for ${log.teamName}:`, log.collected); if (val !== null) db.collection("druLogs").doc(id).update({ collected: parseFloat(val) || 0 }); }
}

function deleteDruLog(id) { if(confirm("Delete this log?")) db.collection("druLogs").doc(id).delete(); }

function renderDruLogs() {
  const summary = document.getElementById('dru-summary'); const tbody = document.getElementById('dru-log-body');
  if (!summary || !tbody) return;

  summary.innerHTML = `
    <div class="metric-card"><div class="metric-label">Total DRU (Target)</div><div class="metric-val" style="color:var(--text2);">${druLogs.reduce((s, l) => s + l.druTarget, 0)}</div></div>
    <div class="metric-card"><div class="metric-label">Total DRU (Achieved)</div><div class="metric-val" style="color:var(--cyan);">${druLogs.reduce((s, l) => s + l.druAchieved, 0)}</div></div>
    <div class="metric-card"><div class="metric-label">Total DPR (Target)</div><div class="metric-val" style="color:var(--text2);">₹${druLogs.reduce((s, l) => s + l.dprTarget, 0).toLocaleString('en-IN')}</div></div>
    <div class="metric-card"><div class="metric-label">Total Collected</div><div class="metric-val" style="color:var(--green);">₹${druLogs.reduce((s, l) => s + l.collected, 0).toLocaleString('en-IN')}</div></div>
  `;

  if (druLogs.length === 0) return tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text3);">No DRU/DPR logged today.</td></tr>';

  tbody.innerHTML = druLogs.map(l => {
    let druBtn = l.druAchieved >= l.druTarget && l.druTarget > 0 ? `<button onclick="updateDruProgress('${l.id}', 'dru')" style="background:rgba(61,203,122,0.15); color:var(--green); border:1px solid rgba(61,203,122,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold; margin-right:5px;">✓ DRU Met</button>` : l.druAchieved > 0 ? `<button onclick="updateDruProgress('${l.id}', 'dru')" style="background:rgba(245,166,35,0.15); color:var(--amber); border:1px solid rgba(245,166,35,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold; margin-right:5px;">⏳ Pending (${l.druAchieved}/${l.druTarget})</button>` : `<button onclick="updateDruProgress('${l.id}', 'dru')" style="background:var(--bg4); color:var(--text3); border:1px solid var(--border); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; margin-right:5px;">? DRU Pending</button>`;
    let dprBtn = l.collected >= l.dprTarget && l.dprTarget > 0 ? `<button onclick="updateDruProgress('${l.id}', 'dpr')" style="background:rgba(61,203,122,0.15); color:var(--green); border:1px solid rgba(61,203,122,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold;">✓ DPR Met</button>` : l.collected > 0 ? `<button onclick="updateDruProgress('${l.id}', 'dpr')" style="background:rgba(245,166,35,0.15); color:var(--amber); border:1px solid rgba(245,166,35,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold;">⏳ Pending (₹${l.collected})</button>` : `<button onclick="updateDruProgress('${l.id}', 'dpr')" style="background:var(--bg4); color:var(--text3); border:1px solid var(--border); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer;">? DPR Pending</button>`;

    return `<tr style="border-bottom: 1px solid var(--border);"><td style="padding: 10px; color: var(--white); font-weight: 500;"><span style="margin-right:5px;">${l.teamIcon}</span> ${l.teamName}</td><td style="padding: 10px; color: var(--text2);">${l.druTarget}</td><td style="padding: 10px; color: var(--cyan); font-weight:bold;">${l.druAchieved}</td><td style="padding: 10px; color: var(--text2);">₹${l.dprTarget.toLocaleString('en-IN')}</td><td style="padding: 10px; color: var(--green); font-weight:bold;">₹${l.collected.toLocaleString('en-IN')}</td><td style="padding: 10px;">${druBtn} ${dprBtn}</td><td style="padding: 10px; text-align: right;"><button class="del-btn" onclick="deleteDruLog('${l.id}')">✕</button></td></tr>`;
  }).join('');
}

// --- TAB 3: FUNNEL BREAKDOWN ---
function renderFunnel() {
  const autoContainer = document.getElementById('auto-pipeline-stats');
  const tPros = globalLeads.filter(l => l.type === 'Prospect').length; const tFol = globalLeads.filter(l => l.type === 'Follow-up').length; const tDone = globalLeads.filter(l => l.status === 'Done').length; const tLost = globalLeads.filter(l => l.status === 'Negative').length;
  
  if (autoContainer) {
    autoContainer.innerHTML = `<div class="metric-card"><div class="metric-label">Logged Prospects</div><div class="metric-val" style="color:var(--cyan);">${tPros}</div></div><div class="metric-card"><div class="metric-label">Logged Follow-Ups</div><div class="metric-val" style="color:var(--amber);">${tFol}</div></div><div class="metric-card"><div class="metric-label">Done (Won)</div><div class="metric-val" style="color:var(--green);">${tDone}</div></div><div class="metric-card"><div class="metric-label">Negative (Lost)</div><div class="metric-val" style="color:var(--red);">${tLost}</div></div><div class="metric-card" style="grid-column: span 2;"><div class="metric-label">Automated Win Rate</div><div class="metric-val">${(tPros+tFol+tDone+tLost)>0 ? Math.round((tDone/(tPros+tFol+tDone+tLost))*100) : 0}%</div></div>`;
  }

  const teamTable = document.getElementById('team-wise-pipeline-body');
  if (teamTable) {
    if (globalLeads.length === 0) teamTable.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text3);">No leads logged today.</td></tr>';
    else teamTable.innerHTML = eodData.teams.map(t => {
      const lds = globalLeads.filter(l => l.teamId === t.id); if(lds.length === 0) return '';
      return `<tr style="border-bottom: 1px solid var(--border);"><td style="padding: 10px; color: var(--white); font-weight: 600;"><span style="margin-right:5px;">${t.icon}</span>${t.name}</td><td style="padding: 10px; color: var(--cyan); font-weight:bold;">${lds.filter(l => l.type === 'Prospect').length}</td><td style="padding: 10px; color: var(--amber); font-weight:bold;">${lds.filter(l => l.type === 'Follow-up').length}</td><td style="padding: 10px; color: var(--green); font-weight:bold;">${lds.filter(l => l.status === 'Done').length}</td><td style="padding: 10px; color: var(--red); font-weight:bold;">${lds.filter(l => l.status === 'Negative').length}</td></tr>`;
    }).join('');
  }
}
