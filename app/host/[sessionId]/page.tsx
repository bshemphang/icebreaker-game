'use client';
import { useEffect, useState, use } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';

interface Team {
  id: number;
  team_name: string;
}

// Notice we changed params to be a Promise here
export default function HostWaitingRoom({ params }: { params: Promise<{ sessionId: string }> }) {
  // 1. Unwrap the params Promise using React's new `use()` hook
  const { sessionId } = use(params);
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    const initializeRoom = async () => {
      // Use the unwrapped sessionId
      const { data } = await supabase
        .from('teams')
        .select('*')
        .eq('session_id', sessionId);
      
      if (data) setTeams(data);
      
      setJoinUrl(`${window.location.origin}/join/${sessionId}`);
    };

    initializeRoom();

    const channel = supabase
      .channel('public:teams')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'teams',
        filter: `session_id=eq.${sessionId}` 
      }, (payload) => {
        setTeams((current) => [...current, payload.new as Team]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]); // Add sessionId to the dependency array

  const startGame = async () => {
    alert("Game Started! Next, we will build the Game Board.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-blue-600 mb-8">Innovation Icebreaker</h1>
      
      <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center max-w-lg w-full text-slate-800">
        <h2 className="text-2xl font-semibold mb-6">Scan to Join!</h2>
        
        {/* QR Code Component */}
        <div className="p-4 border-4 border-blue-100 rounded-lg mb-6 bg-white flex items-center justify-center min-w-[280px] min-h-[280px]">
          {joinUrl ? (
            <QRCodeSVG value={joinUrl} size={256} level="H" />
          ) : (
            <div className="w-64 h-64 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">
              <span className="text-slate-400 font-medium">Generating QR...</span>
            </div>
          )}
        </div>
        
        <p className="text-gray-500 mb-8 font-mono text-center break-all">
          {joinUrl || 'Loading URL...'}
        </p>

        {/* Live Team Roster */}
        <div className="w-full">
          <h3 className="text-xl font-bold border-b pb-2 mb-4">Teams Joined: {teams.length}</h3>
          <ul className="space-y-2 mb-6 max-h-48 overflow-y-auto">
            {teams.length === 0 ? (
              <li className="text-gray-400 italic text-center py-2">Waiting for teams to scan...</li>
            ) : (
              teams.map((team) => (
                <li key={team.id} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md font-medium shadow-sm">
                  {team.team_name}
                </li>
              ))
            )}
          </ul>
        </div>

        <button 
          onClick={startGame}
          disabled={teams.length === 0}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-colors w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {teams.length === 0 ? 'Waiting for Teams...' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}