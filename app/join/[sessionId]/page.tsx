'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';

interface Team {
  id: string;
  team_name: string;
}

export default function JoinGame({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  
  const [playerName, setPlayerName] = useState('');
  const [customTeamName, setCustomTeamName] = useState('');
  const [existingTeams, setExistingTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Fetch teams already in this session
  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, team_name')
        .eq('session_id', sessionId);
      if (data) setExistingTeams(data);
    };

    fetchTeams();

    // Listen for new teams being created by others
    const channel = supabase
      .channel('join-lobby')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'teams', 
        filter: `session_id=eq.${sessionId}` 
      }, (payload) => {
        setExistingTeams((prev) => [...prev, payload.new as Team]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const handleJoinAction = async (targetTeamName: string) => {
    if (!playerName.trim() || !targetTeamName.trim()) return;
    setIsLoading(true);

    try {
      // 1. Get or Create Team
      let { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('session_id', sessionId)
        .ilike('team_name', targetTeamName)
        .single();

      if (!team) {
        const { data: newTeam, error: createError } = await supabase
          .from('teams')
          .insert([{ session_id: sessionId, team_name: targetTeamName }])
          .select().single();
        if (createError) throw createError;
        team = newTeam;
      }

      if (!team) throw new Error("Team initialization failed");

      // 2. Atomic Join Attempt (Captaincy)
      const { data: player, error: joinError } = await supabase
        .from('players')
        .insert([{ 
          session_id: sessionId, 
          team_id: team.id, 
          name: playerName, 
          is_captain: true 
        }])
        .select().single();

      let finalIsCaptain = true;

      // If error 23505 (Unique Constraint), someone else is captain
      if (joinError && joinError.code === '23505') {
        await supabase.from('players').insert([{ 
          session_id: sessionId, 
          team_id: team.id, 
          name: playerName, 
          is_captain: false 
        }]);
        finalIsCaptain = false;
      }

      // 3. Save State
      localStorage.setItem('playerId', player?.id || '');
      localStorage.setItem('teamId', team.id);
      localStorage.setItem('isCaptain', finalIsCaptain.toString());

      alert(finalIsCaptain ? "🚀 You are the Team Captain!" : "✅ Joined the Team!");
      
    } catch (error) {
      console.error('Join Error:', error);
      alert("Failed to join. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-6 pt-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black text-blue-500 mb-2">JOIN GAME</h1>
          <p className="text-slate-400">Enter your name to get started</p>
        </div>

        {/* Player Name Input */}
        <div className="bg-slate-800 p-2 rounded-2xl border border-slate-700">
          <input
            type="text"
            required
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full bg-transparent p-4 outline-none text-lg font-bold"
            placeholder="Your Name (e.g. Alex)"
          />
        </div>

        {/* Existing Teams List */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
            Pick an Existing Team
          </h2>
          <div className="grid gap-3">
            {existingTeams.length === 0 ? (
              <p className="text-slate-600 italic text-sm p-4 text-center">No teams formed yet...</p>
            ) : (
              existingTeams.map((team) => (
                <button
                  key={team.id}
                  disabled={isLoading || !playerName.trim()}
                  onClick={() => handleJoinAction(team.team_name)}
                  className="w-full bg-slate-800 hover:bg-slate-700 p-4 rounded-xl text-left border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  <span className="font-bold text-lg">Join {team.team_name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Create Custom Team */}
        <div className="space-y-4 pt-6 border-t border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
            Or Create a New Team
          </h2>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={customTeamName}
              onChange={(e) => setCustomTeamName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Team Name (e.g. Dream Team)"
            />
            <button
              disabled={isLoading || !playerName.trim() || !customTeamName.trim()}
              onClick={() => handleJoinAction(customTeamName)}
              className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black text-lg shadow-lg shadow-blue-900/40 disabled:opacity-50"
            >
              + CREATE & JOIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}