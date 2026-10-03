import React, { useEffect, useRef } from 'react';

interface SnowfallCanvasProps {
  active?: boolean;
}

interface Flake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wind: number;
  alpha: number;
  swaySpeed: number;
  swayAngle: number;
}

export const SnowfallCanvas: React.FC<SnowfallCanvasProps> = ({ active = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate flakes
    const flakeCount = Math.min(80, Math.floor(width / 16));
    const flakes: Flake[] = [];

    for (let i = 0; i < flakeCount; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.8,
        speed: Math.random() * 0.8 + 0.5,
        wind: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.25,
        swaySpeed: Math.random() * 0.02 + 0.01,
        swayAngle: Math.random() * Math.PI * 2
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < flakes.length; i++) {
        const flake = flakes[i];

        flake.swayAngle += flake.swaySpeed;
        flake.x += Math.sin(flake.swayAngle) * 0.5 + flake.wind;
        flake.y += flake.speed;

        // Wrap around
        if (flake.y > height) {
          flake.y = -5;
          flake.x = Math.random() * width;
        }
        if (flake.x > width + 5) {
          flake.x = -5;
        } else if (flake.x < -5) {
          flake.x = width + 5;
        }

        // Draw snowflake circle
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = `rgba(224, 242, 254, ${flake.alpha})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(186, 230, 253, 0.4)';
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-10 opacity-75"
    />
  );
};
