'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Prompt {
  id: string;
  category: string;
  content: string;
  is_active: boolean;
}

export default function AdminDashboard() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Talk');
  const [isLoading, setIsLoading] = useState(true);

  async function fetchPrompts() {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error("Error fetching prompts:", error);
    if (data) setPrompts(data as Prompt[]);
    setIsLoading(false); 
  }

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        const { data } = await supabase
          .from('prompts')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (isMounted && data) {
          setPrompts(data as Prompt[]);
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false; 
    };
  }, []);

  async function addPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;

    const { error } = await supabase
      .from('prompts')
      .insert([{ 
        category: newCategory, 
        content: newContent, 
        is_active: true 
      }]);

    if (!error) {
      setNewContent('');
      fetchPrompts();
    } else {
      alert("Error adding prompt");
    }
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('prompts')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    if (!error) fetchPrompts();
  }

  async function deletePrompt(id: string) {
    if (confirm('Are you sure? This cannot be undone.')) {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);
      if (!error) fetchPrompts();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-900">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 flex justify-between items-end border-b pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Prompt Admin</h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">
              Challenge Requirements: Section 5
            </p>
          </div>
          <div className="text-right">
            <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-black">
              {prompts.length} TOTAL PROMPTS
            </span>
          </div>
        </header>

        {/* Add Prompt Form */}
        <section className="bg-white p-8 rounded-4xl shadow-sm border border-slate-200 mb-10">
          <h2 className="text-xl font-bold mb-6">Create New Challenge</h2>
          <form onSubmit={addPrompt} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input 
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Enter prompt text (e.g., Draw a house with your feet)..."
                required
              />
            </div>
            <div className="md:w-48">
              <select 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none"
              >
                <option value="Talk">Talk (Discuss)</option>
                <option value="Move">Move (Physical)</option>
                <option value="Create">Create (Creative)</option>
              </select>
            </div>
            <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-600 transition-all">
              ADD PROMPT
            </button>
          </form>
        </section>

        {/* Prompts Table */}
        <div className="bg-white rounded-4xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-slate-400">Category</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-slate-400">Content</th>
                <th className="p-6 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={3} className="p-10 text-center animate-pulse">Loading prompts...</td></tr>
              ) : prompts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      p.category === 'Move' ? 'bg-orange-100 text-orange-600' : 
                      p.category === 'Talk' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {p.category}
                    </span>
                  </td>
                  <td className="p-6 font-medium text-slate-700">
                    <span className={!p.is_active ? 'text-slate-300 line-through' : ''}>
                      {p.content}
                    </span>
                  </td>
                  <td className="p-6 text-right flex justify-end gap-3">
                    <button 
                      onClick={() => toggleActive(p.id, p.is_active)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        p.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {p.is_active ? 'ACTIVE' : 'DISABLED'}
                    </button>
                    <button 
                      onClick={() => deletePrompt(p.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}