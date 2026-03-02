import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, CheckCircle2, AlertCircle, History, X } from 'lucide-react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { User } from '../types';

export default function Attendance({ user }: { user: User }) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (scanning) {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleCheckin(decodedText);
        },
        (errorMessage) => {
          // parse error, ignore it.
        }
      ).catch((err) => {
        console.error("Unable to start scanning", err);
        setScanning(false);
      });

      return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(err => console.error("Error stopping scanner", err));
        }
      };
    }
  }, [scanning]);

  const handleCheckin = async (code: string) => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop().catch(err => console.error(err));
    }
    setScanning(false);
    
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, code }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: `Presença confirmada! +${data.points} pontos.` });
      } else {
        setStatus({ type: 'error', message: data.error || 'Erro ao marcar presença.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Erro ao conectar com o servidor.' });
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-stone-900">Marcar Presença</h2>
        <p className="text-stone-500">Use o QR Code do evento ou digite o código de 6 dígitos.</p>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        {/* Status Message */}
        {status && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
            status.type === 'success' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <p className="font-bold">{status.message}</p>
          </div>
        )}

        {/* Scanner Area */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          {scanning ? (
            <div className="relative rounded-2xl overflow-hidden bg-black">
              <div id="reader" className="w-full"></div>
              <button 
                onClick={() => setScanning(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md text-white rounded-full z-10"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <div className="w-24 h-24 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6">
                <QrCode size={48} />
              </div>
              <button
                onClick={() => setScanning(true)}
                className="px-8 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-2"
              >
                <Camera size={20} />
                Abrir Scanner
              </button>
            </div>
          )}
        </div>

        {/* Manual Code Input */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <label className="block text-sm font-bold text-stone-700 mb-3 text-center uppercase tracking-wider">Ou digite o código manual</label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-center font-mono font-bold text-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 uppercase"
            />
            <button
              onClick={() => handleCheckin(manualCode)}
              disabled={manualCode.length < 6}
              className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors"
            >
              Validar
            </button>
          </div>
        </div>

        {/* History Link */}
        <button className="w-full py-4 flex items-center justify-center gap-2 text-stone-500 font-bold hover:text-stone-800 transition-colors">
          <History size={18} />
          Ver Histórico de Presença
        </button>
      </div>
    </div>
  );
}

