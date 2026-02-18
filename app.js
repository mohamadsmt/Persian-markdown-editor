import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Edit3, 
  Eye, 
  Search, 
  ChevronDown, 
  ChevronRight,
  ChevronLeft,
  Download,
  Settings,
  Moon,
  Sun,
  FolderPlus,
  Folder,
  FolderOpen,
  X,
  Check,
  AlertTriangle,
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  LogOut,
  Mail,
  Lock,
  User,
  RefreshCw,
  ArrowRight,
  Inbox,
  Layers,
  Key
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously
} from 'firebase/auth';

// --- Firebase Initialization (Background Only) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- Mock Auth Service ---
const MockAuth = {
  getUsers: () => JSON.parse(localStorage.getItem('mock_auth_users') || '{}'),
  saveUsers: (users) => localStorage.setItem('mock_auth_users', JSON.stringify(users)),
  getSession: () => localStorage.getItem('mock_auth_session'),
  setSession: (email) => localStorage.setItem('mock_auth_session', email),
  clearSession: () => localStorage.removeItem('mock_auth_session'),
  
  register: (email, password) => {
    const users = MockAuth.getUsers();
    if (users[email]) throw new Error('این ایمیل قبلاً ثبت شده است.');
    users[email] = { email, password, verified: false, createdAt: new Date().toISOString() };
    MockAuth.saveUsers(users);
    return users[email];
  },

  login: (email, password) => {
    const users = MockAuth.getUsers();
    const user = users[email];
    if (!user) throw new Error('کاربری با این ایمیل یافت نشد.');
    if (user.password !== password) throw new Error('رمز عبور اشتباه است.');
    return user;
  },

  changePassword: (email, oldPassword, newPassword) => {
    const users = MockAuth.getUsers();
    const user = users[email];
    if (!user) throw new Error('کاربر یافت نشد.');
    if (user.password !== oldPassword) throw new Error('رمز عبور فعلی اشتباه است.');
    users[email].password = newPassword;
    MockAuth.saveUsers(users);
    return true;
  },

  verifyEmail: (email) => {
    const users = MockAuth.getUsers();
    if (users[email]) {
      users[email].verified = true;
      MockAuth.saveUsers(users);
    }
  }
};

