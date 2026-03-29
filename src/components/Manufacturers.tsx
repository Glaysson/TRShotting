import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Printer, Plus, Search, ChevronRight, Settings, LogOut, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../firebase';

interface Manufacturer {
  id: string;
  nome: string;
  created_at: string;
}

export default function Manufacturers() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchManufacturers();
  }, []);

  const fetchManufacturers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('fabricantes')
        .select('*')
        .order('nome');
      
      if (supabaseError) {
        console.error('Supabase Error:', supabaseError);
        setError(`${supabaseError.code}: ${supabaseError.message}`);
        setManufacturers([]);
      } else {
        setManufacturers(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected Error:', err);
      setError(err.message || 'Erro inesperado ao conectar ao Supabase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* ... existing Header ... */}
      <header className="bg-[#141414] border-b border-[#222] px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Printer className="text-blue-500 w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">TRShooting</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400">
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 lg:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">Fabricantes</h2>
            <p className="text-gray-500">Selecione um fabricante para ver os equipamentos.</p>
          </div>
          
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
            <Plus className="w-5 h-5" />
            Novo Fabricante
          </button>
        </div>

        {/* List of Buttons */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-500">Carregando fabricantes...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-500 mb-2">Erro de Conexão</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <button 
              onClick={fetchManufacturers}
              className="px-6 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : manufacturers.length > 0 ? (
          <div className="space-y-4">
            {manufacturers.map((m) => (
              <motion.button 
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: 4 }}
                className="w-full bg-[#141414] border border-[#222] p-6 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-blue-500/10 transition-colors">
                    <Printer className="text-gray-400 group-hover:text-blue-500 w-6 h-6" />
                  </div>
                  <span className="text-xl font-bold tracking-tight">{m.nome}</span>
                </div>
                <ChevronRight className="text-gray-600 group-hover:text-blue-500 w-6 h-6 transition-all" />
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="bg-[#141414] border border-[#222] border-dashed rounded-3xl p-20 text-center">
            <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Printer className="text-gray-600 w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold mb-2">Nenhum fabricante encontrado</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Ainda não há fabricantes cadastrados na tabela "fabricantes" do Supabase.
            </p>
            <button 
              onClick={fetchManufacturers}
              className="text-blue-500 hover:text-blue-400 font-medium underline underline-offset-4"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
