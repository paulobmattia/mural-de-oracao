import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  doc, 
  setDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { 
  Heart, 
  Send, 
  User, 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  BookOpen, 
  Mail, 
  Lock, 
  CheckCircle, 
  LogOut, 
  MessageCircle, 
  X,
  AlertTriangle,
  Settings,
  Save,
  Calendar,
  Bell,
  Moon,
  Sun,
  Camera
} from 'lucide-react';

// --- SUA CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyC7-wps2_vd6Ak2n7bu1E272qdbPP2JknA",
  authDomain: "mural-de-oracao.firebaseapp.com",
  projectId: "mural-de-oracao",
  storageBucket: "mural-de-oracao.firebasestorage.app",
  messagingSenderId: "523164992096",
  appId: "1:523164992096:web:ae30c09139c92bb326f905"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "mural-v1"; 

// --- Componente Principal ---
export default function PrayerApp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [view, setView] = useState('splash'); 
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, requestId: null });
  
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (!link) {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = '/icon.png';
      document.head.appendChild(newLink);
    } else {
      link.href = '/icon.png';
    }

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Monitorar Autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'main');
        try {
          const docSnap = await getDoc(profileRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
            setView((v) => (v === 'login' || v === 'splash' ? 'home' : v));
          } else {
             // Pega foto do Google se existir
             const initialData = { 
                name: currentUser.displayName || 'Visitante', 
                email: currentUser.email,
                photoURL: currentUser.photoURL || null 
             };
             await setDoc(profileRef, initialData);
             setUserProfile(initialData);
             setView((v) => (v === 'login' || v === 'splash' ? 'home' : v));
          }
        } catch (e) { console.error(e); }
      } else {
        setUserProfile(null);
        if (view !== 'splash') setView('login');
      }
    });
    return () => unsubscribe();
  }, [view]);

  // Listener de Pedidos
  useEffect(() => {
    if (!user) return;
    const requestsRef = collection(db, 'artifacts', appId, 'public', 'data', 'prayer_requests');
    const unsubscribe = onSnapshot(requestsRef, (snapshot) => {
      const loadedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedRequests.sort((a, b) => {
        const userId = user.uid;
        const aPrayed = a.prayedBy?.includes(userId) || false;
        const bPrayed = b.prayedBy?.includes(userId) || false;
        if (aPrayed && !bPrayed) return -1;
        if (!aPrayed && bPrayed) return 1;
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setRequests(loadedRequests);
      setLoading(false);
    }, (error) => { console.error(error); setLoading(false); });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) setView('login');
    }, 3500);
    return () => clearTimeout(timer);
  }, [user]);

  // --- Ações ---

  const handleEmailLogin = async (email, password, isRegister, name) => {
    try {
      let userCredential;
      if (isRegister) {
        if (!name.trim()) { alert("Por favor, informe seu nome."); return; }
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserProfile(userCredential.user.uid, { name: name.trim(), email });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error("Erro Auth:", error);
      alert("Erro na autenticação: " + error.code);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Salva também a URL da foto do Google
      await saveUserProfile(result.user.uid, {
        name: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL
      });
    } catch (error) { console.error("Erro Google:", error); }
  };

  const saveUserProfile = async (uid, data) => {
    try {
      const profileRef = doc(db, 'artifacts', appId, 'users', uid, 'profile', 'main');
      await setDoc(profileRef, data, { merge: true });
      setUserProfile((prev) => ({ ...prev, ...data }));
    } catch (e) { console.error(e); }
  };

  const handleUpdateProfile = async (newName, newPhotoBase64) => {
    if (!user) return;
    const updateData = {};
    if (newName) updateData.name = newName.trim();
    if (newPhotoBase64) updateData.photoURL = newPhotoBase64;
    
    await saveUserProfile(user.uid, updateData);
    alert("Perfil atualizado com sucesso!");
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('login');
  };

  const handleCreateRequest = async (content, isAnonymous) => {
    if (!content.trim() || !user) return;
    try {
      const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'prayer_requests');
      await addDoc(collectionRef, {
        authorName: userProfile?.name || 'Desconhecido',
        authorPhoto: userProfile?.photoURL || null, // Salva a foto atual no pedido
        authorId: user.uid,
        isAnonymous: isAnonymous,
        content: content,
        createdAt: serverTimestamp(),
        prayedBy: [],
        commentCount: 0
      });
      setView('read');
    } catch (error) { alert("Erro ao enviar."); }
  };

  const handleDeleteRequestClick = (requestId) => setDeleteModal({ isOpen: true, requestId });

  const confirmDelete = async () => {
    if (!deleteModal.requestId) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prayer_requests', deleteModal.requestId));
      setDeleteModal({ isOpen: false, requestId: null });
    } catch (error) { alert("Erro ao excluir."); }
  };

  const handlePrayInteraction = async (requestId, isPraying) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'prayer_requests', requestId);
      await updateDoc(docRef, {
        prayedBy: isPraying ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) { console.error(error); }
  };

  // --- Roteamento ---

  if (view === 'splash') return <SplashScreen />;
  if (view === 'login') return <LoginScreen onEmailLogin={handleEmailLogin} onGoogleLogin={handleGoogleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden relative flex flex-col transition-colors duration-300" style={{ fontFamily: "'Roboto', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        body { font-family: 'Roboto', sans-serif; }
        @keyframes fadeInSimple { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-simple { animation: fadeInSimple 2.5s ease-out forwards; }
      `}</style>

      <Header view={view} setView={setView} />

      <main className="flex-1 w-full max-w-md md:max-w-6xl mx-auto relative bg-slate-50 dark:bg-slate-900 md:px-6 transition-colors duration-300">
        {view === 'home' && (
          <HomeScreen onViewChange={setView} requestCount={requests.length} userProfile={userProfile} />
        )}
        {view === 'write' && (
          <WriteScreen onSubmit={handleCreateRequest} userProfile={userProfile} />
        )}
        {view === 'read' && (
          <ReadScreen 
            requests={requests} 
            loading={loading} 
            currentUser={user}
            onPray={handlePrayInteraction}
            onDeleteClick={handleDeleteRequestClick}
            userProfile={userProfile}
          />
        )}
        {view === 'settings' && (
          <SettingsScreen 
            userProfile={userProfile} 
            onUpdateProfile={handleUpdateProfile} 
            onLogout={handleLogout}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}
      </main>

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mb-2">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">ATENÇÃO!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Tem certeza que deseja excluir este pedido de oração?</p>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setDeleteModal({ isOpen: false, requestId: null })} className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                <button onClick={confirmDelete} className="flex-1 py-3 px-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200">Excluir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Componentes Visuais ---

// Componente Auxiliar para Avatar
function UserAvatar({ src, name, size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
    xl: "w-24 h-24 text-3xl"
  };

  if (src) {
    return <img src={src} alt={name} className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 dark:border-slate-600 ${className}`} />;
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold shadow-sm bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 ${className}`}>
      {name ? name.charAt(0).toUpperCase() : <User size={size === 'sm' ? 14 : 20} />}
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 flex flex-col items-center justify-center z-50 transition-colors duration-300">
      <div className="animate-fade-simple flex flex-col items-center">
        <img src="/icon.png" alt="Logo" className="w-40 h-40 object-contain mb-6" />
      </div>
    </div>
  );
}

function LoginScreen({ onEmailLogin, onGoogleLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    if (isRegister && !name) return;
    setLoading(true);
    await onEmailLogin(email, password, isRegister, name);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-8 duration-700 transition-colors duration-300">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
             <img src="/icon.png" alt="Logo" className="w-24 h-24 object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{isRegister ? 'Criar Conta' : 'Bem-vindo de volta'}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Entre para se conectar à corrente de oração.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <div className="relative group animate-in slide-in-from-top-2 fade-in duration-300">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input type="text" required placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 dark:text-white transition-all" />
            </div>
          )}
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input type="email" required placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 dark:text-white transition-all" />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input type="password" required placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 dark:text-white transition-all" />
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70">
            {loading ? 'Processando...' : (isRegister ? 'Cadastrar' : 'Entrar')}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
          <span className="text-xs text-slate-400 font-bold uppercase">Ou continue com</span>
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
        </div>

        <button type="button" onClick={onGoogleLogin} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 p-4 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-3">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google
        </button>
        <div className="mt-8 text-center">
          <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors font-medium">
            {isRegister ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ view, setView }) {
  return (
    <div className="bg-[#649fce] shadow-sm p-4 sticky top-0 z-10 flex items-center justify-between text-white">
      <div className="w-10 flex justify-start">
        {view !== 'home' && view !== 'login' && (
          <button onClick={() => setView('home')} className="p-2 -ml-2 text-white hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
        )}
      </div>
      <div className="flex-1 text-center">
        <h1 className="text-lg font-bold tracking-wide">
          {view === 'home' ? 'Mural de Oração v. 1.0' : 
           view === 'write' ? 'Novo Pedido' : 
           view === 'read' ? 'Mural' : 
           view === 'settings' ? 'Configurações' : ''}
        </h1>
      </div>
      <div className="w-10 flex justify-end">
        {view === 'home' && (
          <button onClick={() => setView('settings')} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Configurações">
            <Settings size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

// --- TELA DE CONFIGURAÇÕES ---
function SettingsScreen({ userProfile, onUpdateProfile, onLogout, theme, toggleTheme }) {
  const [name, setName] = useState(userProfile?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  const handleSave = () => {
    onUpdateProfile(name);
    setIsEditing(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        // Cria uma imagem para redimensionar
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200; // Redimensiona para 200px (thumbnail leve)
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const base64String = canvas.toDataURL('image/jpeg', 0.7); // Compressão JPEG 70%
          onUpdateProfile(null, base64String); // Salva a imagem comprimida
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddToCalendar = () => {
    const title = "Momento de Oração";
    const details = "Tempo dedicado para acessar o Mural de Oração e interceder.";
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&recur=RRULE:FREQ=DAILY`;
    window.open(googleCalendarUrl, '_blank');
  };

  return (
    <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
      
      {/* Aparência */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-6 transition-colors">
        <div className="bg-slate-50 dark:bg-slate-700 p-4 border-b border-slate-100 dark:border-slate-600 flex items-center gap-3">
          <Sun className="text-yellow-500" size={20} />
          <h3 className="font-bold text-slate-700 dark:text-white">Aparência</h3>
        </div>
        <div className="p-6 flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-300 font-medium">Modo Escuro</span>
          <button onClick={toggleTheme} className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}>
              {theme === 'dark' ? <Moon size={14} className="text-blue-600" /> : <Sun size={14} className="text-yellow-500" />}
            </div>
          </button>
        </div>
      </div>

      {/* Perfil */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-6 transition-colors">
        <div className="bg-slate-50 dark:bg-slate-700 p-4 border-b border-slate-100 dark:border-slate-600 flex items-center gap-3">
          <User className="text-blue-500" size={20} />
          <h3 className="font-bold text-slate-700 dark:text-white">Meu Perfil</h3>
        </div>
        <div className="p-6 flex flex-col gap-6">
          
          {/* Foto de Perfil */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserAvatar src={userProfile?.photoURL} name={userProfile?.name} size="lg" />
              <button 
                onClick={() => fileInputRef.current.click()}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-md hover:bg-blue-700 transition-colors"
              >
                <Camera size={14} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700 dark:text-white">Sua Foto</p>
              <p className="text-xs text-slate-400">Toque na câmera para alterar.</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nome de Exibição</label>
            <div className="flex gap-2 mt-2">
              <input 
                type="text" 
                value={name}
                disabled={!isEditing}
                onChange={(e) => setName(e.target.value)}
                className={`flex-1 p-3 rounded-xl border outline-none transition-all ${isEditing ? 'bg-white dark:bg-slate-700 border-blue-400 ring-2 ring-blue-100 dark:text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
              />
              {isEditing ? (
                <button onClick={handleSave} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors">
                  <Save size={20} />
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 p-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <Settings size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lembrete */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-6 transition-colors">
        <div className="bg-slate-50 dark:bg-slate-700 p-4 border-b border-slate-100 dark:border-slate-600 flex items-center gap-3">
          <Bell className="text-orange-500" size={20} />
          <h3 className="font-bold text-slate-700 dark:text-white">Lembrete Diário</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
            Para manter o hábito da oração, adicione um lembrete recorrente na sua agenda pessoal.
          </p>
          <button onClick={handleAddToCalendar} className="w-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 p-4 rounded-xl font-bold hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors flex items-center justify-center gap-2">
            <Calendar size={20} />
            Adicionar à minha Agenda
          </button>
        </div>
      </div>

      <button onClick={onLogout} className="w-full bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900 text-red-500 p-4 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 shadow-sm">
        <LogOut size={20} />
        Sair da Conta
      </button>

      <div className="text-center mt-8 text-xs text-slate-300 dark:text-slate-600">
        Versão 1.4.0
      </div>
    </div>
  );
}

function HomeScreen({ onViewChange, requestCount, userProfile }) {
  return (
    <div className="p-6 flex flex-col gap-6 pb-20 animate-in fade-in pt-8 md:pt-16 max-w-4xl mx-auto">
      <div className="text-center mb-4 flex flex-col items-center">
        {/* Exibir Foto na Home */}
        <UserAvatar src={userProfile?.photoURL} name={userProfile?.name} size="xl" className="mb-4 shadow-lg border-4 border-white dark:border-slate-800" />
        
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Olá, {userProfile?.name || 'Visitante'}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm italic bg-blue-50 dark:bg-slate-800 inline-block px-4 py-1 rounded-full">
          "Orai uns pelos outros para serdes curados."
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 justify-center">
        <button onClick={() => onViewChange('write')} className="group bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-blue-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all active:scale-95 flex flex-col items-center gap-3 flex-1 max-w-sm">
          <div className="bg-blue-100 dark:bg-slate-700 p-4 rounded-full text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Plus size={32} />
          </div>
          <span className="text-lg font-bold text-slate-700 dark:text-white">Deixar um Pedido</span>
        </button>

        <button onClick={() => onViewChange('read')} className="group bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-purple-100 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 transition-all active:scale-95 flex flex-col items-center gap-3 flex-1 max-w-sm">
          <div className="bg-purple-100 dark:bg-slate-700 p-4 rounded-full text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <BookOpen size={32} />
          </div>
          <span className="text-lg font-bold text-slate-700 dark:text-white">Interceder</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 text-center">
            {requestCount > 0 ? `${requestCount} pedidos ativos` : 'Seja o primeiro a ver os pedidos'}
          </span>
        </button>
      </div>
    </div>
  );
}

function WriteScreen({ onSubmit, userProfile }) {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    await onSubmit(content, isAnonymous);
    setIsSubmitting(false);
  };

  return (
    <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm transition-colors">
          <div className="flex items-center gap-3">
             <div className={`p-1 rounded-full ${isAnonymous ? 'bg-slate-100 dark:bg-slate-700' : 'bg-blue-100 dark:bg-slate-700'}`}>
               {isAnonymous ? (
                 <User size={20} className="text-slate-500 dark:text-slate-400 m-2" />
               ) : (
                 <UserAvatar src={userProfile?.photoURL} name={userProfile?.name} size="md" />
               )}
             </div>
             <div className="flex flex-col">
               <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Publicar como</span>
               <span className="font-medium text-slate-700 dark:text-white">{isAnonymous ? 'Anônimo' : (userProfile?.name || 'Você')}</span>
             </div>
          </div>
          <button type="button" onClick={() => setIsAnonymous(!isAnonymous)} className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${isAnonymous ? 'bg-slate-300 dark:bg-slate-600' : 'bg-blue-500'}`}>
            <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${isAnonymous ? 'translate-x-0' : 'translate-x-5'}`}></div>
          </button>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Sparkles size={16} /> Seu Pedido de Oração
          </label>
          <textarea required rows={6} placeholder="Descreva seu pedido com detalhes..." value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-lg outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all resize-none text-slate-700 dark:text-white border border-transparent dark:border-slate-700" />
        </div>
        <button disabled={isSubmitting} type="submit" className="bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
          {isSubmitting ? 'Enviando...' : (<><Send size={20} /> Enviar Pedido</>)}
        </button>
      </form>
    </div>
  );
}

function ReadScreen({ requests, loading, onPray, onDeleteClick, currentUser, userProfile }) {
  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (requests.length === 0) return <div className="text-center p-10 text-slate-400">Ainda não há pedidos.</div>;

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 animate-in fade-in duration-500">
      {requests.map((req) => (
        <PrayerCard key={req.id} request={req} currentUser={currentUser} userProfile={userProfile} onPray={onPray} onDeleteClick={onDeleteClick} />
      ))}
    </div>
  );
}

function PrayerCard({ request, currentUser, userProfile, onPray, onDeleteClick }) {
  const prayedBy = request.prayedBy || [];
  const isPraying = prayedBy.includes(currentUser?.uid);
  const isAuthor = request.authorId === currentUser?.uid;
  const [showComments, setShowComments] = useState(false);
  const displayName = request.isAnonymous ? "Anônimo" : request.authorName;
  const displayPhoto = request.isAnonymous ? null : request.authorPhoto;
  const commentCount = request.commentCount || 0;

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md relative group h-fit">
      {isAuthor && (
        <button onClick={() => onDeleteClick(request.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors p-1">
          <X size={16} />
        </button>
      )}
      <div className="flex justify-between items-start mb-3 pr-6">
        <div className="flex items-center gap-3">
          {/* Exibe foto ou inicial */}
          <UserAvatar src={displayPhoto} name={displayName} size="md" className={isAuthor ? "ring-2 ring-blue-100 dark:ring-blue-900" : ""} />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">{displayName}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1">
               {request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : 'Agora'}
               {isAuthor && <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-1.5 rounded text-[10px] font-bold tracking-wide">VOCÊ</span>}
            </p>
          </div>
        </div>
      </div>
      <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap pl-1">{request.content}</p>
      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700">
        <button onClick={() => setShowComments(!showComments)} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors group">
          <MessageCircle size={16} />
          Comentários
          {commentCount > 0 && (
            <span className="bg-[#649fce] text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold ml-1">
              {commentCount}
            </span>
          )}
        </button>
        <button onClick={() => onPray(request.id, isPraying)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 border ${isPraying ? 'bg-[#649fce] text-white border-[#649fce]' : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-red-200 dark:hover:border-red-900 hover:text-red-500'} active:scale-95`}>
          {isPraying ? (<>Orando <Heart size={14} className="fill-red-500 text-red-500" /></>) : (<>Eu Oro <Heart size={14} className="group-hover:text-red-500 transition-colors" /></>)}
          <span className={`ml-1 font-normal ${isPraying ? 'opacity-100' : 'opacity-80'}`}>| {prayedBy.length}</span>
        </button>
      </div>
      {showComments && <CommentsSection requestId={request.id} currentUser={currentUser} userProfile={userProfile} />}
    </div>
  );
}

