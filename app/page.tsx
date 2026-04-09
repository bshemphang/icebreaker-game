'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [hostName, setHostName] = useState(''); // New state for Host Name
  const [isLoading, setIsLoading] = useState(false);

  const createGameSession = async (e: React.FormEvent) => {
    e.preventDefault(); // Handle form submission
    if (!hostName.trim()) return;
    
    setIsLoading(true);
    
    try {
      // 1. Create a new session with the host_name we collected
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([{ 
          host_name: hostName, // Match the SQL column name
          status: 'waiting' 
        }])
        .select()
        .single();

      if (error) throw error;

      router.push(`/host/${data.id}`);
      
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Check your database connection.');
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-900 text-white">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-6xl font-extrabold tracking-tight">
          Innovation <span className="text-blue-500">Icebreaker</span>
        </h1>
        <p className="text-xl text-slate-300 mx-auto">
          Energize the room in seconds. No apps, no accounts, just scan and play.
        </p>
        
        {/* Added Name Input Form for the Facilitator */}
        <form onSubmit={createGameSession} className="mt-8 space-y-4 max-w-sm mx-auto">
          <input
            type="text"
            required
            placeholder="Enter Facilitator Name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          
          <button
            type="submit"
            disabled={isLoading || !hostName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-full text-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] disabled:opacity-50"
          >
            {isLoading ? 'Setting up room...' : 'Start a New Session'}
          </button>
        </form>
      </div>
    </main>
  );
}