'use client';

import { useEffect, useState, use, useCallback } from 'react'; // Added useCallback
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


const boardSpaces = [
'Start', 'Move', 'Talk', 'Create', 'Wildcard',
'Move', 'Talk', 'Create', 'Move', 'Talk',
'Create', 'Wildcard', 'Move', 'Talk', 'Create',
'Move', 'Wildcard', 'Talk', 'Create', 'Finish'
];

export default function GameBoard({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [isMoving, setIsMoving] = useState(false); // We will use this for a loading state

  // 1. Move function ABOVE useEffect and wrap in useCallback
  const handleLanding = useCallback(async (position: number) => {
    const spaceType = boardSpaces[position];
    if (spaceType === 'Start' || spaceType === 'Finish') return;

    setIsMoving(true); // Now being used
    
    const { data } = await supabase
      .from('prompts')
      .select('category, content')
      .eq('category', spaceType === 'Wildcard' ? 'Move' : spaceType)
      .limit(1);

    if (data && data[0]) {
      setTimeout(() => {
        setActivePrompt(data[0]);
        setIsMoving(false);
      }, 1000);
    } else {
      setIsMoving(false);
    }
  }, [boardSpaces]); // Dependency for useCallback

  useEffect(() => {
    const fetchGameData = async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, team_name, color_hex, board_position')
        .eq('session_id', sessionId);
      if (data) setTeams(data as Team[]);
    };

    fetchGameData();

    const channel = supabase
      .channel('game-sync')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'teams' 
      }, (payload) => {
        const updatedTeam = payload.new as Team;
        setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
        
        // Now handleLanding is declared and safe to call
        handleLanding(updatedTeam.board_position);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, handleLanding]); // handleLanding added as dependency

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white overflow-hidden flex flex-col">
      {/* Visual indicator when a team is moving/loading a prompt */}
      {isMoving && (
        <div className="fixed top-4 right-4 animate-pulse text-blue-400 font-bold">
          Team is moving...
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black tracking-tighter text-blue-500 uppercase">Shared Board</h1>
        <div className="flex gap-4">
          {teams.map(t => (
            <div key={t.id} className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color_hex }} />
              <span className="text-sm font-bold">{t.team_name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 flex-1 relative">
        {boardSpaces.map((type, index) => (
          <div 
            key={index}
            className={`relative rounded-3xl border-2 flex flex-col items-center justify-center p-4 transition-all ${
              index === 0 ? 'bg-green-500/20 border-green-500' : 
              index === 19 ? 'bg-red-500/20 border-red-500' : 'bg-slate-800 border-slate-700'
            }`}
          >
            <span className="text-xs font-black opacity-20 absolute top-4 left-4">#{index + 1}</span>
            <span className="font-black text-xl tracking-widest">{type.toUpperCase()}</span>

            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {teams.filter(t => t.board_position === index).map(t => (
                <div 
                  key={t.id}
                  className="w-8 h-8 rounded-full border-4 border-white shadow-lg transition-all duration-500 animate-bounce"
                  style={{ backgroundColor: t.color_hex }}
                />
              ))}
            </div>
          </div>
        ))}

        {activePrompt && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-12">
            <div className="bg-white text-slate-900 p-12 rounded-[3rem] max-w-2xl w-full shadow-2xl text-center space-y-6 animate-in zoom-in duration-300">
              <span className="bg-blue-600 text-white px-6 py-2 rounded-full font-black uppercase tracking-widest">
                {activePrompt.category}
              </span>
              <h2 className="text-4xl font-black leading-tight">
                {activePrompt.content}
              </h2>
              <button 
                onClick={() => setActivePrompt(null)}
                className="mt-8 bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all"
              >
                CONTINUE
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}