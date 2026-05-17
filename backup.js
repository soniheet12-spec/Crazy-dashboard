/**
 * Log7 Capital Dashboard — Backup System
 * Stores/restores all localStorage data to Google Drive as JSON files.
 *
 * DRIVE FOLDER ID: 1rwJ3Gx992uo5Ol41-ry2oIvBwHWe4J5A
 * Folder URL: https://drive.google.com/drive/folders/1rwJ3Gx992uo5Ol41-ry2oIvBwHWe4J5A
 */

const BACKUP_CONFIG = {
  DRIVE_FOLDER_ID: '1rwJ3Gx992uo5Ol41-ry2oIvBwHWe4J5A',
  AUTO_INTERVAL_HOURS: 6,
  MAX_BACKUPS_TO_KEEP: 20,
  BACKUP_PREFIX: 'log7_backup_',
  SETTINGS_KEY: 'log7_backup_settings',
  HISTORY_KEY: 'log7_backup_history',
  TOKEN_KEY: 'log7_gapi_token',
};

// ─── Keys to back up (all real l7_ keys used by the dashboard) ────────
const BACKUP_KEYS = [
  'l7_net_investors',
  'l7_net_startups',
  'l7_net_partnerships',
  'l7_net_inv_sheet_cache',
  'l7_pipeline',
  'l7_audit',
  'l7_match_scores',
  'l7_key',
  'l7_theme',
  'l7_user',
  'l7_capital',
  'l7_matching_mode',
  'l7_settings_last_saved',
  'l7_ic_voters',
  'l7_email_template',
  'l7_email_subject_template',
  'l7_whatsapp_template',
  'l7_outreach_template',
];

// ─── Collect all localStorage data ─────────────────────────────────
function collectSnapshot() {
  const snapshot = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    source: window.location.hostname,
    data: {},
    meta: { totalKeys: 0, sizeBytes: 0 },
  };

  BACKUP_KEYS.forEach(function(key) {
    var val = localStorage.getItem(key);
    if (val !== null) snapshot.data[key] = val;
  });

  // Also catch any l7_ prefixed keys not in the explicit list
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith('l7_') && !(k in snapshot.data)) {
      snapshot.data[k] = localStorage.getItem(k);
    }
  }

  var jsonStr = JSON.stringify(snapshot.data);
  snapshot.meta.totalKeys = Object.keys(snapshot.data).length;
  snapshot.meta.sizeBytes = new Blob([jsonStr]).size;
  return snapshot;
}

// ─── Get Drive access token ──────────────────────────────────────────
function getDriveToken() {
  return sessionStorage.getItem(BACKUP_CONFIG.TOKEN_KEY) || null;
}

// ─── Upload snapshot to Google Drive ────────────────────────────────
async function uploadToDrive(snapshot) {
  var token = getDriveToken();
  if (!token) throw new Error('Not connected to Google Drive. Click "Connect Google Drive" first.');

  var filename = BACKUP_CONFIG.BACKUP_PREFIX + snapshot.timestamp.replace(/[:.]/g, '-') + '.json';
  var body = JSON.stringify(snapshot, null, 2);
  var boundary = 'log7backup_boundary';
  var metadata = {
    name: filename,
    parents: [BACKUP_CONFIG.DRIVE_FOLDER_ID],
    mimeType: 'application/json',
    description: 'Log7 backup — ' + snapshot.meta.totalKeys + ' keys, ' + formatBytes(snapshot.meta.sizeBytes),
  };

  var multipart = [
    '--' + boundary,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    '--' + boundary,
    'Content-Type: application/json',
    '',
    body,
    '--' + boundary + '--',
  ].join('\r\n');

  var resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'multipart/related; boundary=' + boundary,
    },
    body: multipart,
  });

  if (!resp.ok) {
    var err = await resp.json();
    if (resp.status === 401) {
      sessionStorage.removeItem(BACKUP_CONFIG.TOKEN_KEY);
      throw new Error('Google Drive session expired. Please reconnect.');
    }
    throw new Error((err && err.error && err.error.message) || 'Drive upload failed: ' + resp.status);
  }

  return await resp.json();
}

