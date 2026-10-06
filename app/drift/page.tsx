import type { Metadata } from 'next';
import DriftGame from '@/components/drift/DriftGame';
import './drift.css';

export const metadata: Metadata = {
  title: 'Drift — a quiet jellyfish aquarium · Everwell',
  description: 'Watch jellyfish float through the dark. No goals, no timer — just slow breathing and soft light.',
};

export default function DriftPage() {
  return <DriftGame />;
}
