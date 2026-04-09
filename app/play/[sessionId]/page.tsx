'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';

interface Team {
  id: string;
  team_name: string;
  color_hex: string;
  board_position: number;
}

export default function Gamepad({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  
  const [isCaptain] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isCaptain') === 'true';
    }
    return false;
  });

  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);

  useEffect(() => {
    const teamId = localStorage.getItem('teamId');
    
    if (!teamId) {
      window.location.href = `/join/${sessionId}`;
      return;
    }

    const fetchData = async () => {
      // Fetch My Team Data
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      if (teamData) setMyTeam(teamData as Team);

      // Fetch Session Turn Data
      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('current_turn_team_id')
        .eq('id', sessionId)
        .single();
      if (sessionData) setCurrentTurnId(sessionData.current_turn_team_id);
    };

    fetchData();

    // Listen for Team Updates & Session Turn Updates
    const channel = supabase
      .channel('player-sync')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'teams', 
        filter: `id=eq.${teamId}` 
      }, (payload) => {
        setMyTeam(payload.new as Team);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'game_sessions', 
        filter: `id=eq.${sessionId}` 
      }, (payload) => {
        setCurrentTurnId(payload.new.current_turn_team_id);
        // Reset the dice visual if a new turn starts
        if (payload.new.current_turn_team_id === teamId) {
            setLastRoll(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const rollDice = async () => {
    const isMyTurn = myTeam?.id === currentTurnId;
    if (!myTeam || isRolling || !isMyTurn) return;
    
    setIsRolling(true);
    const roll = Math.floor(Math.random() * 6) + 1;
    setLastRoll(roll);

    const newPosition = Math.min(myTeam.board_position + roll, 19);

    const { error } = await supabase
      .from('teams')
      .update({ board_position: newPosition })
      .eq('id', myTeam.id);

    if (error) alert("Roll failed to sync!");

    setTimeout(() => {
      setIsRolling(false);
    }, 2000);
  };

  if (!myTeam) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black animate-pulse uppercase tracking-widest">Syncing Gear...</div>;

  const isMyTurn = myTeam.id === currentTurnId;

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-between p-8">
      {/* Team Header */}
      <div className="w-full text-center py-4 border-b border-slate-800">
        <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: myTeam.color_hex }} />
        <h1 className="text-xl font-black uppercase tracking-widest">{myTeam.team_name}</h1>
        <p className={`text-xs font-bold mt-1 ${isMyTurn ? 'text-green-400 animate-pulse' : 'text-slate-500'}`}>
          {isMyTurn ? "IT'S YOUR TURN!" : "WAITING FOR YOUR TURN..."}
        </p>
      </div>

      {/* Action Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full space-y-12">
        {lastRoll && (
          <div className="animate-bounce">
            <span className="text-8xl font-black text-blue-500">{lastRoll}</span>
          </div>
        )}

        {isCaptain ? (
          <button
            onClick={rollDice}
            disabled={isRolling || !isMyTurn}
            className={`w-64 h-64 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all border-b-8 active:border-b-0 active:translate-y-2 ${
              isMyTurn 
                ? "bg-blue-600 border-blue-800" 
                : "bg-slate-800 border-slate-900 grayscale opacity-30 cursor-not-allowed"
            }`}
          >
            <span className="text-4xl mb-2">{isMyTurn ? "🎲" : "🔒"}</span>
            <span className="text-2xl font-black italic">{isMyTurn ? "ROLL DICE" : "LOCKED"}</span>
          </button>
        ) : (
          <div className="text-center space-y-4 opacity-50">
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-3xl">👥</span>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
              Team Member View
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="w-full bg-slate-800/50 p-4 rounded-3xl text-center border border-slate-700">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
          {isCaptain ? "👑 Team Captain" : "👥 Crew Member"}
        </p>
      </div>
    </main>
  );
}