import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCollection, saveCollection, readDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'lgs-tracker-secret-key-2026-xyz-987';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Helpers for ID generation
const generateId = () => Math.random().toString(36).substring(2, 11);

// Middleware: Authenticate JWT Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Erişim engellendi. Token bulunamadı.' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token.' });
    
    // Verify user still exists in DB (check users first, then students)
    const users = getCollection('users');
    let user = users.find(u => u.id === decoded.id);
    
    if (!user) {
      const students = getCollection('students');
      const student = students.find(s => s.id === decoded.id);
      if (student) {
        user = {
          id: student.id,
          username: student.studentNo,
          name: student.name,
          role: 'student',
          branch: 'Öğrenci',
          classIds: student.classId ? [student.classId] : []
        };
      }
    }
    
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    
    req.user = user;
    next();
  });
}

// Middleware: Admin check
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için yönetici yetkisi gerekiyor.' });
  }
  next();
}

// Middleware: Staff check (Admin or Teacher)
function requireStaff(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Bu işlem için öğretmen veya yönetici yetkisi gerekiyor.' });
  }
  next();
}

// --- AUTHENTICATION ROUTES ---

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir.' });
  }

  const users = getCollection('users');
  let user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  
  if (user) {
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı!' });
    }
  } else {
    // If not found in users, check students by studentNo
    const students = getCollection('students');
    const student = students.find(s => s.studentNo && s.studentNo.toString().toLowerCase() === username.trim().toLowerCase());
    
    if (!student) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı!' });
    }
    
    if (!student.active) {
      return res.status(403).json({ error: 'Öğrenci hesabı aktif değil!' });
    }
    
    // Check password: bcrypt compare if student has password field, otherwise plain text studentNo match
    const isPasswordValid = student.password
      ? bcrypt.compareSync(password, student.password)
      : (password === student.studentNo.toString());
      
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı!' });
    }
    
    user = {
      id: student.id,
      username: student.studentNo,
      name: student.name,
      role: 'student',
      branch: 'Öğrenci',
      classIds: student.classId ? [student.classId] : []
    };
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      branch: user.branch || '',
      role: user.role,
      classIds: user.classIds || []
    }
  });
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    name: req.user.name,
    branch: req.user.branch,
    role: req.user.role,
    classIds: req.user.classIds || []
  });
});

// Change password
app.put('/api/auth/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mevcut şifre ve yeni şifre gereklidir.' });
  }

  const role = req.user.role;
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(newPassword, salt);

  if (role === 'student') {
    const students = getCollection('students');
    const studentIndex = students.findIndex(s => s.id === req.user.id);
    if (studentIndex === -1) {
      return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }

    const student = students[studentIndex];
    // Verify current password: check bcrypt if exists, otherwise studentNo fallback
    const isCurrentValid = student.password
      ? bcrypt.compareSync(currentPassword, student.password)
      : (currentPassword === student.studentNo.toString());

    if (!isCurrentValid) {
      return res.status(400).json({ error: 'Mevcut şifre hatalı!' });
    }

    students[studentIndex].password = hashedPassword;
    saveCollection('students', students);
    return res.json({ message: 'Şifreniz başarıyla güncellendi.' });
  } else {
    // Admin or Teacher (staff)
    const users = getCollection('users');
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const user = users[userIndex];
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Mevcut şifre hatalı!' });
    }

    users[userIndex].password = hashedPassword;
    saveCollection('users', users);
    return res.json({ message: 'Şifreniz başarıyla güncellendi.' });
  }
});

// --- CLASS / SECTION ROUTES ---

// Get all classes
app.get('/api/classes', authenticateToken, (req, res) => {
  const classes = getCollection('classes');
  res.json(classes);
});

// Create new class (Admin only)
app.post('/api/classes', authenticateToken, requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Sınıf/Şube adı boş olamaz.' });
  }

  const classes = getCollection('classes');
  if (classes.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
    return res.status(400).json({ error: 'Bu sınıf/şube zaten mevcut.' });
  }

  const newClass = {
    id: 'class-' + generateId(),
    name: name.trim()
  };

  classes.push(newClass);
  saveCollection('classes', classes);
  res.status(201).json(newClass);
});

