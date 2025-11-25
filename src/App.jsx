import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously,
  signInWithCustomToken
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
  increment,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { 
  Heart, Send, User, ArrowLeft, Sparkles, Plus, BookOpen, Mail, Lock, 
  CheckCircle, LogOut, MessageCircle, X, AlertTriangle, Settings, Save, 
  Calendar, Bell, Moon, Sun, Camera, Users, KeyRound, Search, LogIn, ChevronLeft,
  Filter, Tag, Award, Check, Info, Share2, Copy
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
const appId = "mural-v2"; 

// --- CONSTANTES ---
const DAILY_VERSES = [
  "Tudo posso naquele que me fortalece. (Filipenses 4:13)",
  "O Senhor é o meu pastor; de nada terei falta. (Salmos 23:1)",
  "Entregue o seu caminho ao Senhor; confie nele, e ele o fará. (Salmos 37:5)",
  "Porque sou eu que conheço os planos que tenho para vocês', diz o Senhor. (Jeremias 29:11)",
  "Sejam fortes e corajosos. Não tenham medo, pois o Senhor vai com vocês. (Deuteronômio 31:6)",
  "Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês. (1 Pedro 5:7)",
  "Busquem, pois, em primeiro lugar o Reino de Deus e a sua justiça. (Mateus 6:33)",
  "Alegrem-se sempre no Senhor. Novamente direi: alegrem-se! (Filipenses 4:4)",
  "O Senhor é a minha luz e a minha salvação; de quem terei medo? (Salmos 27:1)",
  "Confie no Senhor de todo o seu coração. (Provérbios 3:5)"
];

const CATEGORIES = ['Geral', 'Saúde', 'Família', 'Financeiro', 'Espiritual', 'Urgente'];

// --- TEMAS ---
const MAIN_COLOR = "#973130"; 

// --- COMPONENTES AUXILIARES GLOBAIS ---

function ToastNotification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  const bgClass = type === 'error' ? 'bg-red-600' : type === 'info' ? 'bg-[#973130]' : 'bg-green-600';
  const icon = type === 'error' ? <AlertTriangle size={18} /> : type === 'info' ? <Info size={18} /> : <Check size={18} />;

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full text-white animate-fade-in-down ${bgClass}`}>
      {icon}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

function UserAvatar({ src, name, size = "md", className = "" }) {
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-xl", xl: "w-24 h-24 text-3xl" };
  if (src) return <img src={src} alt={name} className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 dark:border-slate-600 ${className}`} />;
  return <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 ${className}`}>{name ? name.charAt(0).toUpperCase() : <User size={size === 'sm' ? 14 : 20} />}</div>;
}

// Componente Skeleton Loading (Inovação Fase 1)
function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 animate-pulse h-fit">
      <div className="flex justify-between items-start mb-3 pr-16">
        <div className="flex items-center gap-3 w-full">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex-1">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
          </div>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
      </div>
      <div className="flex justify-between pt-2">
         <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
         <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div>
      </div>
    </div>
  );
}

// --- COMPONENTES ---

export default function PrayerApp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [view, setView] = useState('splash'); 
  const [activeWall, setActiveWall] = useState(null); 
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  
  const [notification, setNotification] = useState({ message: '', type: 'success' });
  const [leaveModal, setLeaveModal] = useState({ isOpen: false });

  const showToast = (msg, type = 'success') => {
    setNotification({ message: msg, type });
  };

  useEffect(() => {
    // Atualiza título da aba
    document.title = "Mural de Oração";

    const link = document.querySelector("link[rel~='icon']");
    if (!link) {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = '/icon.png';
      document.head.appendChild(newLink);
    } else { link.href = '/icon.png'; }

    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    // Removido login automático de teste para evitar erro de token
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'main');
        try {
          const docSnap = await getDoc(profileRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
            setView(v => (v === 'splash' || v === 'login' ? 'wall-list' : v));
          } else {
             const initialData = { 
               name: currentUser.displayName || 'Visitante', 
               email: currentUser.email,
               photoURL: currentUser.photoURL || null,
               joinedWalls: [] 
             };
             await setDoc(profileRef, initialData);
             setUserProfile(initialData);
             setView(v => (v === 'splash' || v === 'login' ? 'wall-list' : v));
          }
        } catch (e) { console.error(e); }
      } else {
        setUserProfile(null);
        setActiveWall(null);
        if (view !== 'splash') setView('login');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { 
      if (!auth.currentUser) setView('login');
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // --- Ações Principais ---

  const handleCreateWall = async (title, password) => {
    if (!user || !title.trim() || !password.trim()) return;
    try {
      const wallRef = await addDoc(collection(db, 'artifacts', appId, 'prayer_walls'), {
        title: title.trim(),
        password: password.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        memberCount: 1
      });
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
      await updateDoc(userRef, { joinedWalls: arrayUnion(wallRef.id) });
      setUserProfile(prev => ({ ...prev, joinedWalls: [...(prev.joinedWalls || []), wallRef.id] }));
      setActiveWall({ id: wallRef.id, title: title.trim(), isOwner: true, createdBy: user.uid, memberCount: 1 });
      setView('wall-detail');
      showToast('Mural criado com sucesso!');
    } catch (error) {
      showToast("Erro ao criar mural. Tente novamente.", 'error');
    }
  };

  const handleJoinWall = async (nameSearch, passwordInput) => {
    if (!nameSearch.trim() || !passwordInput.trim()) return;
    try {
      const q = query(
        collection(db, 'artifacts', appId, 'prayer_walls'), 
        where("title", "==", nameSearch.trim()),
        where("password", "==", passwordInput.trim())
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        showToast("Mural não encontrado ou senha incorreta.", 'error');
        return;
      }
      const wallDoc = querySnapshot.docs[0];
      const wallId = wallDoc.id;
      const wallData = wallDoc.data();

      if (userProfile.joinedWalls?.includes(wallId)) {
        showToast("Você já participa deste mural!", 'info');
        setActiveWall({ id: wallId, ...wallData });
        setView('wall-detail');
        return;
      }
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
      await updateDoc(userRef, { joinedWalls: arrayUnion(wallId) });
      await updateDoc(doc(db, 'artifacts', appId, 'prayer_walls', wallId), { memberCount: increment(1) });
      setUserProfile(prev => ({ ...prev, joinedWalls: [...(prev.joinedWalls || []), wallId] }));
      setActiveWall({ id: wallId, ...wallData, memberCount: (wallData.memberCount || 0) + 1 });
      setView('wall-detail');
      showToast('Bem-vindo ao mural!');
    } catch (error) {
      showToast("Erro ao entrar no mural.", 'error');
    }
  };

  const confirmLeaveWall = async () => {
    if (!activeWall || !user) return;
    const isCreator = activeWall.createdBy === user.uid;
    try {
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
      await updateDoc(userRef, { joinedWalls: arrayRemove(activeWall.id) });
      if (isCreator) {
          await deleteDoc(doc(db, 'artifacts', appId, 'prayer_walls', activeWall.id));
      } else {
          await updateDoc(doc(db, 'artifacts', appId, 'prayer_walls', activeWall.id), { 
            memberCount: increment(-1) 
          });
      }
      setUserProfile(prev => ({ ...prev, joinedWalls: prev.joinedWalls.filter(id => id !== activeWall.id) }));
      setLeaveModal({ isOpen: false });
      setActiveWall(null);
      setView('wall-list');
      showToast(isCreator ? 'Mural excluído.' : 'Você saiu do mural.');
    } catch (error) { console.error(error); showToast("Ocorreu um erro ao tentar sair.", 'error'); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('login');
  };

  const updateName = async (newName) => {
    if (!user) return;
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
    await setDoc(userRef, { name: newName }, { merge: true });
    setUserProfile(prev => ({ ...prev, name: newName }));
    showToast("Nome atualizado!");
  };

  const updatePhoto = async (newPhoto) => {
    if (!user) return;
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
    await setDoc(userRef, { photoURL: newPhoto }, { merge: true });
    setUserProfile(prev => ({ ...prev, photoURL: newPhoto }));
    showToast("Foto atualizada!");
  };

  if (view === 'splash') return <SplashScreen />;
  if (view === 'login') return <LoginScreen onLoginSuccess={() => setView('wall-list')} appId={appId} db={db} auth={auth} showToast={showToast} />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden relative flex flex-col transition-colors duration-300" style={{ fontFamily: "'Roboto', sans-serif" }}>
      {/* Inovação: Tipografia Expressiva importando Merriweather */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Roboto:wght@300;400;500;700&display=swap');
        body { font-family: 'Roboto', sans-serif; }
        .font-serif { font-family: 'Merriweather', serif; }
        
        @keyframes fadeInSimple { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-simple { animation: fadeInSimple 2.5s ease-out forwards; }
        @keyframes fadeInDown { 0% { opacity: 0; transform: translate(-50%, -20px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
        .animate-fade-in-down { animation: fadeInDown 0.3s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Micro-interação: Animação do coração */
        @keyframes heartBurst {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .animate-heart-burst { animation: heartBurst 0.3s ease-in-out; }

        .text-primary { color: #973130; }
        .bg-primary { background-color: #973130; }
        .border-primary { border-color: #973130; }
        .hover-bg-primary-dark:hover { background-color: #7d2827; }
        .hover-text-primary:hover { color: #973130; }
      `}</style>

      {notification.message && (
        <ToastNotification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification({ ...notification, message: '' })} 
        />
      )}

      <Header 
        view={view} 
        setView={setView} 
        activeWall={activeWall} 
        goBack={() => { setActiveWall(null); setView('wall-list'); }}
        onLeaveClick={() => setLeaveModal({ isOpen: true })}
      />

      <main className="flex-1 w-full max-w-md md:max-w-6xl mx-auto relative bg-slate-50 dark:bg-slate-900 md:px-6 transition-colors duration-300 overflow-y-auto">
        {view === 'wall-list' && (
          <WallListScreen 
            userProfile={userProfile} 
            db={db} 
            appId={appId}
            onSelectWall={(wall) => { setActiveWall(wall); setView('wall-detail'); }}
            onCreateNew={() => setView('create-wall')}
            onJoinExisting={() => setView('join-wall')}
            showToast={showToast}
          />
        )}
        {view === 'create-wall' && <CreateWallScreen onSubmit={handleCreateWall} onCancel={() => setView('wall-list')} />}
        {view === 'join-wall' && <JoinWallScreen onSubmit={handleJoinWall} onCancel={() => setView('wall-list')} />}
        
        {view === 'wall-detail' && activeWall && (
          <WallDetailScreen 
            wall={activeWall}
            user={user}
            userProfile={userProfile}
            db={db}
            appId={appId}
            showToast={showToast}
          />
        )}
        {view === 'settings' && <SettingsScreen userProfile={userProfile} onUpdateName={updateName} onUpdatePhoto={updatePhoto} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />}
      </main>

      {leaveModal.isOpen && activeWall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700">
            <div className="flex flex-col items-center text-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${activeWall.createdBy === user.uid ? 'bg-red-100 text-red-600 dark:bg-red-900/40' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/40'}`}>
                {activeWall.createdBy === user.uid ? <AlertTriangle size={24} /> : <LogOut size={24} />}
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white font-serif">{activeWall.createdBy === user.uid ? 'Excluir Grupo?' : 'Sair do Grupo?'}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                {activeWall.createdBy === user.uid 
                  ? "Você é o criador. Se sair, este mural e todos os pedidos serão excluídos permanentemente para todos." 
                  : `Deseja realmente sair do mural "${activeWall.title}"? Ele será removido da sua lista.`}
              </p>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setLeaveModal({ isOpen: false })} className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                <button onClick={confirmLeaveWall} className={`flex-1 py-3 px-4 text-white font-semibold rounded-xl transition-colors ${activeWall.createdBy === user.uid ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>{activeWall.createdBy === user.uid ? 'Excluir' : 'Sair'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTES SECUNDÁRIOS ---

function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 flex flex-col items-center justify-center z-50 transition-colors duration-300">
      <div className="animate-fade-simple flex flex-col items-center">
        <img src="/icon.png" alt="Logo" className="w-40 h-40 object-contain mb-6" />
      </div>
    </div>
  );
}

function Header({ view, setView, activeWall, goBack, onLeaveClick }) {
  const getTitle = () => {
    if (activeWall) return activeWall.title;
    if (view === 'wall-list') return 'Mural de Oração';
    if (view === 'create-wall') return 'Criar Mural';
    if (view === 'join-wall') return 'Entrar em Mural';
    if (view === 'settings') return 'Configurações';
    return 'Mural de Oração';
  }

  return (
    <div className="bg-[#973130] p-4 sticky top-0 z-20 flex items-center justify-between text-white h-16 transition-colors duration-300">
      <div className="w-12 flex justify-start">
        {activeWall ? (
          <button onClick={goBack} className="p-2 -ml-2 text-white hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
        ) : view !== 'wall-list' && view !== 'splash' && view !== 'login' ? (
          <button onClick={() => setView('wall-list')} className="p-2 -ml-2 text-white hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>
        ) : null}
      </div>

      <div className="flex-1 flex justify-center items-center gap-2 overflow-hidden">
        {!activeWall && (
          <img src="/icon.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
        )}
        
        <div className="flex flex-col items-center justify-center truncate w-full">
          <h1 className={`font-bold tracking-wide truncate leading-tight text-center w-full font-serif ${activeWall ? 'text-lg' : 'text-xl'}`}>
            {getTitle()}
          </h1>
          {activeWall && (
            <span className="text-[10px] opacity-90 flex items-center justify-center gap-1 leading-none w-full">
              <Users size={10} /> {activeWall.memberCount || 1} membros
            </span>
          )}
        </div>
      </div>

      <div className="w-12 flex justify-end">
        {activeWall ? (
          <button onClick={onLeaveClick} className="p-2 text-white/90 hover:text-red-200 hover:bg-white/20 rounded-full transition-colors" title="Sair do Grupo"><LogOut size={20} /></button>
        ) : view === 'wall-list' ? (
          <button onClick={() => setView('settings')} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Configurações"><Settings size={22} /></button>
        ) : null}
      </div>
    </div>
  );
}

function LoginScreen({ onLoginSuccess, appId, db, auth, showToast }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const saveUserProfile = async (uid, data) => {
    const profileRef = doc(db, 'artifacts', appId, 'users', uid, 'profile', 'main');
    await setDoc(profileRef, data, { merge: true });
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    if (isRegister && !name) return;
    setLoading(true);
    try {
      let userCredential;
      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserProfile(userCredential.user.uid, { name: name.trim(), email, joinedWalls: [] });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess();
    } catch (error) { 
      console.error(error);
      if (error.code === 'auth/unauthorized-domain') {
        showToast("Domínio não autorizado! Configure no Firebase Console.", 'error');
      } else if (error.code === 'auth/invalid-credential') {
        showToast("E-mail ou senha incorretos.", 'error');
      } else if (error.code === 'auth/email-already-in-use') {
        showToast("E-mail já cadastrado.", 'error');
      } else {
        showToast("Erro ao entrar: " + error.code, 'error');
      }
      setLoading(false); 
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      if (result.user) {
          await saveUserProfile(result.user.uid, { 
              name: result.user.displayName, 
              email: result.user.email, 
              photoURL: result.user.photoURL 
          });
          onLoginSuccess();
      }
    } catch (error) { 
      console.error(error); 
      if (error.code === 'auth/popup-closed-by-user') {
          showToast("Login cancelado.", 'info');
      } else {
          showToast("Erro ao conectar com Google", 'error');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-8 duration-700 transition-colors duration-300">
      <div className="w-full max-w-xs flex flex-col gap-6">
        <div className="text-center mb-2">
            <div className="flex justify-center mb-6">
                <img src="/icon.png" alt="Logo" className="w-24 h-24 object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white font-serif">{isRegister ? 'Criar Conta' : 'Bem-vindo'}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Entre para conectar-se aos seus murais.</p>
        </div>
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          {isRegister && <input type="text" required placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" />}
          <input type="email" required placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" />
          <input type="password" required placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" />
          <button type="submit" disabled={loading} className="w-full bg-[#973130] hover:bg-[#7d2827] text-white p-4 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-70">{loading ? '...' : (isRegister ? 'Cadastrar' : 'Entrar')}</button>
        </form>
        <div className="flex items-center gap-4"><div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div><span className="text-xs text-slate-400 font-bold uppercase">Ou</span><div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div></div>
        <button type="button" onClick={handleGoogleLogin} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 p-4 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-3">
          <svg className="w-5 h-5 min-w-[20px]" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Google
        </button>
        <div className="text-center"><button onClick={() => setIsRegister(!isRegister)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#973130] transition-colors font-medium">{isRegister ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}</button></div>
      </div>
    </div>
  );
}

function WallListScreen({ userProfile, db, appId, onSelectWall, onCreateNew, onJoinExisting, showToast }) {
  const [myWalls, setMyWalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verse] = useState(() => DAILY_VERSES[Math.floor(Math.random() * DAILY_VERSES.length)]);

  useEffect(() => {
    const fetchWalls = async () => {
      if (!userProfile?.joinedWalls || userProfile.joinedWalls.length === 0) {
        setMyWalls([]);
        setLoading(false);
        return;
      }
      try {
        const wallsData = await Promise.all(
          userProfile.joinedWalls.map(async (wallId) => {
            const snap = await getDoc(doc(db, 'artifacts', appId, 'prayer_walls', wallId));
            if (snap.exists()) return { id: snap.id, ...snap.data() };
            return null;
          })
        );
        setMyWalls(wallsData.filter(w => w !== null));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchWalls();
  }, [userProfile?.joinedWalls]);

  return (
    <div className="p-6 max-w-2xl mx-auto pt-8 animate-in fade-in">
      <div className="text-center mb-8">
        <UserAvatar src={userProfile?.photoURL} name={userProfile?.name} size="xl" className="mb-4 mx-auto border-4 border-white dark:border-slate-800" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 font-serif">Olá, {userProfile?.name?.split(' ')[0]}</h2>
        <div className="bg-[#973130]/10 dark:bg-[#973130]/20 p-4 rounded-xl inline-block max-w-md border border-[#973130]/20 dark:border-[#973130]/30">
            <p className="text-[#973130] dark:text-[#bc5c5b] text-sm italic font-medium font-serif">"{verse}"</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button onClick={onCreateNew} className="bg-[#973130]/10 dark:bg-[#973130]/20 border border-[#973130]/20 dark:border-[#973130]/30 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-[#973130]/20 dark:hover:bg-[#973130]/40 transition-colors"><div className="bg-[#973130] text-white p-2 rounded-full"><Plus size={20} /></div><span className="text-sm font-bold text-[#973130] dark:text-[#bc5c5b]">Criar Mural</span></button>
        <button onClick={onJoinExisting} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"><div className="bg-purple-500 text-white p-2 rounded-full"><Search size={20} /></div><span className="text-sm font-bold text-purple-700 dark:text-purple-300">Entrar em Mural</span></button>
      </div>

      <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 font-serif"><BookOpen size={20} /> Meus Murais</h3>
      {loading ? (<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#973130]"></div></div>) : myWalls.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700"><Users size={40} className="mx-auto mb-2 opacity-50" /><p>Você ainda não participa de nenhum mural.</p><p className="text-xs mt-1">Crie um novo ou entre em um existente acima.</p></div>
      ) : (
        <div className="space-y-3">{myWalls.map(wall => (<button key={wall.id} onClick={() => onSelectWall(wall)} className="w-full bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-[#973130]/10 dark:bg-[#973130]/30 text-[#973130] dark:text-[#bc5c5b] flex items-center justify-center font-bold text-lg font-serif">{wall.title.charAt(0).toUpperCase()}</div><div><h4 className="font-bold text-slate-800 dark:text-white text-lg group-hover:text-[#973130] dark:group-hover:text-[#bc5c5b] transition-colors font-serif">{wall.title}</h4><p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Users size={12} /> {wall.memberCount || 1} intercessores</p></div></div><div className="text-slate-300 group-hover:translate-x-1 transition-transform"><ArrowLeft size={20} className="rotate-180" /></div></button>))}</div>
      )}
    </div>
  );
}

function CreateWallScreen({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); await onSubmit(title, password); setLoading(false); };
  return (
    <div className="p-6 max-w-md mx-auto pt-10 animate-in fade-in slide-in-from-bottom-4"><h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center font-serif">Novo Mural</h2><p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8">Crie um espaço seguro para seu grupo.</p><form onSubmit={handleSubmit} className="flex flex-col gap-6"><div className="space-y-2"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome do Mural</label><div className="relative"><Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input required type="text" placeholder="Ex: Família Silva..." value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#973130] dark:text-white" /></div></div><div className="space-y-2"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Senha de Acesso</label><div className="relative"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input required type="text" placeholder="Defina uma senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#973130] dark:text-white" /></div><p className="text-xs text-slate-400">Compartilhe esta senha apenas com quem deve entrar.</p></div><div className="flex gap-3 mt-4"><button type="button" onClick={onCancel} className="flex-1 p-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">Cancelar</button><button type="submit" disabled={loading} className="flex-1 bg-[#973130] hover:bg-[#7d2827] text-white p-4 rounded-xl font-bold transition-colors dark:shadow-none">{loading ? 'Criando...' : 'Criar Mural'}</button></div></form></div>
  );
}

function JoinWallScreen({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); await onSubmit(name, password); setLoading(false); };
  return (
    <div className="p-6 max-w-md mx-auto pt-10 animate-in fade-in slide-in-from-bottom-4"><h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center font-serif">Entrar em Mural</h2><p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8">Digite os dados fornecidos pelo criador.</p><form onSubmit={handleSubmit} className="flex flex-col gap-6"><div className="space-y-2"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome Exato do Mural</label><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input required type="text" placeholder="Digite o nome exato..." value={name} onChange={e => setName(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 dark:text-white" /></div></div><div className="space-y-2"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Senha do Mural</label><div className="relative"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input required type="text" placeholder="Digite a senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 dark:text-white" /></div></div><div className="flex gap-3 mt-4"><button type="button" onClick={onCancel} className="flex-1 p-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">Cancelar</button><button type="submit" disabled={loading} className="flex-1 bg-purple-600 text-white p-4 rounded-xl font-bold hover:bg-purple-700 transition-colors dark:shadow-none">{loading ? 'Buscando...' : 'Entrar'}</button></div></form></div>
  );
}

function WallDetailScreen({ wall, user, userProfile, db, appId, showToast }) {
  const [mode, setMode] = useState('read'); 
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, requestId: null });
  const [markAnsweredModal, setMarkAnsweredModal] = useState({ isOpen: false, requestId: null });
  const [filterTag, setFilterTag] = useState(null);
  const [showTestimonials, setShowTestimonials] = useState(false);

  const isWallAdmin = wall.createdBy === user?.uid;

  useEffect(() => {
    const requestsRef = collection(db, 'artifacts', appId, 'prayer_walls', wall.id, 'requests');
    const unsubscribe = onSnapshot(requestsRef, (snapshot) => {
      const loadedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedRequests.sort((a, b) => {
        const aPrayed = a.prayedBy?.includes(user.uid) || false;
        const bPrayed = b.prayedBy?.includes(user.uid) || false;
        if (aPrayed && !bPrayed) return -1;
        if (!aPrayed && bPrayed) return 1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      setRequests(loadedRequests);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [wall.id, user.uid]);

  const handleCreate = async (content, isAnonymous, category) => {
    if (!content.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'prayer_walls', wall.id, 'requests'), {
        authorName: userProfile?.name || 'Desconhecido',
        authorPhoto: userProfile?.photoURL || null,
        authorId: user.uid,
        isAnonymous,
        content,
        category: category || 'Geral',
        createdAt: serverTimestamp(),
        prayedBy: [],
        commentCount: 0,
        isAnswered: false
      });
      setMode('read');
      showToast('Pedido enviado!');
    } catch (error) { showToast("Erro ao enviar.", 'error'); }
  };

  const handlePray = async (requestId, isPraying) => {
    const docRef = doc(db, 'artifacts', appId, 'prayer_walls', wall.id, 'requests', requestId);
    await updateDoc(docRef, { prayedBy: isPraying ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const confirmMarkAnswered = async () => {
    if (!markAnsweredModal.requestId) return;
    const docRef = doc(db, 'artifacts', appId, 'prayer_walls', wall.id, 'requests', markAnsweredModal.requestId);
    await updateDoc(docRef, { isAnswered: true });
    setMarkAnsweredModal({ isOpen: false, requestId: null });
    showToast('Graça alcançada registrada! 🎉');
  };

  const confirmDelete = async () => {
    if (!deleteModal.requestId) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'prayer_walls', wall.id, 'requests', deleteModal.requestId));
    setDeleteModal({ isOpen: false, requestId: null });
    showToast('Pedido excluído.');
  };

  const filteredRequests = requests.filter(req => {
    if (showTestimonials) return req.isAnswered;
    if (req.isAnswered) return false; 
    if (filterTag && req.category !== filterTag) return false;
    return true;
  });

  return (
    <div className="pb-20 pt-4 relative h-full">
      
      <div className="mb-4 flex flex-col gap-2">
        <div className="px-4">
          <div className="flex gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm">
            <button onClick={() => setShowTestimonials(false)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!showTestimonials ? 'bg-[#973130] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-400'}`}>Mural</button>
            <button onClick={() => setShowTestimonials(true)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${showTestimonials ? 'bg-yellow-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-400'}`}><Award size={16} /> Testemunhos</button>
          </div>
        </div>
        
        {!showTestimonials && (
          <div className="-mx-6 px-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar w-[calc(100%+48px)]">
             <div className="w-4 flex-shrink-0"></div>
             {CATEGORIES.map(tag => (
               <button 
                key={tag} 
                onClick={() => setFilterTag(filterTag === tag ? null : tag)} 
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border flex-shrink-0 ${filterTag === tag ? 'bg-[#973130]/10 text-[#973130] border-[#973130]/30 dark:bg-[#973130]/20 dark:text-[#bc5c5b] dark:border-[#973130]/40' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
               >
                 {tag}
               </button>
             ))}
             <div className="w-4 flex-shrink-0"></div>
          </div>
        )}
      </div>

      <div className="px-4">
        {mode === 'write' ? (
          <WriteScreen onSubmit={handleCreate} userProfile={userProfile} onBack={() => setMode('read')} />
        ) : (
          <ReadScreen 
            requests={filteredRequests} 
            loading={loading} 
            currentUser={user} 
            userProfile={userProfile} 
            onPray={handlePray} 
            onDeleteClick={(id) => setDeleteModal({ isOpen: true, requestId: id })} 
            onMarkAnswered={(id) => setMarkAnsweredModal({ isOpen: true, requestId: id })}
            wallId={wall.id} 
            appId={appId} 
            db={db}
            isWallAdmin={isWallAdmin}
            isTestimonialMode={showTestimonials}
            showToast={showToast}
          />
        )}
      </div>

      {mode === 'read' && !showTestimonials && (
        <button onClick={() => setMode('write')} className="fixed bottom-6 right-6 w-14 h-14 bg-[#973130] hover:bg-[#7d2827] text-white rounded-full shadow-lg shadow-[#973130]/30 dark:shadow-none flex items-center justify-center active:scale-95 transition-all z-30"><Plus size={28} /></button>
      )}

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 font-serif">Excluir Pedido?</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setDeleteModal({ isOpen: false, requestId: null })} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {markAnsweredModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl border-2 border-yellow-100 dark:border-yellow-900/50">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center text-yellow-600 mx-auto mb-4">
                <Award size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 font-serif">Graça Alcançada?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Deseja marcar este pedido como respondido? Ele será movido para a aba de <b>Testemunhos</b>.
            </p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setMarkAnsweredModal({ isOpen: false, requestId: null })} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">Cancelar</button>
              <button onClick={confirmMarkAnswered} className="flex-1 py-2 bg-yellow-500 text-white font-bold rounded-lg dark:shadow-none">Sim, Amém!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadScreen({ requests, loading, onPray, onDeleteClick, onMarkAnswered, currentUser, userProfile, wallId, appId, db, isWallAdmin, isTestimonialMode, showToast }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  
  if (requests.length === 0) return <div className="text-center p-10 text-slate-400">{isTestimonialMode ? "Ainda não há testemunhos. Continue orando!" : "Não há pedidos com esse filtro."}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 animate-in fade-in duration-500">
      {requests.map((req) => (
        <PrayerCard 
          key={req.id} 
          request={req} 
          currentUser={currentUser} 
          userProfile={userProfile} 
          onPray={onPray} 
          onDeleteClick={onDeleteClick}
          onMarkAnswered={onMarkAnswered}
          wallId={wallId} 
          appId={appId} 
          db={db}
          isWallAdmin={isWallAdmin}
          isTestimonial={isTestimonialMode}
          showToast={showToast}
        />
      ))}
    </div>
  );
}

function PrayerCard({ request, currentUser, userProfile, onPray, onDeleteClick, onMarkAnswered, wallId, appId, db, isWallAdmin, isTestimonial, showToast }) {
  const prayedBy = request.prayedBy || [];
  const isPraying = prayedBy.includes(currentUser?.uid);
  const isAuthor = request.authorId === currentUser?.uid;
  const [showComments, setShowComments] = useState(false);
  const displayName = request.isAnonymous ? "Anônimo" : request.authorName;
  const displayPhoto = request.isAnonymous ? null : request.authorPhoto;
  const commentCount = request.commentCount || 0;
  const canDelete = isAuthor || isWallAdmin;

  // Inovação Fase 1: Compartilhamento Nativo
  const handleShare = async () => {
    const shareData = {
      title: 'Mural de Oração',
      text: `Peço oração: "${request.content.substring(0, 100)}${request.content.length > 100 ? '...' : ''}" - Mural de Oração`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      showToast("Link copiado para a área de transferência!", "info");
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border transition-all hover:shadow-md relative group h-fit ${isTestimonial ? 'border-yellow-400 dark:border-yellow-600 ring-1 ring-yellow-100 dark:ring-yellow-900' : 'border-slate-100 dark:border-slate-700'}`}>
      <div className="absolute top-3 right-3 flex gap-1">
        {/* Inovação Fase 1: Botão Compartilhar */}
        <button onClick={handleShare} className="p-1.5 text-slate-300 hover:text-[#973130] transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-700" title="Compartilhar">
            <Share2 size={16} />
        </button>
        
        {canDelete && (<button onClick={() => onDeleteClick(request.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-700"><X size={16} /></button>)}
        
        {isAuthor && !isTestimonial && (
           <button onClick={() => onMarkAnswered(request.id)} className="p-1.5 text-slate-300 hover:text-yellow-500 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-700" title="Marcar como Graça Alcançada"><Award size={16} /></button>
        )}
      </div>

      <div className="flex justify-between items-start mb-3 pr-20">
        <div className="flex items-center gap-3">
          <UserAvatar src={displayPhoto} name={displayName} size="md" className={isAuthor ? "ring-2 ring-[#973130]/20 dark:ring-[#973130]/40" : ""} />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">{displayName}</h3>
            <div className="flex items-center gap-2">
               <p className="text-xs text-slate-400 flex items-center gap-1">{request.createdAt && request.createdAt.seconds ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : 'Agora'}</p>
               {request.category && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">{request.category}</span>}
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap pl-1 font-serif">
        {isTestimonial && <span className="block font-bold text-yellow-600 dark:text-yellow-500 mb-1 text-xs uppercase tracking-wide font-sans">✨ Graça Alcançada</span>}
        {request.content}
      </p>
      
      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700">
        <button onClick={() => setShowComments(!showComments)} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium hover:text-[#973130] dark:hover:text-[#bc5c5b] transition-colors group">
          <MessageCircle size={16} /> Comentários {commentCount > 0 && <span className="bg-[#973130] text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold ml-1">{commentCount}</span>}
        </button>
        
        {!isTestimonial ? (
            // Inovação Fase 1: Micro-interação Animada no botão de orar
            <button onClick={() => onPray(request.id, isPraying)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 border active:scale-95 ${isPraying ? 'bg-[#973130] text-white border-[#973130]' : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-red-200 dark:hover:border-red-900 hover:text-red-500'}`}>
            {isPraying ? (
                <>Orando <Heart size={14} className="fill-white text-white animate-heart-burst" /></>
            ) : (
                <>Eu Oro <Heart size={14} className="group-hover:text-red-500 transition-colors" /></>
            )}
            <span className={`ml-1 font-normal ${isPraying ? 'opacity-100' : 'opacity-80'}`}>| {prayedBy.length}</span>
            </button>
        ) : (
            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-500 flex items-center gap-1"><Award size={14}/> Testemunho</span>
        )}
      </div>
      {showComments && <CommentsSection requestId={request.id} currentUser={currentUser} userProfile={userProfile} wallId={wallId} appId={appId} db={db} />}
    </div>
  );
}

function WriteScreen({ onSubmit, userProfile, onBack }) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Geral');
  const [isAnonymous, setIsAnonymous] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    await onSubmit(content, isAnonymous, category);
    if (isMounted.current) {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 -ml-2 mr-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white font-serif">Novo Pedido</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="-mx-6 px-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar w-[calc(100%+48px)]">
            <div className="w-4 flex-shrink-0"></div>
            {CATEGORIES.map(cat => (
                <button type="button" key={cat} onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-bold transition-all border flex-shrink-0 ${category === cat ? 'bg-[#973130] text-white border-[#973130]' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>{cat}</button>
            ))}
            <div className="w-4 flex-shrink-0"></div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm transition-colors">
          <div className="flex items-center gap-3">
             <div className={`p-1 rounded-full ${isAnonymous ? 'bg-slate-100 dark:bg-slate-700' : 'bg-[#973130]/10 dark:bg-slate-700'}`}>{isAnonymous ? (<User size={20} className="text-slate-500 dark:text-slate-400 m-2" />) : (<UserAvatar src={userProfile?.photoURL} name={userProfile?.name} size="md" />)}</div>
             <div className="flex flex-col"><span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Publicar como</span><span className="font-medium text-slate-700 dark:text-white">{isAnonymous ? 'Anônimo' : (userProfile?.name || 'Você')}</span></div>
          </div>
          <button type="button" onClick={() => setIsAnonymous(!isAnonymous)} className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${isAnonymous ? 'bg-slate-300 dark:bg-slate-600' : 'bg-[#973130]'}`}>
            <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${isAnonymous ? 'translate-x-0' : 'translate-x-5'}`}></div>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2"><Sparkles size={16} /> Seu Pedido de Oração</label>
          <textarea required rows={6} placeholder="Descreva seu pedido com detalhes..." value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-lg outline-none focus:ring-2 focus:ring-[#973130]/30 dark:focus:ring-[#973130]/50 transition-all resize-none text-slate-700 dark:text-white border border-transparent dark:border-slate-700 font-serif" />
        </div>
        <button disabled={isSubmitting} type="submit" className="bg-[#973130] hover:bg-[#7d2827] text-white p-4 rounded-xl font-bold shadow-lg shadow-[#973130]/30 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70">{isSubmitting ? 'Enviando...' : (<><Send size={20} /> Enviar Pedido</>)}</button>
      </form>
    </div>
  );
}

function CommentsSection({ requestId, currentUser, userProfile, wallId, appId, db }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const commentsRef = collection(db, 'artifacts', appId, 'prayer_walls', wallId, 'requests', requestId, 'comments');
    const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
      const loadedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedComments.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setComments(loadedComments);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [requestId, wallId]);
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const commentsRef = collection(db, 'artifacts', appId, 'prayer_walls', wallId, 'requests', requestId, 'comments');
      await addDoc(commentsRef, { text: newComment, authorName: userProfile?.name || 'Anônimo', authorId: currentUser.uid, createdAt: serverTimestamp() });
      const requestRef = doc(db, 'artifacts', appId, 'prayer_walls', wallId, 'requests', requestId);
      await updateDoc(requestRef, { commentCount: increment(1) });
      setNewComment('');
    } catch (err) { console.error(err); }
  };
  return (
    <div className="mt-4 bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 transition-colors"><div className="max-h-40 overflow-y-auto mb-3 space-y-3 custom-scrollbar">{loading && <div className="text-xs text-slate-400 text-center">Carregando...</div>}{!loading && comments.length === 0 && <div className="text-xs text-slate-400 text-center py-2">Seja o primeiro a comentar.</div>}{comments.map(comment => (<div key={comment.id} className="flex flex-col bg-white dark:bg-slate-800 p-2 rounded shadow-sm"><span className="text-[10px] font-bold text-[#973130] dark:text-[#bc5c5b] mb-0.5">{comment.authorName}</span><span className="text-xs text-slate-700 dark:text-slate-300">{comment.text}</span></div>))}</div><form onSubmit={handleSendComment} className="flex gap-2"><input type="text" placeholder="Escreva uma mensagem de apoio..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 text-xs p-2 rounded border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:border-[#973130]" /><button type="submit" className="bg-[#973130] text-white p-2 rounded hover:bg-[#7d2827] transition-colors"><Send size={14} /></button></form></div>
  );
}

function SettingsScreen({ userProfile, onUpdateName, onUpdatePhoto, onLogout, theme, toggleTheme }) {
  const [name, setName] = useState(userProfile?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);
  const handleSave = () => { onUpdateName(name); setIsEditing(false); };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200; const scaleSize = MAX_WIDTH / img.width; canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          onUpdatePhoto(canvas.toDataURL('image/jpeg', 0.7)); 
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
    <div className="p-6 max-w-xl mx-auto animate-in fade-in"><div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-6 transition-colors"><div className="bg-slate-50 dark:bg-slate-700 p-4 border-b border-slate-100 dark:border-slate-600 flex items-center gap-3"><Sun className="text-yellow-500" size={20} /><h3 className="font-bold text-slate-700 dark:text-white font-serif">Aparência</h3></div><div className="p-6 flex items-center justify-between"><span className="text-slate-600 dark:text-slate-300 font-medium">Modo Escuro</span><button onClick={toggleTheme} className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-[#973130]' : 'bg-slate-300'}`}><div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}>{theme === 'dark' ? <Moon size={14} className="text-[#973130]" /> : <Sun size={14} className="text-yellow-500" />}</div></button></div></div><div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-6 transition-colors"><div className="bg-slate-50 dark:bg-slate-700 p-4 border-b border-slate-100 dark:border-slate-600 flex items-center gap-3"><User className="text-[#973130]" size={20} /><h3 className="font-bold text-slate-700 dark:text-white font-serif">Perfil</h3></div><div className="p-6 flex flex-col gap-6"><div className="flex items-center gap-4"><div className="relative"><UserAvatar src={userProfile?.photoURL} name={userProfile?.name} size="lg" /><button onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-[#973130] text-white p-1.5 rounded-full shadow-md hover:bg-[#7d2827] transition-colors"><Camera size={14} /></button><input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" /></div><div className="flex-1"><p className="text-sm font-bold text-slate-700 dark:text-white">Sua Foto</p><p className="text-xs text-slate-400">Toque na câmera para alterar.</p></div></div><div><label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nome de Exibição</label><div className="flex gap-2 mt-2"><input type="text" value={name} disabled={!isEditing} onChange={(e) => setName(e.target.value)} className={`flex-1 p-3 rounded-xl border outline-none transition-all ${isEditing ? 'bg-white dark:bg-slate-700 border-[#973130] ring-2 ring-[#973130]/20 dark:text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`} />{isEditing ? <button onClick={handleSave} className="bg-[#973130] text-white p-3 rounded-xl"><Save size={20} /></button> : <button onClick={() => setIsEditing(true)} className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 p-3 rounded-xl"><Settings size={20} /></button>}</div></div></div></div><div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-6 transition-colors"><div className="bg-slate-50 dark:bg-slate-700 p-4 border-b border-slate-100 dark:border-slate-600 flex items-center gap-3"><Bell className="text-orange-500" size={20} /><h3 className="font-bold text-slate-700 dark:text-white font-serif">Lembrete Diário</h3></div><div className="p-6"><p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">Para manter o hábito da oração, adicione um lembrete recorrente na sua agenda pessoal.</p><button onClick={handleAddToCalendar} className="w-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 p-4 rounded-xl font-bold hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors flex items-center justify-center gap-2"><Calendar size={20} />Adicionar à minha Agenda</button></div></div><button onClick={onLogout} className="w-full bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900 text-red-500 p-4 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 shadow-sm"><LogOut size={20} /> Sair da Conta</button><div className="text-center mt-8 text-xs text-slate-300 dark:text-slate-600">Versão 6.6 Final</div></div>
  );
}