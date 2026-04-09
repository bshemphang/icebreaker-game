'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';

interface Team {
  id: string;
  team_name: string;
  color_hex: string; // Added for UI colors
}

export default function JoinGame({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  
  const [playerName, setPlayerName] = useState('');
  const [customTeamName, setCustomTeamName] = useState('');
  const [existingTeams, setExistingTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // UX State: Track if the user has already joined a team locally
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already in a team for this specific session
    const savedTeamId = localStorage.getItem('teamId');
    const savedSessionId = localStorage.getItem('sessionId');
    if (savedTeamId && savedSessionId === sessionId) {
      setMyTeamId(savedTeamId);
    }

    const fetchTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, team_name, color_hex')
        .eq('session_id', sessionId);
      if (data) setExistingTeams(data);
    };

    fetchTeams();

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
      // 1. Get or Create Team with a dynamic color
      const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      let { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('session_id', sessionId)
        .ilike('team_name', targetTeamName)
        .single();

      if (!team) {
        const { data: newTeam, error: createError } = await supabase
          .from('teams')
          .insert([{ 
            session_id: sessionId, 
            team_name: targetTeamName,
            color_hex: randomColor 
          }])
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

      if (joinError && joinError.code === '23505') {
        await supabase.from('players').insert([{ 
          session_id: sessionId, 
          team_id: team.id, 
          name: playerName, 
          is_captain: false 
        }]);
        finalIsCaptain = false;
      }

      // 3. Save State & LOCK UI
      localStorage.setItem('playerId', player?.id || '');
      localStorage.setItem('teamId', team.id);
      localStorage.setItem('sessionId', sessionId);
      localStorage.setItem('isCaptain', finalIsCaptain.toString());
      
      setMyTeamId(team.id); // Trigger the "Waiting" view
      
    } catch (error) {
      console.error('Join Error:', error);
      alert("Failed to join. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- WAITING VIEW (Once joined, this replaces the form) ---
  if (myTeamId) {
    const myTeam = existingTeams.find(t => t.id === myTeamId);
    return (
      <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div 
          className="w-48 h-48 rounded-full border-8 mb-8 animate-pulse flex items-center justify-center text-6xl shadow-[0_0_30px_rgba(0,0,0,0.5)]" 
          style={{ borderColor: myTeam?.color_hex || '#3b82f6' }}
        >
          🎮
        </div>
        <h1 className="text-4xl font-black mb-2 tracking-tight">YOU&apos;RE IN!</h1>
        <p className="text-slate-400 text-lg">
          Ready to play with <span className="font-bold" style={{ color: myTeam?.color_hex }}>{myTeam?.team_name || 'your team'}</span>
        </p>
        <div className="mt-12 space-y-2">
            <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Waiting for host to start</p>
        </div>
      </main>
    );
  }

  // --- JOINING VIEW ---
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-6 pt-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black text-blue-500 mb-2">JOIN GAME</h1>
          <p className="text-slate-400">Enter your name to get started</p>
        </div>

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
                  className="w-full bg-slate-800 hover:bg-slate-700 p-5 rounded-xl text-left border-l-8 transition-all active:scale-95 disabled:opacity-50"
                  style={{ borderLeftColor: team.color_hex }}
                >
                  <span className="font-black text-xl">Join {team.team_name}</span>
                </button>
              ))
            )}
          </div>
        </div>

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
              placeholder="Team Name (e.g. Innovators)"
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