// Update class name (Admin only)
app.put('/api/classes/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Sınıf/Şube adı boş olamaz.' });
  }

  const classes = getCollection('classes');
  const classIndex = classes.findIndex(c => c.id === id);
  if (classIndex === -1) {
    return res.status(404).json({ error: 'Sınıf bulunamadı.' });
  }

  if (classes.some((c, idx) => idx !== classIndex && c.name.toLowerCase() === name.trim().toLowerCase())) {
    return res.status(400).json({ error: 'Bu sınıf/şube adı zaten kullanılıyor.' });
  }

  classes[classIndex].name = name.trim();
  saveCollection('classes', classes);
  res.json(classes[classIndex]);
});

// Delete class (Admin only)
app.delete('/api/classes/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  let classes = getCollection('classes');
  const classExists = classes.some(c => c.id === id);

  if (!classExists) {
    return res.status(404).json({ error: 'Sınıf bulunamadı.' });
  }

  // Remove class
  classes = classes.filter(c => c.id !== id);
  saveCollection('classes', classes);

  // Unassign students from this class (or mark classId as null)
  const students = getCollection('students');
  const updatedStudents = students.map(s => s.classId === id ? { ...s, classId: null } : s);
  saveCollection('students', updatedStudents);

  // Remove from teachers' classes
  const users = getCollection('users');
  const updatedUsers = users.map(u => {
    if (u.classIds && u.classIds.includes(id)) {
      return { ...u, classIds: u.classIds.filter(cid => cid !== id) };
    }
    return u;
  });
  saveCollection('users', updatedUsers);

  res.json({ message: 'Sınıf başarıyla silindi, ilişkili öğrenciler sınıfsız olarak güncellendi.' });
});

// --- TEACHER (USER) ROUTES (Admin only) ---

// Get all teachers
app.get('/api/teachers', authenticateToken, requireAdmin, (req, res) => {
  const users = getCollection('users');
  // Return everything except passwords
  const teachers = users
    .filter(u => u.role === 'teacher')
    .map(({ password, ...u }) => u);
  res.json(teachers);
});

// Create new teacher
app.post('/api/teachers', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, name, branch, classIds } = req.body;
  if (!username || !password || !name || !branch) {
    return res.status(400).json({ error: 'Lütfen tüm zorunlu alanları doldurun.' });
  }

  const users = getCollection('users');
  if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
    return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const newTeacher = {
    id: 'teacher-' + generateId(),
    username: username.trim().toLowerCase(),
    password: hashedPassword,
    name: name.trim(),
    branch: branch.trim(),
    role: 'teacher',
    classIds: classIds || []
  };

  users.push(newTeacher);
  saveCollection('users', users);

  const { password: _, ...result } = newTeacher;
  res.status(201).json(result);
});

// Update teacher info (including password change & assignments)
app.put('/api/teachers/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, branch, password, classIds } = req.body;

  const users = getCollection('users');
  const userIndex = users.findIndex(u => u.id === id && u.role === 'teacher');
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Öğretmen bulunamadı.' });
  }

  const updatedTeacher = { ...users[userIndex] };
  if (name) updatedTeacher.name = name.trim();
  if (branch) updatedTeacher.branch = branch.trim();
  if (classIds) updatedTeacher.classIds = classIds;

  if (password && password.trim() !== '') {
    const salt = bcrypt.genSaltSync(10);
    updatedTeacher.password = bcrypt.hashSync(password, salt);
  }

  users[userIndex] = updatedTeacher;
  saveCollection('users', users);

  const { password: _, ...result } = updatedTeacher;
  res.json(result);
});

// Delete teacher
app.delete('/api/teachers/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  let users = getCollection('users');
  const teacherExists = users.some(u => u.id === id && u.role === 'teacher');

  if (!teacherExists) {
    return res.status(404).json({ error: 'Öğretmen bulunamadı.' });
  }

  users = users.filter(u => u.id !== id);
  saveCollection('users', users);
  res.json({ message: 'Öğretmen hesabı silindi.' });
});

// --- STUDENT ROUTES ---

// Get all students
app.get('/api/students', authenticateToken, (req, res) => {
  const students = getCollection('students');
  res.json(students);
});

// Create student (Admin only)
app.post('/api/students', authenticateToken, requireAdmin, (req, res) => {
  const { name, classId, studentNo } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Öğrenci adı ve soyadı boş olamaz.' });
  }

  const students = getCollection('students');
  const newStudent = {
    id: 'student-' + generateId(),
    name: name.trim(),
    studentNo: studentNo ? studentNo.toString().trim() : null,
    classId: classId || null,
    active: true
  };

  students.push(newStudent);
  saveCollection('students', students);
  res.status(201).json(newStudent);
});