// Simple Markdown Parser
const parseMarkdown = (text) => {
  if (!text) return '';
  let html = text
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold my-4 border-b pb-2">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold my-3 border-b pb-1">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium my-2">$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/!\[(.*?)\]\((.*?)\)/gim, "<img alt='$1' src='$2' class='max-w-full h-auto rounded-lg my-4 shadow-md' />")
    .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2' target='_blank' class='text-blue-500 underline'>$1</a>")
    .replace(/^\- (.*$)/gim, '<li class="list-disc mr-6">$1</li>')
    .replace(/^\> (.*$)/gim, '<blockquote class="border-r-4 border-indigo-400 pr-4 py-2 my-2 bg-gray-50 dark:bg-gray-800/50 rounded-l italic text-gray-600 dark:text-gray-400">$1</blockquote>')
    .replace(/`(.*?)`/gim, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-sm text-pink-500">$1</code>')
    .replace(/\n/gim, '<br />');
  
  return html;
};

// --- Settings Modal Component ---
const SettingsModal = ({ isOpen, onClose, user, workspaces, setWorkspaces, activeWorkspaceId, setActiveWorkspaceId, darkMode }) => {
  const [activeTab, setActiveTab] = useState('account');
  
  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });
  
  // Workspace Management State
  const [editingWsId, setEditingWsId] = useState(null);
  const [editWsName, setEditWsName] = useState('');
  const [newWsName, setNewWsName] = useState('');
  const [wsMsg, setWsMsg] = useState({ type: '', text: '' });
  
  // Workspace Delete Confirmation State
  const [wsDeleteId, setWsDeleteId] = useState(null);

  if (!isOpen) return null;

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });
    try {
      MockAuth.changePassword(user.email, oldPassword, newPassword);
      setPwdMsg({ type: 'success', text: 'رمز عبور با موفقیت تغییر کرد.' });
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message });
    }
  };

  const handleAddWorkspace = () => {
    if (!newWsName.trim()) return;
    const newWs = { id: Date.now().toString(), name: newWsName.trim() };
    setWorkspaces([...workspaces, newWs]);
    setNewWsName('');
    setWsMsg({ type: 'success', text: 'ورک‌اسپیس ایجاد شد.' });
    setTimeout(() => setWsMsg({ type: '', text: '' }), 2000);
  };

  const initiateDeleteWorkspace = (id) => {
    if (workspaces.length <= 1) {
      setWsMsg({ type: 'error', text: 'شما باید حداقل یک ورک‌اسپیس داشته باشید.' });
      return;
    }
    setWsDeleteId(id);
  };

  const confirmDeleteWorkspace = () => {
    if (!wsDeleteId) return;

    const newWorkspaces = workspaces.filter(ws => ws.id !== wsDeleteId);
    setWorkspaces(newWorkspaces);
    
    // If we deleted the active one, switch to the first available
    if (activeWorkspaceId === wsDeleteId) {
      setActiveWorkspaceId(newWorkspaces[0].id);
    }
    
    setWsDeleteId(null);
    setWsMsg({ type: 'success', text: 'ورک‌اسپیس حذف شد.' });
    setTimeout(() => setWsMsg({ type: '', text: '' }), 2000);
  };

  const startEditingWs = (ws) => {
    setEditingWsId(ws.id);
    setEditWsName(ws.name);
  };

  const saveEditingWs = () => {
    if (!editWsName.trim()) return;
    setWorkspaces(workspaces.map(ws => ws.id === editingWsId ? { ...ws, name: editWsName.trim() } : ws));
    setEditingWsId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans" dir="rtl">
      <div className={`w-full max-w-2xl h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative ${darkMode ? 'dark' : ''}`}>
        
        {/* Workspace Delete Confirmation Overlay */}
        {wsDeleteId && (
          <div className="absolute inset-0 z-20 bg-white/95 dark:bg-gray-900/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm animate-fade-in">
             <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">حذف ورک‌اسپیس</h3>
             <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
               آیا از حذف ورک‌اسپیس <strong>"{workspaces.find(w => w.id === wsDeleteId)?.name}"</strong> اطمینان دارید؟
               <br/>
               <span className="text-red-500 font-medium text-sm block mt-2">تمام پوشه‌ها و یادداشت‌های داخل این فضا برای همیشه پاک خواهند شد.</span>
             </p>
             <div className="flex gap-4 w-full max-w-xs">
               <button 
                 onClick={() => setWsDeleteId(null)}
                 className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-colors"
               >
                 انصراف
               </button>
               <button 
                 onClick={confirmDeleteWorkspace}
                 className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-colors"
               >
                 حذف کن
               </button>
             </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
            <Settings className="w-6 h-6 text-indigo-500" />
            تنظیمات
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-5 h-5 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar Tabs */}
          <div className="w-48 bg-gray-50 dark:bg-gray-950 p-4 border-l border-gray-100 dark:border-gray-800 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('account')}
              className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'account' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            >
              <User className="w-4 h-4" />
              حساب کاربری
            </button>
            <button 
              onClick={() => setActiveTab('workspaces')}
              className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'workspaces' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            >
              <Layers className="w-4 h-4" />
              فضاهای کار
            </button>
          </div>

          {/* Main Panel */}
          <div className="flex-1 p-8 overflow-y-auto">
            
            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
                  <Key className="w-5 h-5 text-gray-400" />
                  تغییر رمز عبور
                </h3>
                
                {pwdMsg.text && (
                  <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${pwdMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {pwdMsg.type === 'error' ? <AlertTriangle className="w-4 h-4"/> : <Check className="w-4 h-4"/>}
                    {pwdMsg.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">رمز عبور فعلی</label>
                    <input 
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg border-none outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">رمز عبور جدید</label>
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg border-none outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                    ذخیره تغییرات
                  </button>
                </form>
              </div>
            )}

            {/* Workspaces Tab */}
            {activeTab === 'workspaces' && (
              <div>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
                  <Layers className="w-5 h-5 text-gray-400" />
                  مدیریت ورک‌اسپیس‌ها
                </h3>

                {wsMsg.text && (
                  <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${wsMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {wsMsg.type === 'error' ? <AlertTriangle className="w-4 h-4"/> : <Check className="w-4 h-4"/>}
                    {wsMsg.text}
                  </div>
                )}

                <div className="flex gap-2 mb-6">
                  <input 
                    type="text"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="نام ورک‌اسپیس جدید..."
                    className="flex-1 p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg border-none outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                  <button onClick={handleAddWorkspace} className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {workspaces.map(ws => (
                    <div key={ws.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      {editingWsId === ws.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input 
                            value={editWsName}
                            onChange={(e) => setEditWsName(e.target.value)}
                            className="flex-1 p-1.5 bg-white dark:bg-gray-700 rounded border border-indigo-300 outline-none dark:text-white"
                            autoFocus
                          />
                          <button onClick={saveEditingWs} className="p-1.5 text-green-600 bg-green-100 rounded hover:bg-green-200">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingWsId(null)} className="p-1.5 text-red-600 bg-red-100 rounded hover:bg-red-200">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeWorkspaceId === ws.id ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                              <Layers className="w-4 h-4" />
                            </div>
                            <span className={`font-medium ${activeWorkspaceId === ws.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {ws.name}
                              {activeWorkspaceId === ws.id && <span className="text-[10px] mr-2 bg-indigo-100 dark:bg-indigo-900 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-300">فعال</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEditingWs(ws)} className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => initiateDeleteWorkspace(ws.id)}
                              disabled={workspaces.length <= 1}
                              className={`p-2 rounded-lg transition-colors ${workspaces.length <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

const AuthScreen = ({ onLogin, onRegisterSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      try {
        if (isRegistering) {
          MockAuth.register(email, password);
          onRegisterSuccess(email);
          setEmail('');
          setPassword('');
          setIsRegistering(false);
        } else {
          const user = MockAuth.login(email, password);
          onLogin(user);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-8 h-8" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">
            {isRegistering ? 'ایجاد حساب کاربری' : 'ورود به حساب'}
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8">
            {isRegistering ? 'برای استفاده از اوبسیدین ثبت‌نام کنید' : 'خوش آمدید! لطفاً وارد شوید'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-1">ایمیل</label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <input 
                  type="email" 
                  required
                  className="w-full pr-10 pl-4 py-2.5 bg-gray-100 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-1">رمز عبور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  required
                  className="w-full pr-10 pl-4 py-2.5 bg-gray-100 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {isRegistering ? 'ثبت‌نام' : 'ورود'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="text-sm text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
            >
              {isRegistering ? 'قبلاً حساب ساخته‌اید؟ وارد شوید' : 'حساب ندارید؟ ثبت‌نام کنید'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  // --- Auth State ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(null);
  const [showFakeEmail, setShowFakeEmail] = useState(false);

  // --- App State ---
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, id: null, name: '' });
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);

  const editorRef = useRef(null);

  // --- Auth Initialization ---
  useEffect(() => {
    signInAnonymously(auth).catch(e => console.log("Anonymous auth fallback", e));
    const sessionEmail = MockAuth.getSession();
    if (sessionEmail) {
      try {
        const userData = MockAuth.getUsers()[sessionEmail];
        if (userData) setUser(userData);
        else MockAuth.clearSession();
      } catch (e) {
        MockAuth.clearSession();
      }
    }
    setAuthLoading(false);
  }, []);

  // --- Data Persistence ---
  useEffect(() => {
    if (!user) return;
    
    const userPrefix = `obsidian_${user.email}_`;
    const savedWorkspaces = localStorage.getItem(userPrefix + 'workspaces');
    const savedNotes = localStorage.getItem(userPrefix + 'notes');
    const savedFolders = localStorage.getItem(userPrefix + 'folders');
    
    // Load Workspaces or Create Default
    if (savedWorkspaces) {
      const parsedWs = JSON.parse(savedWorkspaces);
      setWorkspaces(parsedWs);
      if (parsedWs.length > 0) setActiveWorkspaceId(parsedWs[0].id);
    } else {
      const defaultWs = { id: 'default', name: 'فضای کار اصلی' };
      setWorkspaces([defaultWs]);
      setActiveWorkspaceId(defaultWs.id);
    }

    // Load Folders & Migrate if needed
    if (savedFolders) {
      let parsedFolders = JSON.parse(savedFolders);
      // Migration: If folders don't have workspaceId, assign to default
      if (parsedFolders.length > 0 && !parsedFolders[0].workspaceId) {
        parsedFolders = parsedFolders.map(f => ({ ...f, workspaceId: 'default' }));
      }
      setFolders(parsedFolders);
      const expansions = {};
      parsedFolders.forEach(f => expansions[f.id] = true);
      setExpandedFolders(expansions);
    } else {
      setFolders([{ id: 'f1', workspaceId: 'default', name: 'عمومی' }]);
      setExpandedFolders({ 'f1': true });
    }

    // Load Notes
    if (savedNotes) {
      try { setNotes(JSON.parse(savedNotes)); } catch(e) {}
    } else {
      setNotes([{
        id: '1',
        folderId: 'f1',
        title: 'شروع کار',
        content: '# خوش آمدید!\nاطلاعات شما به صورت امن ذخیره می‌شود.',
        updatedAt: new Date().toISOString()
      }]);
      setActiveNoteId('1');
    }
  }, [user?.email]);

  // Save Data
  useEffect(() => {
    if (!user) return;
    const userPrefix = `obsidian_${user.email}_`;
    localStorage.setItem(userPrefix + 'workspaces', JSON.stringify(workspaces));
    localStorage.setItem(userPrefix + 'notes', JSON.stringify(notes));
    localStorage.setItem(userPrefix + 'folders', JSON.stringify(folders));
  }, [notes, folders, workspaces, user]);

  // --- Filtered Data based on Active Workspace ---
  const filteredFolders = useMemo(() => 
    folders.filter(f => f.workspaceId === activeWorkspaceId),
  [folders, activeWorkspaceId]);

  const activeNote = useMemo(() => 
    notes.find(n => n.id === activeNoteId) || null, 
    [notes, activeNoteId]
  );

  const activeWorkspace = useMemo(() => 
    workspaces.find(ws => ws.id === activeWorkspaceId) || workspaces[0],
    [workspaces, activeWorkspaceId]
  );

  // Reset active note if switching workspace implies it's gone (optional, but good UX)
  useEffect(() => {
    if (activeNote) {
      const parentFolder = folders.find(f => f.id === activeNote.folderId);
      if (parentFolder && parentFolder.workspaceId !== activeWorkspaceId) {
        setActiveNoteId(null);
      }
    }
  }, [activeWorkspaceId]);


  // --- Handlers ---
  const handleLogin = (loggedInUser) => {
    MockAuth.setSession(loggedInUser.email);
    setUser(loggedInUser);
    setPendingVerificationEmail(null);
  };

  const handleLogout = () => {
    MockAuth.clearSession();
    setUser(null);
    setNotes([]);
    setFolders([]);
    setWorkspaces([]);
    setActiveNoteId(null);
  };

  const handleRegisterSuccess = (email) => {
    setPendingVerificationEmail(email);
    setTimeout(() => setShowFakeEmail(true), 1500);
  };

  const handleVerifyEmail = () => {
    MockAuth.verifyEmail(pendingVerificationEmail);
    const userData = MockAuth.getUsers()[pendingVerificationEmail];
    handleLogin(userData);
    setShowFakeEmail(false);
    setPendingVerificationEmail(null);
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim() && activeWorkspaceId) {
      const newFolder = { 
        id: Date.now().toString(), 
        workspaceId: activeWorkspaceId, 
        name: newFolderName.trim() 
      };
      setFolders([...folders, newFolder]);
      setExpandedFolders(prev => ({ ...prev, [newFolder.id]: true }));
      setNewFolderName('');
      setIsAddingFolder(false);
    }
  };

  const requestDeleteFolder = (folderId, folderName, e) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, type: 'folder', id: folderId, name: folderName });
  };

  const requestDeleteNote = (noteId, noteTitle, e) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, type: 'note', id: noteId, name: noteTitle || 'بدون عنوان' });
  };

  const executeDelete = () => {
    const { type, id } = deleteConfirm;
    if (type === 'folder') {
      setFolders(folders.filter(f => f.id !== id));
      setNotes(notes.filter(n => n.folderId !== id)); // Cascade delete
      if (activeNote && activeNote.folderId === id) setActiveNoteId(null);
    } else if (type === 'note') {
      const updatedNotes = notes.filter(n => n.id !== id);
      setNotes(updatedNotes);
      if (activeNoteId === id) setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null);
    }
    setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' });
  };

  const createNote = (folderId) => {
    // If specific folder not provided, pick first in current workspace or create one
    let targetFolderId = folderId;
    if (!targetFolderId) {
      if (filteredFolders.length > 0) targetFolderId = filteredFolders[0].id;
      else {
        // Auto create a folder if none exist in this workspace
        const newFolder = { id: Date.now().toString(), workspaceId: activeWorkspaceId, name: 'عمومی' };
        setFolders([...folders, newFolder]);
        setExpandedFolders(prev => ({ ...prev, [newFolder.id]: true }));
        targetFolderId = newFolder.id;
      }
    }

    const newNote = {
      id: Date.now().toString(),
      folderId: targetFolderId,
      title: 'یادداشت جدید',
      content: '',
      updatedAt: new Date().toISOString()
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setIsPreview(false);
    if (targetFolderId) setExpandedFolders(prev => ({ ...prev, [targetFolderId]: true }));
  };

  const updateActiveNote = (updates) => {
    if (!activeNoteId) return;
    setNotes(notes.map(n => 
      n.id === activeNoteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    ));
  };

  const insertMarkdown = (prefix, suffix = '') => {
    if (!editorRef.current || !activeNote) return;
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activeNote.content;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    const newContent = before + prefix + selection + suffix + after;
    updateActiveNote({ content: newContent });
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selection.length + suffix.length;
      if (start === end) textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      else textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const downloadNote = () => {
    if (!activeNote) return;
    const element = document.createElement("a");
    const file = new Blob([activeNote.content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${activeNote.title}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- Render Loading ---
  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="text-gray-500 font-sans">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  // --- Render Auth Screen ---
  if (!user && !pendingVerificationEmail) {
    return <AuthScreen onLogin={handleLogin} onRegisterSuccess={handleRegisterSuccess} />;
  }

  // --- Render Verification Waiting Screen ---
  if (pendingVerificationEmail && (!user || !user.verified)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans relative" dir="rtl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-8 text-center border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-600 dark:text-yellow-400">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">تایید ایمیل الزامی است</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            یک ایمیل فعال‌سازی به <strong>{pendingVerificationEmail}</strong> ارسال شد. 
            <br/>لطفاً صندوق ورودی خود را چک کنید.
          </p>
          <div className="space-y-3">
             <button 
              onClick={() => { setPendingVerificationEmail(null); setUser(null); }}
              className="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all"
            >
              بازگشت به صفحه ورود
            </button>
          </div>
        </div>
        {showFakeEmail && (
          <div className="absolute top-4 right-4 max-w-sm w-full bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 animate-bounce-in cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors" onClick={handleVerifyEmail}>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600">
                <Inbox className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">ایمیل جدید: فعال‌سازی حساب</h4>
                <p className="text-xs text-gray-500 mt-1">از طرف: Obsidian Clone Support</p>
                <p className="text-xs text-blue-500 mt-2 font-medium">برای تایید حساب کلیک کنید</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Render Main App ---
  return (
    <div className={`flex h-screen w-full font-sans transition-colors duration-200 ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`} dir="rtl">
      
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'} border-l border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 bg-white dark:bg-gray-950 z-20`}>
        
        {/* Workspace Switcher Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
          <div className="relative">
            <button 
              onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
              className="flex items-center gap-2 font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 -mr-2 rounded-lg transition-colors truncate max-w-[160px]"
            >
              <span className="truncate">{activeWorkspace?.name || 'فضای کار'}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {/* Workspace Dropdown */}
            {isWorkspaceDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsWorkspaceDropdownOpen(false)}></div>
                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 py-1">
                  {workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => { setActiveWorkspaceId(ws.id); setIsWorkspaceDropdownOpen(false); }}
                      className={`w-full text-right px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 ${activeWorkspaceId === ws.id ? 'text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {ws.name}
                      {activeWorkspaceId === ws.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                  <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                  <button 
                    onClick={() => { setIsSettingsOpen(true); setIsWorkspaceDropdownOpen(false); }}
                    className="w-full text-right px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    مدیریت فضاها
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-1">
            <button onClick={() => setIsAddingFolder(true)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="پوشه جدید">
              <FolderPlus className="w-4 h-4" />
            </button>
            <button onClick={() => createNote()} className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg" title="یادداشت جدید">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Info & Settings */}
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsSettingsOpen(true)}>
            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
              {user.email[0].toUpperCase()}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{user.email}</span>
          </div>
          <div className="flex gap-1">
             <button onClick={() => setIsSettingsOpen(true)} className="p-1 text-gray-400 hover:text-indigo-500 transition-colors" title="تنظیمات">
              <Settings className="w-4 h-4" />
            </button>
             <button onClick={handleLogout} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="خروج">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New Folder Input Area */}
        {isAddingFolder && (
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-indigo-50/30 dark:bg-indigo-900/10">
            <div className="flex gap-2">
              <input 
                autoFocus
                type="text"
                className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:outline-none dark:text-white"
                placeholder="نام پوشه..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <button onClick={handleCreateFolder} className="p-1 text-green-500 hover:bg-green-50 rounded">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsAddingFolder(false)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="p-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="جستجو..."
              className="w-full pr-10 pl-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border-none dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredFolders.length === 0 && (
            <div className="text-center text-gray-400 text-xs py-10 italic">
              هیچ پوشه‌ای در این ورک‌اسپیس وجود ندارد.
            </div>
          )}
          {filteredFolders.map(folder => (
            <div key={folder.id} className="mb-2">
              <div 
                onClick={() => toggleFolder(folder.id)}
                className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer group text-gray-600 dark:text-gray-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedFolders[folder.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  {expandedFolders[folder.id] ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-500" />}
                  <span className="text-sm font-bold truncate max-w-[120px]">{folder.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={(e) => { e.stopPropagation(); createNote(folder.id); }} className="p-1 hover:text-indigo-500" title="یادداشت جدید">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                   <button onClick={(e) => requestDeleteFolder(folder.id, folder.name, e)} className="p-1 hover:text-red-500" title="حذف پوشه">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {expandedFolders[folder.id] && (
                <div className="mr-4 mt-1 space-y-1 border-r border-gray-100 dark:border-gray-800">
                  {notes.filter(n => n.folderId === folder.id && (
                    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    n.content.toLowerCase().includes(searchQuery.toLowerCase())
                  )).map(note => (
                    <div 
                      key={note.id}
                      onClick={() => setActiveNoteId(note.id)}
                      className={`group flex items-center justify-between p-2 pr-4 rounded-md cursor-pointer transition-all ${
                        activeNoteId === note.id 
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-r-2 border-indigo-500 font-medium' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <span className="text-sm truncate flex-1">{note.title || 'بدون عنوان'}</span>
                      <button 
                        onClick={(e) => requestDeleteNote(note.id, note.title, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                        title="حذف یادداشت"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {notes.filter(n => n.folderId === folder.id).length === 0 && (
                    <div className="text-[10px] text-gray-400 pr-4 py-1 italic">پوشه خالی است</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-4 shrink-0">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900 relative">
        
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute z-30 top-1/2 -right-3 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all ${!isSidebarOpen ? 'rotate-180 -right-4' : ''}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Note Toolbar */}
        <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <input 
              className="bg-transparent border-none text-xl font-bold focus:outline-none w-1/2 dark:text-white"
              value={activeNote?.title || ''}
              onChange={(e) => updateActiveNote({ title: e.target.value })}
              placeholder="عنوان یادداشت..."
              disabled={!activeNote}
            />
            {activeNote && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Folder className="w-3 h-3" />
                {folders.find(f => f.id === activeNote.folderId)?.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button 
                onClick={() => setIsPreview(false)}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${!isPreview ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">ویرایش</span>
              </button>
              <button 
                onClick={() => setIsPreview(true)}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${isPreview ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">پیش‌نمایش</span>
              </button>
            </div>
            <button 
              onClick={downloadNote}
              disabled={!activeNote}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 disabled:opacity-30 transition-colors"
              title="دانلود فایل MD"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeNote ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {!isPreview && (
                <div className="flex items-center gap-1 p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 overflow-x-auto shrink-0">
                  <ToolButton onClick={() => insertMarkdown('**', '**')} icon={Bold} title="ضخیم (Bold)" />
                  <ToolButton onClick={() => insertMarkdown('*', '*')} icon={Italic} title="ایتالیک (Italic)" />
                  <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />
                  <ToolButton onClick={() => insertMarkdown('# ')} icon={Heading1} title="تیتر ۱" />
                  <ToolButton onClick={() => insertMarkdown('## ')} icon={Heading2} title="تیتر ۲" />
                  <ToolButton onClick={() => insertMarkdown('### ')} icon={Heading3} title="تیتر ۳" />
                  <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />
                  <ToolButton onClick={() => insertMarkdown('- ')} icon={List} title="لیست نشانه‌دار" />
                  <ToolButton onClick={() => insertMarkdown('> ')} icon={Quote} title="نقل قول" />
                  <ToolButton onClick={() => insertMarkdown('`', '`')} icon={Code} title="کد درون خطی" />
                  <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />
                  <ToolButton onClick={() => insertMarkdown('[', '](url)')} icon={LinkIcon} title="لینک" />
                  <ToolButton onClick={() => insertMarkdown('![', '](url)')} icon={ImageIcon} title="تصویر" />
                </div>
              )}

              <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">
                <div className={`flex-1 flex flex-col ${isPreview ? 'hidden' : 'block'} h-full`}>
                  <textarea 
                    ref={editorRef}
                    className="flex-1 p-8 text-lg bg-transparent focus:outline-none resize-none leading-relaxed font-mono dark:text-gray-300 w-full h-full"
                    dir="rtl"
                    placeholder="اینجا بنویسید (از مارک‌داون استفاده کنید)..."
                    value={activeNote.content}
                    onChange={(e) => updateActiveNote({ content: e.target.value })}
                  />
                </div>
                <div className={`flex-1 overflow-y-auto p-8 prose dark:prose-invert max-w-none ${!isPreview ? 'hidden md:block border-r dark:border-gray-800' : 'block'}`}>
                  <div 
                    className="markdown-preview"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(activeNote.content || '*یادداشت خالی است*') }} 
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="relative">
                <FileText className="w-20 h-20 opacity-10" />
                <Plus className="w-8 h-8 absolute -bottom-2 -right-2 text-indigo-500/40" />
              </div>
              <p className="text-lg italic">هیچ یادداشتی برای نمایش وجود ندارد</p>
              <button 
                onClick={() => createNote()}
                className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-md hover:shadow-lg"
              >
                ایجاد اولین یادداشت
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeNote && (
          <div className="h-8 border-t border-gray-100 dark:border-gray-800 px-6 flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-widest shrink-0">
            <div className="flex gap-4">
              <span>آخرین تغییر: {new Date(activeNote.updatedAt).toLocaleTimeString('fa-IR')}</span>
            </div>
            <span>{activeNote.content.trim() ? activeNote.content.trim().split(/\s+/).length : 0} کلمه</span>
          </div>
        )}
      </div>
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        workspaces={workspaces}
        setWorkspaces={setWorkspaces}
        activeWorkspaceId={activeWorkspaceId}
        setActiveWorkspaceId={setActiveWorkspaceId}
        darkMode={darkMode}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 opacity-100 border border-gray-200 dark:border-gray-700">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                حذف {deleteConfirm.type === 'folder' ? 'پوشه' : 'یادداشت'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                آیا مطمئن هستید که می‌خواهید "{deleteConfirm.name}" را حذف کنید؟
                {deleteConfirm.type === 'folder' && <span className="block mt-1 text-red-500 font-medium">تمام یادداشت‌های داخل آن نیز حذف خواهند شد.</span>}
                <br/>این عملیات غیرقابل بازگشت است.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' })}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  انصراف
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-md shadow-red-500/20"
                >
                  حذف کن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
        .markdown-preview h1 { font-size: 2rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; margin-bottom: 1rem; font-weight: 800; }
        .markdown-preview h2 { font-size: 1.5rem; margin-top: 1.5rem; font-weight: 700; }
        .markdown-preview blockquote { border-right: 4px solid #6366f1; padding: 0.5rem 1rem; color: #666; font-style: italic; background: rgba(99, 102, 241, 0.05); }
        .dark .markdown-preview blockquote { color: #aaa; background: rgba(99, 102, 241, 0.1); }
        .markdown-preview a { color: #6366f1; text-decoration: none; }
        .markdown-preview code { font-family: monospace; padding: 0.2rem 0.4rem; background: rgba(0,0,0,0.05); border-radius: 4px; }
        .dark .markdown-preview code { background: rgba(255,255,255,0.1); }
        @keyframes bounce-in {
          0% { transform: scale(0.8) translateY(-20px); opacity: 0; }
          60% { transform: scale(1.05) translateY(5px); opacity: 1; }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}} />
    </div>
  );
};

const ToolButton = ({ onClick, icon: Icon, title }) => (
  <button 
    onClick={onClick}
    title={title}
    className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
  >
    <Icon className="w-4 h-4" />
  </button>
);

export default App;