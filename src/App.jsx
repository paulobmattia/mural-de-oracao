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
  increment,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { 
  Heart, Send, User, ArrowLeft, Sparkles, Plus, BookOpen, Mail, Lock, 
  CheckCircle, LogOut, MessageCircle, X, AlertTriangle, Settings, Save, 
  Calendar, Bell, Moon, Sun, Camera, Users, KeyRound, Search
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

// --- Componente Principal ---
export default function PrayerApp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [view, setView] = useState('splash'); 
  const [activeWall, setActiveWall] = useState(null); 
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
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
  }, [view]);

  useEffect(() => {
    const timer = setTimeout(() => { if (!user) setView('login'); }, 3500);
    return () => clearTimeout(timer);
  }, [user]);

  // --- Lógica de Murais ---

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
      setActiveWall({ id: wallRef.id, title: title.trim(), isOwner: true });
      setView('wall-detail');
    } catch (error) {
      alert("Erro ao criar mural. Verifique se as Regras do Firebase foram atualizadas.");
      console.error(error);
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
        alert("Mural não encontrado ou senha incorreta.");
        return;
      }

      const wallDoc = querySnapshot.docs[0];
      const wallId = wallDoc.id;

      if (userProfile.joinedWalls?.includes(wallId)) {
        alert("Você já participa deste mural!");
        setActiveWall({ id: wallId, ...wallDoc.data() });
        setView('wall-detail');
        return;
      }

      const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
      await updateDoc(userRef, { joinedWalls: arrayUnion(wallId) });
      
      await updateDoc(doc(db, 'artifacts', appId, 'prayer_walls', wallId), {
        memberCount: increment(1)
      });

      setUserProfile(prev => ({ ...prev, joinedWalls: [...(prev.joinedWalls || []), wallId] }));
      setActiveWall({ id: wallId, ...wallDoc.data() });
      setView('wall-detail');

    } catch (error) {
      alert("Erro ao entrar no mural.");
      console.error(error);
    }
  };

  const handleLeaveWall = async () => {
    if (!activeWall || !user) return;
    if (!confirm(`Deseja sair do mural "${activeWall.title}"? Ele sumirá da sua lista.`)) return;

    try {
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
      await updateDoc(userRef, { joinedWalls: arrayRemove(activeWall.id) });
      
      setUserProfile(prev => ({ 
        ...prev, 
        joinedWalls: prev.joinedWalls.filter(id => id !== activeWall.id) 
      }));
      
      setActiveWall(null);
      setView('wall-list');
    } catch (error) { console.error(error); }
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
  };

  const updatePhoto = async (newPhoto) => {
    if (!user) return;
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
    await setDoc(userRef, { photoURL: newPhoto }, { merge: true });
    setUserProfile(prev => ({ ...prev, photoURL: newPhoto }));
  };

  if (view === 'splash') return <SplashScreen />;
  if (view === 'login') return <LoginScreen onLoginSuccess={() => setView('wall-list')} appId={appId} db={db} auth={auth} />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden relative flex flex-col transition-colors duration-300" style={{ fontFamily: "'Roboto', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        body { font-family: 'Roboto', sans-serif; }
        @keyframes fadeInSimple { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-simple { animation: fadeInSimple 2.5s ease-out forwards; }
      `}</style>

      <Header 
        view={view} 
        setView={setView} 
        activeWall={activeWall} 
        goBack={() => { setActiveWall(null); setView('wall-list'); }}
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
          />
        )}
        {view === 'create-wall' && (
          <CreateWallScreen onSubmit={handleCreateWall} onCancel={() => setView('wall-list')} />
        )}
        {view === 'join-wall' && (
          <JoinWallScreen onSubmit={handleJoinWall} onCancel={() => setView('wall-list')} />
        )}
        {view === 'wall-detail' && activeWall && (
          <WallDetailScreen 
            wall={activeWall}
            user={user}
            userProfile={userProfile}
            db={db}
            appId={appId}
            onLeaveWall={handleLeaveWall}
          />
        )}
        {view === 'settings' && (
          <SettingsScreen 
            userProfile={userProfile} 
            onUpdateName={updateName} 
            onUpdatePhoto={updatePhoto}
            onLogout={handleLogout}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}
      </main>
    </div>
  );
}

// --- TELAS DO SISTEMA DE MURAIS ---

function WallListScreen({ userProfile, db, appId, onSelectWall, onCreateNew, onJoinExisting }) {
  const [myWalls, setMyWalls] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <UserAvatar src={userProfile?.photoURL} name={userProfile?.name} size="xl" className="mb-4 mx-auto shadow-lg border-4 border-white dark:border-slate-800" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Olá, {userProfile?.name?.split(' ')[0]}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Onde você deseja interceder hoje?</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button onClick={onCreateNew} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
          <div className="bg-blue-500 text-white p-2 rounded-full"><Plus size={20} /></div>
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Criar Mural</span>
        </button>
        <button onClick={onJoinExisting} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
          <div className="bg-purple-500 text-white p-2 rounded-full"><Search size={20} /></div>
          <span className="text-sm font-bold text-purple-700 dark:text-purple-300">Entrar em Mural</span>
        </button>
      </div>

      <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
        <BookOpen size={20} /> Meus Murais
      </h3>

      {loading ? (
        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : myWalls.length === 0 ? (
        <div className="text-center p-8 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700">
          <Users size={40} className="mx-auto mb-2 opacity-50" />
          <p>Você ainda não participa de nenhum mural.</p>
          <p className="text-xs mt-1">Crie um novo ou entre em um existente acima.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myWalls.map(wall => (
            <button key={wall.id} onClick={() => onSelectWall(wall)} className="w-full bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between hover:shadow-md transition-all text-left group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                  {wall.title.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{wall.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Users size={12} /> {wall.memberCount || 1} intercessores</p>
                </div>
              </div>
              <div className="text-slate-300 group-hover:translate-x-1 transition-transform"><ArrowLeft size={20} className="rotate-180" /></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateWallScreen({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(title, password);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto pt-10 animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">Novo Mural</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8">Crie um espaço seguro para seu grupo.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome do Mural</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input required type="text" placeholder="Ex: Família Silva..." value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Senha de Acesso</label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input required type="text" placeholder="Defina uma senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 dark:text-white" />
          </div>
          <p className="text-xs text-slate-400">Compartilhe esta senha apenas com quem deve entrar.</p>
        </div>
        <div className="flex gap-3 mt-4">
          <button type="button" onClick={onCancel} className="flex-1 p-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">Cancelar</button>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none">{loading ? 'Criando...' : 'Criar Mural'}</button>
        </div>
      </form>
    </div>
  );
}

function JoinWallScreen({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(name, password);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto pt-10 animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">Entrar em Mural</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8">Digite os dados fornecidos pelo criador.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome Exato do Mural</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input required type="text" placeholder="Digite o nome exato..." value={name} onChange={e => setName(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 dark:text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Senha do Mural</label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input required type="text" placeholder="Digite a senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 dark:text-white" />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button type="button" onClick={onCancel} className="flex-1 p-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors">Cancelar</button>
          <button type="submit" disabled={loading} className="flex-1 bg-purple-600 text-white p-4 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 dark:shadow-none">{loading ? 'Buscando...' : 'Entrar'}</button>
        </div>
      </form>
    </div>
  );
}

function WallDetailScreen({ wall, user, userProfile, db, appId, onLeaveWall }) {
  const [mode, setMode] = useState('read'); // read, write
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, requestId: null });

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
  }, [wall.id]);

  const handleCreate = async (content, isAnonymous) => {
    if (!content.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'prayer_walls', wall.id, 'requests'), {
        authorName: userProfile?.name || 'Desconhecido',
        authorPhoto: userProfile?.photoURL || null,
        authorId: user.uid,
        isAnonymous,
        content,
        createdAt: serverTimestamp(),
        prayedBy: [],
        commentCount: 0
      });
      setMode('read');
    } catch (error) { alert("Erro ao enviar."); }
  };

  const handlePray = async (requestId, isPraying) => {
    const docRef = doc(db, 'artifacts', appId, 'prayer_walls', wall.id, 'requests', requestId);
    await updateDoc(docRef, { prayedBy: isPraying ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const confirmDelete = async () => {
    if (!deleteModal.requestId) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'prayer_walls', wall.id, 'requests', deleteModal.requestId));
    setDeleteModal({ isOpen: false, requestId: null });
  };

  return (
    <div className="pb-20">
      <div className="bg-white dark:bg-slate-800 p-4 sticky top-[64px] z-10 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
            {wall.title.charAt(0)}
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white leading-tight">{wall.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{requests.length} pedidos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onLeaveWall} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full" title="Sair do Mural"><LogOut size={20} /></button>
        </div>
      </div>

      <div className="flex p-4 gap-2 justify-center">
        <button onClick={() => setMode('read')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${mode === 'read' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-transparent text-slate-400'}`}>Mural</button>
        <button onClick={() => setMode('write')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${mode === 'write' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-transparent text-slate-400'}`}>Novo Pedido</button>
      </div>

      <div className="px-4">
        {mode === 'write' ? (
          <WriteScreen onSubmit={handleCreate} userProfile={userProfile} />
        ) : (
          <ReadScreen requests={requests} loading={loading} currentUser={user} userProfile={userProfile} onPray={handlePray} onDeleteClick={(id) => setDeleteModal({ isOpen: true, requestId: id })} wallId={wall.id} appId={appId} db={db} />
        )}
      </div>

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Excluir Pedido?</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setDeleteModal({ isOpen: false, requestId: null })} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadScreen({ requests, loading, onPray, onDeleteClick, currentUser, userProfile, wallId, appId, db }) {
  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (requests.length === 0) return <div className="text-center p-10 text-slate-400">Este mural ainda não tem pedidos.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 animate-in fade-in duration-500">
      {requests.map((req) => (
        <PrayerCard key={req.id} request={req} currentUser={currentUser} userProfile={userProfile} onPray={onPray} onDeleteClick={onDeleteClick} wallId={wallId} appId={appId} db={db} />
      ))}
    </div>
  );
}

