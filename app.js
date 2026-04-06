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

// Calendar Navigation States
let currentReportsCalDate = new Date(); 
let currentFunnelCalDate = new Date(); 

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
  document.getElementById('report-date').value = dateStr;
  const selectedDateObj = new Date(dateStr);
  document.getElementById('topbar-date').textContent = selectedDateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  state.funnel = []; 
  refreshAllViews();
}

function jumpToToday() {
  setMasterDate(new Date().toISOString().split('T')[0]);
  currentReportsCalDate = new Date();
  currentFunnelCalDate = new Date();
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
  renderReportsCalendar();
  renderAllReports();
  renderFunnelCalendar();
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

// --- NEW TAB: AI INSIGHTS & ACTIONS ---
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
    actionsHtml += `<div style="background:rgba(232,64,64,0.1); border-left:3px solid var(--red); padding:12px; border-radius:4px;"><strong style="color:var(--red);">Process Bottleneck:</strong> Review the workflow for <strong>${worstMilestone}</strong>. Remind the team of the framework benchmark to prevent lead leakage.</div>`;
  }
  
  if (dailyBlockers.length > 0) {
    actionsHtml += `<div style="background:rgba(245,166,35,0.1); border-left:3px solid var(--amber); padding:12px; border-radius:4px;"><strong style="color:var(--amber);">Resolve Blockers:</strong> Review the <a href="#" onclick="switchSection('blockers-view')" style="color:var(--cyan);">Team Blockers tab</a> and address the ${dailyBlockers.length} issues raised in tomorrow's stand-up.</div>`;
  }

  if (lowEffReps.length > 0) {
    actionsHtml += `<div style="background:rgba(41,171,226,0.1); border-left:3px solid var(--cyan); padding:12px; border-radius:4px;"><strong style="color:var(--cyan);">Efficiency Coaching:</strong> ${lowEffReps.length} reps fell below 50% productive time today. Check call volume expectations vs. manual admin tasks.</div>`;
  }

  if (!worstMilestone && dailyBlockers.length === 0 && lowEffReps.length === 0) {
    actionsHtml += `<div style="background:rgba(61,203,122,0.1); border-left:3px solid var(--green); padding:12px; border-radius:4px;"><strong style="color:var(--green);">All Clear:</strong> Metrics look healthy. Focus on pipeline progression and closing.</div>`;
  }

  actionsHtml += `</div></div>`;

  container.innerHTML = `
    <div class="card" style="border-top: 3px solid var(--cyan);">
      ${findingsHtml}
      ${actionsHtml}
    </div>
  `;
}


// --- TAB: BLOCKERS ---
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


// --- TAB 0: LEADERBOARD ---
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
  const selectedDate = document.getElementById('report-date').value; 

  grid.innerHTML = eodData.activeTeam.members.map(m => {
    // FIX: Daily view strictly shows ONLY leads logged on the selected date.
    const memberLeads = globalLeads.filter(l => 
      l.owner === m && 
      l.teamId === eodData.activeTeam.id && 
      l.date === selectedDate
    );
    
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

  // NEW: Calculate and render the Team Backlog (All Pending Leads for this team)
  const pendingLeads = globalLeads.filter(l => 
    l.teamId === eodData.activeTeam.id && 
    l.status === 'Pending'
  );
  
  const pendingBody = document.getElementById('team-pending-leads-body');
  if (pendingBody) {
    if (pendingLeads.length === 0) {
      pendingBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text3);">No pending leads for this team. Great job!</td></tr>';
    } else {
      pendingLeads.sort((a,b) => new Date(a.date) - new Date(b.date)); // Sort oldest first
      
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
              <button onclick="updateLeadStatus('${l.id}', 'Done')" style="background:rgba(61,203,122,0.15); color:var(--green); border:1px solid rgba(61,203,122,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold;">✓ Done</button>
              <button onclick="updateLeadStatus('${l.id}', 'Negative')" style="background:rgba(232,64,64,0.15); color:var(--red); border:1px solid rgba(232,64,64,0.3); border-radius:3px; font-size:10px; padding:4px 8px; cursor:pointer; font-weight:bold;">✕ Neg</button>
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
  document
