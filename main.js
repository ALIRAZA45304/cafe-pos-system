const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Base data directory next to the exe / in userData
const baseDir = path.join(app.getPath('userData'), 'CafeZarrarData');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function getDailyFile(dateStr) {
  // dateStr: "2026-05-21"
  const [year, month] = dateStr.split('-');
  const dir = path.join(baseDir, year, month);
  ensureDir(dir);
  return path.join(dir, `${dateStr}.json`);
}

function getDailyExpenseFile(dateStr) {
  const [year, month] = dateStr.split('-');
  const dir = path.join(baseDir, year, month);
  ensureDir(dir);
  return path.join(dir, `expenses-${dateStr}.json`);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    title: 'CAFE ZARRAR — POS System',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#0a0a0a',
    show: false
  });

  win.loadFile('index.html');
  win.once('ready-to-show', () => { win.show(); win.maximize(); });
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ── Save bill (append to daily file) ──
ipcMain.on('save-bill', (event, bill) => {
  try {
    const dateStr = bill.date; // "2026-05-21"
    const file = getDailyFile(dateStr);
    let bills = [];
    if (fs.existsSync(file)) {
      bills = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
    bills.push(bill);
    fs.writeFileSync(file, JSON.stringify(bills, null, 2), 'utf-8');
    event.reply('save-bill-reply', { success: true });
  } catch (err) {
    event.reply('save-bill-reply', { success: false, error: err.message });
  }
});

// ── Load bills for a range ──
ipcMain.on('load-bills', (event, { from, to }) => {
  try {
    ensureDir(baseDir);
    const bills = [];
    const fromDate = new Date(from);
    const toDate   = new Date(to);

    // Walk year/month folders
    const years = fs.existsSync(baseDir) ? fs.readdirSync(baseDir) : [];
    for (const year of years) {
      const yearPath = path.join(baseDir, year);
      if (!fs.statSync(yearPath).isDirectory()) continue;
      const months = fs.readdirSync(yearPath);
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        if (!fs.statSync(monthPath).isDirectory()) continue;
        const files = fs.readdirSync(monthPath).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const dateStr = file.replace('.json','');
          const d = new Date(dateStr);
          if (d >= fromDate && d <= toDate) {
            const raw = fs.readFileSync(path.join(monthPath, file), 'utf-8');
            bills.push(...JSON.parse(raw));
          }
        }
      }
    }
    // Sort newest first
    bills.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    event.reply('load-bills-reply', { success: true, bills });
  } catch (err) {
    event.reply('load-bills-reply', { success: false, bills: [], error: err.message });
  }
});

// ── Save expense (append to daily file) ──
ipcMain.on('save-expense', (event, expense) => {
  try {
    const dateStr = expense.date; // "2026-05-21"
    const file = getDailyExpenseFile(dateStr);
    let expenses = [];
    if (fs.existsSync(file)) {
      expenses = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
    expenses.push(expense);
    fs.writeFileSync(file, JSON.stringify(expenses, null, 2), 'utf-8');
    event.reply('save-expense-reply', { success: true });
  } catch (err) {
    event.reply('save-expense-reply', { success: false, error: err.message });
  }
});

// ── Load expenses for a range ──
ipcMain.on('load-expenses', (event, { from, to }) => {
  try {
    ensureDir(baseDir);
    const expenses = [];
    const fromDate = new Date(from);
    const toDate   = new Date(to);

    const years = fs.existsSync(baseDir) ? fs.readdirSync(baseDir) : [];
    for (const year of years) {
      const yearPath = path.join(baseDir, year);
      if (!fs.statSync(yearPath).isDirectory()) continue;
      const months = fs.readdirSync(yearPath);
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        if (!fs.statSync(monthPath).isDirectory()) continue;
        const files = fs.readdirSync(monthPath).filter(f => f.startsWith('expenses-') && f.endsWith('.json'));
        for (const file of files) {
          const dateStr = file.replace('expenses-','').replace('.json','');
          const d = new Date(dateStr);
          if (d >= fromDate && d <= toDate) {
            const raw = fs.readFileSync(path.join(monthPath, file), 'utf-8');
            expenses.push(...JSON.parse(raw));
          }
        }
      }
    }
    expenses.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    event.reply('load-expenses-reply', { success: true, expenses });
  } catch (err) {
    event.reply('load-expenses-reply', { success: false, expenses: [], error: err.message });
  }
});

// ── Update an existing bill (edit after save/print) ──
ipcMain.on('update-bill', (event, updatedBill) => {
  try {
    const dateStr = updatedBill.date;
    const file = getDailyFile(dateStr);
    if (!fs.existsSync(file)) {
      event.reply('update-bill-reply', { success: false, error: 'Bill file not found' });
      return;
    }
    let bills = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const idx = bills.findIndex(b => b.id === updatedBill.id);
    if (idx === -1) {
      event.reply('update-bill-reply', { success: false, error: 'Bill not found' });
      return;
    }
    bills[idx] = updatedBill;
    fs.writeFileSync(file, JSON.stringify(bills, null, 2), 'utf-8');
    event.reply('update-bill-reply', { success: true });
  } catch (err) {
    event.reply('update-bill-reply', { success: false, error: err.message });
  }
});

// ── Save table state ──
ipcMain.on('save-tables', (event, tables) => {
  try {
    ensureDir(baseDir);
    fs.writeFileSync(path.join(baseDir, 'tables.json'), JSON.stringify(tables, null, 2));
    event.reply('save-tables-reply', { success: true });
  } catch(e) { event.reply('save-tables-reply', { success: false }); }
});

// ── Load table state ──
ipcMain.on('load-tables', (event) => {
  try {
    const f = path.join(baseDir, 'tables.json');
    const tables = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f,'utf-8')) : {};
    event.reply('load-tables-reply', { success: true, tables });
  } catch(e) { event.reply('load-tables-reply', { success: true, tables: {} }); }
});

// ── Save menu ──
ipcMain.on('save-menu', (event, menu) => {
  try {
    ensureDir(baseDir);
    fs.writeFileSync(path.join(baseDir, 'menu.json'), JSON.stringify(menu, null, 2));
    event.reply('save-menu-reply', { success: true });
  } catch(e) { event.reply('save-menu-reply', { success: false }); }
});

// ── Load menu ──
ipcMain.on('load-menu', (event) => {
  try {
    const f = path.join(baseDir, 'menu.json');
    const vf = path.join(baseDir, 'menu_version.txt');
    const CURRENT_VERSION = '3';
    const savedVersion = fs.existsSync(vf) ? fs.readFileSync(vf,'utf-8').trim() : '0';
    if (savedVersion !== CURRENT_VERSION && fs.existsSync(f)) {
      fs.unlinkSync(f);
    }
    fs.writeFileSync(vf, CURRENT_VERSION, 'utf-8');
    const menu = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f,'utf-8')) : null;
    event.reply('load-menu-reply', { success: true, menu });
  } catch(e) { event.reply('load-menu-reply', { success: true, menu: null }); }
});

// ── Open data folder in Explorer ──
ipcMain.on('open-data-folder', () => {
  ensureDir(baseDir);
  shell.openPath(baseDir);
});

// ── Print receipt ──
ipcMain.on('print-receipt', (event, html) => {
  const printWin = new BrowserWindow({ width: 400, height: 600, show: false,
    webPreferences: { nodeIntegration: false } });
  printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  printWin.webContents.on('did-finish-load', () => {
    printWin.webContents.print({ silent: false, printBackground: true }, () => printWin.close());
  });
});