// Update student (Admin only)
app.put('/api/students/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, classId, active, studentNo } = req.body;

  const students = getCollection('students');
  const studentIndex = students.findIndex(s => s.id === id);
  if (studentIndex === -1) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
  }

  const updatedStudent = { ...students[studentIndex] };
  if (name !== undefined) updatedStudent.name = name.trim();
  if (classId !== undefined) updatedStudent.classId = classId || null;
  if (active !== undefined) updatedStudent.active = active;
  if (studentNo !== undefined) updatedStudent.studentNo = studentNo ? studentNo.toString().trim() : null;

  students[studentIndex] = updatedStudent;
  saveCollection('students', students);
  res.json(updatedStudent);
});

// Delete student (Admin only)
app.delete('/api/students/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  let students = getCollection('students');
  const studentExists = students.some(s => s.id === id);

  if (!studentExists) {
    return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
  }

  students = students.filter(s => s.id !== id);
  saveCollection('students', students);

  // Clean up student logs
  let logs = getCollection('logs');
  logs = logs.filter(l => l.studentId !== id);
  saveCollection('logs', logs);

  res.json({ message: 'Öğrenci ve tüm soru kayıtları başarıyla silindi.' });
});

// Bulk Import Students (Admin only)
app.post('/api/students/import', authenticateToken, requireAdmin, (req, res) => {
  const { students: importList } = req.body;
  if (!importList || !Array.isArray(importList)) {
    return res.status(400).json({ error: 'Geçersiz veri formatı. Öğrenci listesi gereklidir.' });
  }

  const students = getCollection('students');
  const classes = getCollection('classes');

  let importedCount = 0;
  let updatedCount = 0;
  let classesCreatedCount = 0;

  importList.forEach(item => {
    let studentNo = item.studentNo ? item.studentNo.toString().trim() : '';
    if (!studentNo) return; // Skip if no student number

    let name = '';
    if (item.firstName || item.lastName) {
      name = `${(item.firstName || '').trim()} ${(item.lastName || '').trim()}`.trim();
    } else if (item.name) {
      name = item.name.trim();
    }
    
    if (!name) return; // Skip if no name

    let className = item.className ? item.className.toString().trim() : '';
    if (!className) className = 'Sınıfsız';

    // 1. Find or create Class
    let classObj = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
    if (!classObj) {
      classObj = {
        id: 'class-' + generateId(),
        name: className
      };
      classes.push(classObj);
      classesCreatedCount++;
    }

    // 2. Find Student by StudentNo
    const existingIndex = students.findIndex(s => s.studentNo && s.studentNo.toString() === studentNo);

    if (existingIndex !== -1) {
      // Update existing student's class (and name if changed)
      students[existingIndex].classId = classObj.id;
      students[existingIndex].name = name;
      updatedCount++;
    } else {
      // Create new student
      const newStudent = {
        id: 'student-' + generateId(),
        studentNo: studentNo,
        name: name,
        classId: classObj.id,
        active: true
      };
      students.push(newStudent);
      importedCount++;
    }
  });

  saveCollection('students', students);
  saveCollection('classes', classes);

  res.json({
    message: `${importedCount} yeni öğrenci eklendi, ${updatedCount} öğrencinin sınıf bilgisi güncellendi. ${classesCreatedCount} yeni sınıf/şube oluşturuldu.`,
    summary: {
      imported: importedCount,
      updated: updatedCount,
      classesCreated: classesCreatedCount
    }
  });
});

// --- QUESTION LOGS ROUTES ---

