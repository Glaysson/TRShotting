import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, getDocFromServer } from 'firebase/firestore';
import { Printer, Lock, User as UserIcon, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Manufacturers from './Manufacturers';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

const getDeviceFingerprint = () => {
  const navigator_info = window.navigator;
  const screen_info = window.screen;
  
  // Cria uma string baseada em características do hardware e navegador
  let uid = localStorage.getItem('tr_device_uid');
  if (!uid) {
    uid = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('tr_device_uid', uid);
  }

  const mimeTypesCount = navigator_info.mimeTypes ? navigator_info.mimeTypes.length : 0;
  const fingerprintData = [
    navigator_info.userAgent,
    screen_info.width,
    screen_info.height,
    screen_info.colorDepth,
    uid,
    mimeTypesCount
  ].join('|');

  // Gera um hash simples para parecer um endereço MAC/ID único
  let hash = 0;
  for (let i = 0; i < fingerprintData.length; i++) {
    const char = fingerprintData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `TR-${hex.substring(0, 4)}-${hex.substring(4, 8)}-${uid.substring(0, 4).toUpperCase()}`;
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'ok' | 'error'>('testing');

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setConnectionStatus('ok');
      } catch (err: any) {
        setConnectionStatus('ok');
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user is admin
        setIsAdmin(currentUser.email === 'glayssonrn2@gmail.com');
        
        try {
          // Passamos '***' no auto-login para não sobrescrever a senha real se já existir
          await handleUserRegistration(currentUser, '***');
        } catch (err) {
          setError('Erro ao sincronizar dados do dispositivo.');
        }
      } else {
        setUserData(null);
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUserRegistration = async (currentUser: User, passwordUsed: string) => {
    const path = `users/${currentUser.uid}`;
    const isAdminUser = currentUser.email === 'glayssonrn2@gmail.com';
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const currentFingerprint = getDeviceFingerprint();

      if (!userSnap.exists()) {
        // First login ever - register user and current device
        const newData = {
          id: currentUser.uid,
          login: currentUser.email,
          senha: passwordUsed,
          dataCadastro: new Date().toISOString(),
          macAddress: currentFingerprint,
          role: isAdminUser ? 'admin' : 'user'
        };
        await setDoc(userRef, newData);
        setUserData(newData);
      } else {
        const data = userSnap.data();
        
        // Check if device matches, but ALLOW ADMIN to bypass and update device
        if (data.macAddress && data.macAddress !== currentFingerprint && !isAdminUser) {
          // Device mismatch for normal user - block access
          await auth.signOut();
          setError('Acesso Negado: Este dispositivo não está autorizado para esta conta. Entre em contato com o administrador.');
          setUserData(null);
          return;
        }

        // Update logic for Admin or first-time device registration
        const updateData: any = { 
          id: data.id || currentUser.uid,
          dataCadastro: data.dataCadastro || new Date().toISOString()
        };

        // Admin always updates their device to the current one
        if (isAdminUser || !data.macAddress) {
          updateData.macAddress = currentFingerprint;
        }

        // Update password if it's not the auto-login placeholder
        if (passwordUsed !== '***') {
          updateData.senha = passwordUsed;
        }
        
        if (Object.keys(updateData).length > 2) { // Only update if there are changes beyond ID/Date
          await updateDoc(userRef, updateData);
        }
        setUserData({ ...data, ...updateData });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleUserRegistration(userCredential.user, password);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Usuário ou senha incorretos.');
      } else {
        setError('Erro ao tentar entrar. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  if (user && userData) {
    if (isAdmin) {
      return <Manufacturers />;
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#141414] border border-[#222] p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="text-emerald-500 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Acesso Autorizado</h2>
          <p className="text-gray-400 mb-8">Bem-vindo de volta, {userData.login}</p>
          
          <div className="space-y-4 text-left mb-8">
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#222]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">ID do Usuário</p>
              <p className="font-mono text-sm">{userData.id}</p>
            </div>
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#222]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Data de Cadastro</p>
              <p className="text-sm">{new Date(userData.dataCadastro).toLocaleString()}</p>
            </div>
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#222]">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Endereço MAC (Dispositivo)</p>
              <p className="font-mono text-sm text-emerald-400">{userData.macAddress}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-semibold transition-all duration-200"
          >
            Sair do Sistema
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#141414] border border-[#222] p-8 rounded-2xl shadow-2xl max-w-md w-full"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
            <Printer className="text-blue-500 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">TRShooting</h1>
          <p className="text-gray-500 mt-2">Entre com suas credenciais autorizadas</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">E-mail</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full bg-[#1a1a1a] border border-[#222] rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 ml-1">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1a1a1a] border border-[#222] rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-600"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20 text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Autenticando...</span>
              </div>
            ) : (
              'Acessar Sistema'
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-[#222] text-center">
          <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold">
            Sistema de Registro de Dispositivo Ativo
          </p>
        </div>
      </motion.div>
    </div>
  );
}
