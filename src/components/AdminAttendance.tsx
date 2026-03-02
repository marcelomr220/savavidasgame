import React, { useState } from 'react';
import { QrCode, Plus, Calendar, Star, Users, CheckCircle2 } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function AdminAttendance() {
  const [eventType, setEventType] = useState('Culto Domingo');
  const [points, setPoints] = useState(10);
  const [maxCheckins, setMaxCheckins] = useState(100);
  const [currentSession, setCurrentSession] = useState<{ id: number, code: string } | null>(null);

  const handleCreateSession = async () => {
    const res = await fetch('/api/admin/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, points, maxCheckins }),
    });
    const data = await res.json();
    setCurrentSession(data);
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
    </div>
  );
}
