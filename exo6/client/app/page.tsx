"use client";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Stroke {
  points: { x: number; y: number }[];
  progress: number;
  opacity: number;
  fadeOut: boolean;
  width: number;
}

const AnimatedCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let strokes: Stroke[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const createStroke = (): Stroke => {
      const numPoints = 8 + Math.floor(Math.random() * 12);
      const points: { x: number; y: number }[] = [];

      const margin = 150;
      const startX = margin + Math.random() * (canvas.width - margin * 2);
      const startY = margin + Math.random() * (canvas.height - margin * 2);

      const direction = Math.random() * Math.PI * 2;
      const baseLength = 150 + Math.random() * 250;

      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const angle = direction + (Math.random() - 0.5) * 0.6;
        const length = baseLength * t;
        const wobble = (Math.random() - 0.5) * 40 * t;

        points.push({
          x: startX + Math.cos(angle) * length + wobble,
          y: startY + Math.sin(angle) * length + wobble,
        });
      }

      return {
        points,
        progress: 0,
        opacity: 0.35 + Math.random() * 0.25,
        fadeOut: false,
        width: 1.5 + Math.random() * 1,
      };
    };

    const drawStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;

      const visiblePoints = Math.floor(stroke.points.length * stroke.progress);
      if (visiblePoints < 2) return;

      ctx.strokeStyle = `rgba(96, 96, 96, ${stroke.opacity})`;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < visiblePoints; i++) {
        const xc = (stroke.points[i].x + stroke.points[i - 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i - 1].y) / 2;
        ctx.quadraticCurveTo(
          stroke.points[i - 1].x,
          stroke.points[i - 1].y,
          xc,
          yc
        );
      }

      if (visiblePoints === stroke.points.length) {
        const last = stroke.points[stroke.points.length - 1];
        ctx.lineTo(last.x, last.y);
      }

      ctx.stroke();
    };

    const animate = () => {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (strokes.length < 6 && Math.random() < 0.025) {
        strokes.push(createStroke());
      }

      strokes = strokes.filter((stroke) => {
        if (!stroke.fadeOut) {
          stroke.progress += 0.015;

          if (stroke.progress >= 1) {
            stroke.fadeOut = true;
          }
        } else {
          stroke.opacity -= 0.008;
          if (stroke.opacity <= 0) return false;
        }

        drawStroke(stroke);
        return true;
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
};

export default function Home() {
  return (
    <div className="dark min-h-screen">
      <AnimatedCanvas />
      <main className="flex min-h-screen flex-col items-center relative z-10">
        <div className="w-full pb-24 pt-6 pr-6 flex justify-end">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-foreground hover:underline font-medium"
            >
              Log in
            </Link>
          </p>
        </div>
        <div className="w-full max-w-3xl items-center justify-center flex-col font-mono gap-8 text-sm lg:flex px-4">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-zinc-200">
              Colla&apos;Board
            </h1>
            <p className="text-muted-foreground text-xl">
              A collaborative whiteboard application
            </p>
            <p className="text-muted-foreground max-w-md mx-auto">
              Create or join a board to start collaborating in real-time with
              your team!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link href="/create">
              <Button variant="default" size="lg">
                Create Board
              </Button>
            </Link>
            <Link href="/join">
              <Button variant="outline" size="lg">
                Join Board
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
