'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const createGameSession = async () => {
    setIsLoading(true);
    
    try {
      // 1. Create a new session in the database
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([{ host_id: 'host_' + Math.floor(Math.random() * 1000), status: 'waiting' }])
        .select()
        .single();

      if (error) throw error;

      // 2. Redirect the host to their new Waiting Room using the generated ID
      router.push(`/host/${data.id}`);
      
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Check your database connection.');
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900 text-white">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-6xl font-extrabold tracking-tight">
          Innovation <span className="text-blue-500">Icebreaker</span>
        </h1>
        <p className="text-xl text-slate-300 mx-auto">
          Energize the room in seconds. No apps, no accounts, just scan and play.
        </p>
        
        <button
          onClick={createGameSession}
          disabled={isLoading}
          className="mt-8 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-full text-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] disabled:opacity-50"
        >
          {isLoading ? 'Setting up room...' : 'Start a New Session'}
        </button>
      </div>
    </main>
  );
}