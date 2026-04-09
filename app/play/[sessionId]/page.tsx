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
  
  // 1. Initial State from LocalStorage
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
      // Fetch Team Data
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      if (teamData) setMyTeam(teamData as Team);

      // Fetch Initial Turn State
      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('current_turn_team_id')
        .eq('id', sessionId)
        .single();
      if (sessionData) setCurrentTurnId(sessionData.current_turn_team_id);
    };

    fetchData();

    // REAL-TIME SYNC
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
        const newTurnId = payload.new.current_turn_team_id;
        setCurrentTurnId(newTurnId);
        
        // CHALLENGE REQUIREMENT: Unlock button ONLY when turn switches
        setIsRolling(false); 
        
        // Clear dice visual for a fresh turn
        if (newTurnId === teamId) {
          setLastRoll(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const rollDice = async () => {
    const isMyTurn = myTeam?.id === currentTurnId;
    
    // Safety check: Prevent spam, non-captains, or out-of-turn rolls
    if (!myTeam || isRolling || !isMyTurn || !isCaptain) return;
    
    setIsRolling(true); // Lock immediately
    
    const roll = Math.floor(Math.random() * 6) + 1;
    setLastRoll(roll);

    const newPosition = Math.min(myTeam.board_position + roll, 19);

    const { error } = await supabase
      .from('teams')
      .update({ board_position: newPosition })
      .eq('id', myTeam.id);

    if (error) {
      alert("Roll failed to sync!");
      setIsRolling(false); // Only unlock if DB update fails
    }
  };

  if (!myTeam) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black animate-pulse">
      SYNCING GAMEPAD...
    </div>
  );

  const isMyTurn = myTeam.id === currentTurnId;

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-between p-8 font-sans">
      
      {/* Team Status Header */}
      <div className="w-full text-center py-6 border-b border-white/10">
        <div 
          className="w-4 h-4 rounded-full mx-auto mb-3 shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
          style={{ backgroundColor: myTeam.color_hex }} 
        />
        <h1 className="text-2xl font-black uppercase tracking-tighter">{myTeam.team_name}</h1>
        <div className="mt-2">
          {isMyTurn ? (
            <span className="text-green-400 text-xs font-black uppercase animate-pulse tracking-widest">
              ● Your Turn to Lead
            </span>
          ) : (
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              Waiting for turn...
            </span>
          )}
        </div>
      </div>

      {/* Action Center */}
      <div className="flex-1 flex flex-col items-center justify-center w-full space-y-10">
        
        {/* Dice Result Juice */}
        {lastRoll && (
          <div className="animate-bounce">
            <span className="text-9xl font-black text-blue-500 italic drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
              {lastRoll}
            </span>
          </div>
        )}

        {isCaptain ? (
          <div className="relative group">
            {/* The Glow Effect when it's your turn */}
            {isMyTurn && !isRolling && (
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse" />
            )}
            
            <button
              onClick={rollDice}
              disabled={isRolling || !isMyTurn}
              className={`relative w-64 h-64 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all border-b-[10px] active:border-b-0 active:translate-y-2 ${
                isMyTurn && !isRolling
                  ? "bg-blue-600 border-blue-800" 
                  : "bg-slate-800 border-slate-950 grayscale opacity-20 cursor-not-allowed"
              }`}
            >
              <span className="text-6xl mb-2">
                {isMyTurn ? (isRolling ? "✅" : "🎲") : "🔒"}
              </span>
              <span className="text-2xl font-black italic tracking-tighter">
                {isRolling ? "SENT!" : isMyTurn ? "ROLL DICE" : "LOCKED"}
              </span>
            </button>
          </div>
        ) : (
          /* Non-Captain View: Requirement #2 */
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto border border-white/5 shadow-inner">
              <span className="text-4xl animate-pulse">⏳</span>
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm italic">
              Awaiting Captain&apos;s Roll
            </p>
          </div>
        )}
      </div>

      {/* Footer Info / Role Badge */}
      <div className="w-full bg-white/5 border border-white/10 p-5 rounded-[2.5rem] text-center backdrop-blur-md">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400/80">
          {isCaptain ? "👑 TEAM CAPTAIN" : "👥 CREW MEMBER"}
        </p>
      </div>
      
    </main>
  );
}