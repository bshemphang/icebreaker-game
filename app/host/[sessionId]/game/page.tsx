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
  'Move', 'Wildcard', 'Talk', 'Create', 'Session Complete' 
];

export default function GameBoard({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [isWildcardChoice, setIsWildcardChoice] = useState(false);

  // Helper to fetch a random prompt for a category
  const fetchPrompt = async (category: string) => {
    setIsWildcardChoice(false);
    setIsMoving(true);

    const { data } = await supabase
      .from('prompts')
      .select('category, content')
      .eq('category', category)
      .eq('is_active', true);

    if (data && data.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.length);
      const randomPrompt = data[randomIndex];

      setTimeout(() => {
        setActivePrompt(randomPrompt);
        setIsMoving(false);
      }, 1000);
    } else {
      setIsMoving(false);
    }
  };

  const handleLanding = useCallback(async (position: number) => {
    const spaceType = BOARD_SPACES[position];
    if (spaceType === 'Start') return;

    if (spaceType === 'Wildcard') {
      setIsWildcardChoice(true);
      return;
    }

    if (spaceType === 'Session Complete') {
      setActivePrompt({ 
          category: 'FINALE', 
          content: "Innovation Mode Activated! You've successfully reset your thinking. Ready to start ideating?" 
      });
      return;
    }

    fetchPrompt(spaceType);
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
        await supabase.from('game_sessions').update({ current_turn_team_id: teamData[0].id }).eq('id', sessionId);
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

    const currentIndex = teams.findIndex(t => t.id === currentTurnId);
    const nextIndex = (currentIndex + 1) % teams.length;
    const nextTeamId = teams[nextIndex].id;

    await supabase
      .from('game_sessions')
      .update({ current_turn_team_id: nextTeamId })
      .eq('id', sessionId);
  };

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white overflow-hidden flex flex-col font-sans">
      {/* Facilitator Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-blue-500 uppercase italic">IceBreaker HQ</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">Facilitator View</p>
        </div>
        <div className="flex gap-4">
          {teams.map(t => (
            <div key={t.id} className={`flex items-center gap-3 px-5 py-2 rounded-full border transition-all duration-500 ${t.id === currentTurnId ? 'bg-white text-slate-900 border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-slate-800 border-slate-700 opacity-40'}`}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color_hex }} />
              <span className="text-sm font-black uppercase">{t.team_name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Board */}
      <div className="grid grid-cols-5 gap-4 flex-1 relative">
        {BOARD_SPACES.map((type, index) => (
          <div key={index} className={`relative rounded-[2rem] border-2 flex flex-col items-center justify-center p-4 transition-all duration-500 ${index === 0 ? 'bg-green-500/10 border-green-500/50' : index === 19 ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
            <span className="text-[10px] font-black opacity-30 absolute top-4 left-4">#{index + 1}</span>
            <span className="font-black text-xs tracking-widest opacity-60 mb-2 uppercase">{type}</span>
            
            <div className="flex flex-wrap gap-1 justify-center min-h-[40px]">
              {teams.filter(t => t.board_position === index).map(t => (
                <div 
                  key={t.id} 
                  className={`w-10 h-10 rounded-full border-4 border-white shadow-xl transition-all duration-700 ${t.id === currentTurnId ? 'animate-bounce z-10 scale-125' : 'scale-90 opacity-80'}`} 
                  style={{ backgroundColor: t.color_hex }} 
                />
              ))}
            </div>
          </div>
        ))}

        {/* Wildcard Choice Modal */}
        {isWildcardChoice && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-xl rounded-[3rem]">
            <div className="text-center animate-in zoom-in duration-300">
              <h2 className="text-7xl font-black text-white mb-4 italic tracking-tighter">WILDCARD!</h2>
              <p className="text-blue-400 font-bold uppercase tracking-[0.3em] mb-12">Team, choose your destiny:</p>
              <div className="flex gap-8">
                {['Move', 'Talk', 'Create'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => fetchPrompt(cat)}
                    className="group bg-slate-800 border-2 border-slate-700 p-12 rounded-[3rem] hover:border-blue-500 hover:bg-slate-700 transition-all active:scale-90"
                  >
                    <span className="block text-5xl mb-4">{cat === 'Move' ? '🏃‍♂️' : cat === 'Talk' ? '💬' : '🎨'}</span>
                    <span className="text-xl font-black text-white uppercase tracking-widest">{cat}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Prompt Card Modal */}
        {activePrompt && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-12 rounded-[3rem]">
            <div className="bg-white text-slate-900 p-16 rounded-[4rem] max-w-3xl w-full shadow-2xl text-center space-y-8 animate-in zoom-in duration-300">
              <span className="bg-blue-600 text-white px-8 py-2 rounded-full font-black uppercase tracking-[0.2em] text-sm">
                {activePrompt.category}
              </span>
              <h2 className="text-5xl font-black leading-tight tracking-tight text-slate-900">
                &ldquo;{activePrompt.content}&rdquo;
              </h2>
              <button 
                onClick={nextTurn} 
                className="mt-12 bg-slate-900 text-white px-16 py-6 rounded-3xl font-black text-xl hover:bg-blue-600 transition-all shadow-xl active:scale-95"
              >
                COMPLETE & NEXT TURN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 flex justify-between items-center opacity-50">
        <p className="text-[10px] font-bold uppercase tracking-widest">Innovation Session Icebreaker MVP</p>
        <button 
           onClick={() => {if(confirm("End game session?")) window.location.href='/'}}
           className="text-[10px] font-black border border-white/20 px-4 py-2 rounded-full hover:bg-white hover:text-slate-900 transition-all"
        >
          FORCE END SESSION
        </button>
      </div>
    </main>
  );
}