import React, { useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  getDocFromServer,
  doc
} from 'firebase/firestore';
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
  Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { processChaos, IncidentData } from './services/gemini';

// --- Types ---
interface IncidentRecord extends IncidentData {
  id: string;
  createdAt: Timestamp;
  raw_input: string;
  uid: string;
}

// --- Components ---

const UrgencyBadge = ({ level }: { level: number }) => {
  const colors = [
    'bg-gray-100 text-gray-600',
    'bg-blue-100 text-blue-600',
    'bg-yellow-100 text-yellow-600',
    'bg-orange-100 text-orange-600',
    'bg-red-100 text-red-600',
    'bg-red-200 text-red-800 font-bold animate-pulse'
  ];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${colors[level] || colors[0]}`}>
      Level {level}
    </span>
  );
};

function ActionCard({ action }: { action: any }) {
  return (
    <div className="border border-zinc-800 bg-zinc-900/50 p-3 rounded-lg mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{action.target_system}</span>
        <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">{action.action_type}</span>
      </div>
      <pre className="text-[11px] text-zinc-400 font-mono overflow-x-auto p-2 bg-black/30 rounded border border-zinc-800/50">
        {JSON.stringify(action.payload_to_send, null, 2)}
      </pre>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // --- Auth & Connection Test ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (err) {
        if (err instanceof Error && err.message.includes('the client is offline')) {
          console.error("Firebase connection error: Client is offline.");
          setError("Database connection failed. Please check your configuration.");
        }
      }
    };
    testConnection();

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setError(`Voice error: ${event.error}`);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }

    return () => unsubscribe();
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    if (!user) {
      setIncidents([]);
      return;
    }

    const q = query(
      collection(db, 'incidents'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as IncidentRecord[];
      setIncidents(records);
    }, (err) => {
      console.error("Firestore error:", err);
      setError("Failed to fetch records. Check security rules.");
    });

    return () => unsubscribe();
  }, [user]);

  // --- Handlers ---
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    }
  };

  const handleLogout = () => signOut(auth);

  const toggleListening = () => {
    if (!recognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      setError(null);
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech start error:", e);
        setError("Could not start voice recognition.");
      }
    }
  };

  const handleProcess = async () => {
    if (!input.trim() || !user) return;
    
    setProcessing(true);
    setError(null);
    try {
      const structuredData = await processChaos(input);
      
      const record = {
        ...structuredData,
        raw_input: input,
        uid: user.uid,
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'incidents'), record);
      setSelectedIncident({ id: docRef.id, ...record } as IncidentRecord);
      setInput('');
    } catch (err) {
      console.error("Processing error:", err);
      setError("Failed to process input. Gemini might be busy or input is too chaotic.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-zinc-700 animate-pulse" />
          <span className="text-zinc-500 font-mono text-xs tracking-widest uppercase">Initializing HumanHelpBridge...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 z-0 opacity-20">
          <img 
            src="https://picsum.photos/seed/command-center/1920/1080?blur=2" 
            alt="Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-transparent to-zinc-950" />
        </div>

        <div className="max-w-md w-full border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-zinc-800 rounded-xl">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">HumanHelpBridge</h1>
              <p className="text-zinc-500 text-xs uppercase tracking-widest">Universal Action Protocol</p>
            </div>
          </div>
          
          <div className="mb-8 rounded-xl overflow-hidden border border-zinc-800">
            <img 
              src="https://picsum.photos/seed/rescue-operation/800/400" 
              alt="Rescue Operation" 
              className="w-full h-32 object-cover grayscale hover:grayscale-0 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
          </div>

          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            Convert messy, unstructured human inputs into structured, verifiable, life-saving JSON actions.
          </p>

          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all group"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Authenticate with Google
          </button>
          
          <div className="mt-8 pt-8 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
            <span>v1.0.4-stable</span>
            <span>Secure Protocol Active</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col">
      {/* Header */}
      <header className="border-bottom border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-white" />
            <span className="font-bold text-white tracking-tighter text-lg">HumanHelpBridge</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-white font-medium">{user.displayName}</span>
              <span className="text-[10px] text-zinc-500 font-mono">{user.email}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input & Processing */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-zinc-500" />
                <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Human Chaos Input</h2>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setInput('')}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 font-mono uppercase tracking-widest transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="relative group">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type messy text, medical logs, or disaster reports..."
                className="w-full h-48 bg-black/30 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors resize-none font-mono"
              />
              
              <div className="absolute right-4 bottom-4 flex items-center gap-2">
                <button
                  onClick={toggleListening}
                  className={`p-3 rounded-full transition-all ${
                    isListening 
                    ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                  title={isListening ? "Stop Listening" : "Start Voice Prompt"}
                >
                  <Activity className={`w-5 h-5 ${isListening ? 'animate-bounce' : ''}`} />
                </button>
              </div>
            </div>

            {isListening && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 text-[10px] text-red-400 font-mono uppercase tracking-widest"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                Voice Protocol Active: Listening for chaos...
              </motion.div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-center gap-3 text-red-400 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Gemini-3-Flash Ready
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3" />
                  Encrypted
                </div>
              </div>
              
              <button 
                onClick={handleProcess}
                disabled={processing || !input.trim()}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                  processing || !input.trim() 
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                  : 'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {processing ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Bridge to Structure
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
              >
                <div className="bg-zinc-800/50 px-6 py-4 flex items-center justify-between border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <h2 className="font-bold text-white">Verified Action Protocol</h2>
                  </div>
                  <UrgencyBadge level={selectedIncident.urgency_level} />
                </div>

                <div className="h-40 overflow-hidden border-b border-zinc-800">
                  <img 
                    src={`https://picsum.photos/seed/${selectedIncident.domain || 'emergency'}/1200/400`} 
                    alt="Incident Context" 
                    className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-1000"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Incident ID</span>
                      <p className="text-xs font-mono text-zinc-300">{selectedIncident.incident_id}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Domain</span>
                      <p className="text-xs font-mono text-zinc-300 uppercase">{selectedIncident.domain}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Verified Summary</span>
                    <p className="text-sm text-zinc-200 leading-relaxed italic border-l-2 border-zinc-700 pl-4 py-1">
                      "{selectedIncident.verified_summary}"
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-zinc-500" />
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Structured Actions</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedIncident.structured_actions.map((action, idx) => (
                        <div key={idx} className="border border-zinc-800 bg-zinc-900/50 p-3 rounded-lg mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{action.target_system}</span>
                            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">{action.action_type}</span>
                          </div>
                          <pre className="text-[11px] text-zinc-400 font-mono overflow-x-auto p-2 bg-black/30 rounded border border-zinc-800/50">
                            {JSON.stringify(action.payload_to_send, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-zinc-500" />
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Extracted Entities</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedIncident.extracted_entities).map(([key, val]) => (
                        val && (
                          <div key={key} className="bg-zinc-800/50 border border-zinc-700/50 px-3 py-1.5 rounded-lg">
                            <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">{key}</span>
                            <span className="text-xs text-zinc-300">
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

        {/* Right Column: History */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-[calc(100vh-12rem)] shadow-xl sticky top-24">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-500" />
                <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Incident History</h2>
              </div>
              <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-mono">
                {incidents.length} Records
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {incidents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-700 p-8 text-center">
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-xs font-mono uppercase tracking-widest">No bridge records found</p>
                </div>
              ) : (
                incidents.map((inc) => (
                  <button
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`w-full text-left p-4 rounded-xl transition-all border ${
                      selectedIncident?.id === inc.id 
                      ? 'bg-zinc-800 border-zinc-700 shadow-lg' 
                      : 'bg-transparent border-transparent hover:bg-zinc-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                        {inc.createdAt.toDate().toLocaleDateString()} {inc.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <UrgencyBadge level={inc.urgency_level} />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-200 line-clamp-1 mb-1">{inc.verified_summary}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">{inc.domain}</span>
                      <ChevronRight className={`w-4 h-4 text-zinc-700 transition-transform ${selectedIncident?.id === inc.id ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/30 rounded-b-2xl">
              <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                <ShieldAlert className="w-3 h-3" />
                <span>All actions logged to BigQuery Protocol</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 p-6 text-center">
        <p className="text-[10px] text-zinc-700 font-mono uppercase tracking-[0.3em]">
          HumanHelpBridge Universal Bridge Protocol &copy; 2026 // Secure Action Extraction
        </p>
      </footer>
    </div>
  );
}
