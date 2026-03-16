import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Play, Pause, Volume2, Loader2, ArrowLeft, Share2, CheckCircle } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface DemoFile {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  display_order: number;
  is_active: boolean;
}

const isVideoFile = (fileName: string) => /\.(mp4|webm|mov)$/i.test(fileName);

const DemoSingle = () => {
  const { id } = useParams<{ id: string }>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  const { data: demo, isLoading } = useQuery({
    queryKey: ['demo-file', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_files')
        .select('*')
        .eq('id', id!)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data as DemoFile;
    },
    enabled: !!id,
  });

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const audioSrc = demo
    ? demo.file_url.startsWith('http')
      ? demo.file_url
      : `https://${projectId}.supabase.co/storage/v1/object/public/demo-files/${demo.file_url}`
    : '';

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
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
    audioRef.current.currentTime = (x / rect.width) * audioRef.current.duration;
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: demo?.title || 'Demo Audio', url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Demo URL copied to clipboard." });
    }
  };

  return (
    <>
      <Helmet>
        <title>{demo ? `${demo.title} - Demo` : 'Demo Audio'} | Safal Online Academy</title>
        <meta name="description" content={demo?.description || "Listen to a demo audio preview from Safal Online Academy."} />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container max-w-2xl mx-auto px-4">
          <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All Demos
          </Link>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !demo ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <Volume2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Demo not found or no longer available</p>
              <Link to="/demo" className="text-sm text-primary hover:underline mt-2 inline-block">
                Browse all demos
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card shadow-lg p-6 md:p-10">
              {isVideoFile(demo.file_name) ? (
                <>
                  <h1 className="text-xl md:text-2xl font-bold text-foreground text-center mb-1">
                    {demo.title}
                  </h1>
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    {demo.description || "Safal Online Academy"}
                  </p>
                  <video
                    src={audioSrc}
                    controls
                    preload="metadata"
                    className="w-full rounded-xl"
                    controlsList="nodownload"
                  />
                </>
              ) : (
                <>
                  <audio
                    ref={audioRef}
                    src={audioSrc}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
                    onEnded={() => setIsPlaying(false)}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => setIsBuffering(false)}
                    preload="metadata"
                  />

                  <div className="flex items-center justify-center mb-6">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Volume2 className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                    </div>
                  </div>

                  <h1 className="text-xl md:text-2xl font-bold text-foreground text-center mb-1">
                    {demo.title}
                  </h1>
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    {demo.description || "Safal Online Academy"}
                  </p>

                  <div
                    className="w-full h-2.5 bg-muted rounded-full cursor-pointer mb-2 group"
                    onClick={handleSeek}
                  >
                    <div
                      className="h-full bg-primary rounded-full transition-all relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-6">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={togglePlay}
                      className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
                    >
                      {isBuffering ? (
                        <Loader2 className="w-7 h-7 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="w-7 h-7" />
                      ) : (
                        <Play className="w-7 h-7 ml-0.5" />
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Share button */}
              <div className="flex justify-center mt-6">
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share Demo
                </Button>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <CheckCircle className="w-4 h-4 text-secondary" />
              Like what you hear? Check out our full products!
            </p>
            <Link to="/products" className="text-sm text-primary hover:underline mt-1 inline-block">
              View Products →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default DemoSingle;
