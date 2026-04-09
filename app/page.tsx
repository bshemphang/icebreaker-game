'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [hostName, setHostName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createGameSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([{ 
          host_name: hostName.trim(), 
          status: 'waiting' 
        }])
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem('isHost', 'true');
      localStorage.setItem('facilitatorName', hostName.trim());

      router.push(`/host/${data.id}`);
      
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Please check your Supabase connection.');
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-900 text-white">
      <div className="text-center space-y-8 max-w-2xl w-full">
        {/* Header Section */}
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter">
            INNOVATION <br />
            <span className="text-blue-500 italic">ICEBREAKER</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium max-w-md mx-auto">
            Reset thinking. Increase engagement. <br />Scan and play instantly.
          </p>
        </div>
        
        {/* Facilitator Form */}
        <form 
          onSubmit={createGameSession} 
          className="mt-12 space-y-4 max-w-sm mx-auto bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-sm"
        >
          <div className="text-left">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">
              Facilitator Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Sarah (Innovation Lead)"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full bg-slate-900 text-white border border-slate-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !hostName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 px-10 rounded-2xl text-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? 'Creating Room...' : 'CREATE SESSION'}
          </button>
        </form>
      </div>
    </main>
  );
}