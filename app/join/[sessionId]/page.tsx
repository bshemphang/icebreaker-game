'use client';
import { useState, use } from 'react';
import { supabase } from '@/lib/supabase';

export default function JoinGame({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [teamName, setTeamName] = useState('');
  const [playerName, setPlayerName] = useState(''); // Added Player Name
  const [isLoading, setIsLoading] = useState(false);

  // Inside handleJoin function
const handleJoin = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!teamName.trim() || !playerName.trim()) return;
  setIsLoading(true);

  try {
    // 1. Check if team exists or create it
    let { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('session_id', sessionId)
      .eq('team_name', teamName)
      .single();

    if (!team) {
      const { data: newTeam, error: createTeamError } = await supabase
        .from('teams')
        .insert([{ session_id: sessionId, team_name: teamName }])
        .select().single();
      
      if (createTeamError || !newTeam) throw newTeam; // Stop if creation fails
      team = newTeam;
    }

    // CRITICAL: Type guard to satisfy TypeScript
    if (!team) throw new Error("Team could not be initialized");

    // 2. Try to join as Captain
    const { data: player, error: joinError } = await supabase
      .from('players')
      .insert([{ 
        session_id: sessionId, 
        team_id: team.id, // Now TS knows team.id exists
        name: playerName, 
        is_captain: true 
      }])
      .select().single();

    let finalIsCaptain = true;

    if (joinError && joinError.code === '23505') {
      // Join as regular player (Removed 'member' variable assignment to fix unused warning)
      await supabase
        .from('players')
        .insert([{ 
          session_id: sessionId, 
          team_id: team.id, 
          name: playerName, 
          is_captain: false 
        }]);
      finalIsCaptain = false;
    }

    // 3. Save to LocalStorage
    localStorage.setItem('playerId', player?.id || '');
    localStorage.setItem('teamId', team.id.toString());
    localStorage.setItem('isCaptain', finalIsCaptain.toString());

    alert(finalIsCaptain ? "You are the Team Captain!" : "Joined as a Team Member!");
    
    // NOTE: If you aren't using router yet, remove the 'const router = useRouter()' line at the top
  } catch (error) {
    console.error('Error joining:', error);
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-6 pt-12">
      <h1 className="text-3xl font-bold text-blue-500 mb-2 text-center">Join the Team</h1>
      
      <form onSubmit={handleJoin} className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Team Name</label>
          <input
            type="text"
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., The Rockets"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
          <input
            type="text"
            required
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full bg-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., Alex"
          />
        </div>

        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
          <p className="text-xs text-blue-300 text-center italic">
            Note: The first person to join the team becomes the Captain and gets the dice!
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold transition-all disabled:opacity-50"
        >
          {isLoading ? 'Joining...' : 'Enter Game'}
        </button>
      </form>
    </div>
  );
}