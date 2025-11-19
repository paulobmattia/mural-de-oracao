import React, { useState, useEffect } from 'react';
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
  serverTimestamp
} from 'firebase/firestore';
import { 
  Heart, 
  Send, 
  User, 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  BookOpen, 
  LogIn, 
  Mail, 
  Lock, 
  CheckCircle, 
  LogOut, 
  MessageCircle, 
  X,
  AlertTriangle
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

  // Estado para o Modal de Confirmação Personalizado
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, requestId: null });

  // 1. Monitorar Autenticação
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
             setView((v) => (v === 'login' || v === 'splash' ? 'home' : v));
          }
        } catch (e) {
          console.error("Erro perfil", e);
        }
      } else {
        setUserProfile(null);
        if (view !== 'splash') setView('login');
      }
    });
    return () => unsubscribe();
  }, [view]);

  // 2. Listener de Pedidos
  useEffect(() => {
    if (!user) return;
    const requestsRef = collection(db, 'artifacts', appId, 'public', 'data', 'prayer_requests');
    
    const unsubscribe = onSnapshot(requestsRef, (snapshot) => {
      const loadedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedRequests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRequests(loadedRequests);
      setLoading(false);
    }, (error) => { console.error(error); setLoading(false); });
    return () => unsubscribe();
  }, [user]);

  // 3. Timer Splash
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) setView('login');
    }, 2500);
    return () => clearTimeout(timer);
  }, [user]);

  // --- Ações de Autenticação ---

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
      await saveUserProfile(result.user.uid, {
        name: result.user.displayName,
        email: result.user.email
      });
    } catch (error) {
      console.error("Erro Google:", error);
    }
  };

  const saveUserProfile = async (uid, data) => {
    try {
      const profileRef = doc(db, 'artifacts', appId, 'users', uid, 'profile', 'main');
      await setDoc(profileRef, data, { merge: true });
      setUserProfile(data);
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('login');
  };

  // --- Ações do App ---

  const handleCreateRequest = async (content, isAnonymous) => {
    if (!content.trim() || !user) return;
    try {
      const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'prayer_requests');
      await addDoc(collectionRef, {
        authorName: userProfile?.name || 'Desconhecido',
        authorId: user.uid,
        isAnonymous: isAnonymous,
        content: content,
        createdAt: serverTimestamp(),
        prayedBy: []
      });
      setView('read');
    } catch (error) {
      console.error("Erro ao criar:", error);
      alert("Erro ao enviar.");
    }
  };

  // Função chamada ao clicar no X (apenas abre o modal)
  const handleDeleteRequestClick = (requestId) => {
    setDeleteModal({ isOpen: true, requestId });
  };

  // Função que realmente deleta (chamada pelo Modal)
  const confirmDelete = async () => {
    if (!deleteModal.requestId) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prayer_requests', deleteModal.requestId));
      setDeleteModal({ isOpen: false, requestId: null });
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao excluir.");
    }
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
    <div className="min-h-screen bg-slate-50 text-slate-800 overflow-hidden relative flex flex-col" style={{ fontFamily: "'Roboto', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        body { font-family: 'Roboto', sans-serif; }
      `}</style>

      <Header view={view} setView={setView} onLogout={handleLogout} />

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
            currentUser={user}
            onPray={handlePrayInteraction}
            onDeleteClick={handleDeleteRequestClick} // Passando a nova função
            userProfile={userProfile}
          />
        )}
      </main>

      {/* MODAL DE CONFIRMAÇÃO PERSONALIZADO */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
                <AlertTriangle size={24} />
              </div>
              
              <h3 className="text-xl font-bold text-slate-800">ATENÇÃO!</h3>
              
              <p className="text-slate-500 text-sm leading-relaxed">
                Tem certeza que deseja excluir este pedido de oração? Essa ação não pode ser desfeita.
              </p>

              <div className="flex gap-3 w-full mt-2">
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, requestId: null })}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          {isRegister && (
            <div className="relative group animate-in slide-in-from-top-2 fade-in duration-300">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type="text"
                required
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>
          )}

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

        <button type="button" onClick={onGoogleLogin} className="w-full bg-white border border-slate-200 text-slate-700 p-4 rounded-xl font-bold hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
             <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
             <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
             <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
             <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <div className="mt-8 text-center">
          <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-slate-500 hover:text-blue-600 transition-colors font-medium">
            {isRegister ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ view, setView, onLogout }) {
  return (
    <div className="bg-white shadow-sm p-4 sticky top-0 z-10 flex items-center justify-between">
      <div className="w-10 flex justify-start">
        {view !== 'home' && view !== 'login' && (
          <button onClick={() => setView('home')} className="p-2 -ml-2 text-blue-600 hover:bg-blue-50 rounded-full">
            <ArrowLeft size={24} />
          </button>
        )}
      </div>
      <div className="flex-1 text-center">
        <h1 className="text-lg font-bold text-blue-900 tracking-wide">
          {view === 'home' ? 'Intercessão' : view === 'write' ? 'Novo Pedido' : view === 'read' ? 'Mural' : ''}
        </h1>
      </div>
      <div className="w-10 flex justify-end">
        {view === 'home' && (
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Sair">
            <LogOut size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

function HomeScreen({ onViewChange, requestCount, userName }) {
  return (
    <div className="p-6 flex flex-col gap-6 pb-20 animate-in fade-in pt-8">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Olá, {userName || 'Visitante'}</h2>
        <p className="text-slate-500 text-sm italic bg-blue-50 inline-block px-4 py-1 rounded-full">
          "Orai uns pelos outros para serdes curados."
        </p>
      </div>
      <button onClick={() => onViewChange('write')} className="group bg-white p-6 rounded-2xl shadow-md border border-blue-100 hover:border-blue-300 transition-all active:scale-95 flex flex-col items-center gap-3">
        <div className="bg-blue-100 p-4 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <Plus size={32} />
        </div>
        <span className="text-lg font-bold text-slate-700">Deixar um Pedido</span>
      </button>
      <button onClick={() => onViewChange('read')} className="group bg-white p-6 rounded-2xl shadow-md border border-purple-100 hover:border-purple-300 transition-all active:scale-95 flex flex-col items-center gap-3">
        <div className="bg-purple-100 p-4 rounded-full text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
          <BookOpen size={32} />
        </div>
        <span className="text-lg font-bold text-slate-700">Interceder</span>
        <span className="text-xs text-slate-400 text-center">
          {requestCount > 0 ? `${requestCount} pedidos ativos` : 'Seja o primeiro a ver os pedidos'}
        </span>
      </button>
    </div>
  );
}

function WriteScreen({ onSubmit, userName }) {
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
    <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-full ${isAnonymous ? 'bg-slate-100' : 'bg-blue-100'}`}>
               <User size={20} className={isAnonymous ? 'text-slate-500' : 'text-blue-600'} />
             </div>
             <div className="flex flex-col">
               <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Publicar como</span>
               <span className="font-medium text-slate-700">{isAnonymous ? 'Anônimo' : (userName || 'Você')}</span>
             </div>
          </div>
          
          <button
            type="button"
            onClick={() => setIsAnonymous(!isAnonymous)}
            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${isAnonymous ? 'bg-slate-300' : 'bg-blue-500'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${isAnonymous ? 'translate-x-0' : 'translate-x-5'}`}></div>
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
            <Sparkles size={16} /> Seu Pedido de Oração
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

        <button disabled={isSubmitting} type="submit" className="bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
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
    <div className="p-4 flex flex-col gap-4 pb-20 animate-in fade-in duration-500">
      {requests.map((req) => (
        <PrayerCard 
          key={req.id} 
          request={req} 
          currentUser={currentUser}
          userProfile={userProfile}
          onPray={onPray} 
          onDeleteClick={onDeleteClick}
        />
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
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md relative group">
      
      {isAuthor && (
        <button 
          onClick={() => onDeleteClick(request.id)}
          className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors p-1"
        >
          <X size={16} />
        </button>
      )}

      <div className="flex justify-between items-start mb-3 pr-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
            isAuthor ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
          }`}>
            {avatarInitial}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{displayName}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1">
               {request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : 'Agora'}
               {isAuthor && <span className="bg-blue-50 text-blue-600 px-1.5 rounded text-[10px] font-bold tracking-wide">VOCÊ</span>}
            </p>
          </div>
        </div>
      </div>

      <p className="text-slate-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap pl-1">
        {request.content}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <button 
          onClick={() => setShowComments(!showComments)}
          className="text-xs text-slate-500 flex items-center gap-1.5 font-medium hover:text-blue-600 transition-colors"
        >
          <MessageCircle size={16} />
          Comentários
        </button>

        <button
          onClick={() => onPray(request.id, isPraying)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 shadow-sm ${
            isPraying 
              ? 'bg-green-50 text-green-600 ring-1 ring-green-200'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          } active:scale-95`}
        >
          {isPraying ? (<>Orando <CheckCircle size={14} /></>) : (<>Eu Oro <Heart size={14} /></>)}
          <span className="ml-1 opacity-80 font-normal">| {prayedBy.length}</span>
        </button>
      </div>

      {showComments && (
        <CommentsSection requestId={request.id} currentUser={currentUser} userProfile={userProfile} />
      )}
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
    const commentsRef = collection(db, 'artifacts', 'mural-v1', 'public', 'data', 'prayer_requests', requestId, 'comments');
    
    try {
      await addDoc(commentsRef, {
        text: newComment,
        authorName: userProfile?.name || 'Anônimo',
        authorId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (err) { console.error(err); }
  };

  return (
    <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100 animate-in fade-in slide-in-from-top-2">
      <div className="max-h-40 overflow-y-auto mb-3 space-y-3 custom-scrollbar">
        {loading && <div className="text-xs text-slate-400 text-center">Carregando...</div>}
        {!loading && comments.length === 0 && <div className="text-xs text-slate-400 text-center py-2">Seja o primeiro a comentar.</div>}
        
        {comments.map(comment => (
          <div key={comment.id} className="flex flex-col bg-white p-2 rounded shadow-sm">
            <span className="text-[10px] font-bold text-blue-600 mb-0.5">{comment.authorName}</span>
            <span className="text-xs text-slate-700">{comment.text}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendComment} className="flex gap-2">
        <input 
          type="text" 
          placeholder="Escreva uma mensagem de apoio..." 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 text-xs p-2 rounded border border-slate-200 outline-none focus:border-blue-400"
        />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}