// ─── List backups from Drive ─────────────────────────────────────────
async function listBackupsFromDrive() {
  var token = getDriveToken();
  if (!token) return [];

  var q = encodeURIComponent(
    "'" + BACKUP_CONFIG.DRIVE_FOLDER_ID + "' in parents and name contains '" + BACKUP_CONFIG.BACKUP_PREFIX + "' and trashed=false"
  );

  var resp = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=' + q + '&orderBy=createdTime+desc&pageSize=30&fields=files(id,name,createdTime,description,size)',
    { headers: { Authorization: 'Bearer ' + token } }
  );

  if (!resp.ok) {
    if (resp.status === 401) sessionStorage.removeItem(BACKUP_CONFIG.TOKEN_KEY);
    return [];
  }
  var data = await resp.json();
  return data.files || [];
}

// ─── Download + restore a backup ─────────────────────────────────────
async function restoreFromDrive(fileId, filename) {
  var token = getDriveToken();
  if (!token) throw new Error('Not connected to Google Drive.');

  var resp = await fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media', {
    headers: { Authorization: 'Bearer ' + token },
  });

  if (!resp.ok) throw new Error('Failed to download backup: ' + resp.status);

  var snapshot = await resp.json();
  if (!snapshot || !snapshot.data) throw new Error('Invalid backup file format.');

  // Save emergency snapshot before overwriting
  var emergency = collectSnapshot();
  localStorage.setItem('l7_pre_restore_snapshot', JSON.stringify(emergency));

  var restored = 0;
  Object.entries(snapshot.data).forEach(function(_ref) {
    var key = _ref[0], val = _ref[1];
    localStorage.setItem(key, val);
    restored++;
  });

  addToLocalHistory({
    action: 'restore',
    filename: filename,
    fileId: fileId,
    timestamp: new Date().toISOString(),
    keysRestored: restored,
    fromTimestamp: snapshot.timestamp,
  });

  return { restored: restored, fromTimestamp: snapshot.timestamp };
}

// ─── Local backup history ─────────────────────────────────────────────
function getLocalHistory() {
  try { return JSON.parse(localStorage.getItem(BACKUP_CONFIG.HISTORY_KEY) || '[]'); }
  catch(e) { return []; }
}

function addToLocalHistory(entry) {
  var history = getLocalHistory();
  history.unshift(entry);
  localStorage.setItem(BACKUP_CONFIG.HISTORY_KEY, JSON.stringify(history.slice(0, BACKUP_CONFIG.MAX_BACKUPS_TO_KEEP)));
}

// ─── Settings ─────────────────────────────────────────────────────────
function getBackupSettings() {
  try { return JSON.parse(localStorage.getItem(BACKUP_CONFIG.SETTINGS_KEY) || '{}'); }
  catch(e) { return {}; }
}