function CommentsSection({ requestId, currentUser, userProfile }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirestore();
    const commentsRef = collection(db, 'artifacts', 'mural-v1', 'public', 'data', 'prayer_requests', requestId, 'comments');
    const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
      const loadedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedComments.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setComments(loadedComments);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [requestId]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const db = getFirestore();
    try {
      const commentsRef = collection(db, 'artifacts', 'mural-v1', 'public', 'data', 'prayer_requests', requestId, 'comments');
      await addDoc(commentsRef, {
        text: newComment,
        authorName: userProfile?.name || 'Anônimo',
        // Não salvamos a foto aqui por simplicidade, mas poderia ser adicionada
        authorId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      const requestRef = doc(db, 'artifacts', 'mural-v1', 'public', 'data', 'prayer_requests', requestId);
      await updateDoc(requestRef, { commentCount: increment(1) });
      setNewComment('');
    } catch (err) { console.error(err); }
  };

  return (
    <div className="mt-4 bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 transition-colors">
      <div className="max-h-40 overflow-y-auto mb-3 space-y-3 custom-scrollbar">
        {loading && <div className="text-xs text-slate-400 text-center">Carregando...</div>}
        {!loading && comments.length === 0 && <div className="text-xs text-slate-400 text-center py-2">Seja o primeiro a comentar.</div>}
        {comments.map(comment => (
          <div key={comment.id} className="flex flex-col bg-white dark:bg-slate-800 p-2 rounded shadow-sm">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5">{comment.authorName}</span>
            <span className="text-xs text-slate-700 dark:text-slate-300">{comment.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSendComment} className="flex gap-2">
        <input type="text" placeholder="Escreva uma mensagem de apoio..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 text-xs p-2 rounded border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:border-blue-400" />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}