import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Database, 
  FileText, 
  History, 
  Layers, 
  LogIn, 
  LogOut, 
  MapPin, 
  MessageSquare, 
  ShieldAlert, 
  Zap,
  Camera,
  Mic,
  Video,
  Volume2,
  X,
  Maximize2,
  Settings,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processChaos, StructuredAction, ai } from './services/gemini';
import { useAuth } from './hooks/useAuth';
import { useIncidents, IncidentRecord } from './hooks/useIncidents';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';

// --- Components ---

/**
 * A video preview component for live situational awareness.
 */
const VideoPreview = ({ active }: { active: boolean }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (active) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(setStream)
        .catch(err => console.error("Camera access denied:", err));
    } else {
      stream?.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    return () => stream?.getTracks().forEach(track => track.stop());
  }, [active]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video glass-card overflow-hidden group">
      {active && stream ? (
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-black/40">
          <Video className="w-8 h-8 mb-2 opacity-20" />
          <span className="text-[10px] uppercase tracking-widest font-mono">Camera Offline</span>
        </div>
      )}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
        <span className="text-[9px] font-mono uppercase tracking-widest text-white/50">Live Feed</span>
      </div>
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md border border-white/10">
          <Maximize2 className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  );
};

/**
 * A simple audio visualizer simulation.
 */
const AudioVisualizer = ({ active }: { active: boolean }) => {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          animate={active ? {
            height: [4, Math.random() * 16 + 4, 4],
          } : { height: 4 }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.05,
          }}
          className={`w-1 rounded-full ${active ? 'bg-blue-400' : 'bg-zinc-700'}`}
        />
      ))}
    </div>
  );
};

/**
 * A badge component to display the urgency level of an incident.
 * 
 * @param level - The urgency level (1-5).
 */