function saveBackupSettings(settings) {
  localStorage.setItem(BACKUP_CONFIG.SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Auto-backup scheduler ────────────────────────────────────────────
var _autoBackupTimer = null;

function startAutoBackup() {
  stopAutoBackup();
  var settings = getBackupSettings();
  var intervalHours = settings.intervalHours || BACKUP_CONFIG.AUTO_INTERVAL_HOURS;
  _autoBackupTimer = setInterval(async function() {
    try { await triggerBackup('auto'); }
    catch(e) { console.warn('[Log7 Backup] Auto-backup failed:', e.message); }
  }, intervalHours * 3600000);
  console.log('[Log7 Backup] Auto-backup every ' + intervalHours + 'h');
}

function stopAutoBackup() {
  if (_autoBackupTimer) { clearInterval(_autoBackupTimer); _autoBackupTimer = null; }
}

// ─── Main trigger ──────────────────────────────────────────────────────
async function triggerBackup(source) {
  source = source || 'manual';
  var snapshot = collectSnapshot();
  var file = await uploadToDrive(snapshot);

  addToLocalHistory({
    action: 'backup',
    source: source,
    filename: file.name,
    fileId: file.id,
    timestamp: snapshot.timestamp,
    keys: snapshot.meta.totalKeys,
    sizeBytes: snapshot.meta.sizeBytes,
  });

  var settings = getBackupSettings();
  settings.lastBackupAt = snapshot.timestamp;
  settings.lastBackupFile = file.name;
  saveBackupSettings(settings);

  return { file: file, snapshot: snapshot };
}

// ─── Helpers ──────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  var diff = Date.now() - new Date(isoString).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Render backup panel UI ────────────────────────────────────────────
function renderBackupPanel(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var settings = getBackupSettings();
  var history = getLocalHistory();
  var snap = collectSnapshot();
  var token = getDriveToken();
  var connected = !!token;

  container.innerHTML = [
    '<div class="backup-panel">',

    // Header
    '<div class="backup-header">',
    '  <div>',
    '    <div class="backup-title">&#128190; Data Backup</div>',
    '    <div class="backup-subtitle">All dashboard data backed up to Google Drive</div>',
    '  </div>',
    '  <div class="backup-status-pill ' + (settings.lastBackupAt ? 'status-ok' : 'status-warn') + '">',
    settings.lastBackupAt ? '&#9679; Last: ' + formatRelativeTime(settings.lastBackupAt) : '&#9888; Never backed up',
    '  </div>',
    '</div>',

    // Connect / disconnect
    '<div class="backup-connect-row">',
    connected
      ? '<div class="backup-connected-badge">&#10003; Google Drive connected</div>'
        + '<button class="btn-backup-disconnect" onclick="window._backupDisconnect()">Disconnect</button>'
      : '<button class="btn-backup-connect" onclick="window._backupConnect()">&#128279; Connect Google Drive</button>',
    '</div>',

    // Actions
    '<div class="backup-actions">',
    '  <button class="btn-backup-now" onclick="window._backupNow(this)" ' + (!connected ? 'disabled title="Connect Google Drive first"' : '') + '>',
    '    <span>&#8679;</span> Back Up Now',
    '  </button>',
    '  <button class="btn-backup-restore" onclick="window._openRestoreModal()" ' + (!connected ? 'disabled title="Connect Google Drive first"' : '') + '>',
    '    <span>&#8681;</span> Restore',
    '  </button>',
    '  <a href="https://drive.google.com/drive/folders/1rwJ3Gx992uo5Ol41-ry2oIvBwHWe4J5A" target="_blank" class="btn-backup-drive">',
    '    &#128193; Open Drive Folder',
    '  </a>',
    '</div>',

    // Auto-backup interval
    '<div class="backup-config">',
    '  <label class="config-label">Auto-backup interval</label>',
    '  <div class="config-row">',
    '    <select id="backup-interval-select" onchange="window._saveBackupInterval(this.value)">',
    '      <option value="2"'  + ((settings.intervalHours||6)==2  ?' selected':'') + '>Every 2 hours</option>',
    '      <option value="6"'  + ((settings.intervalHours||6)==6  ?' selected':'') + '>Every 6 hours</option>',
    '      <option value="12"' + ((settings.intervalHours||6)==12 ?' selected':'') + '>Every 12 hours</option>',
    '      <option value="24"' + ((settings.intervalHours||6)==24 ?' selected':'') + '>Every 24 hours</option>',
    '    </select>',
    '    <span class="config-hint">Auto-backup every ' + (settings.intervalHours || 6) + 'h</span>',
    '  </div>',
    '</div>',

    // History
    '<div class="backup-history">',
    '  <div class="history-header"><span>Backup History</span><span class="history-count">' + history.length + ' entries</span></div>',
    '  <div class="history-list">',
    history.length === 0
      ? '<div class="history-empty">No backups yet</div>'
      : history.slice(0, 10).map(function(h) {
          return '<div class="history-item' + (h.action==='restore'?' history-restore':'') + '">'
            + '<div class="history-icon">' + (h.action==='restore' ? '&#8681;' : h.source==='auto' ? '&#8635;' : '&#8679;') + '</div>'
            + '<div class="history-detail">'
            + '<div class="history-name">' + _esc(h.action==='restore' ? 'Restored: ' + (h.fromTimestamp ? new Date(h.fromTimestamp).toLocaleString('en-IN') : h.filename) : (h.filename || 'Backup')) + '</div>'
            + '<div class="history-meta">' + (h.source==='auto'?'Auto':'Manual') + ' &middot; ' + (h.keys||h.keysRestored||'?') + ' keys' + (h.sizeBytes?' &middot; '+formatBytes(h.sizeBytes):'') + '</div>'
            + '</div>'
            + '<div class="history-time">' + formatRelativeTime(h.timestamp) + '</div>'
            + '</div>';
        }).join(''),
    '  </div>',
    '</div>',

    // Stats
    '<div class="backup-stats">',
    '  <div class="stat-box"><div class="stat-val">' + snap.meta.totalKeys + '</div><div class="stat-lbl">Keys in storage</div></div>',
    '  <div class="stat-box"><div class="stat-val">' + formatBytes(snap.meta.sizeBytes) + '</div><div class="stat-lbl">Current size</div></div>',
    '  <div class="stat-box"><div class="stat-val">' + history.filter(function(h){return h.action==='backup';}).length + '</div><div class="stat-lbl">Total backups</div></div>',
    '</div>',

    '</div>',

    // Restore modal
    '<div id="restore-modal" class="modal-overlay" style="display:none">',
    '  <div class="modal-box">',
    '    <div class="modal-title">&#8681; Restore from Backup</div>',
    '    <p class="modal-sub">Choose a backup to restore. Your current data will be saved as an emergency snapshot first.</p>',
    '    <div id="restore-file-list" class="restore-list"><div class="restore-loading">Loading backups from Drive…</div></div>',
    '    <div class="modal-actions"><button onclick="document.getElementById(\'restore-modal\').style.display=\'none\'" class="btn-cancel">Cancel</button></div>',
    '  </div>',
    '</div>',
  ].join('');

  injectBackupStyles();
}

// ─── OAuth / token handlers ────────────────────────────────────────────
var _tokenClient = null;

function _initTokenClient() {
  if (_tokenClient) return;
  if (!window.google || !window.google.accounts) {
    console.warn('[Log7 Backup] Google Identity Services not loaded yet.');
    return;
  }
  _tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: window.LOG7_GOOGLE_CLIENT_ID || '',
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: function(resp) {
      if (resp.error) {
        _backupShowToast('Google Drive sign-in failed: ' + resp.error, 'error');
        return;
      }
      sessionStorage.setItem(BACKUP_CONFIG.TOKEN_KEY, resp.access_token);
      _backupShowToast('Google Drive connected ✓');
      renderBackupPanel('backup-panel-container');
      startAutoBackup();
    },
  });
}

