import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Play, Pause, Volume2, CheckCircle, Loader2 } from "lucide-react";
import { useRef, useState, useCallback, createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DemoFile {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  display_order: number;
  is_active: boolean;
}

// Global audio manager to ensure only one plays at a time
interface AudioManagerContextType {
  registerPlayer: (id: string, pause: () => void) => void;
  notifyPlaying: (id: string) => void;
}

const AudioManagerContext = createContext<AudioManagerContextType>({
  registerPlayer: () => {},
  notifyPlaying: () => {},
});

const useAudioManager = () => useContext(AudioManagerContext);

const DemoAudioPlayer = ({ demo }: { demo: DemoFile }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const { registerPlayer, notifyPlaying } = useAudioManager();

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const audioSrc = demo.file_url.startsWith('http')
    ? demo.file_url
    : `https://${projectId}.supabase.co/storage/v1/object/public/demo-files/${demo.file_url}`;

  // Register this player's pause function
  const pauseCallback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  useState(() => {
    registerPlayer(demo.id, pauseCallback);
  });

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      notifyPlaying(demo.id);
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Playback failed:', err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audioRef.current.currentTime = percentage * audioRef.current.duration;
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => setIsPlaying(false);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-lg p-6 md:p-8">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        preload="metadata"
      />

      <div className="flex items-center justify-center mb-4">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Volume2 className="w-8 h-8 md:w-10 md:h-10 text-primary" />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-foreground text-center mb-1">{demo.title}</h2>
      {demo.description && (
        <p className="text-sm text-muted-foreground text-center mb-4">{demo.description}</p>
      )}
      {!demo.description && <p className="text-sm text-muted-foreground text-center mb-4">Safal Online Academy</p>}

      {/* Progress bar */}
      <div
        className="w-full h-2 bg-muted rounded-full cursor-pointer mb-2 group"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-primary rounded-full transition-all relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mb-4">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center">
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
        >
          {isBuffering ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
};

const Demo = () => {
  const playersRef = useRef<Map<string, () => void>>(new Map());

  const registerPlayer = useCallback((id: string, pause: () => void) => {
    playersRef.current.set(id, pause);
  }, []);

  const notifyPlaying = useCallback((id: string) => {
    playersRef.current.forEach((pause, playerId) => {
      if (playerId !== id) pause();
    });
  }, []);

  const { data: demoFiles, isLoading } = useQuery({
    queryKey: ['demo-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_files')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as DemoFile[];
    },
  });

  return (
    <AudioManagerContext.Provider value={{ registerPlayer, notifyPlaying }}>
      <Helmet>
        <title>Demo Audio | Safal Online Academy</title>
        <meta name="description" content="Listen to our demo audio previews. Safal Online Academy." />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              🎧 Demo Audio
            </h1>
            <p className="text-muted-foreground">
              Listen to sample previews of our study materials
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !demoFiles || demoFiles.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <Volume2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No demo audios available yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {demoFiles.map((demo) => (
                <DemoAudioPlayer key={demo.id} demo={demo} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <CheckCircle className="w-4 h-4 text-secondary" />
              Like what you hear? Check out our full products!
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </AudioManagerContext.Provider>
  );
};

export default Demo;