// Get logs (filtered)
app.get('/api/logs', authenticateToken, (req, res) => {
  const { classId, studentId, branch, date, startDate, endDate } = req.query;
  let logs = getCollection('logs');
  const students = getCollection('students');

  if (req.user.role === 'student') {
    // Restrict student to only view their own logs
    logs = logs.filter(l => l.studentId === req.user.id);
  } else {
    // Filter logs by student criteria if classId is specified
    if (classId) {
      const classStudentIds = students.filter(s => s.classId === classId).map(s => s.id);
      logs = logs.filter(l => classStudentIds.includes(l.studentId));
    }

    if (studentId) {
      logs = logs.filter(l => l.studentId === studentId);
    }

    if (branch) {
      logs = logs.filter(l => l.branch.toLowerCase() === branch.toLowerCase());
    }

    if (date) {
      logs = logs.filter(l => l.date === date);
    }

    if (startDate) {
      logs = logs.filter(l => l.date >= startDate);
    }

    if (endDate) {
      logs = logs.filter(l => l.date <= endDate);
    }

    // If request is from teacher, restrict to their assigned classes if applicable
    if (req.user.role === 'teacher' && req.user.classIds && req.user.classIds.length > 0) {
      const assignedStudentIds = students.filter(s => req.user.classIds.includes(s.classId)).map(s => s.id);
      logs = logs.filter(l => assignedStudentIds.includes(l.studentId));
    }
  }

  // Sort logs by date descending
  logs.sort((a, b) => b.date.localeCompare(a.date));

  // Map student name and details into response
  const responseLogs = logs.map(l => {
    const student = students.find(s => s.id === l.studentId);
    return {
      ...l,
      studentName: student ? student.name : 'Silinmiş Öğrenci'
    };
  });

  res.json(responseLogs);
});

// Bulk Insert Logs (For teachers/admin entering details for a whole class)
app.post('/api/logs/bulk', authenticateToken, requireStaff, (req, res) => {
  const { date, logs, branch: bodyBranch } = req.body;
  if (!date || !logs || !Array.isArray(logs)) {
    return res.status(400).json({ error: 'Tarih ve log listesi eksik veya hatalı.' });
  }

  // Branch depends on the body branch (if admin/user passes it) or the user's branch
  const branch = bodyBranch || req.user.branch;
  if (!branch) {
    return res.status(400).json({ error: 'Lütfen veri girişi yapılacak branş/ders seçin.' });
  }

  const teacherId = req.user.id;

  const currentLogs = getCollection('logs');

  logs.forEach(item => {
    const solved = parseInt(item.solved) || 0;

    // Skip if solved count is 0
    if (solved === 0) return;

    // Check if entry already exists for student + date + branch (Sum up if exists, else insert)
    const existingIndex = currentLogs.findIndex(
      l => l.studentId === item.studentId && l.date === date && l.branch.toLowerCase() === branch.toLowerCase()
    );

    let finalSolved = solved;
    if (existingIndex !== -1) {
      finalSolved = (currentLogs[existingIndex].solved || 0) + solved;
    }

    const logEntry = {
      id: existingIndex !== -1 ? currentLogs[existingIndex].id : 'log-' + generateId(),
      studentId: item.studentId,
      teacherId,
      branch,
      date,
      solved: finalSolved,
      correct: 0,
      incorrect: 0,
      net: 0
    };

    if (existingIndex !== -1) {
      currentLogs[existingIndex] = logEntry;
    } else {
      currentLogs.push(logEntry);
    }
  });

  saveCollection('logs', currentLogs);
  res.json({ message: 'Kayıtlar başarıyla kaydedildi.' });
});

// Delete a log entry (Admin or logging teacher only)
app.delete('/api/logs/:id', authenticateToken, requireStaff, (req, res) => {
  const { id } = req.params;
  let logs = getCollection('logs');
  const log = logs.find(l => l.id === id);

  if (!log) {
    return res.status(404).json({ error: 'Kayıt bulunamadı.' });
  }

  // Access control
  if (req.user.role !== 'admin' && log.teacherId !== req.user.id) {
    return res.status(403).json({ error: 'Bu kaydı silmeye yetkiniz yok.' });
  }

  logs = logs.filter(l => l.id !== id);
  saveCollection('logs', logs);
  res.json({ message: 'Kayıt silindi.' });
});

// --- REPORTS & DASHBOARD API ---