window._backupConnect = function() {
  _initTokenClient();
  if (!_tokenClient) {
    _backupShowToast('Google Identity Services not ready. Refresh and try again.', 'error');
    return;
  }
  if (!window.LOG7_GOOGLE_CLIENT_ID) {
    _backupShowToast('OAuth Client ID not configured. Set window.LOG7_GOOGLE_CLIENT_ID.', 'error');
    return;
  }
  _tokenClient.requestAccessToken({ prompt: 'consent' });
};

window._backupDisconnect = function() {
  sessionStorage.removeItem(BACKUP_CONFIG.TOKEN_KEY);
  stopAutoBackup();
  renderBackupPanel('backup-panel-container');
  _backupShowToast('Disconnected from Google Drive.');
};

// ─── Action handlers ───────────────────────────────────────────────────
window._backupNow = async function(btn) {
  var orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '&#8987; Backing up…';
  try {
    var result = await triggerBackup('manual');
    btn.innerHTML = '&#10003; Done!';
    _backupShowToast('Backed up ' + result.snapshot.meta.totalKeys + ' keys → ' + result.file.name);
    setTimeout(function() {
      btn.disabled = false;
      btn.innerHTML = orig;
      renderBackupPanel('backup-panel-container');
    }, 2000);
  } catch(e) {
    btn.disabled = false;
    btn.innerHTML = orig;
    _backupShowToast('Backup failed: ' + e.message, 'error');
  }
};

