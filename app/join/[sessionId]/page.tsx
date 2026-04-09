'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function JoinGame({ params }: { params: Promise<{ sessionId: string }> }) {
  // Unwrap the params promise just like we did for the Host screen
  const { sessionId } = use(params);
  
  const [teamName, setTeamName] = useState('');
  const [isCaptain, setIsCaptain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    
    setIsLoading(true);

    try {
      // 1. Insert the new team into the Supabase database
      const { data, error } = await supabase
        .from('teams')
        .insert([{ 
          session_id: sessionId, 
          team_name: teamName, 
          is_captain: isCaptain 
        }])
        .select()
        .single();

      if (error) throw error;

      // 2. The LocalStorage Trick: Save their ID to their phone's browser secretly
      localStorage.setItem('teamId', data.id.toString());
      localStorage.setItem('sessionId', sessionId);
      if (isCaptain) {
        localStorage.setItem('isCaptain', 'true');
      }

      // 3. Send them to their mobile Gamepad screen (we will build this next)
      alert("Success! Now we need to build the Gamepad screen.");
      // router.push(`/play/${data.id}`); // We will uncomment this when the Play page exists
      
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Failed to join the game. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-6 pt-12">
      <h1 className="text-3xl font-bold text-blue-500 mb-2">Join the Game</h1>
      <p className="text-slate-400 mb-10 text-center">Enter your team details below to jump into the action.</p>

      <form onSubmit={handleJoin} className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl shadow-xl">
        
        {/* Team Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Team Name
          </label>
          <input
            type="text"
            required
            maxLength={20}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            placeholder="e.g., The Innovators"
          />
        </div>

        {/* Captain Toggle */}
        <div className="mb-8 p-4 bg-slate-700/50 rounded-xl border border-slate-600">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isCaptain}
              onChange={(e) => setIsCaptain(e.target.checked)}
              className="w-6 h-6 text-blue-500 rounded focus:ring-blue-500 bg-slate-700 border-slate-500"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-white">I am the Team Captain</span>
              <span className="text-xs text-slate-400">Only the captain can roll the dice.</span>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !teamName.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl text-lg transition-all disabled:opacity-50"
        >
          {isLoading ? 'Joining...' : 'Jump In!'}
        </button>
      </form>
    </div>
  );
}