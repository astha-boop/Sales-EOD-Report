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

// Syncs with Firebase
let globalLeads = []; 
let druLogs = []; 
let allReports = []; 
let tatLogs = []; 

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

const TAT_BENCHMARKS = {
  'Lead Assignment': { max: 10, unit: 'mins' },
  'First Call Attempt': { max: 30, unit: 'mins' },
  'Inbound Lead Response': { max: 5, unit: 'mins' },
  'Follow-Up (Post First Call)': { max: 24, unit: 'hrs' },
  'Interested Lead Follow-Up': { max: 48, unit: 'hrs' },
  'Demo Scheduling': { max: 24, unit: 'hrs' },
  'Demo Completion': { max: 48, unit: 'hrs' },
  'Post-Demo Follow-Up': { max: 24, unit: 'hrs' },
  'Payment Link Sharing': { max: 10, unit: 'mins' },
  'Payment Acknowledgment': { max: 15, unit: 'mins' },
  'CRM Update': { max: 4, unit: 'hrs' }
};

const SECTION_META = {
  'home-leaderboard': ['Top Performers', 'Live daily revenue and DRU leaderboard'],
  'insights-view': ['AI Insights & Actions', 'Automated executive summary and recommendations'],
  'teams-eod': ['EOD Report', 'Manage team rosters and efficiency tracking'],
  'all-reports': ['All Reports', 'View daily EOD submissions across all teams'],
  'blockers-view': ['Team Blockers', 'Review challenges and blockers reported by the team'],
  'tat-tracker': ['TAT Tracker', 'Monitor Turnaround Time SLAs against the Framework'],
  's1': ['Daily Metrics', 'Track Daily Required Units (DRU) and Daily Punched Revenue (DPR)'],
  's2': ['Funnel Breakdown', 'Section 2 · Visualise pipeline drop off']
};

