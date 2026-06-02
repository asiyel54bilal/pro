import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Load environment variables from .env file manually if exists
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  } catch (err) {
    console.error('Error reading .env file:', err.message);
  }
}

const GOOGLE_SHEETS_URL = process.env.GOOGLE_SHEETS_URL;
const GOOGLE_SHEETS_TOKEN = process.env.GOOGLE_SHEETS_TOKEN || 'LGS_TRACKER_SHEETS_SECRET_TOKEN_2026';

const salt = bcrypt.genSaltSync(10);
const hashedPassword = bcrypt.hashSync('admin123', salt);

if (GOOGLE_SHEETS_URL) {
  console.log('Google Sheets veritabanı algılandı. Admin şifresi sıfırlanıyor...');
  try {
    // 1. Fetch current database from sheets
    const fetchUrl = `${GOOGLE_SHEETS_URL}?token=${encodeURIComponent(GOOGLE_SHEETS_TOKEN)}`;
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`HTTP fetch error! Status: ${response.status}`);
    }
    const db = await response.json();
    if (db.error) {
      throw new Error(db.error);
    }

    db.users = db.users || [];
    let admin = db.users.find(u => u.username === 'admin');
    if (admin) {
      admin.password = hashedPassword;
      console.log('Mevcut admin kullanıcısının şifresi Google Sheets üzerinde "admin123" olarak sıfırlandı.');
    } else {
      admin = {
        id: 'admin-1',
        username: 'admin',
        password: hashedPassword,
        name: 'Sistem Yöneticisi',
        branch: 'Tüm Branşlar',
        role: 'admin',
        classIds: []
      };
      db.users.push(admin);
      console.log('Yönetici hesabı Google Sheets üzerinde bulunamadı. "admin" kullanıcısı "admin123" şifresiyle yeniden oluşturuldu.');
    }

    // 2. Save users back to Google Sheets
    console.log('Google Sheets verileri güncelleniyor...');
    const postResponse = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'saveCollection',
        name: 'users',
        data: db.users
      })
    });

    if (!postResponse.ok) {
      throw new Error(`HTTP post error! Status: ${postResponse.status}`);
    }
    const result = await postResponse.json();
    if (result.error) {
      throw new Error(result.error);
    }

    // 3. Write local backup
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    console.log('İşlem başarılı! Google Sheets ve yerel yedek veritabanı güncellendi.');

  } catch (err) {
    console.error('Google Sheets üzerinde şifre sıfırlama hatası:', err.message);
    process.exit(1);
  }
} else {
  // Local DB mode
  console.log('Yerel veritabanı algılandı. Admin şifresi sıfırlanıyor...');
  if (!fs.existsSync(DB_FILE)) {
    console.log('Yerel veritabanı dosyası bulunamadı. Lütfen önce sunucuyu en az bir kez başlatın.');
    process.exit(1);
  }

  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    let admin = db.users.find(u => u.username === 'admin');

    if (admin) {
      admin.password = hashedPassword;
      console.log('Mevcut admin kullanıcısının şifresi "admin123" olarak sıfırlandı.');
    } else {
      admin = {
        id: 'admin-1',
        username: 'admin',
        password: hashedPassword,
        name: 'Sistem Yöneticisi',
        branch: 'Tüm Branşlar',
        role: 'admin',
        classIds: []
      };
      db.users.push(admin);
      console.log('Yönetici hesabı bulunamadı. "admin" kullanıcısı "admin123" şifresiyle yeniden oluşturuldu.');
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    console.log('İşlem başarılı! Yerel veritabanı güncellendi.');
  } catch (err) {
    console.error('Yerel şifre sıfırlama hatası:', err.message);
    process.exit(1);
  }
}
