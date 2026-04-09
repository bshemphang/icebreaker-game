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
  
  // 1. Initial State from LocalStorage (Calculated once)
  const [isCaptain] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isCaptain') === 'true';
    }
    return false;
  });

  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);

  useEffect(() => {
  const teamId = localStorage.getItem('teamId');
  
  if (!teamId) {
    // If someone tries to go to /play without joining, send them to join
    window.location.href = `/join/${sessionId}`;
    return;
  }

    const fetchTeamData = async () => {
      if (!teamId) return;
      const { data } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      if (data) setMyTeam(data as Team);
    };

    fetchTeamData();

    // Listen for board updates (in case other teams move)
    const channel = supabase
      .channel('player-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, (payload) => {
        if (payload.new.id === teamId) {
          setMyTeam(payload.new as Team);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const rollDice = async () => {
    if (!myTeam || isRolling) return;
    
    setIsRolling(true);
    
    // 1. Simulate a local roll for juice/UX
    const roll = Math.floor(Math.random() * 6) + 1;
    setLastRoll(roll);

    // 2. Calculate new position (capped at 19 for the 20-space board)
    const newPosition = Math.min(myTeam.board_position + roll, 19);

    // 3. Update Supabase
    const { error } = await supabase
      .from('teams')
      .update({ 
        board_position: newPosition,
      })
      .eq('id', myTeam.id);

    if (error) {
      alert("Roll failed to sync!");
    }

    // Wait for animation to finish before allowing next roll
    setTimeout(() => {
      setIsRolling(false);
    }, 2000);
  };

  if (!myTeam) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Gear...</div>;

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-between p-8">
      {/* Team Header */}
      <div className="w-full text-center py-4 border-b border-slate-800">
        <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: myTeam.color_hex }} />
        <h1 className="text-xl font-black uppercase tracking-widest">{myTeam.team_name}</h1>
        <p className="text-xs text-slate-500 font-bold">POSITION: {myTeam.board_position + 1} / 20</p>
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
            disabled={isRolling}
            className="w-64 h-64 rounded-full bg-blue-600 border-b-8 border-blue-800 flex flex-col items-center justify-center shadow-2xl active:translate-y-2 active:border-b-0 transition-all disabled:opacity-50 disabled:grayscale"
          >
            <span className="text-4xl mb-2">🎲</span>
            <span className="text-2xl font-black italic">ROLL DICE</span>
          </button>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
              <span className="text-3xl">⏳</span>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
              Waiting for Captain to roll...
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="w-full bg-slate-800/50 p-4 rounded-3xl text-center">
        <p className="text-xs text-slate-500 font-bold">
          {isCaptain ? "YOU ARE THE CAPTAIN" : "YOU ARE A TEAM MEMBER"}
        </p>
      </div>
    </main>
  );
}