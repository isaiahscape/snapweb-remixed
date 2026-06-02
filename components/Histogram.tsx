import React, { useEffect, useRef } from 'react';

interface HistogramProps {
  imageData: ImageData | null;
}

const Histogram: React.FC<HistogramProps> = ({ imageData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageData || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    ctx.clearRect(0, 0, width, height);

    const data = imageData.data;
    const step = 4; // Sampling step for performance

    const rCounts = new Array(256).fill(0);
    const gCounts = new Array(256).fill(0);
    const bCounts = new Array(256).fill(0);
    let maxCount = 0;

    for (let i = 0; i < data.length; i += step * 4) {
      rCounts[data[i]]++;
      gCounts[data[i + 1]]++;
      bCounts[data[i + 2]]++;
    }

    maxCount = Math.max(
      ...rCounts, ...gCounts, ...bCounts
    );

    const drawChannel = (counts: number[], color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalCompositeOperation = 'screen'; // Blend mode for overlap
      
      for (let i = 0; i < 256; i++) {
        const pct = counts[i] / maxCount;
        const x = (i / 255) * width;
        const y = height - (pct * height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawChannel(rCounts, 'rgba(255, 50, 50, 0.8)');
    drawChannel(gCounts, 'rgba(50, 255, 50, 0.8)');
    drawChannel(bCounts, 'rgba(50, 50, 255, 0.8)');
    
    // Reset composite
    ctx.globalCompositeOperation = 'source-over';

  }, [imageData]);

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800 p-2 shadow-lg">
      <canvas 
        ref={canvasRef} 
        width={256} 
        height={80} 
        className="w-full h-16 block"
      />
    </div>
  );
};

export default Histogram;