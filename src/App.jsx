import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Edit, 
  LogOut, 
  Download, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  Layers, 
  Search, 
  Activity, 
  Award,
  PlusCircle,
  RefreshCw,
  Menu,
  X,
  Eye,
  FileText,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { api } from './utils/api';
import * as XLSX from 'xlsx';
import logo from './logo.png';

export default function App() {
  const [token, setToken] = useState(api.getToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Data States
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Student Preview States
  const [previewStudent, setPreviewStudent] = useState(null);
  const [previewStats, setPreviewStats] = useState(null);
  const [previewLogs, setPreviewLogs] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Class Report States
  const [classReportId, setClassReportId] = useState('');
  const [classReportStart, setClassReportStart] = useState('');
  const [classReportEnd, setClassReportEnd] = useState('');
  const [classReportData, setClassReportData] = useState(null);
  const [loadingClassReport, setLoadingClassReport] = useState(false);

  // Student Report States
  const [studentReportClassId, setStudentReportClassId] = useState('');
  const [studentReportStudentId, setStudentReportStudentId] = useState('');
  const [studentReportStats, setStudentReportStats] = useState(null);
  const [studentReportLogs, setStudentReportLogs] = useState([]);
  const [loadingStudentReport, setLoadingStudentReport] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentReportStart, setStudentReportStart] = useState('');
  const [studentReportEnd, setStudentReportEnd] = useState('');

  // Sidebar Menu Toggle States
  const [reportsMenuOpen, setReportsMenuOpen] = useState(true);

  // Target / Homework States
  const [targetClassId, setTargetClassId] = useState('');
  const [targetStartDate, setTargetStartDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [targetEndDate, setTargetEndDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(d.setDate(diff));
    return sunday.toISOString().split('T')[0];
  });
  const [targetReportData, setTargetReportData] = useState(null);
  const [loadingTargetReport, setLoadingTargetReport] = useState(false);
  const [assignType, setAssignType] = useState('class');
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignGoals, setAssignGoals] = useState({
    "Türkçe": 0,
    "Matematik": 0,
    "Fen Bilimleri": 0,
    "T.C. İnkılap Tarihi ve Atatürkçülük": 0,
    "Din Kültürü ve Ahlak Bilgisi": 0,
    "Yabancı Dil (İngilizce)": 0
  });
  const [isAssigning, setIsAssigning] = useState(false);

  // Filter States (Admin Logs View)
  const [logFilterClass, setLogFilterClass] = useState('');
  const [logFilterStudent, setLogFilterStudent] = useState('');
  const [logFilterBranch, setLogFilterBranch] = useState('');
  const [logFilterDate, setLogFilterDate] = useState('');

  // Form Modals
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState(null);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [teacherForm, setTeacherForm] = useState({
    username: '',
    password: '',
    name: '',
    branch: '',
    classIds: []
  });

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: '',
    studentNo: '',
    classId: '',
    active: true
  });

  // Import Students Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPasteText, setImportPasteText] = useState('');
  const [importPreviewList, setImportPreviewList] = useState([]);

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Teacher Quick Entry Form State
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryClassId, setEntryClassId] = useState('');
  const [entryBranch, setEntryBranch] = useState('Matematik');
  const [entrySearchQuery, setEntrySearchQuery] = useState('');
  const [bulkLogs, setBulkLogs] = useState([]); // [{ studentId, name, solved, correct, incorrect, net }]

  // Authentication check on mount
  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  // Refetch data when tab changes or role is loaded
  useEffect(() => {
    if (user) {
      loadTabData();
    }
  }, [user, activeTab]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profile = await api.get('/api/auth/me');
      setUser(profile);
    } catch (err) {
      showError(err.message);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const stats = await api.get('/api/reports/dashboard');
        setDashboardStats(stats);
        
        // Also fetch classes in background for name mapping
        const cls = await api.get('/api/classes');
        setClasses(cls);

        if (user && user.role === 'student') {
          const myLogs = await api.get('/api/logs');
          setLogs(myLogs);
        }
      }
      else if (activeTab === 'leaderboard') {
        const stats = await api.get('/api/reports/dashboard');
        setDashboardStats(stats);
        
        const cls = await api.get('/api/classes');
        setClasses(cls);
      }
      else if (activeTab === 'classes') {
        const cls = await api.get('/api/classes');
        setClasses(cls);
      }
      else if (activeTab === 'teachers') {
        const tchs = await api.get('/api/teachers');
        setTeachers(tchs);
        const cls = await api.get('/api/classes');
        setClasses(cls);
      }
      else if (activeTab === 'students') {
        const stds = await api.get('/api/students');
        setStudents(stds);
        const cls = await api.get('/api/classes');
        setClasses(cls);
      }
      else if (activeTab === 'logs') {
        const url = `/api/logs?classId=${logFilterClass}&studentId=${logFilterStudent}&branch=${logFilterBranch}&date=${logFilterDate}`;
        const data = await api.get(url);
        setLogs(data);

        // Fetch students and classes for filtering selects
        const stds = await api.get('/api/students');
        setStudents(stds);
        const cls = await api.get('/api/classes');
        setClasses(cls);
      }
      else if (activeTab === 'teacher-entry') {
        const cls = await api.get('/api/classes');
        setClasses(cls);
        const stds = await api.get('/api/students');
        setStudents(stds);
      }
      else if (activeTab === 'teacher-logs') {
        const data = await api.get('/api/logs');
        setLogs(data);
        const cls = await api.get('/api/classes');
        setClasses(cls);
      }
      else if (activeTab === 'class-reports') {
        const cls = await api.get('/api/classes');
        setClasses(cls);
        const isAdminUser = user && user.role === 'admin';
        const allowedClasses = cls.filter(c => isAdminUser || !user?.classIds || user.classIds.length === 0 || user.classIds.includes(c.id));
        if (allowedClasses.length > 0 && !classReportId) {
          setClassReportId(allowedClasses[0].id);
        }
      }
      else if (activeTab === 'student-reports') {
        const cls = await api.get('/api/classes');
        setClasses(cls);
        const stds = await api.get('/api/students');
        setStudents(stds);
      }
      else if (activeTab === 'targets') {
        const cls = await api.get('/api/classes');
        setClasses(cls);
        const stds = await api.get('/api/students');
        setStudents(stds);
        
        const isAdminUser = user && user.role === 'admin';
        const allowedClasses = cls.filter(c => isAdminUser || !user?.classIds || user.classIds.length === 0 || user.classIds.includes(c.id));
        if (allowedClasses.length > 0 && !targetClassId) {
          setTargetClassId(allowedClasses[0].id);
        }
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const fetchClassReport = async () => {
    if (!classReportId) {
      setClassReportData(null);
      return;
    }
    try {
      setLoadingClassReport(true);
      const url = `/api/reports/class-summary?classId=${classReportId}&startDate=${classReportStart}&endDate=${classReportEnd}`;
      const data = await api.get(url);
      setClassReportData(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoadingClassReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'class-reports' && classReportId) {
      fetchClassReport();
    } else if (activeTab === 'class-reports' && !classReportId) {
      setClassReportData(null);
    }
  }, [classReportId, classReportStart, classReportEnd, activeTab]);

  const fetchStudentReport = async (studentId) => {
    const sId = studentId || studentReportStudentId;
    if (!sId) {
      setStudentReportStats(null);
      setStudentReportLogs([]);
      return;
    }
    try {
      setLoadingStudentReport(true);
      const stats = await api.get(`/api/reports/dashboard?studentId=${sId}&startDate=${studentReportStart}&endDate=${studentReportEnd}`);
      setStudentReportStats(stats);
      const studentLogs = await api.get(`/api/logs?studentId=${sId}&startDate=${studentReportStart}&endDate=${studentReportEnd}`);
      setStudentReportLogs(studentLogs);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoadingStudentReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'student-reports' && studentReportStudentId) {
      fetchStudentReport(studentReportStudentId);
    } else if (activeTab === 'student-reports' && !studentReportStudentId) {
      setStudentReportStats(null);
      setStudentReportLogs([]);
    }
  }, [studentReportStudentId, studentReportStart, studentReportEnd, activeTab]);

  useEffect(() => {
    setStudentReportStudentId('');
    setStudentSearchQuery('');
    setStudentReportStats(null);
    setStudentReportLogs([]);
  }, [studentReportClassId]);

  const fetchTargetReport = async () => {
    if (!targetClassId || !targetStartDate || !targetEndDate) {
      setTargetReportData(null);
      return;
    }
    try {
      setLoadingTargetReport(true);
      const url = `/api/targets/report?classId=${targetClassId}&startDate=${targetStartDate}&endDate=${targetEndDate}`;
      const data = await api.get(url);
      setTargetReportData(data);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoadingTargetReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'targets' && targetClassId) {
      fetchTargetReport();
    } else if (activeTab === 'targets' && !targetClassId) {
      setTargetReportData(null);
    }
  }, [targetClassId, targetStartDate, targetEndDate, activeTab]);

  const handleSaveTargets = async (e) => {
    e.preventDefault();
    const targetId = assignType === 'class' ? targetClassId : assignStudentId;
    if (!targetId) {
      return showError(assignType === 'class' ? 'Lütfen bir sınıf seçin.' : 'Lütfen bir öğrenci seçin.');
    }
    
    const goals = {};
    Object.keys(assignGoals).forEach(b => {
      goals[b] = parseInt(assignGoals[b]) || 0;
    });

    const hasActiveGoal = Object.values(goals).some(g => g > 0);
    if (!hasActiveGoal) {
      return showError('Lütfen en az bir ders için soru hedefi belirleyin.');
    }

    try {
      setIsAssigning(true);
      const res = await api.post('/api/targets', {
        type: assignType,
        targetId,
        goals,
        startDate: targetStartDate,
        endDate: targetEndDate
      });
      showSuccess(res.message);
      fetchTargetReport();
      setAssignGoals({
        "Türkçe": 0,
        "Matematik": 0,
        "Fen Bilimleri": 0,
        "T.C. İnkılap Tarihi ve Atatürkçülük": 0,
        "Din Kültürü ve Ahlak Bilgisi": 0,
        "Yabancı Dil (İngilizce)": 0
      });
      setAssignStudentId('');
    } catch (err) {
      showError(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
      setLoading(true);
      const res = await api.post('/api/auth/login', { username, password });
      api.setToken(res.token);
      setToken(res.token);
      setUser(res.user);
      setActiveTab('dashboard');
      showSuccess(`Hoş geldiniz, ${res.user.name}`);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.clearToken();
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
    setClassReportId('');
    setClassReportStart('');
    setClassReportEnd('');
    setClassReportData(null);
    setStudentReportClassId('');
    setStudentReportStudentId('');
    setStudentSearchQuery('');
    setStudentReportStats(null);
    setStudentReportLogs([]);
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return showError('Yeni şifreler uyuşmuyor!');
    }
    if (passwordForm.newPassword.length < 4) {
      return showError('Şifre en az 4 karakter olmalıdır!');
    }
    try {
      setLoading(true);
      await api.put('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      showSuccess('Şifreniz başarıyla güncellendi.');
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD HANDLERS ---

  // Classes
  const handleOpenClassModal = (cls = null) => {
    if (cls) {
      setEditingClass(cls);
      setNewClassName(cls.name);
    } else {
      setEditingClass(null);
      setNewClassName('');
    }
    setShowClassModal(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!newClassName || newClassName.trim() === '') return;
    try {
      if (editingClass) {
        const updated = await api.put(`/api/classes/${editingClass.id}`, { name: newClassName });
        setClasses(classes.map(c => c.id === editingClass.id ? updated : c));
        showSuccess('Sınıf adı başarıyla güncellendi.');
      } else {
        const newCls = await api.post('/api/classes', { name: newClassName });
        setClasses([...classes, newCls]);
        showSuccess('Sınıf/Şube başarıyla açıldı.');
      }
      setNewClassName('');
      setEditingClass(null);
      setShowClassModal(false);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm('Bu sınıfı silmek istediğinizden emin misiniz? Sınıftaki öğrenciler "Sınıfsız" kalacaktır.')) return;
    try {
      await api.delete(`/api/classes/${id}`);
      setClasses(classes.filter(c => c.id !== id));
      showSuccess('Sınıf başarıyla silindi.');
    } catch (err) {
      showError(err.message);
    }
  };

  // Teachers
  const handleOpenTeacherModal = (tch = null) => {
    if (tch) {
      setEditingTeacher(tch);
      setTeacherForm({
        username: tch.username,
        password: '', // blank password unless changing
        name: tch.name,
        branch: tch.branch,
        classIds: tch.classIds || []
      });
    } else {
      setEditingTeacher(null);
      setTeacherForm({
        username: '',
        password: '',
        name: '',
        branch: 'Matematik',
        classIds: []
      });
    }
    setShowTeacherModal(true);
  };

  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    try {
      if (editingTeacher) {
        // Update
        const updated = await api.put(`/api/teachers/${editingTeacher.id}`, teacherForm);
        setTeachers(teachers.map(t => t.id === editingTeacher.id ? updated : t));
        showSuccess('Öğretmen bilgileri güncellendi.');
      } else {
        // Create
        const created = await api.post('/api/teachers', teacherForm);
        setTeachers([...teachers, created]);
        showSuccess('Öğretmen başarıyla eklendi.');
      }
      setShowTeacherModal(false);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Bu öğretmeni silmek istediğinizden emin misiniz?')) return;
    try {
      await api.delete(`/api/teachers/${id}`);
      setTeachers(teachers.filter(t => t.id !== id));
      showSuccess('Öğretmen hesabı silindi.');
    } catch (err) {
      showError(err.message);
    }
  };

  // Students
  const handleOpenStudentModal = (std = null) => {
    if (std) {
      setEditingStudent(std);
      setStudentForm({
        name: std.name,
        studentNo: std.studentNo || '',
        classId: std.classId || '',
        active: std.active
      });
    } else {
      setEditingStudent(null);
      setStudentForm({
        name: '',
        studentNo: '',
        classId: classes[0]?.id || '',
        active: true
      });
    }
    setShowStudentModal(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        const updated = await api.put(`/api/students/${editingStudent.id}`, studentForm);
        setStudents(students.map(s => s.id === editingStudent.id ? updated : s));
        showSuccess('Öğrenci bilgileri güncellendi.');
      } else {
        const created = await api.post('/api/students', studentForm);
        setStudents([...students, created]);
        showSuccess('Öğrenci başarıyla eklendi.');
      }
      setShowStudentModal(false);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleImportPasteChange = (text) => {
    setImportPasteText(text);
    if (!text.trim()) {
      setImportPreviewList([]);
      return;
    }
    
    const lines = text.trim().split('\n');
    const parsedStudents = [];
    
    lines.forEach((line, idx) => {
      let cols = [];
      if (line.includes('\t')) {
        cols = line.split('\t');
      } else if (line.includes(';')) {
        cols = line.split(';');
      } else {
        cols = line.split(',');
      }

      cols = cols.map(c => c.replace(/^["']|["']$/g, '').trim());

      // Skip lines with fewer columns
      if (cols.length < 3) return;

      // Skip header row if it contains keywords
      const isHeader = cols.some(col => 
        /no|ad|soyad|soyadı|isim|soyisim|shortname|sınıf|sube|şube/i.test(col)
      );
      if (isHeader && idx === 0) return;

      const studentNo = cols[0];
      const firstName = cols[1];
      const lastName = cols[2];
      const className = cols[3] || 'Sınıfsız';

      if (studentNo && firstName) {
        parsedStudents.push({
          studentNo,
          firstName,
          lastName,
          className,
          name: `${firstName} ${lastName}`.trim()
        });
      }
    });
    
    setImportPreviewList(parsedStudents);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const parsedStudents = [];
          
          rows.forEach((cols, idx) => {
            if (!cols || cols.length < 3) return;
            
            // Skip header row if it contains keywords
            const isHeader = cols.some(col => 
              col && /no|ad|soyad|soyadı|isim|soyisim|shortname|sınıf|sube|şube/i.test(col.toString())
            );
            if (isHeader && idx === 0) return;
            
            const studentNo = cols[0] ? cols[0].toString().trim() : '';
            const firstName = cols[1] ? cols[1].toString().trim() : '';
            const lastName = cols[2] ? cols[2].toString().trim() : '';
            const className = cols[3] ? cols[3].toString().trim() : 'Sınıfsız';
            
            if (studentNo && firstName) {
              parsedStudents.push({
                studentNo,
                firstName,
                lastName,
                className,
                name: `${firstName} ${lastName}`.trim()
              });
            }
          });
          
          setImportPreviewList(parsedStudents);
          const textRepresentation = parsedStudents.map(s => `${s.studentNo}\t${s.name}\t${s.className}`).join('\n');
          setImportPasteText(textRepresentation);
          showSuccess(`${parsedStudents.length} öğrenci Excel dosyasından başarıyla okundu.`);
        } catch (err) {
          showError('Excel dosyası okunurken hata oluştu: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        handleImportPasteChange(text);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleSaveImport = async () => {
    if (importPreviewList.length === 0) return showError('İçe aktarılacak öğrenci bulunamadı.');
    
    try {
      setLoading(true);
      const res = await api.post('/api/students/import', { students: importPreviewList });
      showSuccess(res.message);
      
      // Reload students and classes
      const stds = await api.get('/api/students');
      setStudents(stds);
      const cls = await api.get('/api/classes');
      setClasses(cls);
      
      // Close modal
      setShowImportModal(false);
      setImportPasteText('');
      setImportPreviewList([]);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Bu öğrenciyi ve çözdüğü tüm soru kayıtlarını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) return;
    try {
      await api.delete(`/api/students/${id}`);
      setStudents(students.filter(s => s.id !== id));
      showSuccess('Öğrenci başarıyla silindi.');
    } catch (err) {
      showError(err.message);
    }
  };

  // Delete log entry
  const handleDeleteLog = async (id) => {
    if (!window.confirm('Bu soru kaydını silmek istediğinizden emin misiniz?')) return;
    try {
      await api.delete(`/api/logs/${id}`);
      setLogs(logs.filter(l => l.id !== id));
      if (activeTab === 'dashboard') {
        // reload dashboard stats
        const stats = await api.get('/api/reports/dashboard');
        setDashboardStats(stats);
      }
      showSuccess('Soru kaydı başarıyla silindi.');
    } catch (err) {
      showError(err.message);
    }
  };

  const handleViewStudentPanel = async (student) => {
    try {
      setLoadingPreview(true);
      setPreviewStudent(student);
      
      // Fetch stats for the student
      const stats = await api.get(`/api/reports/dashboard?studentId=${student.id}`);
      setPreviewStats(stats);
      
      // Fetch logs for the student
      const studentLogs = await api.get(`/api/logs?studentId=${student.id}`);
      setPreviewLogs(studentLogs);
    } catch (err) {
      showError(err.message);
      setPreviewStudent(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const csvData = await api.get('/api/reports/export');
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `lgs_soru_takip_raporu_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess('Rapor indirildi.');
    } catch (err) {
      showError(err.message);
    }
  };

  const handleExportClassReportToExcel = () => {
    if (!classReportData || !classReportData.reports) {
      showError('İndirilecek rapor verisi bulunamadı.');
      return;
    }

    try {
      const branches = [
        "Türkçe",
        "Matematik",
        "Fen Bilimleri",
        "T.C. İnkılap Tarihi ve Atatürkçülük",
        "Din Kültürü ve Ahlak Bilgisi",
        "Yabancı Dil (İngilizce)"
      ];

      const headers = [
        "Öğrenci No",
        "Öğrenci Adı",
        ...branches,
        "Toplam"
      ];

      const dataRows = classReportData.reports.map(r => {
        const row = [
          r.studentNo || '',
          r.studentName || ''
        ];
        branches.forEach(b => {
          row.push(r.branchSummary[b] || 0);
        });
        row.push(r.totalSolved || 0);
        return row;
      });

      const totalsRow = [
        "GENEL",
        "Sınıf Toplamı"
      ];
      branches.forEach(b => {
        totalsRow.push(classReportData.classBranchTotals[b] || 0);
      });
      totalsRow.push(classReportData.classTotalSolved || 0);

      dataRows.push(totalsRow);

      const ws = XLSX.utils.aoa_to_sheet([
        [`${classReportData.className} - Sınıf Soru Çözüm Raporu`],
        [`Tarih Aralığı: ${classReportStart || 'Tüm Zamanlar'} - ${classReportEnd || 'Tüm Zamanlar'}`],
        [],
        headers,
        ...dataRows
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sınıf Raporu");

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${classReportData.className}_sinif_raporu_${dateStr}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      showSuccess('Excel raporu başarıyla indirildi.');
    } catch (err) {
      showError('Excel dosyası oluşturulurken hata oluştu: ' + err.message);
    }
  };

  // --- TEACHER ENTRY LOGIC ---

  // When class changes, initialize class student list
  useEffect(() => {
    if (activeTab === 'teacher-entry') {
      if (entryClassId) {
        const classStudents = students.filter(s => s.classId === entryClassId && s.active);
        setBulkLogs(classStudents.map(s => ({
          studentId: s.id,
          name: s.name,
          className: classes.find(c => c.id === s.classId)?.name || '',
          solved: ''
        })));
        setEntrySearchQuery('');
      } else {
        setBulkLogs([]);
      }
    }
  }, [entryClassId, activeTab, students, classes]);

  // When search query changes without class selected, load matching students
  useEffect(() => {
    if (activeTab === 'teacher-entry' && !entryClassId) {
      const query = entrySearchQuery.trim();
      if (query.length >= 2) {
        const isTeacher = user?.role === 'teacher';
        const matched = students.filter(s => {
          const matchesSearch = s.name.toLowerCase().includes(query.toLowerCase());
          const isClassAuthorized = !isTeacher || !user?.classIds || user.classIds.length === 0 || user.classIds.includes(s.classId);
          return s.active && matchesSearch && isClassAuthorized;
        });

        // Map to logs, preserving any already entered solved counts
        setBulkLogs(prev => {
          return matched.map(s => {
            const existing = prev.find(p => p.studentId === s.id);
            return {
              studentId: s.id,
              name: s.name,
              className: classes.find(c => c.id === s.classId)?.name || '',
              solved: existing ? existing.solved : ''
            };
          });
        });
      } else {
        setBulkLogs([]);
      }
    }
  }, [entrySearchQuery, entryClassId, activeTab, students, classes, user]);

  const handleBulkLogChange = (studentId, field, value) => {
    const updated = bulkLogs.map(item => {
      if (item.studentId === studentId) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setBulkLogs(updated);
  };

  const handleSaveBulkLogs = async (e) => {
    e.preventDefault();
    if (!entryDate) return showError('Lütfen bir tarih seçin.');

    // Filter out rows with no entries (solved=0)
    const logsToSave = bulkLogs
      .filter(l => l.solved !== '' && parseInt(l.solved) > 0)
      .map(({ studentId, solved }) => ({
        studentId,
        solved: parseInt(solved) || 0
      }));

    if (logsToSave.length === 0) {
      return showError('Lütfen en az bir öğrenci için soru sayısı girin.');
    }

    const detailLines = logsToSave.map(item => {
      const studentName = bulkLogs.find(p => p.studentId === item.studentId)?.name || 'Öğrenci';
      return `- ${studentName}: ${item.solved} Soru`;
    });

    const confirmMessage = `Aşağıdaki soru çözümlerini kaydetmek istediğinizden emin misiniz?\n\n${detailLines.join('\n')}`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      await api.post('/api/logs/bulk', {
        date: entryDate,
        logs: logsToSave,
        ...(isAdmin ? { branch: entryBranch } : {})
      });
      showSuccess('Tüm soru çözümleri başarıyla kaydedildi!');
      // Reset inputs
      setEntryClassId('');
      setEntrySearchQuery('');
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERS ---

  if (!token) {
    // LOGIN RENDER
    return (
      <div className="auth-page">
        <div className="glass-card auth-card animate-fade-in">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src={logo} alt="PROVIP Logo" style={{ maxHeight: '65px', display: 'block', margin: '0 auto 1.5rem', objectFit: 'contain' }} />
            <h1 className="title-gradient" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Soru Takip Sistemi</h1>
            <p className="text-muted">LGS Hazırlık Süreci Soru Analiz Paneli</p>
          </div>

          {errorMessage && (
            <div className="glass-card badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: '8px' }}>
              <AlertCircle size={20} />
              <span style={{ fontSize: '0.9rem' }}>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Kullanıcı Adı</label>
              <input 
                name="username" 
                type="text" 
                className="glass-input" 
                placeholder="Örn: ahmet_hoca" 
                required 
                autoComplete="username"
              />
            </div>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Şifre</label>
              <input 
                name="password" 
                type="password" 
                className="glass-input" 
                placeholder="••••••••" 
                required 
                autoComplete="current-password"
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.875rem' }}
              disabled={loading}
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Giriş Yap'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Varsayılan yönetici hesabı: <strong>admin</strong> / <strong>admin123</strong>
          </div>
        </div>
      </div>
    );
  }

  // Loaded Profile Spinner
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
        <RefreshCw className="animate-spin" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary)' }} size={40} />
        <style>{`
          @keyframes spin { 
            100% { transform: rotate(360deg); } 
          }
        `}</style>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const displayStudents = isAdmin 
    ? students 
    : students.filter(s => user.classIds && user.classIds.includes(s.classId));

  // MAIN SYSTEM PANEL
  return (
    <div className="app-container">
      
      {/* MOBILE HEADER */}
      <header className="mobile-header">
        <div className="mobile-header-logo">
          <img src={logo} alt="PROVIP Logo" style={{ maxHeight: '34px', objectFit: 'contain' }} />
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-toggle-btn" aria-label="Menü">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* MOBILE BACKDROP OVERLAY */}
      <div 
        className={`sidebar-overlay ${mobileMenuOpen ? 'visible' : ''}`} 
        onClick={() => setMobileMenuOpen(false)}
      ></div>
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ paddingLeft: '0.25rem', marginBottom: '0.5rem' }}>
          <img src={logo} alt="PROVIP Logo" style={{ maxHeight: '44px', maxWidth: '100%', objectFit: 'contain' }} />
        </div>

        <nav className="sidebar-nav">
          {user.role === 'student' ? (
            <>
              <button 
                className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              >
                <BarChart3 size={18} />
                <span>Analizlerim</span>
              </button>

              <button 
                className={`sidebar-link ${activeTab === 'leaderboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('leaderboard'); setMobileMenuOpen(false); }}
              >
                <Award size={18} />
                <span>Liderlik Tablosu</span>
              </button>
            </>
          ) : isAdmin ? (
            <>
              <button 
                className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              >
                <BarChart3 size={18} />
                <span>Dashboard</span>
              </button>

              <button 
                className={`sidebar-link ${activeTab === 'classes' ? 'active' : ''}`}
                onClick={() => { setActiveTab('classes'); setMobileMenuOpen(false); }}
              >
                <Layers size={18} />
                <span>Sınıf / Şube</span>
              </button>

              <button 
                className={`sidebar-link ${activeTab === 'teachers' ? 'active' : ''}`}
                onClick={() => { setActiveTab('teachers'); setMobileMenuOpen(false); }}
              >
                <Users size={18} />
                <span>Öğretmenler</span>
              </button>

              <button 
                className={`sidebar-link ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => { setActiveTab('students'); setMobileMenuOpen(false); }}
              >
                <GraduationCap size={18} />
                <span>Öğrenciler</span>
              </button>

              <div className="sidebar-dropdown">
                <button 
                  className={`sidebar-link ${activeTab === 'class-reports' || activeTab === 'student-reports' ? 'active' : ''}`}
                  onClick={() => setReportsMenuOpen(!reportsMenuOpen)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', border: 'none', background: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} />
                    <span>Raporlar</span>
                  </div>
                  {reportsMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                {reportsMenuOpen && (
                  <div className="sidebar-submenu">
                    <button 
                      className={`sidebar-link ${activeTab === 'class-reports' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('class-reports'); setMobileMenuOpen(false); }}
                    >
                      <Layers size={14} />
                      <span>Sınıf Raporları</span>
                    </button>
                    
                    <button 
                      className={`sidebar-link ${activeTab === 'student-reports' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('student-reports'); setMobileMenuOpen(false); }}
                    >
                      <GraduationCap size={14} />
                      <span>Öğrenci Raporları</span>
                    </button>
                  </div>
                )}
              </div>

              <button 
                className={`sidebar-link ${activeTab === 'logs' ? 'active' : ''}`}
                onClick={() => { setActiveTab('logs'); setMobileMenuOpen(false); }}
              >
                <BookOpen size={18} />
                <span>Geçmiş Kayıtlar</span>
              </button>

              <button 
                className={`sidebar-link ${activeTab === 'teacher-entry' ? 'active' : ''}`}
                onClick={() => { setActiveTab('teacher-entry'); setMobileMenuOpen(false); }}
              >
                <PlusCircle size={18} />
                <span>Soru Girişi</span>
              </button>

              <button 
                className={`sidebar-link ${activeTab === 'targets' ? 'active' : ''}`}
                onClick={() => { setActiveTab('targets'); setMobileMenuOpen(false); }}
              >
                <CheckCircle size={18} />
                <span>Ödev & Hedefler</span>
              </button>
            </>
          ) : (
            <>
              <button 
                className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              >
                <BarChart3 size={18} />
                <span>Dashboard</span>
              </button>

              <button 
                className={`sidebar-link ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => { setActiveTab('students'); setMobileMenuOpen(false); }}
              >
                <GraduationCap size={18} />
                <span>Öğrenciler</span>
              </button>

              <div className="sidebar-dropdown">
                <button 
                  className={`sidebar-link ${activeTab === 'class-reports' || activeTab === 'student-reports' ? 'active' : ''}`}
                  onClick={() => setReportsMenuOpen(!reportsMenuOpen)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', border: 'none', background: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} />
                    <span>Raporlar</span>
                  </div>
                  {reportsMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                {reportsMenuOpen && (
                  <div className="sidebar-submenu">
                    <button 
                      className={`sidebar-link ${activeTab === 'class-reports' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('class-reports'); setMobileMenuOpen(false); }}
                    >
                      <Layers size={14} />
                      <span>Sınıf Raporları</span>
                    </button>
                    
                    <button 
                      className={`sidebar-link ${activeTab === 'student-reports' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('student-reports'); setMobileMenuOpen(false); }}
                    >
                      <GraduationCap size={14} />
                      <span>Öğrenci Raporları</span>
                    </button>
                  </div>
                )}
              </div>

              <button 
                className={`sidebar-link ${activeTab === 'teacher-entry' ? 'active' : ''}`}
                onClick={() => { setActiveTab('teacher-entry'); setMobileMenuOpen(false); }}
              >
                <PlusCircle size={18} />
                <span>Soru Girişi</span>
              </button>

              <button 
                className={`sidebar-link ${activeTab === 'teacher-logs' ? 'active' : ''}`}
                onClick={() => { setActiveTab('teacher-logs'); setMobileMenuOpen(false); }}
              >
                <BookOpen size={18} />
                <span>Girdiğim Kayıtlar</span>
              </button>

              <button 
                className={`sidebar-link ${activeTab === 'targets' ? 'active' : ''}`}
                onClick={() => { setActiveTab('targets'); setMobileMenuOpen(false); }}
              >
                <CheckCircle size={18} />
                <span>Ödev & Hedefler</span>
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div 
            className="user-profile-badge" 
            style={{ cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background-color var(--transition-fast)' }}
            onClick={() => {
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setShowPasswordModal(true);
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Şifre Değiştirmek İçin Tıklayın"
          >
            <div className="user-avatar">
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">
                {user.role === 'student' 
                  ? `Öğrenci • No: ${user.username}` 
                  : `${user.branch} • ${isAdmin ? 'Yönetici' : 'Öğretmen'}`}
              </span>
            </div>
          </div>
          
          <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
            <LogOut size={16} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        
        {/* Floating Toast Alerts */}
        {successMessage && (
          <div className="animate-slide-in" style={{ 
            position: 'fixed', 
            top: '2rem', 
            right: '2rem', 
            padding: '1rem 1.5rem', 
            borderRadius: '12px', 
            zIndex: 9999, 
            background: 'rgba(16, 185, 129, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontWeight: '600',
            fontSize: '0.95rem',
            boxShadow: '0 10px 40px rgba(16, 185, 129, 0.4)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem' 
          }}>
            <CheckCircle size={20} />
            <span>{successMessage}</span>
          </div>
        )}
        
        {errorMessage && (
          <div className="animate-slide-in" style={{ 
            position: 'fixed', 
            top: '2rem', 
            right: '2rem', 
            padding: '1rem 1.5rem', 
            borderRadius: '12px', 
            zIndex: 9999, 
            background: 'rgba(239, 68, 68, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontWeight: '600',
            fontSize: '0.95rem',
            boxShadow: '0 10px 40px rgba(239, 68, 68, 0.4)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem' 
          }}>
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ----------------- DASHBOARD VIEW ----------------- */}
        {activeTab === 'dashboard' && dashboardStats && (
          <div className="animate-fade-in">
            {user.role === 'student' ? (
              // STUDENT DASHBOARD VIEW
              <>
                <div className="view-header">
                  <div className="view-header-title">
                    <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Hoş Geldin, {user.name} 👋</h1>
                    <p className="text-muted">Bireysel LGS soru takip ve gelişim analiz paneli</p>
                  </div>
                  <div className="view-header-actions">
                    <button 
                      onClick={() => {
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setShowPasswordModal(true);
                      }} 
                      className="btn btn-secondary"
                    >
                      <span>Şifre Değiştir</span>
                    </button>
                  </div>
                </div>

                {/* Quick Metrics Grid */}
                <div className="stats-grid">
                  <div className="glass-card stat-card">
                    <div>
                      <span className="text-muted">Toplam Soru Çözümüm</span>
                      <div className="stat-value">{dashboardStats.totals?.solved || 0}</div>
                    </div>
                    <div className="stat-icon stat-icon-violet">
                      <Activity size={24} />
                    </div>
                  </div>

                  <div className="glass-card stat-card">
                     <div>
                       <span className="text-muted">Okul Genel Sıralamam</span>
                       <div className="stat-value" style={{ fontSize: '1.8rem', marginTop: '0.8rem', marginBottom: '0.8rem' }}>
                         #{dashboardStats.studentInfo?.rank || '-'} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {dashboardStats.studentInfo?.totalStudentsCount || 0}</span>
                       </div>
                     </div>
                     <div className="stat-icon stat-icon-cyan">
                       <Award size={24} />
                     </div>
                  </div>

                  <div className="glass-card stat-card">
                    <div>
                      <span className="text-muted">Sınıfım / Şubem</span>
                      <div className="stat-value" style={{ fontSize: '1.8rem', marginTop: '0.8rem', marginBottom: '0.8rem' }}>
                        {dashboardStats.studentInfo?.className || 'Sınıfsız'}
                      </div>
                    </div>
                    <div className="stat-icon stat-icon-emerald">
                      <Layers size={24} />
                    </div>
                  </div>

                  <div className="glass-card stat-card">
                    <div>
                      <span className="text-muted">Soru Giriş Kaydım</span>
                      <div className="stat-value">{dashboardStats.counts?.logs || 0}</div>
                    </div>
                    <div className="stat-icon stat-icon-rose">
                      <CheckCircle size={24} />
                    </div>
                  </div>
                </div>

                {(() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const activeTarget = user && user.targets && user.targets.find(t => todayStr >= t.startDate && todayStr <= t.endDate) || 
                                       (user && user.targets && user.targets.length > 0 ? user.targets[user.targets.length - 1] : null);
                  
                  if (!activeTarget) return null;

                  let targetBranchProgress = {};
                  let targetTotalSolved = 0;
                  let targetTotalGoal = 0;

                  Object.keys(activeTarget.goals).forEach(branch => {
                    const goalVal = activeTarget.goals[branch] || 0;
                    if (goalVal > 0) {
                      const solvedInLogs = logs
                        .filter(l => l.branch === branch && l.date >= activeTarget.startDate && l.date <= activeTarget.endDate)
                        .reduce((sum, l) => sum + (parseInt(l.solved) || 0), 0);
                      
                      targetBranchProgress[branch] = {
                        goal: goalVal,
                        solved: solvedInLogs,
                        percent: Math.min(100, Math.round((solvedInLogs / goalVal) * 100))
                      };
                      
                      targetTotalSolved += solvedInLogs;
                      targetTotalGoal += goalVal;
                    }
                  });

                  const overallPercent = targetTotalGoal > 0 ? Math.min(100, Math.round((targetTotalSolved / targetTotalGoal) * 100)) : 0;
                  const isSuccess = overallPercent === 100;

                  return (
                    <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem' }}>
                            <CheckCircle size={20} color="var(--primary)" />
                            Haftalık Ödev ve Hedeflerim
                          </h3>
                          <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                            {activeTarget.startDate} - {activeTarget.endDate} tarihleri arası hedefleriniz (Atayan: {activeTarget.assignedBy || 'Öğretmen'})
                          </p>
                        </div>
                        <div style={{ backgroundColor: 'var(--primary-glow)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                          <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.9rem' }}>
                            Genel İlerleme: %{overallPercent}
                          </span>
                        </div>
                      </div>

                      {isSuccess && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          <Award size={24} color="var(--success)" />
                          <div>
                            <span style={{ fontWeight: '700', color: 'var(--success)', display: 'block', fontSize: '0.95rem' }}>Tebrikler! 🎉</span>
                            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Bu haftaki tüm soru çözme hedeflerini başarıyla tamamladın! Çalışmaya devam et.</span>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {Object.keys(activeTarget.goals).map((branch) => {
                          const goalVal = activeTarget.goals[branch] || 0;
                          if (goalVal === 0) return null;

                          const progress = targetBranchProgress[branch] || { goal: goalVal, solved: 0, percent: 0 };
                          const isCompleted = progress.solved >= progress.goal;

                          return (
                            <div key={branch} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.01)', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{branch}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: isCompleted ? 'var(--success)' : 'var(--text-main)' }}>
                                  {progress.solved} / {progress.goal} soru ({progress.percent}%)
                                </span>
                              </div>
                              <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${progress.percent}%`, 
                                  height: '100%', 
                                  backgroundColor: isCompleted ? 'var(--success)' : 'var(--primary)', 
                                  transition: 'width 0.5s ease',
                                  borderRadius: '4px'
                                }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="grid-2col" style={{ marginBottom: '2rem' }}>
                  {/* Daily Trend Chart */}
                  <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Günlük Soru Çözüm Eğilimim</h3>
                    {!dashboardStats.dailyTrend || dashboardStats.dailyTrend.length === 0 ? (
                      <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Henüz grafik için veri girişi bulunmuyor.
                      </div>
                    ) : (
                      <div className="chart-container">
                        {dashboardStats.dailyTrend.map((day, idx) => {
                          const maxVal = Math.max(...dashboardStats.dailyTrend.map(d => d.solved), 1);
                          const heightPercent = (day.solved / maxVal) * 80 + 5;
                          return (
                            <div key={idx} className="chart-bar-wrapper">
                              <div className="chart-bar" style={{ height: `${heightPercent}%` }}>
                                <span className="chart-bar-value">{day.solved}</span>
                              </div>
                              <span className="chart-label" title={day.date}>
                                {day.date.substring(5)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Subject Breakdown */}
                  <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Ders Bazlı Soru Dağılımım</h3>
                    {!dashboardStats.branchSummary || dashboardStats.branchSummary.length === 0 ? (
                      <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Kayıtlı branş istatistiği yok.
                      </div>
                    ) : (
                      <div className="dashboard-list">
                        {dashboardStats.branchSummary.map((br, idx) => (
                          <div key={idx} className="dashboard-list-item">
                            <div>
                              <strong style={{ fontSize: '1rem' }}>{br.branch}</strong>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span className="badge badge-primary">
                                {br.solved} Soru
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Son Soru Çözüm Kayıtları Tablosu */}
                <div className="glass-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Son Soru Çözüm Kayıtlarım</h3>
                  {logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                      Henüz soru çözüm kaydınız bulunmuyor.
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                         <thead>
                           <tr>
                             <th>Tarih</th>
                             <th>Ders / Branş</th>
                             <th>Çözülen Soru Sayısı</th>
                           </tr>
                         </thead>
                         <tbody>
                           {logs.slice(0, 10).map(l => (
                             <tr key={l.id}>
                               <td>{l.date}</td>
                               <td><span className="badge badge-success">{l.branch}</span></td>
                               <td><strong>{l.solved} Soru</strong></td>
                             </tr>
                           ))}
                         </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // STAFF / ADMIN DASHBOARD VIEW
              <>
                <div className="view-header">
                  <div className="view-header-title">
                    <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Genel Durum Analizi</h1>
                    <p className="text-muted">Öğrenci soru çözüm verileri ve başarı grafikleri</p>
                  </div>
                  <div className="view-header-actions">
                    <button onClick={handleExportCSV} className="btn btn-primary">
                      <Download size={16} />
                      <span>Raporu Excel Olarak İndir</span>
                    </button>
                  </div>
                </div>

                {/* Quick Metrics Grid */}
                <div className="stats-grid">
                  <div className="glass-card stat-card">
                    <div>
                      <span className="text-muted">Toplam Çözülen Soru</span>
                      <div className="stat-value">{dashboardStats.totals.solved}</div>
                    </div>
                    <div className="stat-icon stat-icon-violet">
                      <Activity size={24} />
                    </div>
                  </div>

                  <div className="glass-card stat-card">
                    <div>
                      <span className="text-muted">Toplam Öğrenci</span>
                      <div className="stat-value">{dashboardStats.counts.students}</div>
                    </div>
                    <div className="stat-icon stat-icon-cyan">
                      <GraduationCap size={24} />
                    </div>
                  </div>

                  <div className="glass-card stat-card">
                    <div>
                      <span className="text-muted">Toplam Sınıf / Şube</span>
                      <div className="stat-value">{dashboardStats.counts.classes}</div>
                    </div>
                    <div className="stat-icon stat-icon-emerald">
                      <Layers size={24} />
                    </div>
                  </div>

                  <div className="glass-card stat-card">
                    <div>
                      <span className="text-muted">Soru Giriş Kaydı</span>
                      <div className="stat-value">{dashboardStats.counts.logs}</div>
                    </div>
                    <div className="stat-icon stat-icon-rose">
                      <Activity size={24} />
                    </div>
                  </div>
                </div>

                <div className="grid-2col" style={{ marginBottom: '2rem' }}>
                  {/* Daily Trend Chart */}
                  <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Günlük Soru Çözüm Eğilimi</h3>
                    {dashboardStats.dailyTrend.length === 0 ? (
                      <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Henüz grafik için veri girişi bulunmuyor.
                      </div>
                    ) : (
                      <div className="chart-container">
                        {dashboardStats.dailyTrend.map((day, idx) => {
                          const maxVal = Math.max(...dashboardStats.dailyTrend.map(d => d.solved), 1);
                          const heightPercent = (day.solved / maxVal) * 80 + 5; // bounds between 5% and 85%
                          return (
                            <div key={idx} className="chart-bar-wrapper">
                              <div className="chart-bar" style={{ height: `${heightPercent}%` }}>
                                <span className="chart-bar-value">{day.solved}</span>
                              </div>
                              <span className="chart-label" title={day.date}>
                                {day.date.substring(5)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Branch Breakdown */}
                  <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Branş Bazlı Soru Çözümü</h3>
                    {dashboardStats.branchSummary.length === 0 ? (
                      <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Kayıtlı branş istatistiği yok.
                      </div>
                    ) : (
                      <div className="dashboard-list">
                        {dashboardStats.branchSummary.map((br, idx) => (
                          <div key={idx} className="dashboard-list-item">
                            <div>
                              <strong style={{ fontSize: '1rem' }}>{br.branch}</strong>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span className="badge badge-primary">
                                {br.solved} Soru
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Students Ranking */}
                <div className="glass-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Soru Çözüm Sıralaması (İlk 10 Öğrenci)</h3>
                  {dashboardStats.topStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Henüz veri girilmemiş.
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>Sıra</th>
                            <th>Öğrenci Adı</th>
                            <th>Sınıf / Şube</th>
                            <th style={{ textAlign: 'center' }}>Türkçe</th>
                            <th style={{ textAlign: 'center' }}>Matematik</th>
                            <th style={{ textAlign: 'center' }}>Fen Bil.</th>
                            <th style={{ textAlign: 'center' }}>İnkılap T.</th>
                            <th style={{ textAlign: 'center' }}>Din K.</th>
                            <th style={{ textAlign: 'center' }}>İngilizce</th>
                            <th style={{ textAlign: 'center', fontWeight: 'bold' }}>Toplam</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardStats.topStudents.map((std, idx) => (
                            <tr key={std.id}>
                              <td>
                                <span className="badge badge-primary" style={{ minWidth: '24px', justifyContent: 'center' }}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td style={{ fontWeight: '600' }}>{std.name}</td>
                              <td>{std.className}</td>
                              <td style={{ textAlign: 'center' }}>{std.branches?.["Türkçe"] || 0}</td>
                              <td style={{ textAlign: 'center' }}>{std.branches?.["Matematik"] || 0}</td>
                              <td style={{ textAlign: 'center' }}>{std.branches?.["Fen Bilimleri"] || 0}</td>
                              <td style={{ textAlign: 'center' }}>{std.branches?.["T.C. İnkılap Tarihi ve Atatürkçülük"] || 0}</td>
                              <td style={{ textAlign: 'center' }}>{std.branches?.["Din Kültürü ve Ahlak Bilgisi"] || 0}</td>
                              <td style={{ textAlign: 'center' }}>{std.branches?.["Yabancı Dil (İngilizce)"] || 0}</td>
                              <td style={{ textAlign: 'center' }}>
                                <strong style={{ color: 'var(--primary)' }}>{std.solved} Soru</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Class Rankings */}
                <div className="glass-card" style={{ marginTop: '2rem' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>Sınıf Bazlı Soru Çözüm Sıralaması</h3>
                  {!dashboardStats.classRankings || dashboardStats.classRankings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Henüz veri girilmemiş.
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>Sıra</th>
                            <th>Sınıf / Şube Adı</th>
                            <th>Öğrenci Sayısı</th>
                            <th>Toplam Çözülen Soru</th>
                            <th>Öğrenci Başına Ortalama Soru</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardStats.classRankings.map((cls, idx) => {
                            const avg = cls.studentCount > 0 ? Math.round(cls.solved / cls.studentCount) : 0;
                            return (
                              <tr key={cls.id}>
                                <td>
                                  <span className="badge badge-primary" style={{ minWidth: '24px', justifyContent: 'center' }}>
                                    {idx + 1}
                                  </span>
                                </td>
                                <td style={{ fontWeight: '600' }}>{cls.name}</td>
                                <td>{cls.studentCount} Öğrenci</td>
                                <td>
                                  <strong style={{ color: 'var(--primary)' }}>{cls.solved} Soru</strong>
                                </td>
                                <td>
                                  <span className="badge badge-success">{avg} Soru/Öğrenci</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ----------------- LIDERLIK TABLOSU VIEW ----------------- */}
        {activeTab === 'leaderboard' && dashboardStats && (
          <div className="animate-fade-in">
            <div className="view-header">
              <div className="view-header-title">
                <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Okul Liderlik Tablosu 🏆</h1>
                <p className="text-muted">Genel soru çözüm sıralaması ve dereceye giren öğrenciler</p>
              </div>
            </div>

            {/* Podium for Ranks 1-3 */}
            {dashboardStats.topStudents && dashboardStats.topStudents.length > 0 && (
              <div className="podium-container">
                {/* 2nd Place */}
                {dashboardStats.topStudents[1] && (
                  <div className="podium-step second animate-fade-in">
                    <div className="podium-avatar">
                      {dashboardStats.topStudents[1].name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="podium-info">
                      <div className="podium-student-name" title={dashboardStats.topStudents[1].name}>
                        {dashboardStats.topStudents[1].name}
                      </div>
                      <div className="podium-student-class">
                        {dashboardStats.topStudents[1].className}
                      </div>
                    </div>
                    <div className="podium-bar">
                      <div className="podium-bar-value">{dashboardStats.topStudents[1].solved} Soru</div>
                      <div className="podium-bar-rank">2</div>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {dashboardStats.topStudents[0] && (
                  <div className="podium-step first animate-fade-in">
                    <span className="podium-crown">👑</span>
                    <div className="podium-avatar">
                      {dashboardStats.topStudents[0].name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="podium-info">
                      <div className="podium-student-name" title={dashboardStats.topStudents[0].name}>
                        {dashboardStats.topStudents[0].name}
                      </div>
                      <div className="podium-student-class">
                        {dashboardStats.topStudents[0].className}
                      </div>
                    </div>
                    <div className="podium-bar">
                      <div className="podium-bar-value">{dashboardStats.topStudents[0].solved} Soru</div>
                      <div className="podium-bar-rank">1</div>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {dashboardStats.topStudents[2] && (
                  <div className="podium-step third animate-fade-in">
                    <div className="podium-avatar">
                      {dashboardStats.topStudents[2].name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="podium-info">
                      <div className="podium-student-name" title={dashboardStats.topStudents[2].name}>
                        {dashboardStats.topStudents[2].name}
                      </div>
                      <div className="podium-student-class">
                        {dashboardStats.topStudents[2].className}
                      </div>
                    </div>
                    <div className="podium-bar">
                      <div className="podium-bar-value">{dashboardStats.topStudents[2].solved} Soru</div>
                      <div className="podium-bar-rank">3</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top 10 Students Table */}
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Soru Çözüm Sıralaması (İlk 10 Öğrenci)</h3>
              {!dashboardStats.topStudents || dashboardStats.topStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Henüz veri girilmemiş.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Sıra</th>
                        <th>Öğrenci Adı</th>
                        <th>Sınıf / Şube</th>
                        <th style={{ textAlign: 'center' }}>Türkçe</th>
                        <th style={{ textAlign: 'center' }}>Matematik</th>
                        <th style={{ textAlign: 'center' }}>Fen Bil.</th>
                        <th style={{ textAlign: 'center' }}>İnkılap T.</th>
                        <th style={{ textAlign: 'center' }}>Din K.</th>
                        <th style={{ textAlign: 'center' }}>İngilizce</th>
                        <th style={{ textAlign: 'center', fontWeight: 'bold' }}>Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardStats.topStudents.map((std, idx) => {
                        const isCurrentUser = user.role === 'student' && std.studentNo?.toString() === user.username?.toString();
                        return (
                          <tr key={std.id} className={isCurrentUser ? 'leaderboard-row-highlight' : ''}>
                            <td>
                              <span 
                                className={`badge ${idx === 0 ? 'badge-primary' : idx === 1 ? 'badge-success' : idx === 2 ? 'badge-warning' : 'badge-secondary'}`}
                                style={{ minWidth: '24px', justifyContent: 'center' }}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td style={{ fontWeight: '600' }}>
                              {std.name} {isCurrentUser && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '0.25rem' }}>(Siz)</span>}
                            </td>
                            <td>{std.className}</td>
                            <td style={{ textAlign: 'center' }}>{std.branches?.["Türkçe"] || 0}</td>
                            <td style={{ textAlign: 'center' }}>{std.branches?.["Matematik"] || 0}</td>
                            <td style={{ textAlign: 'center' }}>{std.branches?.["Fen Bilimleri"] || 0}</td>
                            <td style={{ textAlign: 'center' }}>{std.branches?.["T.C. İnkılap Tarihi ve Atatürkçülük"] || 0}</td>
                            <td style={{ textAlign: 'center' }}>{std.branches?.["Din Kültürü ve Ahlak Bilgisi"] || 0}</td>
                            <td style={{ textAlign: 'center' }}>{std.branches?.["Yabancı Dil (İngilizce)"] || 0}</td>
                            <td style={{ textAlign: 'center' }}>
                              <strong style={{ color: isCurrentUser ? 'var(--primary)' : 'inherit' }}>{std.solved} Soru</strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Class Rankings */}
            <div className="glass-card">
              <h3 style={{ marginBottom: '1.5rem' }}>Sınıf Bazlı Soru Çözüm Sıralaması</h3>
              {!dashboardStats.classRankings || dashboardStats.classRankings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Henüz veri girilmemiş.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Sıra</th>
                        <th>Sınıf / Şube Adı</th>
                        <th>Öğrenci Sayısı</th>
                        <th>Toplam Çözülen Soru</th>
                        <th>Öğrenci Başına Ortalama Soru</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardStats.classRankings.map((cls, idx) => {
                        const avg = cls.studentCount > 0 ? Math.round(cls.solved / cls.studentCount) : 0;
                        const isStudentClass = user.role === 'student' && dashboardStats.studentInfo?.className === cls.name;
                        return (
                          <tr key={cls.id} className={isStudentClass ? 'leaderboard-row-highlight' : ''}>
                            <td>
                              <span className="badge badge-primary" style={{ minWidth: '24px', justifyContent: 'center' }}>
                                {idx + 1}
                              </span>
                            </td>
                            <td style={{ fontWeight: '600' }}>
                              {cls.name} {isStudentClass && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '0.25rem' }}>(Sınıfınız)</span>}
                            </td>
                            <td>{cls.studentCount} Öğrenci</td>
                            <td>
                              <strong style={{ color: 'var(--primary)' }}>{cls.solved} Soru</strong>
                            </td>
                            <td>
                              <span className="badge badge-success">{avg} Soru/Öğrenci</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- CLASSES VIEW (ADMIN ONLY) ----------------- */}
        {activeTab === 'classes' && isAdmin && (
          <div className="animate-fade-in">
            <div className="view-header">
              <div className="view-header-title">
                <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Sınıf / Şube Yönetimi</h1>
                <p className="text-muted">Öğrencilerin atanacağı LGS sınıflarını açın</p>
              </div>
              <div className="view-header-actions">
                <button onClick={() => handleOpenClassModal()} className="btn btn-primary">
                  <Plus size={16} />
                  <span>Yeni Sınıf Aç</span>
                </button>
              </div>
            </div>

            <div className="glass-card">
              {classes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  Henüz sınıf tanımlanmamış. Sağ üstteki butondan yeni sınıf açabilirsiniz.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Sınıf / Şube Adı</th>
                        <th>Sınıf Kodu</th>
                        <th style={{ textAlign: 'right' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: '600', fontSize: '1.1rem' }}>{c.name}</td>
                          <td><span className="badge badge-primary">{c.id}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => handleOpenClassModal(c)} 
                                className="btn btn-secondary" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              >
                                <Edit size={14} />
                                <span>Düzenle</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteClass(c.id)} 
                                className="btn btn-danger" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              >
                                <Trash2 size={14} />
                                <span>Sil</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Class Form Modal */}
            {showClassModal && (
              <div className="modal-overlay">
                <div className="glass-card modal-card animate-fade-in">
                  <div className="modal-header">
                    <h3>{editingClass ? 'Sınıf/Şube Adını Düzenle' : 'Yeni Sınıf/Şube Aç'}</h3>
                    <button onClick={() => setShowClassModal(false)} className="btn btn-secondary" style={{ padding: '0.25rem' }}>✕</button>
                  </div>
                  <form onSubmit={handleSaveClass}>
                    <div className="form-group">
                      <label className="form-label">Sınıf/Şube Adı</label>
                      <input 
                        type="text" 
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        className="glass-input" 
                        placeholder="Örn: 8-A, 8-B" 
                        required 
                        autoFocus
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                      <button type="button" onClick={() => setShowClassModal(false)} className="btn btn-secondary">İptal</button>
                      <button type="submit" className="btn btn-primary">
                        {editingClass ? 'Kaydet' : 'Sınıfı Oluştur'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TEACHERS VIEW (ADMIN ONLY) ----------------- */}
        {activeTab === 'teachers' && isAdmin && (
          <div className="animate-fade-in">
            <div className="view-header">
              <div className="view-header-title">
                <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Öğretmen Yönetimi</h1>
                <p className="text-muted">Okuldaki branş öğretmenlerini ve yetkili oldukları sınıfları düzenleyin</p>
              </div>
              <div className="view-header-actions">
                <button onClick={() => handleOpenTeacherModal()} className="btn btn-primary">
                  <Plus size={16} />
                  <span>Yeni Öğretmen Ekle</span>
                </button>
              </div>
            </div>

            <div className="glass-card">
              {teachers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  Kayıtlı öğretmen bulunmuyor. Yeni bir öğretmen hesabı oluşturarak başlayın.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Öğretmen Adı</th>
                        <th>Kullanıcı Adı</th>
                        <th>Branşı</th>
                        <th>Yetkili Sınıflar</th>
                        <th style={{ textAlign: 'right' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: '600' }}>{t.name}</td>
                          <td><code>{t.username}</code></td>
                          <td>
                            <span className="badge badge-success">{t.branch}</span>
                          </td>
                          <td>
                            {(!t.classIds || t.classIds.length === 0) ? (
                              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Sınıf Atanmamış</span>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                {t.classIds.map(cid => {
                                  const cls = classes.find(c => c.id === cid);
                                  return (
                                    <span key={cid} className="badge badge-primary">
                                      {cls ? cls.name : 'Silinmiş Sınıf'}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => handleOpenTeacherModal(t)} 
                                className="btn btn-secondary" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              >
                                <Edit size={14} />
                                <span>Düzenle</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteTeacher(t.id)} 
                                className="btn btn-danger" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              >
                                <Trash2 size={14} />
                                <span>Sil</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Teacher Form Modal */}
            {showTeacherModal && (
              <div className="modal-overlay">
                <div className="glass-card modal-card animate-fade-in" style={{ maxWidth: '550px' }}>
                  <div className="modal-header">
                    <h3>{editingTeacher ? 'Öğretmen Hesabını Düzenle' : 'Yeni Öğretmen Ekle'}</h3>
                    <button onClick={() => setShowTeacherModal(false)} className="btn btn-secondary" style={{ padding: '0.25rem' }}>✕</button>
                  </div>
                  <form onSubmit={handleSaveTeacher}>
                    <div className="form-group">
                      <label className="form-label">Adı Soyadı</label>
                      <input 
                        type="text" 
                        value={teacherForm.name}
                        onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                        className="glass-input" 
                        placeholder="Örn: Ahmet Yılmaz" 
                        required 
                      />
                    </div>
                    
                    <div className="grid-2col">
                      <div className="form-group">
                        <label className="form-label">Kullanıcı Adı</label>
                        <input 
                          type="text" 
                          value={teacherForm.username}
                          onChange={(e) => setTeacherForm({ ...teacherForm, username: e.target.value })}
                          className="glass-input" 
                          placeholder="Örn: ahmet.yilmaz" 
                          required 
                          disabled={!!editingTeacher}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{editingTeacher ? 'Yeni Şifre (Değişmeyecekse Boş)' : 'Giriş Şifresi'}</label>
                        <input 
                          type="password" 
                          value={teacherForm.password}
                          onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                          className="glass-input" 
                          placeholder="Şifre" 
                          required={!editingTeacher}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Branş / Ders</label>
                      <select 
                        value={teacherForm.branch}
                        onChange={(e) => setTeacherForm({ ...teacherForm, branch: e.target.value })}
                        className="glass-input glass-select"
                        required
                      >
                        <option value="Matematik">Matematik</option>
                        <option value="Türkçe">Türkçe</option>
                        <option value="Fen Bilimleri">Fen Bilimleri</option>
                        <option value="T.C. İnkılap Tarihi ve Atatürkçülük">T.C. İnkılap Tarihi ve Atatürkçülük</option>
                        <option value="Din Kültürü ve Ahlak Bilgisi">Din Kültürü ve Ahlak Bilgisi</option>
                        <option value="Yabancı Dil (İngilizce)">Yabancı Dil (İngilizce)</option>
                      </select>
                    </div>

                    {/* Class Selection Checkboxes */}
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Yetkili/Atandığı Sınıflar</label>
                        {classes.length > 0 && (
                          <label className="class-checkbox-item" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)' }}>
                            <input 
                              type="checkbox"
                              checked={classes.length > 0 && teacherForm.classIds.length === classes.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTeacherForm({ ...teacherForm, classIds: classes.map(c => c.id) });
                                } else {
                                  setTeacherForm({ ...teacherForm, classIds: [] });
                                }
                              }}
                            />
                            <span>Tümünü Seç</span>
                          </label>
                        )}
                      </div>
                      {classes.length === 0 ? (
                        <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>Öncelikle sol menüden sınıf oluşturmalısınız!</p>
                      ) : (
                        <div className="class-checkbox-grid">
                          {classes.map(c => {
                            const isChecked = teacherForm.classIds.includes(c.id);
                            return (
                              <label key={c.id} className="class-checkbox-item">
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const nextClassIds = isChecked 
                                      ? teacherForm.classIds.filter(id => id !== c.id)
                                      : [...teacherForm.classIds, c.id];
                                    setTeacherForm({ ...teacherForm, classIds: nextClassIds });
                                  }}
                                />
                                <span>{c.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                      <button type="button" onClick={() => setShowTeacherModal(false)} className="btn btn-secondary">İptal</button>
                      <button type="submit" className="btn btn-primary">Kaydet</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- STUDENTS VIEW (ADMIN & TEACHER) ----------------- */}
        {activeTab === 'students' && (isAdmin || user.role === 'teacher') && (
          <div className="animate-fade-in">
            <div className="view-header">
              <div className="view-header-title">
                <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Öğrenci Yönetimi</h1>
                <p className="text-muted">Öğrenci kayıtlarını açın ve onları sınıflarına atayın</p>
              </div>
              {isAdmin && (
                <div className="view-header-actions">
                  <button onClick={() => setShowImportModal(true)} className="btn btn-secondary">
                    <Download size={16} style={{ transform: 'rotate(180deg)' }} />
                    <span>Excel/CSV İçe Aktar</span>
                  </button>
                  <button onClick={() => handleOpenStudentModal()} className="btn btn-primary" disabled={classes.length === 0}>
                    <Plus size={16} />
                    <span>Yeni Öğrenci Ekle</span>
                  </button>
                </div>
              )}
            </div>

            {isAdmin && classes.length === 0 && (
              <div className="glass-card badge-warning" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '8px' }}>
                <AlertCircle size={20} />
                <span>Öğrenci ekleyebilmek için öncelikle <strong>Sınıf/Şube Yönetimi</strong> kısmından en az bir sınıf oluşturmalısınız.</span>
              </div>
            )}

            <div className="glass-card">
              {displayStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  Sistemde henüz kayıtlı öğrenci bulunmuyor.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Öğrenci No</th>
                        <th>Öğrenci Adı</th>
                        <th>Atandığı Sınıf</th>
                        <th>Durum</th>
                        <th style={{ textAlign: 'right' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayStudents.map(s => {
                        const sClass = classes.find(c => c.id === s.classId);
                        return (
                          <tr key={s.id}>
                            <td>
                              <code style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                {s.studentNo || '-'}
                              </code>
                            </td>
                            <td style={{ fontWeight: '600' }}>{s.name}</td>
                            <td>
                              <span className={sClass ? 'badge badge-primary' : 'badge badge-danger'}>
                                {sClass ? sClass.name : 'Sınıfsız (Atama Gerekli)'}
                              </span>
                            </td>
                            <td>
                              {s.active ? (
                                <span className="badge badge-success">Aktif</span>
                              ) : (
                                <span className="badge badge-danger">Pasif</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button 
                                  onClick={() => handleViewStudentPanel(s)} 
                                  className="btn btn-primary" 
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
                                >
                                  <Eye size={14} />
                                  <span>Paneli Gör</span>
                                </button>
                                {isAdmin && (
                                  <>
                                    <button 
                                      onClick={() => handleOpenStudentModal(s)} 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                    >
                                      <Edit size={14} />
                                      <span>Düzenle / Ata</span>
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteStudent(s.id)} 
                                      className="btn btn-danger" 
                                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                    >
                                      <Trash2 size={14} />
                                      <span>Sil</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Student Form Modal */}
            {showStudentModal && (
              <div className="modal-overlay">
                <div className="glass-card modal-card animate-fade-in">
                  <div className="modal-header">
                    <h3>{editingStudent ? 'Öğrenci Bilgilerini Güncelle' : 'Yeni Öğrenci Ekle'}</h3>
                    <button onClick={() => setShowStudentModal(false)} className="btn btn-secondary" style={{ padding: '0.25rem' }}>✕</button>
                  </div>
                  <form onSubmit={handleSaveStudent}>
                    <div className="form-group">
                      <label className="form-label">Öğrenci Numarası</label>
                      <input 
                        type="text" 
                        value={studentForm.studentNo}
                        onChange={(e) => setStudentForm({ ...studentForm, studentNo: e.target.value })}
                        className="glass-input" 
                        placeholder="Örn: 85198 (Toplu yükleme eşleştirmesi için)" 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Öğrenci Adı Soyadı</label>
                      <input 
                        type="text" 
                        value={studentForm.name}
                        onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                        className="glass-input" 
                        placeholder="Örn: Mehmet Can" 
                        required 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Sınıf / Şube Seçimi (Atama)</label>
                      <select 
                        value={studentForm.classId}
                        onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                        className="glass-input glass-select"
                        required
                      >
                        <option value="">-- Sınıf Seçin --</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Durum</label>
                      <select 
                        value={studentForm.active ? 'true' : 'false'}
                        onChange={(e) => setStudentForm({ ...studentForm, active: e.target.value === 'true' })}
                        className="glass-input glass-select"
                      >
                        <option value="true">Aktif (Soru Çözümü Girilebilir)</option>
                        <option value="false">Pasif (Giriş Durdurulur)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                      <button type="button" onClick={() => setShowStudentModal(false)} className="btn btn-secondary">İptal</button>
                      <button type="submit" className="btn btn-primary">Kaydet</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Bulk Import Modal */}
            {showImportModal && (
              <div className="modal-overlay">
                <div className="glass-card modal-card animate-fade-in" style={{ maxWidth: '750px', width: '90%' }}>
                  <div className="modal-header">
                    <h3>Excel / CSV'den Toplu Öğrenci Yükle</h3>
                    <button onClick={() => setShowImportModal(false)} className="btn btn-secondary" style={{ padding: '0.25rem' }}>✕</button>
                  </div>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                      Excel tablonuzdaki kolonları kopyalayıp (Ctrl+C) aşağıdaki metin alanına yapıştırabilir (Ctrl+V) veya bir <strong>.csv</strong> dosyası seçebilirsiniz.
                    </p>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                      <strong>Beklenen Kolon Sırası:</strong> Öğrenci No | Öğrenci Adı | Öğrenci Soyadı | Sınıfı (ShortName)
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <div className="form-group">
                        <label className="form-label">Excel veya CSV Dosyası Yükle</label>
                        <input 
                          type="file" 
                          accept=".csv,.txt,.xlsx,.xls"
                          onChange={handleFileUpload}
                          className="glass-input"
                          style={{ padding: '0.5rem' }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Veya Excel'den Kopyalanan Veriyi Yapıştırın</label>
                        <textarea
                          value={importPasteText}
                          onChange={(e) => handleImportPasteChange(e.target.value)}
                          className="glass-input"
                          placeholder="Öğrenci No	Öğrenci Adı	Öğrenci Soyadı	ShortName&#10;85198	MUAZ YAHYA	ADALI	8-S-1"
                          style={{ height: '180px', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label className="form-label">
                        İçe Aktarma Önizleme ({importPreviewList.length} Öğrenci)
                      </label>
                      <div className="glass-card" style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '250px', padding: '0.5rem', background: 'rgba(0,0,0,0.2)' }}>
                        {importPreviewList.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Veri girildiğinde önizleme burada görünecektir.
                          </div>
                        ) : (
                          <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                            <thead>
                              <tr>
                                <th style={{ padding: '0.4rem' }}>No</th>
                                <th style={{ padding: '0.4rem' }}>Ad Soyad</th>
                                <th style={{ padding: '0.4rem' }}>Sınıf</th>
                                <th style={{ padding: '0.4rem' }}>Durum</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importPreviewList.map((item, index) => {
                                const exists = students.some(s => s.studentNo && s.studentNo.toString() === item.studentNo.toString());
                                return (
                                  <tr key={index}>
                                    <td style={{ padding: '0.4rem' }}><code>{item.studentNo}</code></td>
                                    <td style={{ padding: '0.4rem', fontWeight: '500' }}>{item.name}</td>
                                    <td style={{ padding: '0.4rem' }}>
                                      <span className="badge badge-primary" style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}>{item.className}</span>
                                    </td>
                                    <td style={{ padding: '0.4rem' }}>
                                      {exists ? (
                                        <span className="badge badge-warning" style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', color: '#000' }}>Güncelle</span>
                                      ) : (
                                        <span className="badge badge-success" style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}>Yeni</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                    <button type="button" onClick={() => setShowImportModal(false)} className="btn btn-secondary">İptal</button>
                    <button 
                      type="button" 
                      onClick={handleSaveImport} 
                      className="btn btn-primary"
                      disabled={importPreviewList.length === 0 || loading}
                    >
                      {loading ? <RefreshCw className="animate-spin" size={16} /> : 'Yüklemeyi Başlat'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- HISTORICAL LOGS VIEW (ADMIN ONLY) ----------------- */}
        {activeTab === 'logs' && isAdmin && (
          <div className="animate-fade-in">
            <div className="view-header">
              <div className="view-header-title">
                <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Geçmiş Soru Kayıtları</h1>
                <p className="text-muted">Öğretmenler tarafından girilen tüm soru verilerini inceleyin veya filtreleyin</p>
              </div>
              <div className="view-header-actions">
                <button onClick={handleExportCSV} className="btn btn-primary">
                  <Download size={16} />
                  <span>Raporu Excel Olarak İndir</span>
                </button>
              </div>
            </div>

            {/* Search Filters Card */}
            <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Sınıf/Şube</label>
                  <select 
                    value={logFilterClass}
                    onChange={(e) => setLogFilterClass(e.target.value)}
                    className="glass-input glass-select"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <option value="">Tümü</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Öğrenci</label>
                  <select 
                    value={logFilterStudent}
                    onChange={(e) => setLogFilterStudent(e.target.value)}
                    className="glass-input glass-select"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <option value="">Tümü</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Branş/Ders</label>
                  <select 
                    value={logFilterBranch}
                    onChange={(e) => setLogFilterBranch(e.target.value)}
                    className="glass-input glass-select"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <option value="">Tümü</option>
                    <option value="Matematik">Matematik</option>
                    <option value="Türkçe">Türkçe</option>
                    <option value="Fen Bilimleri">Fen Bilimleri</option>
                    <option value="T.C. İnkılap Tarihi ve Atatürkçülük">T.C. İnkılap Tarihi</option>
                    <option value="Din Kültürü ve Ahlak Bilgisi">Din Kültürü</option>
                    <option value="Yabancı Dil (İngilizce)">İngilizce</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Tarih</label>
                  <input 
                    type="date"
                    value={logFilterDate}
                    onChange={(e) => setLogFilterDate(e.target.value)}
                    className="glass-input"
                    style={{ padding: '0.5rem 1rem' }}
                  />
                </div>

                <button 
                  onClick={loadTabData} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Search size={16} />
                  <span>Filtrele</span>
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="glass-card">
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  Arama kriterlerinize uygun kayıt bulunamadı.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Öğrenci</th>
                        <th>Branş</th>
                        <th>Çözülen Soru</th>
                        <th>Giren</th>
                        <th style={{ textAlign: 'right' }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(l => (
                        <tr key={l.id}>
                          <td>{l.date}</td>
                          <td style={{ fontWeight: '600' }}>{l.studentName}</td>
                          <td><span className="badge badge-success">{l.branch}</span></td>
                          <td><strong>{l.solved} Soru</strong></td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {teachers.find(t => t.id === l.teacherId)?.name || 'Yönetici'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              onClick={() => handleDeleteLog(l.id)} 
                              className="btn btn-danger" 
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- QUICK DATA ENTRY (TEACHER & ADMIN) ----------------- */}
        {activeTab === 'teacher-entry' && (
          <div className="animate-fade-in">
            <div className="view-header">
              <div className="view-header-title">
                <h1 className="title-gradient" style={{ fontSize: '2rem' }}>{isAdmin ? 'Yönetici Soru Giriş Ekranı' : `${user.branch} Soru Giriş Ekranı`}</h1>
                <p className="text-muted">Seçtiğiniz sınıf için öğrencilerin çözdükleri soru sayılarını ve doğru/yanlış analizlerini girin</p>
              </div>
            </div>

            {/* Filter class & date entry */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Çözüm Tarihi</label>
                  <input 
                    type="date" 
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="glass-input" 
                    required
                  />
                </div>

                {isAdmin && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Branş / Ders</label>
                    <select 
                      value={entryBranch}
                      onChange={(e) => setEntryBranch(e.target.value)}
                      className="glass-input glass-select"
                      required
                    >
                      <option value="Matematik">Matematik</option>
                      <option value="Türkçe">Türkçe</option>
                      <option value="Fen Bilimleri">Fen Bilimleri</option>
                      <option value="T.C. İnkılap Tarihi ve Atatürkçülük">T.C. İnkılap Tarihi ve Atatürkçülük</option>
                      <option value="Din Kültürü ve Ahlak Bilgisi">Din Kültürü ve Ahlak Bilgisi</option>
                      <option value="Yabancı Dil (İngilizce)">Yabancı Dil (İngilizce)</option>
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Sınıf / Şube</label>
                  <select 
                    value={entryClassId}
                    onChange={(e) => setEntryClassId(e.target.value)}
                    className="glass-input glass-select"
                  >
                    <option value="">-- Sınıf Seçmeden Doğrudan Ara --</option>
                    {classes
                      .filter(c => !user.classIds || user.classIds.length === 0 || user.classIds.includes(c.id))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Öğrenci Adı Soyadı Ara</label>
                  <input 
                    type="text" 
                    value={entrySearchQuery}
                    onChange={(e) => setEntrySearchQuery(e.target.value)}
                    className="glass-input" 
                    placeholder="Örn: Ahmet (En az 2 harf)" 
                  />
                </div>
              </div>
            </div>

            {/* Helper Banner when no class selected and no search query */}
            {!entryClassId && entrySearchQuery.trim().length < 2 && (
              <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Search size={48} style={{ margin: '0 auto 1rem', opacity: 0.5, display: 'block' }} />
                <h3>Hızlı Soru Girişi</h3>
                <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
                  Veri girişi yapmak için yukarıdan bir <strong>Sınıf / Şube</strong> seçebilir veya <strong>Öğrenci Adı Soyadı Ara</strong> alanına öğrenci ismini yazarak doğrudan arama yapabilirsiniz.
                </p>
              </div>
            )}

            {/* Students Input Grid */}
            {(entryClassId || (entrySearchQuery.trim().length >= 2 && bulkLogs.length > 0)) && (
              <form onSubmit={handleSaveBulkLogs} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div>
                    <h3>Öğrenci Listesi {entryClassId ? `(${classes.find(c => c.id === entryClassId)?.name})` : '(Arama Sonuçları)'}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Çözülmeyen satırları boş bırakabilirsiniz (Sıfır olarak sayılmaz).
                    </div>
                  </div>
                </div>

                {bulkLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Öğrenci bulunamadı.
                  </div>
                ) : (
                  <div className="bulk-entry-grid">
                    {/* Header Row for desktop */}
                    <div className="bulk-entry-row" style={{ background: 'transparent', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)', borderRadius: 0, paddingBottom: '0.5rem' }}>
                      <div>Öğrenci Adı Soyadı</div>
                      <div>Çözülen Soru Sayısı</div>
                    </div>

                    {bulkLogs
                      .filter(item => !entryClassId || item.name.toLowerCase().includes(entrySearchQuery.toLowerCase()))
                      .map((item) => (
                        <div key={item.studentId} className="bulk-entry-row">
                          <div className="bulk-student-name">
                            {item.name}
                            {item.className && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                ({item.className})
                              </span>
                            )}
                          </div>
                          <div>
                            <input 
                              type="number" 
                              min="0"
                              value={item.solved}
                              onChange={(e) => handleBulkLogChange(item.studentId, 'solved', e.target.value)}
                              className="glass-input" 
                              placeholder="Çözülen Soru Sayısı" 
                              style={{ padding: '0.5rem 0.75rem' }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {bulkLogs.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.875rem 2.5rem' }} disabled={loading}>
                      {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Kaydet ve Gönder'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {/* ----------------- TEACHER HISTORY LOGS VIEW ----------------- */}
        {activeTab === 'teacher-logs' && !isAdmin && (
          <div className="animate-fade-in">
            <div className="view-header">
              <div className="view-header-title">
                <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Girdiğim Son Kayıtlar</h1>
                <p className="text-muted">Kendi branşınızda sisteme girdiğiniz son LGS soru istatistiklerini kontrol edin</p>
              </div>
            </div>

            <div className="glass-card">
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  Henüz girdiğiniz bir soru kaydı bulunmuyor.
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Öğrenci Adı</th>
                        <th>Ders</th>
                        <th>Soru Sayısı</th>
                        <th style={{ textAlign: 'right' }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(l => (
                        <tr key={l.id}>
                          <td>{l.date}</td>
                          <td style={{ fontWeight: '600' }}>{l.studentName}</td>
                          <td><span className="badge badge-success">{l.branch}</span></td>
                          <td><strong>{l.solved} Soru</strong></td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              onClick={() => handleDeleteLog(l.id)} 
                              className="btn btn-danger" 
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              <Trash2 size={12} />
                              <span style={{ marginLeft: '0.25rem' }}>Sil</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- CLASS REPORTS VIEW (ADMIN & TEACHER) ----------------- */}
        {activeTab === 'class-reports' && (isAdmin || user.role === 'teacher') && (
          <div className="animate-fade-in">
            <div className="view-header">
              <div className="view-header-title">
                <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Sınıf Raporları</h1>
                <p className="text-muted">Sınıfların branş bazında soru çözüm istatistiklerini tek sayfada inceleyin</p>
              </div>
              <div className="view-header-actions">
                <button 
                  onClick={handleExportClassReportToExcel} 
                  className="btn btn-primary" 
                  disabled={!classReportData || !classReportData.reports || classReportData.reports.length === 0}
                >
                  <Download size={16} />
                  <span>Excel Olarak İndir</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Card */}
            <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Sınıf/Şube</label>
                  <select 
                    value={classReportId}
                    onChange={(e) => setClassReportId(e.target.value)}
                    className="glass-input glass-select"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <option value="">-- Sınıf Seçin --</option>
                    {classes
                      .filter(c => isAdmin || !user.classIds || user.classIds.length === 0 || user.classIds.includes(c.id))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Başlangıç Tarihi</label>
                  <input 
                    type="date"
                    value={classReportStart}
                    onChange={(e) => setClassReportStart(e.target.value)}
                    className="glass-input"
                    style={{ padding: '0.5rem 1rem' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Bitiş Tarihi</label>
                  <input 
                    type="date"
                    value={classReportEnd}
                    onChange={(e) => setClassReportEnd(e.target.value)}
                    className="glass-input"
                    style={{ padding: '0.5rem 1rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => {
                      setClassReportStart('');
                      setClassReportEnd('');
                    }} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.6rem 1rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    disabled={!classReportStart && !classReportEnd}
                    title="Filtreleri Temizle"
                  >
                    <span>Temizle</span>
                  </button>
                  <button 
                    onClick={fetchClassReport} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.6rem 1rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    title="Verileri Yenile"
                  >
                    <RefreshCw size={16} />
                    <span>Yenile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Report Table Card */}
            <div className="glass-card">
              {loadingClassReport ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem 0', gap: '0.75rem' }}>
                  <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--primary-color)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Rapor hazırlanıyor...</span>
                </div>
              ) : !classReportData || !classReportData.reports || classReportData.reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  {classReportId ? 'Bu sınıfta kayıtlı öğrenci veya belirtilen tarih aralığında soru çözümü bulunamadı.' : 'Lütfen raporunu görüntülemek istediğiniz sınıfı seçin.'}
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Okul No</th>
                        <th>Öğrenci Adı</th>
                        <th>Türkçe</th>
                        <th>Matematik</th>
                        <th>Fen Bilimleri</th>
                        <th style={{ whiteSpace: 'nowrap' }}>T.C. İnkılap</th>
                        <th>Din Kültürü</th>
                        <th>İngilizce</th>
                        <th style={{ fontWeight: 'bold' }}>Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classReportData.reports.map(r => (
                        <tr key={r.studentId}>
                          <td style={{ fontWeight: '500' }}>{r.studentNo || '-'}</td>
                          <td style={{ fontWeight: '600' }}>{r.studentName}</td>
                          <td>{r.branchSummary["Türkçe"] > 0 ? r.branchSummary["Türkçe"] : <span style={{ color: 'var(--text-muted)', opacity: 0.35 }}>0</span>}</td>
                          <td>{r.branchSummary["Matematik"] > 0 ? r.branchSummary["Matematik"] : <span style={{ color: 'var(--text-muted)', opacity: 0.35 }}>0</span>}</td>
                          <td>{r.branchSummary["Fen Bilimleri"] > 0 ? r.branchSummary["Fen Bilimleri"] : <span style={{ color: 'var(--text-muted)', opacity: 0.35 }}>0</span>}</td>
                          <td>{r.branchSummary["T.C. İnkılap Tarihi ve Atatürkçülük"] > 0 ? r.branchSummary["T.C. İnkılap Tarihi ve Atatürkçülük"] : <span style={{ color: 'var(--text-muted)', opacity: 0.35 }}>0</span>}</td>
                          <td>{r.branchSummary["Din Kültürü ve Ahlak Bilgisi"] > 0 ? r.branchSummary["Din Kültürü ve Ahlak Bilgisi"] : <span style={{ color: 'var(--text-muted)', opacity: 0.35 }}>0</span>}</td>
                          <td>{r.branchSummary["Yabancı Dil (İngilizce)"] > 0 ? r.branchSummary["Yabancı Dil (İngilizce)"] : <span style={{ color: 'var(--text-muted)', opacity: 0.35 }}>0</span>}</td>
                          <td style={{ fontWeight: '700', color: r.totalSolved > 0 ? 'var(--primary-color)' : 'inherit' }}>{r.totalSolved}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.05)', fontWeight: 'bold', borderTop: '2px solid var(--border-color)' }}>
                        <td colSpan={2} style={{ color: 'var(--primary-color)', fontSize: '0.95rem' }}>Sınıf Toplamı</td>
                        <td>{classReportData.classBranchTotals["Türkçe"] || 0}</td>
                        <td>{classReportData.classBranchTotals["Matematik"] || 0}</td>
                        <td>{classReportData.classBranchTotals["Fen Bilimleri"] || 0}</td>
                        <td>{classReportData.classBranchTotals["T.C. İnkılap Tarihi ve Atatürkçülük"] || 0}</td>
                        <td>{classReportData.classBranchTotals["Din Kültürü ve Ahlak Bilgisi"] || 0}</td>
                        <td>{classReportData.classBranchTotals["Yabancı Dil (İngilizce)"] || 0}</td>
                        <td style={{ fontSize: '1rem', color: 'var(--primary-color)' }}>{classReportData.classTotalSolved || 0}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- STUDENT REPORTS VIEW (ADMIN & TEACHER) ----------------- */}
        {activeTab === 'student-reports' && (isAdmin || user.role === 'teacher') && (
          <div className="animate-fade-in">
            <div className="view-header">
              <div className="view-header-title">
                <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Öğrenci Raporları</h1>
                <p className="text-muted">Öğrencilerin bireysel soru çözüm analizlerini ve çalışma eğilimlerini detaylı inceleyin</p>
              </div>
            </div>

            {/* Filter Card */}
            <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Sınıf/Şube (İsteğe Bağlı)</label>
                  <select 
                    value={studentReportClassId}
                    onChange={(e) => setStudentReportClassId(e.target.value)}
                    className="glass-input glass-select"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <option value="">-- Tüm Sınıflar --</option>
                    {classes
                      .filter(c => isAdmin || !user.classIds || user.classIds.length === 0 || user.classIds.includes(c.id))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>

                <div style={{ position: 'relative' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Öğrenci Seçin</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="text"
                      placeholder="Öğrenci ara ve seç..."
                      value={isStudentDropdownOpen ? studentSearchQuery : (students.find(s => s.id === studentReportStudentId) ? `${students.find(s => s.id === studentReportStudentId).name} (${students.find(s => s.id === studentReportStudentId).studentNo || '-'})` : '')}
                      onFocus={() => {
                        setIsStudentDropdownOpen(true);
                        setStudentSearchQuery('');
                      }}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      onBlur={() => {
                        setTimeout(() => {
                          setIsStudentDropdownOpen(false);
                        }, 250);
                      }}
                      className="glass-input"
                      style={{ padding: '0.5rem 2.5rem 0.5rem 1rem', width: '100%' }}
                    />
                    <div style={{ position: 'absolute', right: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                      {studentReportStudentId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentReportStudentId('');
                            setStudentSearchQuery('');
                          }}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            color: 'var(--text-muted)', 
                            padding: '2px', 
                            display: 'flex', 
                            alignItems: 'center'
                          }}
                          title="Seçimi Temizle"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <Search size={14} style={{ opacity: 0.6 }} />
                    </div>
                  </div>

                  {isStudentDropdownOpen && (
                    <div 
                      className="glass-card" 
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        zIndex: 1000, 
                        maxHeight: '220px', 
                        overflowY: 'auto', 
                        marginTop: '0.25rem', 
                        padding: '0.25rem 0',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px'
                      }}
                    >
                      {students
                        .filter(s => s.active)
                        .filter(s => isAdmin || !user.classIds || user.classIds.length === 0 || user.classIds.includes(s.classId))
                        .filter(s => !studentReportClassId || s.classId === studentReportClassId)
                        .filter(s => {
                          if (!studentSearchQuery) return true;
                          const term = studentSearchQuery.toLocaleLowerCase('tr-TR');
                          return s.name.toLocaleLowerCase('tr-TR').includes(term) || (s.studentNo && s.studentNo.toString().includes(term));
                        }).length === 0 ? (
                        <div style={{ padding: '0.55rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Öğrenci bulunamadı.
                        </div>
                      ) : (
                        students
                          .filter(s => s.active)
                          .filter(s => isAdmin || !user.classIds || user.classIds.length === 0 || user.classIds.includes(s.classId))
                          .filter(s => !studentReportClassId || s.classId === studentReportClassId)
                          .filter(s => {
                            if (!studentSearchQuery) return true;
                            const term = studentSearchQuery.toLocaleLowerCase('tr-TR');
                            return s.name.toLocaleLowerCase('tr-TR').includes(term) || (s.studentNo && s.studentNo.toString().includes(term));
                          })
                          .map(s => (
                            <div 
                              key={s.id}
                              onMouseDown={() => {
                                setStudentReportStudentId(s.id);
                                setIsStudentDropdownOpen(false);
                              }}
                              style={{ 
                                padding: '0.55rem 1rem', 
                                cursor: 'pointer', 
                                fontSize: '0.85rem',
                                color: s.id === studentReportStudentId ? 'var(--primary-color)' : 'inherit',
                                background: s.id === studentReportStudentId ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                transition: 'background 0.2s',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = s.id === studentReportStudentId ? 'rgba(255, 255, 255, 0.08)' : 'transparent'}
                            >
                              <span>{s.name}</span>
                              <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{s.studentNo || '-'}</span>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Başlangıç Tarihi</label>
                  <input 
                    type="date"
                    value={studentReportStart}
                    onChange={(e) => setStudentReportStart(e.target.value)}
                    className="glass-input"
                    style={{ padding: '0.5rem 1rem' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Bitiş Tarihi</label>
                  <input 
                    type="date"
                    value={studentReportEnd}
                    onChange={(e) => setStudentReportEnd(e.target.value)}
                    className="glass-input"
                    style={{ padding: '0.5rem 1rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => fetchStudentReport()} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.6rem 1rem', flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    disabled={!studentReportStudentId}
                  >
                    <RefreshCw size={16} />
                    <span>Yenile</span>
                  </button>

                  <button 
                    onClick={() => {
                      setStudentReportStudentId('');
                      setStudentSearchQuery('');
                      setStudentReportStart('');
                      setStudentReportEnd('');
                    }} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.6rem 1rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    disabled={!studentReportStudentId && !studentSearchQuery && !studentReportStart && !studentReportEnd}
                    title="Filtreleri Temizle"
                  >
                    <span>Temizle</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Loading & Report Cards */}
            {loadingStudentReport ? (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '1rem', color: 'var(--text-muted)' }}>
                <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary-color)' }} />
                <span style={{ fontSize: '1rem' }}>Öğrenci panel verileri yükleniyor...</span>
              </div>
            ) : !studentReportStudentId ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                Lütfen detaylı raporunu görüntülemek istediğiniz sınıfı ve öğrenciyi seçin.
              </div>
            ) : studentReportStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Quick Metrics Grid */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Toplam Soru Çözümü</span>
                      <div className="stat-value" style={{ fontSize: '1.8rem', marginTop: '0.5rem' }}>{studentReportStats.totals?.solved || 0}</div>
                    </div>
                    <div className="stat-icon stat-icon-violet" style={{ width: '40px', height: '40px' }}>
                      <Activity size={20} />
                    </div>
                  </div>

                  <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Okul Genel Sıralaması</span>
                      <div className="stat-value" style={{ fontSize: '1.6rem', marginTop: '0.5rem' }}>
                        #{studentReportStats.studentInfo?.rank || '-'} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {studentReportStats.studentInfo?.totalStudentsCount || 0}</span>
                      </div>
                    </div>
                    <div className="stat-icon stat-icon-cyan" style={{ width: '40px', height: '40px' }}>
                      <Award size={20} />
                    </div>
                  </div>

                  <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Sınıfı / Şubesi</span>
                      <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {studentReportStats.studentInfo?.className || 'Sınıfsız'}
                      </div>
                    </div>
                    <div className="stat-icon stat-icon-emerald" style={{ width: '40px', height: '40px' }}>
                      <Layers size={20} />
                    </div>
                  </div>

                  <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Soru Giriş Kaydı</span>
                      <div className="stat-value" style={{ fontSize: '1.8rem', marginTop: '0.5rem' }}>{studentReportStats.counts?.logs || 0}</div>
                    </div>
                    <div className="stat-icon stat-icon-rose" style={{ width: '40px', height: '40px' }}>
                      <CheckCircle size={20} />
                    </div>
                  </div>
                </div>

                <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                  {/* Daily Trend Chart */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Günlük Soru Çözüm Eğilimi</h3>
                    {!studentReportStats.dailyTrend || studentReportStats.dailyTrend.length === 0 ? (
                      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Henüz grafik için veri girişi bulunmuyor.
                      </div>
                    ) : (
                      <div className="chart-container" style={{ height: '220px' }}>
                        {studentReportStats.dailyTrend.map((day, idx) => {
                          const maxVal = Math.max(...studentReportStats.dailyTrend.map(d => d.solved), 1);
                          const heightPercent = (day.solved / maxVal) * 80 + 5;
                          return (
                            <div key={idx} className="chart-bar-wrapper">
                              <div className="chart-bar" style={{ height: `${heightPercent}%`, backgroundColor: '#8b5cf6' }}>
                                <span className="chart-bar-value">{day.solved}</span>
                              </div>
                              <span className="chart-label" title={day.date} style={{ fontSize: '0.75rem' }}>
                                {day.date.substring(5)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Subject Breakdown */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Ders Bazlı Soru Dağılımı</h3>
                    {!studentReportStats.branchSummary || studentReportStats.branchSummary.length === 0 ? (
                      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Kayıtlı branş istatistiği yok.
                      </div>
                    ) : (
                      <div className="dashboard-list" style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {studentReportStats.branchSummary.map((br, idx) => (
                          <div key={idx} className="dashboard-list-item" style={{ padding: '0.6rem 0.5rem' }}>
                            <div>
                              <span style={{ fontWeight: '600' }}>{br.branch}</span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{br.logsCount} kayıt</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span className="badge badge-success" style={{ fontSize: '0.9rem' }}>{br.solved} Soru</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Soru Çözüm Geçmişi */}
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Soru Çözüm Geçmişi (Tüm Kayıtlar)</h3>
                  {studentReportLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                      Öğrenciye ait soru çözümü geçmişi bulunmuyor.
                    </div>
                  ) : (
                    <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Tarih</th>
                            <th>Ders</th>
                            <th>Soru Sayısı</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentReportLogs.map(l => (
                            <tr key={l.id}>
                              <td>{l.date}</td>
                              <td><span className="badge badge-success">{l.branch}</span></td>
                              <td><strong>{l.solved} Soru</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
        {/* ----------------- HEDEFLER & ÖDEVLER VIEW ----------------- */}
        {activeTab === 'targets' && (isAdmin || user.role === 'teacher') && (
          <div className="animate-fade-in">
            <div className="view-header">
              <div className="view-header-title">
                <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Ödev & Branş Hedefleri</h1>
                <p className="text-muted">Öğrencilere haftalık branş bazlı soru çözme hedefleri atayın ve takibini yapın.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
              
              {/* TARGET ASSIGNMENT FORM */}
              <div className="glass-card">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlusCircle size={20} color="var(--primary)" />
                  Yeni Hedef Tanımla
                </h2>
                
                <form onSubmit={handleSaveTargets}>
                  <div className="form-group">
                    <label className="form-label">Atama Türü</label>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="assignType" 
                          checked={assignType === 'class'} 
                          onChange={() => { setAssignType('class'); setAssignStudentId(''); }}
                          style={{ cursor: 'pointer' }}
                        />
                        Sınıf Bazlı
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="assignType" 
                          checked={assignType === 'student'} 
                          onChange={() => setAssignType('student')}
                          style={{ cursor: 'pointer' }}
                        />
                        Öğrenci Bazlı
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sınıf / Şube</label>
                    <select
                      value={targetClassId}
                      onChange={(e) => {
                        setTargetClassId(e.target.value);
                        setAssignStudentId('');
                      }}
                      className="glass-input"
                      required
                    >
                      <option value="">-- Sınıf Seçin --</option>
                      {classes
                        .filter(c => isAdmin || !user.classIds || user.classIds.length === 0 || user.classIds.includes(c.id))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>

                  {assignType === 'student' && (
                    <div className="form-group">
                      <label className="form-label">Öğrenci Seçimi</label>
                      <select
                        value={assignStudentId}
                        onChange={(e) => setAssignStudentId(e.target.value)}
                        className="glass-input"
                        required={assignType === 'student'}
                        disabled={!targetClassId}
                      >
                        <option value="">-- Öğrenci Seçin --</option>
                        {students
                          .filter(s => s.active && s.classId === targetClassId)
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.name} (No: {s.studentNo || '-'})</option>
                          ))}
                      </select>
                      {!targetClassId && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Önce yukarıdan bir sınıf seçmelisiniz.</span>
                      )}
                    </div>
                  )}

                  <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Başlangıç Tarihi</label>
                      <input 
                        type="date" 
                        value={targetStartDate}
                        onChange={(e) => setTargetStartDate(e.target.value)}
                        className="glass-input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Bitiş Tarihi</label>
                      <input 
                        type="date" 
                        value={targetEndDate}
                        onChange={(e) => setTargetEndDate(e.target.value)}
                        className="glass-input"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                    <label className="form-label" style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Branş Hedefleri (Soru Sayısı)</label>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {[
                        "Türkçe",
                        "Matematik",
                        "Fen Bilimleri",
                        "T.C. İnkılap Tarihi ve Atatürkçülük",
                        "Din Kültürü ve Ahlak Bilgisi",
                        "Yabancı Dil (İngilizce)"
                      ].map(branch => (
                        <div key={branch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{branch}</span>
                          <input 
                            type="number"
                            min="0"
                            value={assignGoals[branch] || 0}
                            onChange={(e) => setAssignGoals({
                              ...assignGoals,
                              [branch]: parseInt(e.target.value) || 0
                            })}
                            style={{ width: '80px', textAlign: 'center', padding: '0.3rem' }}
                            className="glass-input"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={isAssigning}
                  >
                    {isAssigning ? <RefreshCw className="animate-spin" size={16} /> : 'Hedefleri Tanımla / Ata'}
                  </button>
                </form>
              </div>

              {/* TARGETS REPORT LIST */}
              <div className="glass-card" style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={20} color="var(--primary)" />
                    Haftalık Hedef Raporu
                  </h2>
                  <button 
                    onClick={fetchTargetReport} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.5rem' }}
                    disabled={loadingTargetReport}
                  >
                    <RefreshCw size={16} className={loadingTargetReport ? 'animate-spin' : ''} />
                  </button>
                </div>

                {!targetClassId ? (
                  <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                    Lütfen hedef durumunu incelemek istediğiniz sınıfı seçin.
                  </div>
                ) : loadingTargetReport ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem', color: 'var(--text-muted)' }}>
                    <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.95rem' }}>Hedef rapor verileri yükleniyor...</span>
                  </div>
                ) : !targetReportData || !targetReportData.reports || targetReportData.reports.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                    Seçilen sınıf için bu tarih aralığında hedefler bulunmamaktadır. Sol taraftaki formdan yeni hedefler tanımlayabilirsiniz.
                  </div>
                ) : (
                  <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Öğrenci Adı (No)</th>
                          <th style={{ textAlign: 'center' }}>Matematik</th>
                          <th style={{ textAlign: 'center' }}>Türkçe</th>
                          <th style={{ textAlign: 'center' }}>Fen Bil.</th>
                          <th style={{ textAlign: 'center' }}>İnkılap</th>
                          <th style={{ textAlign: 'center' }}>Din K.</th>
                          <th style={{ textAlign: 'center' }}>İngilizce</th>
                          <th style={{ textAlign: 'center' }}>Genel Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {targetReportData.reports.map(rep => {
                          const percent = rep.totalTarget > 0 ? Math.min(100, Math.round((rep.totalSolved / rep.totalTarget) * 100)) : 0;
                          
                          return (
                            <tr key={rep.studentId}>
                              <td>
                                <strong>{rep.studentName}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No: {rep.studentNo || '-'}</div>
                              </td>
                              {[
                                "Matematik",
                                "Türkçe",
                                "Fen Bilimleri",
                                "T.C. İnkılap Tarihi ve Atatürkçülük",
                                "Din Kültürü ve Ahlak Bilgisi",
                                "Yabancı Dil (İngilizce)"
                              ].map(b => {
                                const brData = rep.branchReports[b] || { solved: 0, target: 0 };
                                const completed = brData.target > 0 && brData.solved >= brData.target;
                                if (brData.target === 0) {
                                  return (
                                    <td key={b} style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.85rem' }}>
                                      -
                                    </td>
                                  );
                                }
                                return (
                                  <td key={b} style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                                    <span style={{ 
                                      fontWeight: '600', 
                                      color: completed ? 'var(--success)' : (brData.solved > 0 ? 'var(--primary)' : 'var(--text-main)') 
                                    }}>
                                      {brData.solved} / {brData.target}
                                    </span>
                                  </td>
                                );
                              })}
                              <td style={{ width: '150px' }}>
                                {rep.hasTarget ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700' }}>
                                      <span>%{percent}</span>
                                      <span>{rep.totalSolved} / {rep.totalTarget}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ 
                                        width: `${percent}%`, 
                                        height: '100%', 
                                        backgroundColor: percent === 100 ? 'var(--success)' : 'var(--primary)',
                                        borderRadius: '3px'
                                      }} />
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Hedef Yok</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="modal-overlay">
            <div className="glass-card modal-card animate-fade-in" style={{ maxWidth: '450px', width: '90%' }}>
              <div className="modal-header">
                <h2>Şifre Değiştir</h2>
                <button 
                  onClick={() => setShowPasswordModal(false)} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem', borderRadius: '50%' }}
                >
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={handleSavePassword}>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Mevcut Şifre</label>
                  <input 
                    type="password" 
                    required 
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="glass-input" 
                    placeholder="Mevcut şifrenizi girin"
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Yeni Şifre</label>
                  <input 
                    type="password" 
                    required 
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="glass-input" 
                    placeholder="En az 4 karakter girin"
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Yeni Şifre (Tekrar)</label>
                  <input 
                    type="password" 
                    required 
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="glass-input" 
                    placeholder="Yeni şifrenizi tekrar girin"
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowPasswordModal(false)} 
                    className="btn btn-secondary"
                  >
                    İptal
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : 'Şifreyi Güncelle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Student Panel Preview Modal */}
        {previewStudent && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="glass-card modal-card animate-fade-in" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem' }}>
                <div>
                  <h2 className="title-gradient" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Eye size={22} style={{ color: '#8b5cf6' }} />
                    <span>Öğrenci Paneli Önizleme</span>
                  </h2>
                  <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                    <strong>{previewStudent.name}</strong> &mdash; No: {previewStudent.studentNo || '-'} | Sınıf: {classes.find(c => c.id === previewStudent.classId)?.name || 'Sınıfsız'}
                  </p>
                </div>
                <button 
                  onClick={() => setPreviewStudent(null)} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem', borderRadius: '50%' }}
                >
                  <X size={18} />
                </button>
              </div>

              {loadingPreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '1rem', color: 'var(--text-muted)' }}>
                  <RefreshCw className="animate-spin" size={32} style={{ color: '#8b5cf6' }} />
                  <span style={{ fontSize: '1rem' }}>Öğrenci panel verileri yükleniyor...</span>
                </div>
              ) : previewStats ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Quick Metrics Grid */}
                  <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                      <div>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Toplam Soru Çözümü</span>
                        <div className="stat-value" style={{ fontSize: '1.8rem', marginTop: '0.5rem' }}>{previewStats.totals?.solved || 0}</div>
                      </div>
                      <div className="stat-icon stat-icon-violet" style={{ width: '40px', height: '40px' }}>
                        <Activity size={20} />
                      </div>
                    </div>

                    <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                      <div>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Okul Genel Sıralaması</span>
                        <div className="stat-value" style={{ fontSize: '1.6rem', marginTop: '0.5rem' }}>
                          #{previewStats.studentInfo?.rank || '-'} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {previewStats.studentInfo?.totalStudentsCount || 0}</span>
                        </div>
                      </div>
                      <div className="stat-icon stat-icon-cyan" style={{ width: '40px', height: '40px' }}>
                        <Award size={20} />
                      </div>
                    </div>

                    <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                      <div>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Sınıfı / Şubesi</span>
                        <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {previewStats.studentInfo?.className || 'Sınıfsız'}
                        </div>
                      </div>
                      <div className="stat-icon stat-icon-emerald" style={{ width: '40px', height: '40px' }}>
                        <Layers size={20} />
                      </div>
                    </div>

                    <div className="glass-card stat-card" style={{ padding: '1.25rem' }}>
                      <div>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Soru Giriş Kaydı</span>
                        <div className="stat-value" style={{ fontSize: '1.8rem', marginTop: '0.5rem' }}>{previewStats.counts?.logs || 0}</div>
                      </div>
                      <div className="stat-icon stat-icon-rose" style={{ width: '40px', height: '40px' }}>
                        <CheckCircle size={20} />
                      </div>
                    </div>
                  </div>

                  <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {/* Daily Trend Chart */}
                    <div className="glass-card" style={{ padding: '1.25rem' }}>
                      <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Günlük Soru Çözüm Eğilimi</h3>
                      {!previewStats.dailyTrend || previewStats.dailyTrend.length === 0 ? (
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          Henüz grafik için veri girişi bulunmuyor.
                        </div>
                      ) : (
                        <div className="chart-container" style={{ height: '220px' }}>
                          {previewStats.dailyTrend.map((day, idx) => {
                            const maxVal = Math.max(...previewStats.dailyTrend.map(d => d.solved), 1);
                            const heightPercent = (day.solved / maxVal) * 80 + 5;
                            return (
                              <div key={idx} className="chart-bar-wrapper">
                                <div className="chart-bar" style={{ height: `${heightPercent}%`, backgroundColor: '#8b5cf6' }}>
                                  <span className="chart-bar-value">{day.solved}</span>
                                </div>
                                <span className="chart-label" title={day.date} style={{ fontSize: '0.75rem' }}>
                                  {day.date.substring(5)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Subject Breakdown */}
                    <div className="glass-card" style={{ padding: '1.25rem' }}>
                      <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Ders Bazlı Soru Dağılımı</h3>
                      {!previewStats.branchSummary || previewStats.branchSummary.length === 0 ? (
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          Kayıtlı branş istatistiği yok.
                        </div>
                      ) : (
                        <div className="dashboard-list" style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                          {previewStats.branchSummary.map((br, idx) => (
                            <div key={idx} className="dashboard-list-item" style={{ padding: '0.6rem 0.5rem' }}>
                              <div>
                                <strong style={{ fontSize: '0.9rem' }}>{br.branch}</strong>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                                  {br.solved} Soru
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Son Soru Çözüm Kayıtları Tablosu */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Son Soru Çözüm Kayıtları</h3>
                    {previewLogs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Henüz soru çözüm kaydı bulunmuyor.
                      </div>
                    ) : (
                      <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                           <thead>
                             <tr>
                               <th style={{ padding: '0.5rem 0.75rem' }}>Tarih</th>
                               <th style={{ padding: '0.5rem 0.75rem' }}>Ders / Branş</th>
                               <th style={{ padding: '0.5rem 0.75rem' }}>Çözülen Soru Sayısı</th>
                             </tr>
                           </thead>
                           <tbody>
                             {previewLogs.slice(0, 10).map(l => (
                               <tr key={l.id}>
                                 <td style={{ padding: '0.5rem 0.75rem' }}>{l.date}</td>
                                 <td style={{ padding: '0.5rem 0.75rem' }}><span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>{l.branch}</span></td>
                                 <td style={{ padding: '0.5rem 0.75rem' }}><strong>{l.solved} Soru</strong></td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
                  Öğrenci verileri yüklenirken bir hata oluştu veya veri bulunamadı.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setPreviewStudent(null)} 
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1.5rem' }}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