export const UrgencyBadge = ({ level }: { level: number }) => {
  const configs = [
    { label: 'Low', color: 'text-zinc-400 bg-white/5 border-white/5' },
    { label: 'Minor', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { label: 'Moderate', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    { label: 'High', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    { label: 'Critical', color: 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse' },
    { label: 'Extreme', color: 'text-red-500 bg-red-500/20 border-red-500/40 font-bold animate-pulse' }
  ];
  const config = configs[level] || configs[0];
  
  return (
    <span 
      className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-[0.2em] font-mono border ${config.color}`}
      aria-label={`Urgency Level ${level}`}
    >
      {config.label} // L{level}
    </span>
  );
};

/**
 * A card component to display a single structured action.
 * 
 * @param props - The component props.
 * @param props.action - The structured action data.
 */
export function ActionCard({ action }: { action: StructuredAction }) {
  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all group/card" role="listitem">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">{action.target_system}</span>
        </div>
        <span className="text-[9px] bg-white/10 text-zinc-300 px-2 py-0.5 rounded border border-white/10 font-mono uppercase tracking-widest">
          {action.action_type}
        </span>
      </div>
      <div className="relative">
        <pre className="text-[11px] text-zinc-400 font-mono overflow-x-auto p-3 bg-black/40 rounded-lg border border-white/5 custom-scrollbar" tabIndex={0}>
          {JSON.stringify(action.payload_to_send, null, 2)}
        </pre>
        <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
          <button className="p-1 bg-white/5 hover:bg-white/10 rounded border border-white/10">
            <FileText className="w-3 h-3 text-zinc-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The main application component for HumanHelpBridge.
 */
export default function App() {
  const { user, loading, login, logout, error: authError } = useAuth();
  const { incidents, addIncident, error: incidentsError } = useIncidents(user);
  
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);

  const { isListening, toggleListening, error: voiceError } = useSpeechRecognition(useCallback((transcript) => {
    setInput(prev => prev + (prev ? ' ' : '') + transcript);
  }, []));

  // Combined error state
  const error = localError || authError || incidentsError || voiceError;

  /**
   * Processes the chaotic input and stores the result in Firestore.
   */
  const handleProcess = async () => {
    if (!input.trim() || !user) return;
    
    setProcessing(true);
    setLocalError(null);
    try {
      const structuredData = await processChaos(input);
      const newRecord = await addIncident(structuredData, input);
      setSelectedIncident(newRecord);
      setInput('');
    } catch (err) {
      console.error("Processing error:", err);
      setLocalError("Failed to process input. Gemini might be busy or input is too chaotic.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-zinc-700 animate-pulse" aria-hidden="true" />
          <span className="text-zinc-500 font-mono text-xs tracking-widest uppercase">Initializing HumanHelpBridge...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        <div className="atmosphere" />
        
        <main className="max-w-md w-full glass-card p-8 relative z-10">
          <header className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <Layers className="w-8 h-8 text-white glow-text" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight glow-text">HumanHelpBridge</h1>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-mono">Universal Action Protocol</p>
            </div>
          </header>
          
          <div className="mb-10 rounded-2xl overflow-hidden border border-white/10 group">
            <img 
              src="https://picsum.photos/seed/rescue-operation/800/400" 
              alt="A rescue operation in progress" 
              className="w-full h-40 object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          </div>

          <p className="text-zinc-400 text-sm mb-10 leading-relaxed font-light">
            Bridging the gap between human chaos and machine precision. Convert unstructured inputs into verifiable JSON actions in real-time.
          </p>

          <button 
            onClick={login}
            className="btn-primary w-full flex items-center justify-center gap-3 group"
            aria-label="Sign in with Google"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            Initialize Protocol
          </button>
          
          <footer className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center text-[9px] text-zinc-600 font-mono uppercase tracking-widest">
            <span>v1.2.0-alpha</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              Secure Node Active
            </div>
          </footer>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-zinc-300 font-sans flex flex-col selection:bg-white/10">
      <div className="atmosphere" />
      
      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <nav className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between" aria-label="Main Navigation">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10">
              <Layers className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-tighter text-xl">HumanHelpBridge</span>
              <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Command Center // Live</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <div className="flex flex-col items-end">
                <span className="text-xs text-white font-medium">{user.displayName}</span>
                <span className="text-[9px] text-zinc-500 font-mono uppercase">{user.email?.split('@')[0]}</span>
              </div>
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt="" 
                className="w-8 h-8 rounded-full border border-white/20"
              />
            </div>
            <button 
              onClick={logout}
              className="p-2.5 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all border border-transparent hover:border-white/10"
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Input & Live Intelligence */}
        <div className="xl:col-span-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Live Feed Section */}
            <section className="glass-card p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-400" />
                  <h2 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Situational Awareness</h2>
                </div>
                <button 
                  onClick={() => setIsLiveMode(!isLiveMode)}
                  className={`text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded border transition-all ${
                    isLiveMode ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-zinc-500'
                  }`}
                >
                  {isLiveMode ? 'Disable Live' : 'Enable Live'}
                </button>
              </div>
              
              <VideoPreview active={isLiveMode} />
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-[9px] text-zinc-500 block mb-1 uppercase font-mono">Audio Stream</span>
                  <div className="flex items-center justify-between">
                    <Volume2 className="w-3 h-3 text-zinc-400" />
                    <AudioVisualizer active={isListening} />
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-[9px] text-zinc-500 block mb-1 uppercase font-mono">Signal Strength</span>
                  <div className="flex items-end gap-0.5 h-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`w-1 rounded-full bg-green-500/50`} style={{ height: `${i * 25}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions / Telemetry */}
            <section className="glass-card p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <h2 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">System Telemetry</h2>
              </div>
              
              <div className="flex-1 grid grid-cols-1 gap-3">
                {[
                  { label: 'Latency', value: '42ms', icon: Zap, color: 'text-yellow-400' },
                  { label: 'Grounding', value: 'Active', icon: Database, color: 'text-blue-400' },
                  { label: 'Encryption', value: 'AES-256', icon: ShieldAlert, color: 'text-green-400' },
                  { label: 'Node', value: 'US-EAST-1', icon: MapPin, color: 'text-purple-400' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-xs text-zinc-400">{item.label}</span>
                    </div>
                    <span className="text-xs font-mono text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Main Input Section */}
          <section className="glass-card p-8" aria-labelledby="input-heading">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="input-heading" className="text-sm font-bold text-white">Chaos Bridge</h2>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Unstructured Data Ingestion</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setInput('')}
                  className="btn-secondary py-2 px-4 text-xs"
                  aria-label="Clear input"
                >
                  Reset
                </button>
              </div>
            </div>
            
            <div className="relative">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ingest chaotic reports, medical transcripts, or emergency logs..."
                className="w-full h-56 bg-black/40 border border-white/10 rounded-2xl p-6 text-base text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/50 focus:bg-white/5 transition-all resize-none font-mono leading-relaxed"
                aria-label="Chaos Input Textarea"
              />
              
              <div className="absolute right-6 bottom-6 flex items-center gap-3">
                <button
                  onClick={toggleListening}
                  className={`p-4 rounded-2xl transition-all shadow-2xl ${
                    isListening 
                    ? 'bg-red-500 text-white animate-pulse shadow-red-500/20' 
                    : 'bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white border border-white/10'
                  }`}
                  aria-label={isListening ? "Stop voice recognition" : "Start voice recognition"}
                  aria-pressed={isListening}
                >
                  <Mic className={`w-6 h-6 ${isListening ? 'scale-110' : ''}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            {isListening && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-400 font-mono uppercase tracking-widest"
                role="status"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" aria-hidden="true" />
                Voice Stream Active // Listening for chaos...
              </motion.div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-4 text-red-400 text-sm" role="alert">
                <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-6 text-[10px] text-zinc-600 font-mono uppercase tracking-[0.2em]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" aria-hidden="true" />
                  Gemini-3-Flash
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                  Auto-Grounding
                </div>
              </div>
              
              <button 
                onClick={handleProcess}
                disabled={processing || !input.trim()}
                className={`btn-primary flex items-center gap-3 px-8 ${
                  processing || !input.trim() ? 'opacity-30' : ''
                }`}
                aria-busy={processing}
              >
                {processing ? (
                  <>
                    <Activity className="w-5 h-5 animate-spin" aria-hidden="true" />
                    Bridging...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" aria-hidden="true" />
                    Execute Bridge
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Result Display */}
          <AnimatePresence mode="wait">
            {selectedIncident && (
              <motion.section 
                key={selectedIncident.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="glass-card overflow-hidden"
                aria-labelledby="result-heading"
              >
                <div className="px-8 py-6 flex items-center justify-between border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-green-400" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 id="result-heading" className="text-lg font-bold text-white">Action Protocol Verified</h2>
                      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Incident Analysis Complete</p>
                    </div>
                  </div>
                  <UrgencyBadge level={selectedIncident.urgency_level} />
                </div>

                <div className="relative h-56 overflow-hidden border-b border-white/10">
                  <img 
                    src={`https://picsum.photos/seed/${selectedIncident.domain || 'emergency'}/1600/600`} 
                    alt={`Visual context for ${selectedIncident.domain} incident`} 
                    className="w-full h-full object-cover opacity-40 grayscale hover:grayscale-0 hover:opacity-60 transition-all duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-8">
                    <span className="text-[10px] text-blue-400 font-mono uppercase tracking-[0.3em] mb-1 block">Domain Classification</span>
                    <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">{selectedIncident.domain}</h3>
                  </div>
                </div>

                <div className="p-8 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest block">Protocol ID</span>
                      <p className="text-xs font-mono text-zinc-300 bg-white/5 p-2 rounded border border-white/10 truncate">{selectedIncident.incident_id}</p>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest block">Verified Summary</span>
                      <p className="text-base text-zinc-200 leading-relaxed font-serif italic border-l-2 border-blue-500/50 pl-6 py-1">
                        "{selectedIncident.verified_summary}"
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-zinc-500" aria-hidden="true" />
                      <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Structured Actions</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list">
                      {selectedIncident.structured_actions.map((action, idx) => (
                        <ActionCard key={idx} action={action} />
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-6">
                      <MapPin className="w-5 h-5 text-zinc-500" aria-hidden="true" />
                      <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Extracted Entities</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(selectedIncident.extracted_entities).map(([key, val]) => (
                        val && (
                          <div key={key} className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all">
                            <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-2">{key}</span>
                            <span className="text-sm text-zinc-200 font-medium">
                              {Array.isArray(val) ? val.join(', ') : String(val)}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: History & Intelligence */}
        <aside className="xl:col-span-4 space-y-8">
          <section className="glass-card flex flex-col h-[calc(100vh-14rem)] sticky top-28" aria-labelledby="history-heading">
            <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-zinc-500" aria-hidden="true" />
                <h2 id="history-heading" className="text-xs font-mono uppercase tracking-widest text-zinc-400">Bridge History</h2>
              </div>
              <span className="text-[10px] bg-white/10 text-zinc-400 px-3 py-1 rounded-full font-mono border border-white/10">
                {incidents.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar" role="list">
              {incidents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-700 p-10 text-center">
                  <FileText className="w-16 h-16 mb-6 opacity-10" aria-hidden="true" />
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em]">No bridge records</p>
                </div>
              ) : (
                incidents.map((inc) => (
                  <button
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`w-full text-left p-5 rounded-2xl transition-all border group ${
                      selectedIncident?.id === inc.id 
                      ? 'bg-white/10 border-white/20 shadow-2xl' 
                      : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
                    }`}
                    aria-current={selectedIncident?.id === inc.id ? 'true' : 'false'}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                        {inc.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} // {inc.createdAt.toDate().toLocaleDateString()}
                      </span>
                      <UrgencyBadge level={inc.urgency_level} />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-200 line-clamp-2 mb-3 group-hover:text-white transition-colors leading-tight">{inc.verified_summary}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-500" />
                        <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">{inc.domain}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-zinc-700 transition-transform group-hover:text-zinc-400 ${selectedIncident?.id === inc.id ? 'rotate-90' : ''}`} aria-hidden="true" />
                    </div>
                  </button>
                ))
              )}
            </div>
            
            <div className="p-6 border-t border-white/10 bg-black/40">
              <div className="flex items-center gap-3 text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em]">
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Encrypted Ledger // Immutable</span>
              </div>
            </div>
          </section>

          {/* Info Card */}
          <section className="glass-card p-6 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-4 h-4 text-blue-400" />
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-blue-400">Protocol Information</h3>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              HumanHelpBridge uses Gemini-3-Flash for real-time extraction. All data is grounded via Google Search and cross-referenced with local emergency protocols.
            </p>
          </section>
        </aside>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 p-10 text-center bg-black/20 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Layers className="w-5 h-5 text-zinc-700" />
            <p className="text-[9px] text-zinc-700 font-mono uppercase tracking-[0.4em]">
              HumanHelpBridge // Universal Bridge Protocol &copy; 2026
            </p>
          </div>
          <div className="flex items-center gap-8 text-[9px] text-zinc-700 font-mono uppercase tracking-widest">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Security</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
