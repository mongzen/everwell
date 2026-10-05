# Everwell — Home (EN)

Next.js 14 (App Router) + Three.js. Built from the Figma file "Everwell".

## Run
    npm install
    npm run dev        # http://localhost:3000
    npm run build

## Deploy to Vercel
Option A — CLI:  `npm i -g vercel && vercel --prod`
Option B — push this folder to GitHub, then Vercel → Add New Project → Import (framework: Next.js, no settings to change).

## Effects (components/)
- FlowLines.tsx  — hero lines (cursor-reactive)
- Jellyfish.tsx  — "What we support" backdrop
- RatesReveal.tsx — pinned scroll reveal, rolling digits (THB)
- GlowField.tsx  — contact CTA ribbons + particles
All pause when off-screen, respect prefers-reduced-motion, and cap pixel ratio on mobile (lib/loop.ts).

## To finish before going live
- Replace gradient placeholders (therapist portraits, hero/trust imagery) with real photos.
- Fill Licence No., phone, e-mail, social links, company name (currently placeholders).
- Therapist names and prices are fictional placeholders.