document.addEventListener('DOMContentLoaded', () => {
  setMasterDate(new Date().toISOString().split('T')[0]);
  
  // Listen for Sidebar Date Picker changes
  document.getElementById('report-date').addEventListener('change', (e) => {
    setMasterDate(e.target.value);
  });

  auth.onAuthStateChanged((user) => {
    if (user) {
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('main-app').style.display = 'flex';
      document.getElementById('topbar-user').textContent = user.email;
      
      eodRenderHome();
      initDruForm(); 
      initTatForm(); 
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

function setMasterDate(dateStr) {
  // Sync all date pickers on the screen
  document.getElementById('report-date').value = dateStr;
  document.getElementById('reports-date-filter').value = dateStr;
  document.getElementById('funnel-date-filter').value = dateStr;

  const selectedDateObj = new Date(dateStr);
  document.getElementById('topbar-date').textContent = selectedDateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  state.funnel = []; 
  refreshAllViews();
}

function jumpToToday() {
  setMasterDate(new Date().toISOString().split('T')[0]);
  refreshAllViews();
}

function listenToFirebase() {
  db.collection("globalLeads").onSnapshot((snapshot) => {
    globalLeads = [];
    snapshot.forEach((doc) => { 
      let data = doc.data();
      if (!data.date && data.timestamp) {
        const d = data.timestamp.toDate();
        data.date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
      globalLeads.push({ id: doc.id, ...data }); 
    });
    refreshAllViews();
  });

  db.collection("druLogs").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
    druLogs = [];
    snapshot.forEach((doc) => { 
      let data = doc.data();
      if (!data.date && data.timestamp) {
        const d = data.timestamp.toDate();
        data.date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
      druLogs.push({ id: doc.id, ...data }); 
    });
    refreshAllViews();
  });

  db.collection("eodReports").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
    allReports = [];
    snapshot.forEach((doc) => { 
      let data = doc.data();
      if (!data.date && data.timestamp) {
        const d = data.timestamp.toDate();
        data.date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
      allReports.push({ id: doc.id, ...data }); 
    });
    refreshAllViews();
  });

  db.collection("tatLogs").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
    tatLogs = [];
    snapshot.forEach((doc) => { tatLogs.push({ id: doc.id, ...doc.data() }); });
    renderTatLogs();
    renderInsights(); 
  });
}

function refreshAllViews() {
  if(document.getElementById('eod-view-team').style.display === 'block') eodRenderRoster();
  renderLeaderboard(); 
  renderDruLogs();
  renderAllReports();
  renderFunnel();
  renderTatLogs(); 
  renderBlockers(); 
  renderInsights(); 
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

// --- INSIGHTS VIEW ---
function renderInsights() {
  const container = document.getElementById('insights-content');
  if (!container) return;

  const selectedDate = document.getElementById('report-date').value;
  const dailyTat = tatLogs.filter(log => log.date === selectedDate);
  const dailyReports = allReports.filter(r => r.date === selectedDate);
  const dailyBlockers = dailyReports.filter(r => r.blockers && r.blockers.trim() !== '');

  if (dailyReports.length === 0 && dailyTat.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text3); padding:40px;">Not enough data on ${selectedDate} to generate insights.</div>`;
    return;
  }

  let tatRate = dailyTat.length > 0 ? Math.round((dailyTat.filter(l => l.isMet).length / dailyTat.length) * 100) : 100;
  let tatBreaches = dailyTat.filter(l => !l.isMet);
  let milestoneCounts = {};
  tatBreaches.forEach(b => milestoneCounts[b.milestone] = (milestoneCounts[b.milestone] || 0) + 1);
  let worstMilestone = Object.keys(milestoneCounts).sort((a,b) => milestoneCounts[b] - milestoneCounts[a])[0];

  let avgEff = dailyReports.length > 0 ? dailyReports.reduce((sum, r) => sum + parseFloat(r.efficiency), 0) / dailyReports.length : 0;
  let lowEffReps = dailyReports.filter(r => parseFloat(r.efficiency) < 50);

  let findingsHtml = `
    <div style="margin-bottom: 20px;">
      <h3 style="color:var(--white); margin-bottom:10px; font-family:'Barlow Condensed'; font-size:20px;">Key Findings</h3>
      <ul style="color:var(--text2); padding-left:20px; line-height:1.8;">
        <li>Overall TAT Compliance today is <strong>${tatRate}%</strong>.</li>
        ${worstMilestone ? `<li>The most frequently breached SLA is <strong><span style="color:var(--red);">${worstMilestone}</span></strong> (${milestoneCounts[worstMilestone]} breaches).</li>` : `<li>All audited SLAs were met today.</li>`}
        <li>Team average operational efficiency is <strong>${avgEff.toFixed(0)}%</strong>.</li>
        ${dailyBlockers.length > 0 ? `<li><strong>${dailyBlockers.length} active blockers</strong> were reported by the team.</li>` : `<li>No major operational blockers were reported today.</li>`}
      </ul>
    </div>
  `;

  let actionsHtml = `
    <div>
      <h3 style="color:var(--white); margin-bottom:10px; font-family:'Barlow Condensed'; font-size:20px;">Recommended Head of Sales Actions</h3>
      <div style="display:flex; flex-direction:column; gap:10px;">
  `;

  if (worstMilestone) {
    actionsHtml += `<div style="background:rgba(255,77,77,0.1); border-left:3px solid var(--red); padding:12px; border-radius:4px;"><strong style="color:var(--red);">Process Bottleneck:</strong> Review the workflow for <strong>${worstMilestone}</strong>. Remind the team of the framework benchmark to prevent lead leakage.</div>`;
  }
  
  if (dailyBlockers.length > 0) {
    actionsHtml += `<div style="background:rgba(255,179,71,0.1); border-left:3px solid var(--amber); padding:12px; border-radius:4px;"><strong style="color:var(--amber);">Resolve Blockers:</strong> Review the <a href="#" onclick="switchSection('blockers-view')" style="color:var(--cyan);">Team Blockers tab</a> and address the ${dailyBlockers.length} issues raised in tomorrow's stand-up.</div>`;
  }

  if (lowEffReps.length > 0) {
    actionsHtml += `<div style="background:rgba(41,171,226,0.1); border-left:3px solid var(--cyan); padding:12px; border-radius:4px;"><strong style="color:var(--cyan);">Efficiency Coaching:</strong> ${lowEffReps.length} reps fell below 50% productive time today. Check call volume expectations vs. manual admin tasks.</div>`;
  }

  if (!worstMilestone && dailyBlockers.length === 0 && lowEffReps.length === 0) {
    actionsHtml += `<div style="background:rgba(74,222,128,0.1); border-left:3px solid var(--green); padding:12px; border-radius:4px;"><strong style="color:var(--green);">All Clear:</strong> Metrics look healthy. Focus on pipeline progression and closing.</div>`;
  }

  actionsHtml += `</div></div>`;

  container.innerHTML = `
    <div class="card" style="border-top: 3px solid var(--cyan);">
      ${findingsHtml}
      ${actionsHtml}
    </div>
  `;
}

// --- BLOCKERS VIEW ---
function renderBlockers() {
  const tbody = document.getElementById('blockers-body');
  if (!tbody) return;

  const selectedDate = document.getElementById('report-date').value;
  const dailyBlockers = allReports.filter(r => r.date === selectedDate && r.blockers && r.blockers.trim() !== '');

  if (dailyBlockers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text3);">No blockers or challenges reported for ${selectedDate}.</td></tr>`;
    return;
  }

  tbody.innerHTML = dailyBlockers.map(r => {
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px; color: var(--text2);">${r.teamIcon} ${r.team}</td>
        <td style="padding: 10px; color: var(--white); font-weight: 500;">${r.member}</td>
        <td style="padding: 10px; color: var(--orange); font-weight: 500; font-size: 13px; line-height: 1.4;">${r.blockers}</td>
      </tr>
    `;
  }).join('');
}

// --- LEADERBOARD ---
function renderLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;
  
  const selectedDate = document.getElementById('report-date').value;
  const dailyDruLogs = druLogs.filter(log => log.date === selectedDate);
  
  let teamStats = {};
  dailyDruLogs.forEach(log => {
    if(!teamStats[log.teamName]) {
      teamStats[log.teamName] = { name: log.teamName, icon: log.teamIcon, revenue: 0, dru: 0 };
    }
    teamStats[log.teamName].revenue += log.collected;
    teamStats[log.teamName].dru += log.druAchieved;
  });

  let sortedTeams = Object.values(teamStats).sort((a, b) => b.revenue - a.revenue);

  if (sortedTeams.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text3); padding:40px;">No revenue logged for ${selectedDate}.</div>`;
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

// --- TEAMS EOD LOGIC ---
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
  const selectedDate = document.getElementById('report-date').value; 

  grid.innerHTML = eodData.activeTeam.members.map(m => {
    const memberLeads = globalLeads.filter(l => 
      l.owner === m && 
      l.teamId === eodData.activeTeam.id && 
      l.date === selectedDate
    );
    
    let leadsHTML = memberLeads.map(l => {
      let statusColor = l.status === 'Done' ? 'var(--green)' : l.status === 'Negative' ? 'var(--red)' : 'var(--amber)';
      let actionButtons = l.status === 'Pending' ? `
        <div style="display:flex; gap:5px; margin-top:6px;">
          <button onclick="event.stopPropagation(); updateLeadStatus('${l.id}', 'Done')" style="flex:1; background:rgba(74,222,128,0.15); color:var(--green); border:1px solid rgba(74,222,128,0.3); border-radius:3px; font-size:10px; padding:4px; cursor:pointer; font-weight:bold;">✓ Done</button>
          <button onclick="event.stopPropagation(); updateLeadStatus('${l.id}', 'Negative')" style="flex:1; background:rgba(255,77,77,0.15); color:var(--red); border:1px solid rgba(255,77,77,0.3); border-radius:3px; font-size:10px; padding:4px; cursor:pointer; font-weight:bold;">✕ Negative</button>
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

  const pendingLeads = globalLeads.filter(l => l.teamId === eodData.activeTeam.id && l.status === 'Pending');
  const pendingBody = document.getElementById('team-pending-leads-body');
  
  if (pendingBody) {
    if (pendingLeads.length === 0) {
      pendingBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text3);">No pending leads for this team. Great job!</td></tr>';
    } else {
      pendingLeads.sort((a,b) => new Date(a.date) - new Date(b.date)); 
      
      pendingBody.innerHTML = pendingLeads.map(l => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 10px; color: var(--text2);">${l.date}</td>
          <td style="padding: 10px; color: var(--white); font-weight: 500;">${l.owner}</td>
          <td style="padding: 10px; color: var(--white);">${l.name}</td>
          <td style="padding: 10px; color: var(--text2); font-family: 'DM Mono';">${l.phone}</td>
          <td style="padding: 10px; color: var(--cyan);">${l.type}</td>
          <td style="padding: 10px; color: var(--amber); font-weight: bold;">${l.status}</td>
          <td style="padding: 10px;">
            <div style="display:flex; gap:5px;">
              <button onclick="updateLeadStatus('${l.id}', 'Done')" style="background:rgba(74,222,128,0.15); color:var(--green); border:1px solid rgba(74,222,128,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold;">✓ Done</button>
              <button onclick="updateLeadStatus('${l.id}', 'Negative')" style="background:rgba(255,77,77,0.15); color:var(--red); border:1px solid rgba(255,77,77,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold;">✕ Neg</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  }
}

function updateLeadStatus(id, newStatus) { db.collection("globalLeads").doc(id).update({ status: newStatus }); }

function eodAddMember() {
  const nameInput = document.getElementById('new-member-name');
  if (!nameInput.value.trim()) return;
  eodData.activeTeam.members.push(nameInput.value.trim());
  nameInput.value = '';
  initDruForm(); initTatForm(); eodRenderRoster();
}
function eodRemoveMember(name) {
  if (confirm(`Remove ${name}?`)) {
    eodData.activeTeam.members = eodData.activeTeam.members.filter(m => m !== name);
    initDruForm(); initTatForm(); eodRenderRoster();
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
      <p style="font-size:11px; color:var(--text3); margin-bottom:10px;">Log specific Prospects or Follow-ups.</p>
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
        <span id="badge-benchmark" style="padding: 4px 10px; font-size:11px; font-weight:bold; border-radius: 20px; background: rgba(255,77,77,0.15); color: var(--red);">✗ Core Benchmark Not Met</span>
        <span id="badge-highly" style="padding: 4px 10px; font-size:11px; font-weight:bold; border-radius: 20px; background: rgba(255,77,77,0.15); color: var(--red);">✗ Under 3.5hrs</span>
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

  if (calls >= 200 || talkTimeMins >= 180) { badgeBench.textContent = '✓ Core Benchmark Met'; badgeBench.style.background = 'rgba(74,222,128,0.15)'; badgeBench.style.color = 'var(--green)'; } 
  else { badgeBench.textContent = `✗ Missed Core`; badgeBench.style.background = 'rgba(255,77,77,0.15)'; badgeBench.style.color = 'var(--red)'; }

  if (totalProductiveHours >= 3.5) { badgeHighly.textContent = '⚡ Highly Efficient'; badgeHighly.style.background = 'rgba(41,171,226,0.15)'; badgeHighly.style.color = 'var(--cyan)'; document.getElementById('calc-pct').style.color = 'var(--cyan)'; } 
  else { badgeHighly.textContent = '✗ Under 3.5hrs'; badgeHighly.style.background = 'rgba(255,77,77,0.15)'; badgeHighly.style.color = 'var(--red)'; document.getElementById('calc-pct').style.color = 'var(--white)'; }
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

  const selectedDate = document.getElementById('report-date').value;

  formLeads.forEach(l => {
    if(l.name.trim() !== '') {
      db.collection("globalLeads").add({ 
        type: l.type, 
        name: l.name, 
        phone: l.phone, 
        status: 'Pending', 
        owner: eodData.activeMember, 
        teamId: eodData.activeTeam.id,
        date: selectedDate, 
        timestamp: firebase.firestore.FieldValue.serverTimestamp() 
      });
    }
  });
  
  const calls = parseFloat(currentFormState.calls) || 0;
  const talkTimeMins = parseFloat(currentFormState.tt) || 0;
  const totalProductiveHours = (talkTimeMins / 60) + (extraTasks.reduce((sum, task) => sum + task.minutes, 0) / 60);
  const efficiencyPct = Math.min((totalProductiveHours / 7) * 100, 100).toFixed(0);

  db.collection("eodReports").add({
    member: eodData.activeMember,
    team: eodData.activeTeam.name,
    teamIcon: eodData.activeTeam.icon,
    date: selectedDate, 
    calls: calls,
    talkTime: talkTimeMins,
    efficiency: efficiencyPct,
    blockers: currentFormState.blockers,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  formLeads = []; alert(`✅ ${eodData.activeMember}'s EOD submitted successfully for ${selectedDate}!`); eodGoToTeam(); 
}

// --- ALL REPORTS TAB (NEON BLINK) ---
function renderAllReports() {
  const tbody = document.getElementById('all-reports-body');
  const title = document.getElementById('reports-table-title');
  if (!tbody) return;

  const selectedDate = document.getElementById('report-date').value;
  const dailyReports = allReports.filter(r => r.date === selectedDate);
  const dateObj = new Date(selectedDate);
  
  title.innerHTML = `Reports for <span style="color:var(--cyan);">${dateObj.toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>`;

  if (dailyReports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text3);">No EOD reports submitted on ${selectedDate}.</td></tr>`;
    return;
  }

  const efficiencies = dailyReports.map(r => parseFloat(r.efficiency));
  const maxEff = Math.max(...efficiencies);
  const minEff = Math.min(...efficiencies);
  const showNeon = dailyReports.length > 1 && maxEff !== minEff;

  tbody.innerHTML = dailyReports.map(r => {
    let eff = parseFloat(r.efficiency);
    let effClass = "";
    let effColor = eff >= 50 ? 'var(--cyan)' : 'var(--white)';

    if (showNeon) {
      if (eff === maxEff) effClass = "neon-green-blink";
      else if (eff === minEff) effClass = "neon-red-blink";
    }

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px; color: var(--text2);">${r.date}</td>
        <td style="padding: 10px; color: var(--white); font-weight: 500;">${r.member}</td>
        <td style="padding: 10px; color: var(--text2);">${r.teamIcon} ${r.team}</td>
        <td style="padding: 10px; color: ${effClass ? 'inherit' : effColor}; font-weight:bold;" class="${effClass}">${r.efficiency}%</td>
        <td style="padding: 10px; color: var(--text2);">${r.calls}</td>
        <td style="padding: 10px; color: var(--text2);">${r.talkTime}m</td>
        <td style="padding: 10px; color: var(--text3); font-size: 11px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${r.blockers || 'None'}">${r.blockers || '—'}</td>
      </tr>
    `;
  }).join('');
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
  const selectedDate = document.getElementById('report-date').value; 

  db.collection("druLogs").add({ 
    teamIcon: team.icon, 
    teamName: team.name, 
    druTarget: getNum('dru-target'), 
    druAchieved: getNum('dru-achieved'), 
    dprTarget: getNum('dru-dpr-target'), 
    collected: getNum('dru-collected'), 
    date: selectedDate,
    timestamp: firebase.firestore.FieldValue.serverTimestamp() 
  });
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

  const selectedDate = document.getElementById('report-date').value;
  const dailyDruLogs = druLogs.filter(log => log.date === selectedDate);

  summary.innerHTML = `
    <div class="metric-card"><div class="metric-label">Total DRU (Target)</div><div class="metric-val" style="color:var(--text2);">${dailyDruLogs.reduce((s, l) => s + l.druTarget, 0)}</div></div>
    <div class="metric-card"><div class="metric-label">Total DRU (Achieved)</div><div class="metric-val" style="color:var(--cyan);">${dailyDruLogs.reduce((s, l) => s + l.druAchieved, 0)}</div></div>
    <div class="metric-card"><div class="metric-label">Total DPR (Target)</div><div class="metric-val" style="color:var(--text2);">₹${dailyDruLogs.reduce((s, l) => s + l.dprTarget, 0).toLocaleString('en-IN')}</div></div>
    <div class="metric-card"><div class="metric-label">Total Collected</div><div class="metric-val" style="color:var(--green);">₹${dailyDruLogs.reduce((s, l) => s + l.collected, 0).toLocaleString('en-IN')}</div></div>
  `;

  if (dailyDruLogs.length === 0) return tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text3);">No DRU/DPR logged for ${selectedDate}.</td></tr>`;

  tbody.innerHTML = dailyDruLogs.map(l => {
    let druBtn = l.druAchieved >= l.druTarget && l.druTarget > 0 ? `<button onclick="updateDruProgress('${l.id}', 'dru')" style="background:rgba(74,222,128,0.15); color:var(--green); border:1px solid rgba(74,222,128,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold; margin-right:5px;">✓ DRU Met</button>` : l.druAchieved > 0 ? `<button onclick="updateDruProgress('${l.id}', 'dru')" style="background:rgba(255,179,71,0.15); color:var(--amber); border:1px solid rgba(255,179,71,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold; margin-right:5px;">⏳ Pending (${l.druAchieved}/${l.druTarget})</button>` : `<button onclick="updateDruProgress('${l.id}', 'dru')" style="background:var(--bg4); color:var(--text3); border:1px solid var(--border); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; margin-right:5px;">? DRU Pending</button>`;
    let dprBtn = l.collected >= l.dprTarget && l.dprTarget > 0 ? `<button onclick="updateDruProgress('${l.id}', 'dpr')" style="background:rgba(74,222,128,0.15); color:var(--green); border:1px solid rgba(74,222,128,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold;">✓ DPR Met</button>` : l.collected > 0 ? `<button onclick="updateDruProgress('${l.id}', 'dpr')" style="background:rgba(255,179,71,0.15); color:var(--amber); border:1px solid rgba(255,179,71,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold;">⏳ Pending (₹${l.collected})</button>` : `<button onclick="updateDruProgress('${l.id}', 'dpr')" style="background:var(--bg4); color:var(--text3); border:1px solid var(--border); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer;">? DPR Pending</button>`;

    return `<tr style="border-bottom: 1px solid var(--border);"><td style="padding: 10px; color: var(--white); font-weight: 500;"><span style="margin-right:5px;">${l.teamIcon}</span> ${l.teamName}</td><td style="padding: 10px; color: var(--text2);">${l.druTarget}</td><td style="padding: 10px; color: var(--cyan); font-weight:bold;">${l.druAchieved}</td><td style="padding: 10px; color: var(--text2);">₹${l.dprTarget.toLocaleString('en-IN')}</td><td style="padding: 10px; color: var(--green); font-weight:bold;">₹${l.collected.toLocaleString('en-IN')}</td><td style="padding: 10px;">${druBtn} ${dprBtn}</td><td style="padding: 10px; text-align: right;"><button class="del-btn" onclick="deleteDruLog('${l.id}')">✕</button></td></tr>`;
  }).join('');
}

// --- TAB: TAT TRACKER ---
function initTatForm() {
  const teamSelect = document.getElementById('tat-team');
  if (!teamSelect) return;
  teamSelect.innerHTML = '<option value="">Select Team</option>' + eodData.teams.map(t => `<option value="${t.id}">${t.icon} ${t.name}</option>`).join('');
}

function updateTatMembers() {
  const teamId = document.getElementById('tat-team').value;
  const memberSelect = document.getElementById('tat-member');
  if (!teamId) {
    memberSelect.innerHTML = '<option value="">Select Member</option>';
    return;
  }
  const team = eodData.teams.find(t => t.id === teamId);
  memberSelect.innerHTML = '<option value="">Select Member</option>' + team.members.map(m => `<option value="${m}">${m}</option>`).join('');
}

function addTatLog() {
  const teamId = document.getElementById('tat-team').value;
  const member = document.getElementById('tat-member').value;
  const leadName = getStr('tat-lead');
  const milestone = document.getElementById('tat-milestone').value;
  const timeTaken = getNum('tat-time');
  const unit = document.getElementById('tat-unit').value;
  const selectedDate = document.getElementById('report-date').value;

  if (!teamId || !member || !leadName || !milestone || timeTaken <= 0) {
    return alert('Please fill out all TAT audit fields properly.');
  }

  const team = eodData.teams.find(t => t.id === teamId);
  const benchmark = TAT_BENCHMARKS[milestone];
  
  let timeInMins = unit === 'hrs' ? timeTaken * 60 : timeTaken;
  let benchInMins = benchmark.unit === 'hrs' ? benchmark.max * 60 : benchmark.max;
  const isMet = timeInMins <= benchInMins;

  db.collection("tatLogs").add({
    teamIcon: team.icon,
    teamName: team.name,
    member: member,
    leadName: leadName,
    milestone: milestone,
    timeTaken: timeTaken,
    unit: unit,
    benchmarkMax: benchmark.max,
    benchmarkUnit: benchmark.unit,
    isMet: isMet,
    date: selectedDate,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById('tat-lead').value = '';
  document.getElementById('tat-milestone').value = '';
  document.getElementById('tat-time').value = '';
}

function deleteTatLog(id) { if(confirm("Delete this TAT audit?")) db.collection("tatLogs").doc(id).delete(); }

function renderTatLogs() {
  const tbody = document.getElementById('tat-log-body');
  if (!tbody) return;

  const selectedDate = document.getElementById('report-date').value;
  const dailyTat = tatLogs.filter(log => log.date === selectedDate);

  const total = dailyTat.length;
  const met = dailyTat.filter(l => l.isMet).length;
  const breached = total - met;
  const rate = total > 0 ? Math.round((met / total) * 100) : 0;

  document.getElementById('tat-total').textContent = total;
  document.getElementById('tat-met').textContent = met;
  document.getElementById('tat-breach').textContent = breached;
  document.getElementById('tat-rate').textContent = rate + '%';

  if (dailyTat.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text3);">No TAT audits logged for ${selectedDate}.</td></tr>`;
    return;
  }

  tbody.innerHTML = dailyTat.map(l => {
    let statusBadge = l.isMet ? `<span class="badge-pill badge-green">✓ SLA Met</span>` : `<span class="badge-pill badge-red">✕ Breached</span>`;
    let timeColor = l.isMet ? 'var(--green)' : 'var(--red)';
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px; color: var(--white); font-weight: 500;"><div>${l.member}</div><div style="font-size:10px; color:var(--text3);">${l.teamIcon} ${l.teamName}</div></td>
        <td style="padding: 10px; color: var(--text2);">${l.leadName}</td>
        <td style="padding: 10px; color: var(--cyan); font-weight:bold;">${l.milestone}<div style="font-size:9px; color:var(--text3); font-weight:normal; margin-top:2px;">Target: ${l.benchmarkMax} ${l.benchmarkUnit}</div></td>
        <td style="padding: 10px; color: ${timeColor}; font-weight:bold;">${l.timeTaken} ${l.unit}</td>
        <td style="padding: 10px;">${statusBadge}</td>
        <td style="padding: 10px; text-align: right;"><button class="del-btn" onclick="deleteTatLog('${l.id}')">✕</button></td>
      </tr>
    `;
  }).join('');
}

// --- TAB 3: FUNNEL BREAKDOWN ---
function renderFunnel() {
  const autoContainer = document.getElementById('auto-pipeline-stats');
  const title = document.getElementById('pipeline-title');
  const selectedDate = document.getElementById('report-date').value;
  const dateObj = new Date(selectedDate);
  const dailyLeads = globalLeads.filter(log => log.date === selectedDate);

  if (title) title.innerHTML = `Live Lead Pipeline for <span style="color:var(--white);">${dateObj.toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>`;

  const tPros = dailyLeads.filter(l => l.type === 'Prospect').length; 
  const tFol = dailyLeads.filter(l => l.type === 'Follow-up').length; 
  const tDone = dailyLeads.filter(l => l.status === 'Done').length; 
  const tLost = dailyLeads.filter(l => l.status === 'Negative').length;
  
  if (autoContainer) {
    autoContainer.innerHTML = `<div class="metric-card"><div class="metric-label">Logged Prospects</div><div class="metric-val" style="color:var(--cyan);">${tPros}</div></div><div class="metric-card"><div class="metric-label">Logged Follow-Ups</div><div class="metric-val" style="color:var(--amber);">${tFol}</div></div><div class="metric-card"><div class="metric-label">Done (Won)</div><div class="metric-val" style="color:var(--green);">${tDone}</div></div><div class="metric-card"><div class="metric-label">Negative (Lost)</div><div class="metric-val" style="color:var(--red);">${tLost}</div></div><div class="metric-card" style="grid-column: span 2;"><div class="metric-label">Automated Win Rate</div><div class="metric-val">${(tPros+tFol+tDone+tLost)>0 ? Math.round((tDone/(tPros+tFol+tDone+tLost))*100) : 0}%</div></div>`;
  }

  const teamTable = document.getElementById('team-wise-pipeline-body');
  if (teamTable) {
    if (dailyLeads.length === 0) teamTable.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text3);">No leads logged on ${selectedDate}.</td></tr>`;
    else teamTable.innerHTML = eodData.teams.map(t => {
      const lds = dailyLeads.filter(l => l.teamId === t.id); if(lds.length === 0) return '';
      return `<tr style="border-bottom: 1px solid var(--border);"><td style="padding: 10px; color: var(--white); font-weight: 600;"><span style="margin-right:5px;">${t.icon}</span>${t.name}</td><td style="padding: 10px; color: var(--cyan); font-weight:bold;">${lds.filter(l => l.type === 'Prospect').length}</td><td style="padding: 10px; color: var(--amber); font-weight:bold;">${lds.filter(l => l.type === 'Follow-up').length}</td><td style="padding: 10px; color: var(--green); font-weight:bold;">${lds.filter(l => l.status === 'Done').length}</td><td style="padding: 10px; color: var(--red); font-weight:bold;">${lds.filter(l => l.status === 'Negative').length}</td></tr>`;
    }).join('');
  }

  const visContainer = document.getElementById('funnel-vis');
  const tableBody = document.getElementById('funnel-body');
  
  if (state.funnel.length === 0) {
    if(visContainer) visContainer.innerHTML = '<p style="text-align:center; color:var(--text3); font-size:13px; padding:20px;">No stages added manually yet.</p>';
    if(tableBody) tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text3);">No data</td></tr>';
    return;
  }

  const maxCount = Math.max(...state.funnel.map(r => r.count), 1);

  if(visContainer) {
    visContainer.innerHTML = state.funnel.map((r, i) => {
      const pct = Math.round((r.count / maxCount) * 100);
      const prev = state.funnel[i - 1];
      let dropHtml = '';
      if (prev && prev.count > 0) {
        const drop = Math.round(((prev.count - r.count) / prev.count) * 100);
        const badgeClass = drop > 40 ? 'badge-red' : drop > 20 ? 'badge-amber' : 'badge-green';
        dropHtml = `<div class="funnel-drop"><span class="badge-pill ${badgeClass}">${drop}% drop-off</span></div>`;
      }
      return `<div class="funnel-stage"><div class="funnel-row"><div class="funnel-name">${r.stage}</div><div class="funnel-bar-bg"><div class="funnel-bar-fill" style="width:${pct}%"></div></div><div class="funnel-count">${r.count}</div></div>${dropHtml}</div>`;
    }).join('');
  }

  if(tableBody) {
    tableBody.innerHTML = state.funnel.map((r, i) => {
      const prev = state.funnel[i - 1];
      let dropCell = '—';
      if (prev && prev.count > 0) {
        const drop = Math.round(((prev.count - r.count) / prev.count) * 100);
        const badgeClass = drop > 40 ? 'badge-red' : drop > 20 ? 'badge-amber' : 'badge-green';
        dropCell = `<span class="badge-pill ${badgeClass}">${drop}%</span>`;
      }
      return `<tr style="border-bottom: 1px solid var(--border);"><td style="padding: 10px; color: var(--white); font-weight: 500;">${r.stage}</td><td style="padding: 10px; color: var(--text2);">${r.count}</td><td style="padding: 10px;">${dropCell}</td><td style="padding: 10px; color: var(--text2);">${r.issue || '—'}</td><td style="padding: 10px; color: var(--text2);">${r.owner || '—'}</td><td style="padding: 10px; text-align: right;"><button class="del-btn" onclick="deleteFunnel(${i})">✕</button></td></tr>`;
    }).join('');
  }
}

function addFunnelRow() {
  const stage = getStr('f-stage'), count = getNum('f-count');
  if (!stage) return alert('Please enter a stage name.');
  state.funnel.push({ stage, count, issue: getStr('f-issue'), owner: getStr('f-owner') });
  document.getElementById('f-stage').value = ''; document.getElementById('f-count').value = '';
  document.getElementById('f-issue').value = ''; document.getElementById('f-owner').value = '';
  renderFunnel();
}
function deleteFunnel(index) { state.funnel.splice(index, 1); renderFunnel(); }