app.get('/api/reports/dashboard', authenticateToken, (req, res) => {
  const logs = getCollection('logs');
  const students = getCollection('students');
  const classes = getCollection('classes');

  let isViewingStudent = false;
  let targetStudentId = null;

  if (req.user.role === 'student') {
    if (req.query.studentId && req.query.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Öğrenci rolüyle başka öğrencilerin bilgilerine erişemezsiniz.' });
    }
    isViewingStudent = true;
    targetStudentId = req.user.id;
  } else if (req.query.studentId) {
    isViewingStudent = true;
    targetStudentId = req.query.studentId;

    // Verify student exists
    const student = students.find(s => s.id === targetStudentId);
    if (!student) {
      return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }

    // Teacher class restriction
    if (req.user.role === 'teacher') {
      const classIds = req.user.classIds || [];
      if (!classIds.includes(student.classId)) {
        return res.status(403).json({ error: 'Bu öğrencinin bilgilerini görme yetkiniz yok.' });
      }
    }
  }

  if (isViewingStudent) {
    const studentId = targetStudentId;
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }

    let studentLogs = logs.filter(l => l.studentId === studentId);
    let rankingLogs = logs;

    if (req.query.startDate) {
      studentLogs = studentLogs.filter(l => l.date >= req.query.startDate);
      rankingLogs = rankingLogs.filter(l => l.date >= req.query.startDate);
    }
    if (req.query.endDate) {
      studentLogs = studentLogs.filter(l => l.date <= req.query.endDate);
      rankingLogs = rankingLogs.filter(l => l.date <= req.query.endDate);
    }

    const totalSolved = studentLogs.reduce((sum, l) => sum + l.solved, 0);

    const branchStats = {
      "Türkçe": 0,
      "Matematik": 0,
      "Fen Bilimleri": 0,
      "T.C. İnkılap Tarihi ve Atatürkçülük": 0,
      "Din Kültürü ve Ahlak Bilgisi": 0,
      "Yabancı Dil (İngilizce)": 0
    };
    studentLogs.forEach(l => {
      if (branchStats[l.branch] !== undefined) {
        branchStats[l.branch] += l.solved;
      }
    });

    const branchSummary = Object.keys(branchStats).map(b => ({
      branch: b,
      solved: branchStats[b]
    }));

    // Daily stats for student
    const dailyStats = {};
    studentLogs.forEach(l => {
      if (!dailyStats[l.date]) dailyStats[l.date] = 0;
      dailyStats[l.date] += l.solved;
    });
    const dailyTrend = Object.keys(dailyStats)
      .map(date => ({ date, solved: dailyStats[date] }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);

    // Leaderboard calculation across all active students
    const studentStats = {};
    rankingLogs.forEach(l => {
      if (!studentStats[l.studentId]) {
        studentStats[l.studentId] = {
          solved: 0,
          branches: {
            "Türkçe": 0,
            "Matematik": 0,
            "Fen Bilimleri": 0,
            "T.C. İnkılap Tarihi ve Atatürkçülük": 0,
            "Din Kültürü ve Ahlak Bilgisi": 0,
            "Yabancı Dil (İngilizce)": 0
          }
        };
      }
      studentStats[l.studentId].solved += l.solved;
      if (studentStats[l.studentId].branches[l.branch] !== undefined) {
        studentStats[l.studentId].branches[l.branch] += l.solved;
      }
    });

    // Sort all active students by solved count
    const activeStudentsList = students
      .filter(s => s.active)
      .map(s => {
        const stats = studentStats[s.id] || { solved: 0, branches: {} };
        return {
          id: s.id,
          name: s.name,
          className: classes.find(c => c.id === s.classId)?.name || 'Sınıfsız',
          solved: stats.solved,
          branches: stats.branches
        };
      })
      .sort((a, b) => b.solved - a.solved);

    // Find student rank
    const myRank = activeStudentsList.findIndex(s => s.id === studentId) + 1;

    const topStudents = activeStudentsList.slice(0, 10);

    // Class rankings
    const classStats = {};
    classes.forEach(c => {
      classStats[c.id] = {
        id: c.id,
        name: c.name,
        solved: 0,
        studentCount: 0
      };
    });
    students.forEach(s => {
      if (s.active && classStats[s.classId]) {
        classStats[s.classId].studentCount += 1;
      }
    });
    rankingLogs.forEach(l => {
      const sObj = students.find(std => std.id === l.studentId);
      if (sObj && classStats[sObj.classId]) {
        classStats[sObj.classId].solved += l.solved;
      }
    });
    const classRankings = Object.values(classStats).sort((a, b) => b.solved - a.solved);

    return res.json({
      totals: {
        solved: totalSolved
      },
      branchSummary,
      topStudents,
      classRankings,
      dailyTrend,
      studentInfo: {
        id: student.id,
        name: student.name,
        rank: myRank,
        totalStudentsCount: activeStudentsList.length,
        className: classes.find(c => c.id === student.classId)?.name || 'Sınıfsız',
        studentNo: student.studentNo
      },
      counts: {
        logs: studentLogs.length
      }
    });
  }

  // Filter logs if teacher is authorized for specific classes
  let targetLogs = [...logs];
  let targetStudents = [...students];

  if (req.user.role === 'teacher' && req.user.classIds && req.user.classIds.length > 0) {
    targetStudents = students.filter(s => req.user.classIds.includes(s.classId));
    const targetStudentIds = targetStudents.map(s => s.id);
    targetLogs = logs.filter(l => targetStudentIds.includes(l.studentId));
  }

  // Branch filter if teacher (only show their branch details, or admin shows everything)
  const isTeacher = req.user.role === 'teacher';
  if (isTeacher) {
    targetLogs = targetLogs.filter(l => l.branch.toLowerCase() === req.user.branch.toLowerCase());
  }

  // Totals
  const totalSolved = targetLogs.reduce((sum, l) => sum + l.solved, 0);

  // Branch Statistics
  const branchStats = {};
  targetLogs.forEach(l => {
    if (!branchStats[l.branch]) {
      branchStats[l.branch] = { solved: 0 };
    }
    branchStats[l.branch].solved += l.solved;
  });

  // Convert branch stats to array
  const branchSummary = Object.keys(branchStats).map(b => ({
    branch: b,
    solved: branchStats[b].solved
  }));

  // Student Rankings (Top 10)
  const studentStats = {};
  targetLogs.forEach(l => {
    if (!studentStats[l.studentId]) {
      studentStats[l.studentId] = { 
        solved: 0,
        branches: {
          "Türkçe": 0,
          "Matematik": 0,
          "Fen Bilimleri": 0,
          "T.C. İnkılap Tarihi ve Atatürkçülük": 0,
          "Din Kültürü ve Ahlak Bilgisi": 0,
          "Yabancı Dil (İngilizce)": 0
        }
      };
    }
    studentStats[l.studentId].solved += l.solved;
    
    // Sum by branch
    const bName = l.branch;
    if (studentStats[l.studentId].branches[bName] !== undefined) {
      studentStats[l.studentId].branches[bName] += l.solved;
    } else {
      studentStats[l.studentId].branches[bName] = l.solved;
    }
  });

  const topStudents = Object.keys(studentStats)
    .map(sid => {
      const student = students.find(s => s.id === sid);
      return {
        id: sid,
        name: student ? student.name : 'Bilinmeyen Öğrenci',
        className: student ? (classes.find(c => c.id === student.classId)?.name || 'Sınıfsız') : 'Sınıfsız',
        solved: studentStats[sid].solved,
        branches: studentStats[sid].branches
      };
    })
    .sort((a, b) => b.solved - a.solved)
    .slice(0, 10);

  // Daily Trend (Last 7 active days of entries)
  const dailyStats = {};
  targetLogs.forEach(l => {
    if (!dailyStats[l.date]) {
      dailyStats[l.date] = 0;
    }
    dailyStats[l.date] += l.solved;
  });

  const dailyTrend = Object.keys(dailyStats)
    .map(date => ({ date, solved: dailyStats[date] }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10); // Last 10 dates

  // Class Rankings (Sorted by total solved count)
  const classStats = {};
  classes.forEach(c => {
    classStats[c.id] = {
      id: c.id,
      name: c.name,
      solved: 0,
      studentCount: 0
    };
  });

  // Count active students per class
  students.forEach(s => {
    if (s.active && classStats[s.classId]) {
      classStats[s.classId].studentCount += 1;
    }
  });

  // Sum solved question count per class
  targetLogs.forEach(l => {
    const student = students.find(s => s.id === l.studentId);
    if (student && classStats[student.classId]) {
      classStats[student.classId].solved += l.solved;
    }
  });

  const classRankings = Object.values(classStats)
    .sort((a, b) => b.solved - a.solved);

  res.json({
    totals: {
      solved: totalSolved
    },
    branchSummary,
    topStudents,
    classRankings,
    dailyTrend,
    counts: {
      students: targetStudents.length,
      classes: classes.length,
      logs: targetLogs.length
    }
  });
});

// CSV Export route (Compatible with Excel)
app.get('/api/reports/export', authenticateToken, (req, res) => {
  const logs = getCollection('logs');
  const students = getCollection('students');
  const classes = getCollection('classes');
  const users = getCollection('users');

  let targetLogs = [...logs];
  if (req.user.role === 'teacher') {
    targetLogs = logs.filter(l => l.branch.toLowerCase() === req.user.branch.toLowerCase());
  }

  // Construct CSV Header with UTF-8 BOM so Turkish characters render correctly in Excel
  let csvContent = '\uFEFF'; 
  csvContent += 'Tarih;Öğrenci Adı;Sınıf/Şube;Branş;Çözülen Soru;Öğretmen\r\n';

  targetLogs.forEach(l => {
    const student = students.find(s => s.id === l.studentId);
    const className = student ? (classes.find(c => c.id === student.classId)?.name || '-') : '-';
    const teacher = users.find(u => u.id === l.teacherId);
    
    const row = [
      l.date,
      student ? student.name : 'Silinmiş Öğrenci',
      className,
      l.branch,
      l.solved,
      teacher ? teacher.name : '-'
    ];

    csvContent += row.join(';') + '\r\n';
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=lgs_soru_takip_raporu.csv');
  res.send(csvContent);
});

// Class-wide branch-by-branch report with date filtering
app.get('/api/reports/class-summary', authenticateToken, (req, res) => {
  if (req.user.role === 'student') {
    return res.status(403).json({ error: 'Öğrenci rolüyle bu rapora erişemezsiniz.' });
  }

  const { classId, startDate, endDate } = req.query;

  if (!classId) {
    return res.status(400).json({ error: 'Sınıf seçimi (classId) parametresi zorunludur.' });
  }

  // Teacher authorization check
  if (req.user.role === 'teacher') {
    const classIds = req.user.classIds || [];
    if (!classIds.includes(classId)) {
      return res.status(403).json({ error: 'Bu sınıfın raporlarını görme yetkiniz yok.' });
    }
  }

  const classes = getCollection('classes');
  const targetClass = classes.find(c => c.id === classId);
  if (!targetClass) {
    return res.status(404).json({ error: 'Sınıf bulunamadı.' });
  }

  const students = getCollection('students');
  const logs = getCollection('logs');

  // Filter students in selected class
  const classStudents = students.filter(s => s.classId === classId);
  const studentIdsInClass = new Set(classStudents.map(s => s.id));

  // Filter logs belonging to class students
  let filteredLogs = logs.filter(l => studentIdsInClass.has(l.studentId));

  // Date filters
  if (startDate) {
    filteredLogs = filteredLogs.filter(l => l.date >= startDate);
  }
  if (endDate) {
    filteredLogs = filteredLogs.filter(l => l.date <= endDate);
  }

  const branches = [
    "Türkçe",
    "Matematik",
    "Fen Bilimleri",
    "T.C. İnkılap Tarihi ve Atatürkçülük",
    "Din Kültürü ve Ahlak Bilgisi",
    "Yabancı Dil (İngilizce)"
  ];

  // Group solved counts by student
  const reports = classStudents.map(student => {
    const studentLogs = filteredLogs.filter(l => l.studentId === student.id);
    
    const branchSummary = {};
    branches.forEach(b => {
      branchSummary[b] = 0;
    });

    let totalSolved = 0;
    studentLogs.forEach(l => {
      if (branchSummary[l.branch] !== undefined) {
        const solvedNum = Number(l.solved) || 0;
        branchSummary[l.branch] += solvedNum;
        totalSolved += solvedNum;
      }
    });

    return {
      studentId: student.id,
      studentName: student.name,
      studentNo: student.studentNo,
      branchSummary,
      totalSolved
    };
  });

  // Calculate totals across the entire class
  const classBranchTotals = {};
  branches.forEach(b => {
    classBranchTotals[b] = 0;
  });
  let classTotalSolved = 0;

  reports.forEach(r => {
    branches.forEach(b => {
      classBranchTotals[b] += r.branchSummary[b];
    });
    classTotalSolved += r.totalSolved;
  });

  res.json({
    className: targetClass.name,
    classId: targetClass.id,
    reports,
    classBranchTotals,
    classTotalSolved
  });
});

// --- SERVING STATIC FRONTEND IN PRODUCTION ---
const distPath = path.join(__dirname, 'dist');
if (express.static(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    // If request starts with /api, pass it through (avoid HTML routing for API calls)
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
