import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  doc, 
  setDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { Heart, Send, User, ArrowLeft, Sparkles, Plus, BookOpen, LogIn, Mail, Lock, CheckCircle } from 'lucide-react';

// --- Configuração do Firebase ---
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Componente Principal ---
export default function PrayerApp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [view, setView] = useState('splash'); 
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Autenticação e Carregamento de Perfil
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Erro auth:", error);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'main');
        try {
          const docSnap = await getDoc(profileRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          }
        } catch (e) {
          console.error("Erro ao buscar perfil", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Listener de Pedidos
  useEffect(() => {
    if (!user) return;
    const requestsRef = collection(db, 'artifacts', appId, 'public', 'data', 'prayer_requests');
    const unsubscribe = onSnapshot(requestsRef, (snapshot) => {
      const loadedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedRequests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRequests(loadedRequests);
      setLoading(false);
    }, (error) => {
      console.error("Erro buscar pedidos:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Fluxo de Telas Inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && userProfile) {
        setView('home');
      } else {
        setView('login');
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [user, userProfile]);

  // --- Ações ---

  const handleEmailLogin = async (email, password, isRegister) => {
    if (!user) return;
    try {
      const nameFromEmail = email.split('@')[0];
      const displayName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
      const profileData = { name: displayName, email: email };
      await setDoc(profileRef, profileData);
      setUserProfile(profileData);
      setView('home');
    } catch (e) {
      console.error("Erro ao salvar perfil:", e);
      alert("Erro ao entrar. Tente novamente.");
    }
  };

  const handleGoogleLogin = async () => {
    alert("No modo Preview, o Login Google é simulado. Em produção, isso abriria o popup do Google.");
    if (!user) return;
    try {
      const mockGoogleProfile = { name: "Usuário Google", email: "google@user.com" };
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
      await setDoc(profileRef, mockGoogleProfile);
      setUserProfile(mockGoogleProfile);
      setView('home');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRequest = async (content) => {
    if (!content.trim() || !user) return;
    try {
      const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'prayer_requests');
      await addDoc(collectionRef, {
        authorName: userProfile?.name || 'Anônimo',
        authorId: user.uid,
        content: content,
        createdAt: serverTimestamp(),
        prayedBy: []
      });
      setView('read');
    } catch (error) {
      console.error("Erro criar pedido:", error);
    }
  };

  const handlePrayInteraction = async (requestId, isPraying) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'prayer_requests', requestId);
      await updateDoc(docRef, {
        prayedBy: isPraying ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error("Erro interagir:", error);
    }
  };

  const handleLogout = () => {
    setUserProfile(null);
    setView('login');
  };

  // --- Roteamento ---

  if (view === 'splash') return <SplashScreen />;
  if (view === 'login') return <LoginScreen onEmailLogin={handleEmailLogin} onGoogleLogin={handleGoogleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 overflow-hidden relative flex flex-col" style={{ fontFamily: "'Roboto', sans-serif" }}>
      {/* Importando Roboto via style tag para garantir a fonte */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        body { font-family: 'Roboto', sans-serif; }
      `}</style>

      <Header 
        view={view} 
        setView={setView} 
        userProfile={userProfile}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-md mx-auto w-full relative">
        {view === 'home' && (
          <HomeScreen onViewChange={setView} requestCount={requests.length} userName={userProfile?.name} />
        )}
        {view === 'write' && (
          <WriteScreen onSubmit={handleCreateRequest} userName={userProfile?.name} />
        )}
        {view === 'read' && (
          <ReadScreen 
            requests={requests} 
            loading={loading} 
            currentUserId={user?.uid}
            onPray={handlePrayInteraction} 
          />
        )}
      </main>
    </div>
  );
}

// --- Componentes ---

function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-purple-700 flex flex-col items-center justify-center text-white z-50 animate-fade-out">
      <div className="animate-bounce-slow">
        <Sparkles size={80} className="text-white opacity-90" />
      </div>
      <h1 className="mt-6 text-3xl font-light tracking-widest animate-pulse font-roboto">ORAÇÃO</h1>
      <p className="mt-2 text-sm opacity-75">Conectando propósitos</p>
    </div>
  );
}

function LoginScreen({ onEmailLogin, onGoogleLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    await onEmailLogin(email, password, isRegister);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
            <Sparkles size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{isRegister ? 'Criar Conta' : 'Bem-vindo de volta'}</h2>
          <p className="text-slate-500 text-sm mt-2">Entre para se conectar à corrente de oração.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Inputs omitidos para brevidade, mantendo estrutura original */}
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="email"
              required
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="password"
              required
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-200 disabled:opacity-70"
          >
            {loading ? 'Processando...' : (isRegister ? 'Cadastrar' : 'Entrar')}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-100"></div>
          <span className="text-xs text-slate-400 font-bold uppercase">Ou continue com</span>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>

        <button 
          type="button"
          onClick={onGoogleLogin}
          className="w-full bg-white border border-slate-200 text-slate-700 p-4 rounded-xl font-bold hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
             <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
             <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
             <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
             <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-slate-500 hover:text-blue-600 transition-colors font-medium"
          >
            {isRegister ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ view, setView, userProfile, onLogout }) {
  return (
    <div className="bg-white shadow-sm p-4 sticky top-0 z-10 flex items-center justify-between">
      <div className="w-10 flex justify-start">
        {view !== 'home' && (
          <button onClick={() => setView('home')} className="p-2 -ml-2 text-blue-600 hover:bg-blue-50 rounded-full">
            <ArrowLeft size={24} />
          </button>
        )}
      </div>
      
      <div className="flex-1 text-center">
        {/* APLICADO: Roboto Bold aqui */}
        <h1 className="text-lg font-bold text-blue-900 tracking-wide">
          {view === 'home' ? 'Intercessão' : view === 'write' ? 'Novo Pedido' : 'Mural'}
        </h1>
      </div>
      
      <div className="w-10 flex justify-end">
        {view === 'home' && (
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Sair">
            <LogIn size={20} className="rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
}

function HomeScreen({ onViewChange, requestCount, userName }) {
  return (
    // MODIFICADO: Removido 'justify-center' e 'h-[calc]', adicionado 'pt-8'
    <div className="p-6 flex flex-col gap-6 pb-20 animate-in fade-in pt-8">
      <div className="text-center mb-2">
        {/* APLICADO: Roboto Bold */}
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Olá, {userName || 'Visitante'}
        </h2>
        <p className="text-slate-500 text-sm italic bg-blue-50 inline-block px-4 py-1 rounded-full">
          "Orai uns pelos outros para serdes curados."
        </p>
      </div>

      <button 
        onClick={() => onViewChange('write')}
        className="group bg-white p-6 rounded-2xl shadow-md border border-blue-100 hover:border-blue-300 transition-all active:scale-95 flex flex-col items-center gap-3"
      >
        <div className="bg-blue-100 p-4 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <Plus size={32} />
        </div>
        {/* APLICADO: Roboto Bold */}
        <span className="text-lg font-bold text-slate-700">Deixar um Pedido</span>
        <span className="text-xs text-slate-400 text-center">Compartilhe sua necessidade</span>
      </button>

      <button 
        onClick={() => onViewChange('read')}
        className="group bg-white p-6 rounded-2xl shadow-md border border-purple-100 hover:border-purple-300 transition-all active:scale-95 flex flex-col items-center gap-3"
      >
        <div className="bg-purple-100 p-4 rounded-full text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
          <BookOpen size={32} />
        </div>
        {/* APLICADO: Roboto Bold */}
        <span className="text-lg font-bold text-slate-700">Interceder</span>
        <span className="text-xs text-slate-400 text-center">
          {requestCount > 0 ? `${requestCount} pedidos ativos na comunidade` : 'Seja o primeiro a ver os pedidos'}
        </span>
      </button>
    </div>
  );
}

function WriteScreen({ onSubmit, userName }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    await onSubmit(content);
    setIsSubmitting(false);
  };

  return (
    <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3 text-blue-800">
          <div className="bg-blue-200 p-1.5 rounded-full">
             <User size={16} className="text-blue-800" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Publicando como</span>
            <span className="font-medium text-lg">{userName || 'Anônimo'}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
            <Sparkles size={16} />
            Seu Pedido de Oração
          </label>
          <textarea
            required
            rows={6}
            placeholder="Descreva seu pedido com detalhes..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none text-slate-700"
          />
        </div>

        <button
          disabled={isSubmitting}
          type="submit"
          className="bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isSubmitting ? 'Enviando...' : (
            <>
              <Send size={20} />
              Enviar Pedido
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function ReadScreen({ requests, loading, onPray, currentUserId }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
        <Sparkles size={48} className="mb-4 opacity-50" />
        <p>Ainda não há pedidos.</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4 pb-20 animate-in fade-in duration-500">
      {requests.map((req) => (
        <PrayerCard 
          key={req.id} 
          request={req} 
          currentUserId={currentUserId} 
          onPray={onPray} 
        />
      ))}
    </div>
  );
}

function PrayerCard({ request, currentUserId, onPray }) {
  const prayedBy = request.prayedBy || [];
  const isPraying = prayedBy.includes(currentUserId);
  const count = prayedBy.length;

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
            request.authorId === currentUserId ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
          }`}>
            {request.authorName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{request.authorName}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1">
               {request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : 'Agora'}
               {request.authorId === currentUserId && <span className="bg-blue-50 text-blue-600 px-1.5 rounded text-[10px] font-bold tracking-wide">VOCÊ</span>}
            </p>
          </div>
        </div>
      </div>

      <p className="text-slate-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap pl-1">
        {request.content}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <span className="text-xs text-slate-500 flex items-center gap-1.5 font-bold">
          {count > 0 && (
             <div className="flex -space-x-2">
                {[...Array(Math.min(count, 3))].map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-red-100 border-2 border-white flex items-center justify-center">
                    <Heart size={10} className="text-red-400 fill-red-400" />
                  </div>
                ))}
             </div>
          )}
          {count === 0 ? 'Seja o primeiro a orar' : `${count} orando`}
        </span>

        <button
          onClick={() => onPray(request.id, isPraying)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 shadow-sm ${
            isPraying 
              ? 'bg-green-50 text-green-600 ring-1 ring-green-200 hover:bg-green-100'
              : 'bg-slate-800 text-white hover:bg-slate-700 hover:shadow-md'
          } active:scale-95`}
        >
          {isPraying ? (
            <>Orando <CheckCircle size={14} /></>
          ) : (
            <>Eu Oro <Heart size={14} className={isPraying ? "fill-current" : ""} /></>
          )}
        </button>
      </div>
    </div>
  );
}