window._openRestoreModal = async function() {
  document.getElementById('restore-modal').style.display = 'flex';
  var listEl = document.getElementById('restore-file-list');
  try {
    var files = await listBackupsFromDrive();
    if (!files.length) {
      listEl.innerHTML = '<div class="restore-loading">No backups found in Drive folder.</div>';
      return;
    }
    listEl.innerHTML = files.map(function(f) {
      return '<div class="restore-item">'
        + '<div class="restore-item-info">'
        + '<div class="restore-item-name">' + _esc(f.name.replace(BACKUP_CONFIG.BACKUP_PREFIX, '')) + '</div>'
        + '<div class="restore-item-meta">' + _esc(f.description || '') + '</div>'
        + '</div>'
        + '<button class="btn-restore-item" onclick="window._doRestore(\'' + f.id + '\',\'' + _esc(f.name) + '\',this)">Restore</button>'
        + '</div>';
    }).join('');
  } catch(e) {
    listEl.innerHTML = '<div class="restore-loading" style="color:var(--red)">Error: ' + _esc(e.message) + '</div>';
  }
};

window._doRestore = async function(fileId, filename, btn) {
  if (!confirm('Restore from "' + filename + '"?\n\nYour current data will be saved as an emergency snapshot before restoring.')) return;
  btn.disabled = true;
  btn.textContent = 'Restoring…';
  try {
    var result = await restoreFromDrive(fileId, filename);
    document.getElementById('restore-modal').style.display = 'none';
    _backupShowToast('Restored ' + result.restored + ' keys. Reloading…');
    setTimeout(function() { location.reload(); }, 1800);
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'Restore';
    _backupShowToast('Restore failed: ' + e.message, 'error');
  }
};

window._saveBackupInterval = function(val) {
  var settings = getBackupSettings();
  settings.intervalHours = parseInt(val, 10);
  saveBackupSettings(settings);
  stopAutoBackup();
  startAutoBackup();
  _backupShowToast('Auto-backup set to every ' + val + ' hours');
};

// ─── Toast (uses dashboard's showToast if available) ──────────────────
function _backupShowToast(msg, kind) {
  if (typeof window.showToast === 'function') { window.showToast(msg, kind === 'error' ? 'error' : undefined); return; }
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:'
    + (kind==='error'?'#f44336':'#4caf50')
    + ';color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:500;max-width:360px;box-shadow:0 4px 20px rgba(0,0,0,.4)';
  document.body.appendChild(t);
  setTimeout(function() { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(function(){t.remove();},320); }, 3000);
}

