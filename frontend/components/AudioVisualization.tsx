'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

interface AudioVisualizationProps {
    isActive: boolean;
    audioStream?: MediaStream;
    voiceActivityLevel: 'low' | 'medium' | 'high';
    className?: string;
}

interface WaveformData {
    amplitude: number;
    frequency: number;
    volume: number;
    bassLevel: number;
    trebleLevel: number;
}

export default function AudioVisualization({
    isActive,
    audioStream,
    voiceActivityLevel,
    className = ''
}: AudioVisualizationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(null);
    const audioContextRef = useRef<AudioContext>(null);
    const analyserRef = useRef<AnalyserNode>(null);
    const dataArrayRef = useRef<Uint8Array>(null);
    const [waveformData, setWaveformData] = useState<WaveformData>({
        amplitude: 0,
        frequency: 0,
        volume: 0,
        bassLevel: 0,
        trebleLevel: 0
    });

    // Initialize audio context and analyser
    const initializeAudioAnalysis = useCallback(async () => {
        if (!audioStream || !isActive) return;

        try {
            // Create audio context
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioContext = audioContextRef.current;

            // Create analyser node
            analyserRef.current = audioContext.createAnalyser();
            const analyser = analyserRef.current;

            // Configure analyser for optimal real-time performance
            analyser.fftSize = 256; // Smaller FFT size for better performance
            analyser.smoothingTimeConstant = 0.8;
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;

            // Create data array for frequency data
            const bufferLength = analyser.frequencyBinCount;
            dataArrayRef.current = new Uint8Array(bufferLength);

            // Connect audio stream to analyser
            const source = audioContext.createMediaStreamSource(audioStream);
            source.connect(analyser);

            console.log('Audio analysis initialized successfully');
        } catch (error) {
            console.error('Error initializing audio analysis:', error);
        }
    }, [audioStream, isActive]);

    // Analyze audio data and extract waveform information
    const analyzeAudioData = useCallback(() => {
        if (!analyserRef.current || !dataArrayRef.current) return;

        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;

        // Get frequency data
        analyser.getByteFrequencyData(dataArray);

        // Calculate overall volume (RMS)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const volume = Math.sqrt(sum / dataArray.length) / 255;

        // Calculate bass level (low frequencies: 0-85Hz approximately)
        const bassEnd = Math.floor(dataArray.length * 0.1);
        let bassSum = 0;
        for (let i = 0; i < bassEnd; i++) {
            bassSum += dataArray[i];
        }
        const bassLevel = (bassSum / bassEnd) / 255;

        // Calculate treble level (high frequencies: 2kHz+ approximately)
        const trebleStart = Math.floor(dataArray.length * 0.6);
        let trebleSum = 0;
        for (let i = trebleStart; i < dataArray.length; i++) {
            trebleSum += dataArray[i];
        }
        const trebleLevel = (trebleSum / (dataArray.length - trebleStart)) / 255;

        // Find dominant frequency
        let maxValue = 0;
        let maxIndex = 0;
        for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] > maxValue) {
                maxValue = dataArray[i];
                maxIndex = i;
            }
        }

        // Convert index to approximate frequency
        const nyquist = (audioContextRef.current?.sampleRate || 44100) / 2;
        const frequency = (maxIndex / dataArray.length) * nyquist;

        // Calculate amplitude with smoothing
        const amplitude = maxValue / 255;

        setWaveformData({
            amplitude,
            frequency,
            volume,
            bassLevel,
            trebleLevel
        });
    }, []);

    // Draw waveform visualization on canvas
    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        const centerY = height / 2;
        const { amplitude, volume, bassLevel, trebleLevel } = waveformData;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Create dynamic color based on voice activity and frequency content
        const baseHue = bassLevel > trebleLevel ? 200 : 280; // Blue for bass, purple for treble
        const saturation = Math.min(100, 60 + (volume * 40));
        const lightness = Math.min(80, 50 + (amplitude * 30));
        const alpha = Math.max(0.3, volume);

        const primaryColor = `hsla(${baseHue}, ${saturation}%, ${lightness}%, ${alpha})`;
        const secondaryColor = `hsla(${baseHue + 30}, ${saturation}%, ${lightness + 10}%, ${alpha * 0.7})`;

        // Draw multiple waveform layers for depth
        const numBars = 12;
        const barWidth = width / numBars;
        const maxBarHeight = height * 0.8;

        for (let i = 0; i < numBars; i++) {
            const x = i * barWidth + barWidth / 2;

            // Create physics-based movement with different frequencies
            const time = Date.now() * 0.001;
            const baseHeight = amplitude * maxBarHeight * 0.3;

            // Bass creates larger, slower waves
            const bassWave = bassLevel * Math.sin(time * 2 + i * 0.5) * maxBarHeight * 0.4;

            // Treble creates smaller, faster waves
            const trebleWave = trebleLevel * Math.sin(time * 8 + i * 1.2) * maxBarHeight * 0.2;

            // Volume affects overall intensity
            const volumeMultiplier = Math.max(0.1, volume);

            // Combine all effects
            let barHeight = (baseHeight + bassWave + trebleWave) * volumeMultiplier;

            // Add some randomness for more organic feel
            barHeight += (Math.random() - 0.5) * amplitude * 10;

            // Ensure minimum and maximum heights
            barHeight = Math.max(2, Math.min(maxBarHeight, Math.abs(barHeight)));

            // Create gradient for each bar
            const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
            gradient.addColorStop(0, primaryColor);
            gradient.addColorStop(0.5, secondaryColor);
            gradient.addColorStop(1, primaryColor);

            // Draw bar with rounded corners
            ctx.fillStyle = gradient;
            ctx.beginPath();

            // Custom rounded rectangle implementation for better browser compatibility
            const barX = x - barWidth / 4;
            const barY = centerY - barHeight / 2;
            const barW = barWidth / 2;
            const barH = barHeight;
            const radius = 2;

            ctx.moveTo(barX + radius, barY);
            ctx.lineTo(barX + barW - radius, barY);
            ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + radius);
            ctx.lineTo(barX + barW, barY + barH - radius);
            ctx.quadraticCurveTo(barX + barW, barY + barH, barX + barW - radius, barY + barH);
            ctx.lineTo(barX + radius, barY + barH);
            ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - radius);
            ctx.lineTo(barX, barY + radius);
            ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
            ctx.closePath();

            ctx.fill();

            // Add glow effect for high activity
            if (volume > 0.3) {
                ctx.shadowColor = primaryColor;
                ctx.shadowBlur = 10 * volume;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        // Draw central pulse for overall activity
        if (volume > 0.1) {
            const pulseRadius = volume * 20;
            const pulseGradient = ctx.createRadialGradient(
                width / 2, centerY, 0,
                width / 2, centerY, pulseRadius
            );
            pulseGradient.addColorStop(0, `hsla(${baseHue}, ${saturation}%, ${lightness}%, 0.6)`);
            pulseGradient.addColorStop(1, `hsla(${baseHue}, ${saturation}%, ${lightness}%, 0)`);

            ctx.fillStyle = pulseGradient;
            ctx.beginPath();
            ctx.arc(width / 2, centerY, pulseRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }, [waveformData]);

    // Animation loop for real-time visualization
    const animate = useCallback(() => {
        if (!isActive) return;

        analyzeAudioData();
        drawWaveform();

        animationFrameRef.current = requestAnimationFrame(animate);
    }, [isActive, analyzeAudioData, drawWaveform]);

    // Initialize audio analysis when component becomes active
    useEffect(() => {
        if (isActive && audioStream) {
            initializeAudioAnalysis();
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [isActive, audioStream, initializeAudioAnalysis]);

    // Start/stop animation loop
    useEffect(() => {
        if (isActive) {
            animate();
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isActive, animate]);

    // Resize canvas to match container
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    return (
        <div className={`audio-visualization-container ${className}`}>
            <canvas
                ref={canvasRef}
                className="audio-visualization-canvas"
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 'inherit',
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity 0.3s ease'
                }}
            />

            {/* Fallback static visualization for when audio analysis isn't available */}
            {isActive && !audioStream && (
                <div className="static-waveform">
                    <div className="static-waveform-bars">
                        {Array.from({ length: 12 }, (_, i) => (
                            <div
                                key={i}
                                className="static-waveform-bar"
                                style={{
                                    animationDelay: `${i * 0.1}s`,
                                    height: `${20 + Math.random() * 60}%`
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}