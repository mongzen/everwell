'use client';
import dynamic from 'next/dynamic';
// Three.js is loaded lazily, client-side only, so first paint stays fast.
export const FlowLines = dynamic(() => import('./FlowLines'), { ssr: false });
export const Jellyfish = dynamic(() => import('./Jellyfish'), { ssr: false });
export const GlowField = dynamic(() => import('./GlowField'), { ssr: false });
