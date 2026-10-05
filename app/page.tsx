import Nav from '@/components/Nav';
import SupportList from '@/components/SupportList';
import TeamSlider from '@/components/TeamSlider';
import RatesReveal from '@/components/RatesReveal';
import { FlowLines, Jellyfish, GlowField } from '@/components/Effects';

const MARQUEE = ['Qualified psychologists', 'Online consultation across Thailand', 'Evenings & weekends', 'Insurance accepted', 'Begin when ready'];

export default function Home() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        {/* HERO */}
        <section className="hero" id="top">
          <FlowLines />
          <div className="hero-copy">
            <div className="eyebrow light">Online therapy · Qualified in Thailand</div>
            <h1>A calmer place to begin.</h1>
            <p>Secure online therapy with qualified Thai psychologists for adults, teens, couples and families — in Thai or English, at a pace that feels right for you.</p>
            <div className="hero-note">New clients welcome · Private insurance accepted · Evening &amp; weekend sessions</div>
            <div className="hero-ctas">
              <a className="btn btn-light" href="#contact">Book a consultation</a>
              <a className="link-light" href="#services">How it works</a>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="trust">
          {[
            ['01 — Credentials', 'Qualified in Thailand', 'Our psychologists are trained in Thailand, and clinical psychologists hold a verifiable professional licence.'],
            ['02 — Coverage', 'Insurance accepted', 'We check your benefits before your first session.'],
            ['03 — Hours', 'Evenings & weekends', 'Sessions Monday–Saturday, 08:00–20:00 (Thailand time).'],
          ].map(([k, t, d]) => (
            <div className="trust-item" key={k}>
              <div className="trust-icon" aria-hidden="true" />
              <div className="eyebrow">{k}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </section>

        {/* SUPPORT */}
        <section className="support" id="services">
          <Jellyfish />
          <div className="outro">
            <div className="outro-marquee" aria-hidden="true"><div className="track">{Array.from({ length: 10 }, (_, i) => <span key={i}>Support</span>)}</div></div>
            <div className="outro-center" aria-hidden="true" />
            <div className="outro-cap"><span>Anxiety · Depression · Trauma · Couples · Grief · Life transitions</span><span className="eyebrow">8 areas of care</span></div>
            <blockquote>“Not sure what to call it? That’s okay. We’ll figure it out together, at your pace.”<footer className="eyebrow">/ Everwell care team</footer></blockquote>
          </div>
          <div className="support-body">
            <div className="support-head">
              <div className="eyebrow">What we support</div>
              <h2>Support for what you’re carrying.</h2>
              <p>Not sure what to call it? That’s okay. We’ll figure it out together, at your pace.</p>
            </div>
            <SupportList />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="how">
          <div className="section-head"><div className="eyebrow light">How it works</div><h2>Getting started takes three small steps.</h2></div>
          <div className="steps">
            {[
              ['01', 'Tell us a little', 'Share a few details in a short, confidential form. We reply within one business day.'],
              ['02', 'Get matched', 'We pair you with a qualified psychologist whose experience fits what you’re looking for.'],
              ['03', 'Begin when ready', 'Meet on secure video from home. There’s no pressure to have it all figured out.'],
            ].map(([n, t, d], i) => (
              <article className="step" key={n}>
                <div className="step-top"><span>{n}</span><div className={`step-visual v${i}`} aria-hidden="true"><i /><i /></div></div>
                <h3>{t}</h3>
                <div className="step-desc"><p>{d}</p><span aria-hidden="true">→</span></div>
              </article>
            ))}
          </div>
        </section>

        {/* TEAM */}
        <section className="team" id="psychologists">
          <div className="section-head row"><h2>Meet our therapists</h2><a className="link-dark" href="#psychologists">View full team →</a></div>
          <TeamSlider />
        </section>

        {/* MARQUEE */}
        <section className="marquee" aria-hidden="true">
          <div className="track">
            {[...MARQUEE, ...MARQUEE, ...MARQUEE].map((t, i) => <span key={i}>{t}<i /></span>)}
          </div>
        </section>

        <RatesReveal />

        {/* CONTACT */}
        <section className="cta" id="contact">
          <GlowField />
          <div className="cta-copy">
            <h2>Ready when you are.</h2>
            <p>Book a free 15-minute consultation. No pressure, no commitment — just a conversation to help you find the right fit.</p>
            <div className="cta-btns">
              <a className="btn btn-dark" href="mailto:hello@everwell.example">Book a consultation</a>
              <a className="btn btn-ghost" href="mailto:hello@everwell.example">Send a message</a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand"><div className="logo">Everwell</div><p>Warm, confidential online therapy with qualified psychologists in Thailand for adults, teens, couples and families.</p></div>
          <div><h4>Menu</h4><ul><li><a href="#psychologists">Psychologists</a></li><li><a href="#fees">Service fees</a></li><li><a href="#services">Services</a></li><li><a href="#contact">Contact us</a></li></ul></div>
          <div><h4>Contact us</h4><ul><li><a href="mailto:hello@everwell.example">hello@everwell.example</a></li><li><a href="tel:021234567">02 123 4567</a></li><li>Mon–Sat · 08:00–20:00 (ICT)</li></ul></div>
          <div><h4>Follow</h4><ul>{['Facebook', 'Instagram', 'LINE', 'YouTube'].map((s) => <li key={s}><a href="#">{s}</a></li>)}</ul></div>
        </div>
        <p className="crisis">If you are in crisis or need immediate help, call the Department of Mental Health hotline <a href="tel:1323">1323</a> (24 hours) or <a href="tel:1669">1669</a> for medical emergencies. Everwell is not an emergency service.</p>
        <div className="footer-bottom"><span>© 2026 Everwell Therapy Co., Ltd. · Licence No. [to be added] · Privacy Policy · Terms of Service</span><a href="#top">Back to top ↑</a></div>
      </footer>
    </>
  );
}