// ─── Styles ────────────────────────────────────────────────────────────
function injectBackupStyles() {
  if (document.getElementById('backup-styles')) return;
  var style = document.createElement('style');
  style.id = 'backup-styles';
  style.textContent = `
    .backup-panel{display:flex;flex-direction:column;gap:16px}
    .backup-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .backup-title{font-size:15px;font-weight:700;color:var(--text)}
    .backup-subtitle{font-size:12px;color:var(--muted);margin-top:2px}
    .backup-status-pill{font-size:11px;padding:4px 10px;border-radius:20px;white-space:nowrap;flex-shrink:0;font-weight:600}
    .status-ok{background:rgba(62,207,142,.15);color:var(--green);border:1px solid rgba(62,207,142,.3)}
    .status-warn{background:rgba(245,166,35,.15);color:var(--amber);border:1px solid rgba(245,166,35,.3)}

    .backup-connect-row{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--s2);border:1px solid var(--border);border-radius:8px}
    .backup-connected-badge{flex:1;font-size:13px;font-weight:600;color:var(--green)}
    .btn-backup-connect{background:var(--accent);color:#fff;border:none;border-radius:7px;padding:8px 14px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Poppins',sans-serif;transition:opacity .15s}
    .btn-backup-connect:hover{opacity:.88}
    .btn-backup-disconnect{background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;font-family:'Poppins',sans-serif}
    .btn-backup-disconnect:hover{color:var(--red);border-color:var(--red)}

    .backup-actions{display:flex;gap:8px;flex-wrap:wrap}
    .backup-actions button,.backup-actions a{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;text-decoration:none;border:none;font-weight:500;font-family:'Poppins',sans-serif;transition:all .15s}
    .btn-backup-now{background:var(--accent);color:#fff}
    .btn-backup-now:hover:not(:disabled){opacity:.88}
    .btn-backup-now:disabled{opacity:.5;cursor:not-allowed}
    .btn-backup-restore{background:var(--s2);color:var(--text);border:1px solid var(--border)}
    .btn-backup-restore:hover:not(:disabled){background:var(--s3)}
    .btn-backup-restore:disabled{opacity:.5;cursor:not-allowed}
    .btn-backup-drive{background:var(--s2);color:var(--muted);border:1px solid var(--border);font-size:12px}
    .btn-backup-drive:hover{color:var(--text);background:var(--s3)}

    .backup-config{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:12px 14px}
    .config-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:8px;font-weight:600}
    .config-row{display:flex;align-items:center;gap:12px}
    .config-row select{background:var(--s1);color:var(--text);border:1px solid var(--border2);border-radius:6px;padding:6px 10px;font-size:13px;cursor:pointer;font-family:'Poppins',sans-serif}
    .config-hint{font-size:12px;color:var(--muted)}

    .backup-history{background:var(--s2);border:1px solid var(--border);border-radius:8px;overflow:hidden}
    .history-header{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--muted)}
    .history-count{font-size:11px}
    .history-list{max-height:220px;overflow-y:auto}
    .history-empty{padding:20px 14px;text-align:center;color:var(--muted);font-size:13px}
    .history-item{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);transition:background .1s}
    .history-item:last-child{border-bottom:none}
    .history-item:hover{background:var(--s3)}
    .history-restore{border-left:2px solid var(--blue)}
    .history-icon{font-size:14px;width:20px;text-align:center;flex-shrink:0}
    .history-detail{flex:1;min-width:0}
    .history-name{font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .history-meta{font-size:11px;color:var(--muted);margin-top:2px}
    .history-time{font-size:11px;color:var(--muted);white-space:nowrap;flex-shrink:0}

    .backup-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .stat-box{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center}
    .stat-val{font-size:18px;font-weight:700;color:var(--accent)}
    .stat-lbl{font-size:11px;color:var(--muted);margin-top:3px}

    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px}
    .modal-box{background:var(--s1);border:1px solid var(--border2);border-radius:12px;width:100%;max-width:520px;padding:24px;display:flex;flex-direction:column;gap:16px;max-height:90vh}
    .modal-title{font-size:15px;font-weight:700;color:var(--text)}
    .modal-sub{font-size:13px;color:var(--muted);line-height:1.6}
    .restore-list{max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:8px}
    .restore-loading{padding:20px;text-align:center;color:var(--muted);font-size:13px}
    .restore-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border)}
    .restore-item:last-child{border-bottom:none}
    .restore-item-info{flex:1;min-width:0}
    .restore-item-name{font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .restore-item-meta{font-size:11px;color:var(--muted);margin-top:2px}
    .btn-restore-item{background:var(--s2);color:var(--text);border:1px solid var(--border);padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-family:'Poppins',sans-serif;flex-shrink:0;transition:all .15s}
    .btn-restore-item:hover{background:var(--accent);color:#fff;border-color:transparent}
    .btn-restore-item:disabled{opacity:.5;cursor:not-allowed}
    .modal-actions{display:flex;justify-content:flex-end}
    .btn-cancel{background:var(--s2);color:var(--muted);border:1px solid var(--border);padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-family:'Poppins',sans-serif}
    .btn-cancel:hover{color:var(--text)}
  `;
  document.head.appendChild(style);
}

// ─── Init ──────────────────────────────────────────────────────────────
function initBackupSystem() {
  // Lazy-init token client after GIS loads
  if (window.google && window.google.accounts) {
    _initTokenClient();
  } else {
    window.addEventListener('load', _initTokenClient);
  }
  if (getDriveToken()) startAutoBackup();
  console.log('[Log7 Backup] System initialised. Drive folder: ' + BACKUP_CONFIG.DRIVE_FOLDER_ID);
}

window.Log7Backup = {
  init: initBackupSystem,
  backup: triggerBackup,
  restore: restoreFromDrive,
  listFromDrive: listBackupsFromDrive,
  renderPanel: renderBackupPanel,
  collectSnapshot: collectSnapshot,
  getHistory: getLocalHistory,
  getSettings: getBackupSettings,
};
