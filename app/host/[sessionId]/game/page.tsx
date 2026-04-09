'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Team {
  id: string;
  team_name: string;
  color_hex: string;
  board_position: number;
}

interface Prompt {
  category: string;
  content: string;
}

const BOARD_SPACES = [
  'Start', 'Move', 'Talk', 'Create', 'Wildcard',
  'Move', 'Talk', 'Create', 'Move', 'Talk',
  'Create', 'Wildcard', 'Move', 'Talk', 'Create',
  'Move', 'Wildcard', 'Talk', 'Create', 'Finish'
];

export default function GameBoard({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);

  const handleLanding = useCallback(async (position: number) => {
    const spaceType = BOARD_SPACES[position];
    if (spaceType === 'Start' || spaceType === 'Finish') return;

    setIsMoving(true);
    
    // Fetch all active prompts for the specific category
    const { data } = await supabase
      .from('prompts')
      .select('category, content')
      .eq('category', spaceType === 'Wildcard' ? 'Move' : spaceType)
      .eq('is_active', true);

    if (data && data.length > 0) {
      // Pick a random prompt from the list
      const randomIndex = Math.floor(Math.random() * data.length);
      const randomPrompt = data[randomIndex];

      setTimeout(() => {
        setActivePrompt(randomPrompt);
        setIsMoving(false);
      }, 1000);
    } else {
      setIsMoving(false);
    }
  }, []);

  useEffect(() => {
    const fetchGameData = async () => {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, team_name, color_hex, board_position')
        .eq('session_id', sessionId);
      if (teamData) setTeams(teamData as Team[]);

      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('current_turn_team_id')
        .eq('id', sessionId)
        .single();
      
      if (sessionData && !sessionData.current_turn_team_id && teamData && teamData.length > 0) {
        await supabase
          .from('game_sessions')
          .update({ current_turn_team_id: teamData[0].id })
          .eq('id', sessionId);
        setCurrentTurnId(teamData[0].id);
      } else if (sessionData) {
        setCurrentTurnId(sessionData.current_turn_team_id);
      }
    };

    fetchGameData();

    const channel = supabase
      .channel('game-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, (payload) => {
        const updatedTeam = payload.new as Team;
        setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
        handleLanding(updatedTeam.board_position);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        setCurrentTurnId(payload.new.current_turn_team_id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, handleLanding]);

  const nextTurn = async () => {
    setActivePrompt(null);
    if (teams.length === 0) return;

    // Logic to move turn to the next team
    const currentIndex = teams.findIndex(t => t.id === currentTurnId);
    const nextIndex = (currentIndex + 1) % teams.length;
    const nextTeamId = teams[nextIndex].id;

    await supabase
      .from('game_sessions')
      .update({ current_turn_team_id: nextTeamId })
      .eq('id', sessionId);
  };

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white overflow-hidden flex flex-col">
      {isMoving && (
        <div className="fixed top-4 right-4 animate-pulse text-blue-400 font-bold z-50">
          TEAM IS MOVING...
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-blue-500 uppercase">Shared Board</h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
            Turn: {teams.find(t => t.id === currentTurnId)?.team_name || '...'}
          </p>
        </div>
        <div className="flex gap-4">
          {teams.map(t => (
            <div key={t.id} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${t.id === currentTurnId ? 'bg-white text-slate-900 border-white scale-110 shadow-lg' : 'bg-slate-800 border-slate-700 opacity-50'}`}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color_hex }} />
              <span className="text-sm font-bold">{t.team_name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 flex-1 relative">
        {BOARD_SPACES.map((type, index) => (
          <div key={index} className={`relative rounded-3xl border-2 flex flex-col items-center justify-center p-4 transition-all ${index === 0 ? 'bg-green-500/20 border-green-500' : index === 19 ? 'bg-red-500/20 border-red-500' : 'bg-slate-800 border-slate-700'}`}>
            <span className="text-xs font-black opacity-20 absolute top-4 left-4">#{index + 1}</span>
            <span className="font-black text-xl tracking-widest">{type.toUpperCase()}</span>
            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {teams.filter(t => t.board_position === index).map(t => (
                <div key={t.id} className={`w-8 h-8 rounded-full border-4 border-white shadow-lg transition-all duration-500 ${t.id === currentTurnId ? 'animate-bounce z-10 scale-125' : 'opacity-80'}`} style={{ backgroundColor: t.color_hex }} />
              ))}
            </div>
          </div>
        ))}

        {activePrompt && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-12">
            <div className="bg-white text-slate-900 p-12 rounded-[3rem] max-w-2xl w-full shadow-2xl text-center space-y-6 animate-in zoom-in duration-300">
              <span className="bg-blue-600 text-white px-6 py-2 rounded-full font-black uppercase tracking-widest">{activePrompt.category}</span>
              <h2 className="text-4xl font-black leading-tight">{activePrompt.content}</h2>
              <button onClick={nextTurn} className="mt-8 bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                COMPLETE & NEXT TURN
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}