function PrayerCard({ request, currentUser, userProfile, onPray, onDeleteClick, wallId, appId, db }) {
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
          <MessageCircle size={16} /> Comentários
          {commentCount > 0 && <span className="bg-[#649fce] text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold ml-1">{commentCount}</span>}
        </button>
        <button onClick={() => onPray(request.id, isPraying)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 border ${isPraying ? 'bg-[#649fce] text-white border-[#649fce]' : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-red-200 dark:hover:border-red-900 hover:text-red-500'} active:scale-95`}>
          {isPraying ? (<>Orando <Heart size={14} className="fill-red-500 text-red-500" /></>) : (<>Eu Oro <Heart size={14} className="group-hover:text-red-500 transition-colors" /></>)}
          <span className={`ml-1 font-normal ${isPraying ? 'opacity-100' : 'opacity-80'}`}>| {prayedBy.length}</span>
        </button>
      </div>
      {showComments && <CommentsSection requestId={request.id} currentUser={currentUser} userProfile={userProfile} wallId={wallId} appId={appId} db={db} />}
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
      await addDoc(commentsRef, {
        text: newComment,
        authorName: userProfile?.name || 'Anônimo',
        authorId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      const requestRef = doc(db, 'artifacts', appId, 'prayer_walls', wallId, 'requests', requestId);
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
        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"><Send size={14} /></button>
      </form>
    </div>
  );
}

function UserAvatar({ src, name, size = "md", className = "" }) {
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-xl", xl: "w-24 h-24 text-3xl" };
  if (src) return <img src={src} alt={name} className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 dark:border-slate-600 ${className}`} />;
  return <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold shadow-sm bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 ${className}`}>{name ? name.charAt(0).toUpperCase() : <User size={size === 'sm' ? 14 : 20} />}</div>;
}

function Header({ view, setView, activeWall, goBack }) {
  const getTitle = () => {
    if (activeWall) return activeWall.title;
    if (view === 'wall-list') return 'Mural de Oração';
    if (view === 'create-wall') return 'Criar Mural';
    if (view === 'join-wall') return 'Entrar em Mural';
    if (view === 'settings') return 'Configurações';
    return 'Mural de Oração';
  }
  return (
    <div className="bg-[#649fce] shadow-sm p-4 sticky top-0 z-20 flex items-center justify-between text-white">
      <div className="w-10 flex justify-start">
        {activeWall ? (<button onClick={goBack} className="p-2 -ml-2 text-white hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>) : view !== 'wall-list' && view !== 'splash' && view !== 'login' ? (<button onClick={() => setView('wall-list')} className="p-2 -ml-2 text-white hover:bg-white/20 rounded-full transition-colors"><ArrowLeft size={24} /></button>) : null}
      </div>
      <div className="flex-1 text-center"><h1 className="text-lg font-bold tracking-wide truncate px-2">{getTitle()}</h1></div>
      <div className="w-10 flex justify-end">
        {view === 'wall-list' && (<button onClick={() => setView('settings')} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Configurações"><Settings size={22} /></button>)}
      </div>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 flex flex-col items-center justify-center z-50 transition-colors duration-300">
      <div className="animate-fade-simple flex flex-col items-center"><img src="/icon.png" alt="Logo" className="w-40 h-40 object-contain mb-6" /></div>
    </div>
  );
}

function LoginScreen({ onLoginSuccess, appId, db, auth }) {
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
    } catch (error) { alert("Erro: " + error.code); setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await saveUserProfile(result.user.uid, { name: result.user.displayName, email: result.user.email, photoURL: result.user.photoURL });
      onLoginSuccess();
    } catch (error) { console.error(error); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-8 duration-700 transition-colors duration-300">
      <div className="w-full max-w-sm text-center mb-8">
        <img src="/icon.png" alt="Logo" className="w-24 h-24 object-contain mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{isRegister ? 'Criar Conta' : 'Bem-vindo'}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Entre para conectar-se aos seus murais.</p>
      </div>
      <form onSubmit={handleEmailLogin} className="w-full max-w-sm flex flex-col gap-4">
        {isRegister && <input type="text" required placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" />}
        <input type="email" required placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" />
        <input type="password" required placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" />
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-70">{loading ? '...' : (isRegister ? 'Cadastrar' : 'Entrar')}</button>
      </form>
      <div className="my-6 w-full max-w-sm flex items-center gap-4"><div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div><span className="text-xs text-slate-400 font-bold uppercase">Ou</span><div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div></div>
      <button type="button" onClick={handleGoogleLogin} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 p-4 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-3">
        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Google
      </button>
      <button onClick={() => setIsRegister(!isRegister)} className="mt-8 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 font-medium">{isRegister ? 'Já tem conta? Entrar' : 'Criar conta'}</button>
    </div>
  );
}

// Settings Screen (Reutilizada da v1.4 mas com props ajustadas)
function SettingsScreen({ userProfile, onUpdateName, onUpdatePhoto, onLogout, theme, toggleTheme }) {
  const [name, setName] = useState(userProfile?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  const handleSave = () => {
    onUpdateName(name);
    setIsEditing(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
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
    <div className="p-6 max-w-xl mx-auto animate-in fade-in">
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

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-6 transition-colors">
        <div className="bg-slate-50 dark:bg-slate-700 p-4 border-b border-slate-100 dark:border-slate-600 flex items-center gap-3">
          <User className="text-blue-500" size={20} />
          <h3 className="font-bold text-slate-700 dark:text-white">Perfil</h3>
        </div>
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserAvatar src={userProfile?.photoURL} name={userProfile?.name} size="lg" />
              <button onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-md hover:bg-blue-700 transition-colors"><Camera size={14} /></button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
            <div className="flex-1"><p className="text-sm font-bold text-slate-700 dark:text-white">Sua Foto</p><p className="text-xs text-slate-400">Toque na câmera para alterar.</p></div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nome de Exibição</label>
            <div className="flex gap-2 mt-2">
              <input type="text" value={name} disabled={!isEditing} onChange={(e) => setName(e.target.value)} className={`flex-1 p-3 rounded-xl border outline-none transition-all ${isEditing ? 'bg-white dark:bg-slate-700 border-blue-400 ring-2 ring-blue-100 dark:text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`} />
              {isEditing ? <button onClick={() => { onUpdateName(name); setIsEditing(false); }} className="bg-blue-600 text-white p-3 rounded-xl"><Save size={20} /></button> : <button onClick={() => setIsEditing(true)} className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 p-3 rounded-xl"><Settings size={20} /></button>}
            </div>
          </div>
        </div>
      </div>

      <button onClick={onLogout} className="w-full bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900 text-red-500 p-4 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 shadow-sm"><LogOut size={20} /> Sair da Conta</button>
      <div className="text-center mt-8 text-xs text-slate-300 dark:text-slate-600">Versão 2.0 Multi-Wall</div>
    </div>
  );
}