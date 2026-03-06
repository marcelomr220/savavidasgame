import React, { useState, useEffect } from 'react';
import { QrCode, Plus, Calendar, Star, Users, CheckCircle2, Trash2, Clock } from 'lucide-react';
import QRCode from 'react-qr-code';
import { getAttendanceSessions, createAttendanceSession, deleteAttendanceSession } from '../services/api';

export default function AdminAttendance() {
  const [eventType, setEventType] = useState('Culto Domingo');
  const [points, setPoints] = useState(10);
  const [maxCheckins, setMaxCheckins] = useState(100);
  const [currentSession, setCurrentSession] = useState<{ id: number, code: string } | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await getAttendanceSessions();
      setSessions(data);
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const data = await createAttendanceSession(eventType, points, maxCheckins);
      setCurrentSession(data);
      fetchSessions();
    } catch (err) {
      console.error("Error creating session:", err);
    }
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta sessão? Todos os registros de presença vinculados serão removidos.')) return;
    try {
      await deleteAttendanceSession(id);
      if (currentSession?.id === id) setCurrentSession(null);
      fetchSessions();
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-stone-900">Controle de Frequência</h2>
        <p className="text-stone-500">Gere códigos QR para registrar presença nos eventos.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Create Session Form */}
        <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-900 mb-6 flex items-center gap-2">
            <Plus size={20} className="text-red-600" />
            Nova Sessão de Presença
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Tipo de Evento</label>
              <select 
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option>Culto Domingo</option>
                <option>Célula Salva</option>
                <option>Culto Salva</option>
                <option>Especial</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Pontos</label>
                <input 
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Limite Check-ins</label>
                <input 
                  type="number"
                  value={maxCheckins}
                  onChange={(e) => setMaxCheckins(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleCreateSession}
              className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200"
            >
              Gerar Código QR
            </button>
          </div>
        </section>

        {/* QR Display Area */}
        <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col items-center justify-center text-center">
          {currentSession ? (
            <div className="space-y-6">
              <div className="p-4 bg-white border-4 border-stone-900 rounded-3xl shadow-xl">
                <QRCode value={currentSession.code} size={200} />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Código Manual</p>
                <p className="text-4xl font-black text-stone-900 tracking-[0.2em]">{currentSession.code}</p>
              </div>
              <div className="flex items-center gap-4 justify-center">
                <div className="flex items-center gap-1 text-red-600 font-bold">
                  <Star size={16} fill="currentColor" />
                  <span>{points} pts</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600 font-bold">
                  <Calendar size={16} />
                  <span>{eventType}</span>
                </div>
              </div>
              <div className="pt-4 flex items-center gap-2 text-red-600 font-bold justify-center">
                <CheckCircle2 size={18} />
                <span>Sessão Ativa</span>
              </div>
            </div>
          ) : (
            <div className="text-stone-300">
              <QrCode size={120} strokeWidth={1} />
              <p className="mt-4 font-medium">Preencha o formulário para gerar o QR Code</p>
            </div>
          )}
        </section>
      </div>

      {/* Sessions List */}
      <section className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100">
          <h3 className="font-bold text-stone-900 flex items-center gap-2">
            <Clock size={20} className="text-red-600" />
            Sessões Recentes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Evento</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Pontos</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-stone-400" />
                      <span className="font-semibold text-stone-900">{session.event_type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="bg-stone-100 px-2 py-1 rounded font-bold text-stone-700">{session.code}</code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-red-600 font-bold">
                      <Star size={14} fill="currentColor" />
                      <span>{session.points}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      session.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {session.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">
                    Nenhuma sessão registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
