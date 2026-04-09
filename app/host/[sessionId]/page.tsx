'use client';

import { useEffect, useState, use } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';

interface Player {
  id: string;
  name: string;
  is_captain: boolean;
}

interface Team {
  id: string;
  team_name: string;
  color_hex: string;
  players: Player[]; 
}

export default function HostWaitingRoom({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [hostName, setHostName] = useState<string>('');
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    const initializeRoom = async () => {
      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('host_name')
        .eq('id', sessionId)
        .single();
      
      if (sessionData) setHostName(sessionData.host_name);
      fetchTeamsAndPlayers();
      setJoinUrl(`${window.location.origin}/join/${sessionId}`);
    };

    const fetchTeamsAndPlayers = async () => {
        const { data } = await supabase
            .from('teams')
            .select(`
            id,
            team_name,
            color_hex,
            players (
                id,
                name,
                is_captain
            )
            `)
            .eq('session_id', sessionId);
        
        if (data) {
            setTeams(data as unknown as Team[]);
        }
    };

    initializeRoom();

    const channel = supabase
      .channel(`lobby-${sessionId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'teams',
        filter: `session_id=eq.${sessionId}` 
      }, () => fetchTeamsAndPlayers())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'players',
        filter: `session_id=eq.${sessionId}` 
      }, () => fetchTeamsAndPlayers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const startGame = async () => {
    const { error } = await supabase
        .from('game_sessions')
        .update({ status: 'playing' })
        .eq('id', sessionId);
    
    if (error) {
        alert("Error: " + error.message);
    } else {
        window.location.href = `/host/${sessionId}/game`;
    }
    };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-12 text-white">
      <div className="text-center mb-12">
        <p className="text-blue-400 font-bold tracking-widest uppercase text-sm mb-2">Facilitator Mode</p>
        {/* FIX 2: Escaped apostrophe for "Host's Room" using &apos; */}
        <h1 className="text-5xl font-black">{hostName || 'Innovation Session'}&apos;s Room</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl w-full">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center text-slate-900 h-fit">
          <h2 className="text-3xl font-black mb-8">Join the Game</h2>
          <div className="p-6 bg-slate-50 rounded-3xl border-4 border-dashed border-blue-100 mb-8">
            {joinUrl && <QRCodeSVG value={joinUrl} size={320} level="H" />}
          </div>
          <p className="text-slate-400 font-mono text-sm break-all bg-slate-100 p-4 rounded-xl w-full text-center">
            {joinUrl}
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-slate-700 pb-4">
            <h2 className="text-3xl font-bold">Teams</h2>
            <span className="bg-blue-600 px-4 py-1 rounded-full text-sm font-bold">
              {teams.length} Created
            </span>
          </div>

          <div className="grid gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {teams.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                <p className="text-slate-500 text-lg">Waiting for first team to form...</p>
              </div>
            ) : (
              teams.map((team) => (
                <div key={team.id} className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-black" style={{ color: team.color_hex }}>
                      {team.team_name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                        {team.players && team.players.length > 0 ? (
                            team.players.map((player) => (
                            <span key={player.id} className={`px-3 py-1 rounded-lg text-sm font-bold ${player.is_captain ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                {player.name} {player.is_captain && '👑'}
                            </span>
                            ))
                        ) : (
                            <span className="text-slate-500 italic text-xs">No one joined yet...</span>
                        )}
                    </div>
                </div>
              ))
            )}
          </div>

        <button 
        onClick={startGame}
        disabled={teams.length < 1} 
        className="w-full mt-8 bg-green-500 hover:bg-green-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-black py-6 rounded-4xl text-2xl transition-all shadow-xl shadow-green-900/20 active:scale-95 cursor-pointer flex items-center justify-center gap-3"
        >
        {teams.length === 0 ? (
            <>
            <span className="animate-pulse">⏳</span> WAITING FOR TEAMS...
            </>
        ) : (
            <>
            🚀 START CHALLENGE
            </>
        )}
        </button>
        </div>
      </div>
    </div>
  );
}