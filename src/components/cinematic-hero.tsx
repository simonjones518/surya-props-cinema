import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import heroWide from "@/assets/hero-wide.jpg";
import heroWideVideo from "@/assets/hero-wide.mp4.asset.json";
import heroPortraitVideo from "@/assets/hero-portrait.mp4.asset.json";
import heroPortrait from "@/assets/hero-portrait.jpg";
import armory from "@/assets/stage-armory.jpg";
import camera from "@/assets/stage-camera.jpg";
import vehicles from "@/assets/stage-vehicles.jpg";
import { useIsMobile } from "@/hooks/use-mobile";

/** Optional scroll-scrubbed background videos (16:9 desktop / 9:16 mobile). */
const VIDEO_WIDE =
  (import.meta.env['VITE_HERO_VIDEO_WIDE'] as string | undefined) ?? heroWideVideo.url;
const VIDEO_PORTRAIT =
  (import.meta.env['VITE_HERO_VIDEO_PORTRAIT'] as string | undefined) ?? heroPortraitVideo.url;

const stages = [
  {
    kicker: "Stage 01",
    title: "Where Real Props Bring Stories to Life",
    body: "Surya Cine Special Props supplies screen-ready hero props to feature films, web series and ad films across India.",
    image: heroWide,
  },
  {
    kicker: "Stage 02",
    title: "Action Armory & Weapons",
    body: "Non-firing vintage revolvers, tactical loadouts, breach kits and armourer-supervised handling on set.",
    image: armory,
  },
  {
    kicker: "Stage 03",
    title: "Cinema Cameras & Sound",
    body: "Dressed ARRI and RED hero rigs, period boom poles, blimp mics and full sound-department dressing.",
    image: camera,
  },
  {
    kicker: "Stage 04",
    title: "Vintage Film Vehicles",
    body: "1970s Willys jeeps, blacked-out retro muscle cars and chase-ready units with stunt coordination.",
    image: vehicles,
  },
];

export function CinematicHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile = useIsMobile();
  const [ready, setReady] = useState(false);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });

  const bgScale = useTransform(scrollYProgress, [0, 1], isMobile ? [1.08, 1] : [1.15, 1.02]);
  const bgOpacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.9, 1],
    isMobile ? [1, 1, 0.95, 0.8] : [1, 0.75, 0.6, 0.35],
  );
  const bgRotate = useTransform(scrollYProgress, [0, 1], isMobile ? [0, -1.5] : [0, 0]);
  const bgY = useTransform(scrollYProgress, [0, 1], isMobile ? ["-2%", "2%"] : ["0%", "0%"]);
  const railWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const video = videoRef.current;
    if (!video) return;
    const d = video.duration;
    if (!d || Number.isNaN(d) || !Number.isFinite(d)) return;
    if (!video.paused) video.pause();
    video.currentTime = Math.min(d - 0.05, Math.max(0, p) * d);
  });

  const videoSrc = isMobile ? VIDEO_PORTRAIT : VIDEO_WIDE;
  const poster = isMobile ? heroPortrait : heroWide;

  return (
    <div ref={containerRef} className="relative h-[500vh] w-full">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <motion.div
          style={{ scale: bgScale, opacity: bgOpacity, rotate: bgRotate, y: bgY }}
          className="absolute inset-0"
        >
          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              poster={poster}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0.01;
                setReady(true);
              }}
              className="size-full object-cover"
            />
          ) : (
            <img
              src={poster}
              alt="Surya Cine Special Props warehouse lit in gold light"
              width={isMobile ? 720 : 1920}
              height={isMobile ? 1280 : 1080}
              className="size-full object-cover"
            />
          )}
        </motion.div>

        {/* Light scrim so the footage stays clearly visible on mobile */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/25 to-background/10 md:from-background md:via-background/55 md:to-background/25" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent" />
        {!ready && videoSrc ? <span className="sr-only">Loading hero footage</span> : null}

        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center px-5 sm:px-8">
          {stages.map((stage, i) => (
            <StageCard
              key={stage.kicker}
              stage={stage}
              index={i}
              progress={scrollYProgress}
              isMobile={isMobile}
            />
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-6 sm:px-8">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            <div className="h-px flex-1 bg-border">
              <motion.div style={{ width: railWidth }} className="h-px bg-gradient-to-r from-primary to-amber-neon" />
            </div>
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Scroll <ArrowDown className="size-3.5 animate-bounce" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageCard({
  stage,
  index,
  progress,
  isMobile,
}: {
  stage: (typeof stages)[number];
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  isMobile: boolean;
}) {
  const span = 1 / stages.length;
  const start = index * span;
  const end = start + span;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const range = [
    clamp(start - 0.06),
    clamp(start + 0.05),
    clamp(end - 0.07),
    clamp(Math.min(end + 0.02, 1)),
  ];
  const isFirst = index === 0;
  const isLast = index === stages.length - 1;
  const opacity = useTransform(progress, range, [isFirst ? 1 : 0, 1, 1, isLast ? 1 : 0]);
  const y = useTransform(
    progress,
    [range[0]!, range[3]!],
    isMobile ? [isFirst ? 0 : 110, -110] : [isFirst ? 0 : 70, -70],
  );
  const scale = useTransform(progress, range, isMobile ? [0.92, 1, 1, 0.92] : [1, 1, 1, 1]);
  const rotate = useTransform(progress, range, isMobile ? [4, 0, 0, -4] : [0, 0, 0, 0]);
  const blur = useTransform(progress, range, [
    isFirst ? "blur(0px)" : "blur(8px)",
    "blur(0px)",
    "blur(0px)",
    isLast ? "blur(0px)" : "blur(8px)",
  ]);

  return (
    <motion.article
      style={{ opacity, y, scale, rotate, filter: blur }}
      className="absolute left-5 right-5 max-w-2xl sm:left-8 sm:right-8"
    >
      <div className="glass-panel shadow-cine rounded-xl border border-primary/25 p-5 sm:p-9">
        <p className="text-[11px] font-bold uppercase tracking-[0.38em] text-primary">{stage.kicker}</p>
        {index === 0 ? (
          <h1 className="mt-3 text-4xl leading-[0.95] sm:text-6xl lg:text-7xl">
            <span className="text-gradient-gold">Surya Cine Special Props</span>
            <span className="mt-2 block text-2xl text-foreground sm:text-4xl lg:text-5xl">
              {stage.title}
            </span>
          </h1>
        ) : (
          <h2 className="mt-3 text-3xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl">
            {stage.title}
          </h2>
        )}
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {stage.body}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/catalog"
            className="glow-gold inline-flex items-center rounded-md bg-gradient-to-r from-primary to-amber-neon px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            Browse Props
          </Link>
          <Link
            to="/admin"
            className="inline-flex items-center rounded-md border border-primary/40 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary transition-colors hover:border-primary hover:bg-primary/10"
          >
            Admin ERP
          </Link>
        </div>
      </div>
    </motion.article>
  );
}