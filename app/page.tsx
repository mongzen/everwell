import Nav from '@/components/Nav';
import SoundToggle from '@/components/SoundToggle';
import SupportList from '@/components/SupportList';
import SupportOutro from '@/components/SupportOutro';
import TeamSlider from '@/components/TeamSlider';
import RatesReveal from '@/components/RatesReveal';
import BreatheInvite from '@/components/BreatheInvite';
import { FlowLines, Jellyfish, OrganicGradient, GlowField } from '@/components/Effects';

const TRUST = [
  ['01 — Credentials', 'Qualified in Thailand', 'Every clinician holds a valid professional license in Thailand.', '/icons/trust-credentials.svg'],
  ['02 — Coverage', 'Insurance accepted', 'We check your benefits before your first session.', '/icons/trust-coverage.svg'],
  ['03 — Hours', 'Evenings & weekends', 'Sessions Monday–Saturday, 08:00–20:00 (Thailand time).', '/icons/trust-hours.svg'],
];
const STEPS = [
  ['01', 'Tell us a little', 'Share a few details in a short, confidential form. We reply within one business day.', 'img_step_1.webp'],
  ['02', 'Get matched', 'We pair you with a qualified psychologist whose experience fits what you\'re looking for.', 'img_step_2.webp'],
  ['03', 'Begin when ready', 'Meet on secure video from home. There\'s no pressure to have it all figured out.', 'img_step_3.webp'],
] as const;

export default function Home() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        {/* HERO */}
        <section className="hero" id="top">
          <img className="hero__bg" src="/images/img_hero_bg.webp" width="2880" height="1800" alt="" />
          <div className="hero__glow"><FlowLines /></div>
          <div className="hero__scrim" />
          <div className="hero__inner">
            <div className="hero__text">
              <p className="label hero__eyebrow">Online therapy · Qualified in Thailand</p>
              <h1>A calmer place to begin.</h1>
              <p className="hero__sub">Secure online therapy with qualified Thai psychologists for adults, teens, couples and families — in Thai or English, at a pace that feels right for you.</p>
              <p className="hero__note">New clients welcome · Private insurance accepted · Evening &amp; weekend sessions</p>
            </div>
            <div className="hero__ctas">
              <a className="glass btn" href="#contact"><span className="label">Book an appointment</span></a>
              <a className="textbtn textbtn--light" href="#psychologists"><span className="label">Meet our team</span><i /></a>
            </div>
            <SoundToggle />
          </div>
        </section>

        {/* TRUST */}
        <section className="trust">
          <div className="fx-bg"><OrganicGradient variant="trust" /></div>
          {TRUST.map(([k, t, d, icon]) => (
            <div className="trust__item" key={k}>
              <div className="trust__icon"><img src={icon} width={36} height={36} alt="" /></div>
              <div className="trust__text">
                <p className="label trust__k">{k}</p>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </section>

        {/* SUPPORT */}
        <section className="support" id="services">
          <SupportOutro />
          <div className="slist-wrap">
            <div className="slist-bg"><Jellyfish /></div>
            <div className="slist-layout">
              <div className="slist-head">
                <p className="label slist-head__eyebrow">What we support</p>
                <h2>Support for what you're carrying.</h2>
                <p className="lead">Not sure what to call it? That's okay. We'll figure it out together, at your pace.</p>
              </div>
              <SupportList />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="how">
          <img className="how__bg" src="/images/how_it_works_frame_fill_.webp" width="2880" height="2446" alt="" />
          <div className="how__scrim" />
          <div className="how__head"><p className="label">How it works</p><h2>Getting started takes three small steps.</h2></div>
          <div className="steps">
            {STEPS.map(([n, t, d, img]) => (
              <article className="step" key={n}>
                <div className="step__top">
                  <span className="step__n">{n}</span>
                  <div className="step__visual">
                    <img alt="" src={`/images/${img}`} width={420} height={540} className="cover" />
                  </div>
                </div>
                <div className="step__info">
                  <h3>{t}</h3>
                  <div className="step__desc"><p>{d}</p><span aria-hidden="true">→</span></div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* TEAM */}
        <section className="team" id="psychologists">
          <div className="fx-bg"><OrganicGradient variant="team" /></div>
          <div className="team__head"><h2>Meet our therapists</h2><a className="label" href="#psychologists">View full team →</a></div>
          <TeamSlider />
        </section>

        {/* RATES */}
        <section className="rates" id="fees">
          <div className="rates__head"><p className="label">Service fees</p><h2>Clear, upfront fees.</h2></div>
          <RatesReveal />
          <a className="outline btn" href="#contact"><span className="label">See rates &amp; insurance</span></a>
        </section>

        {/* PAUSE — Drift invite */}
        <BreatheInvite />

        {/* CONTACT */}
        <section className="cta" id="contact">
          <div className="cta__fx"><GlowField /></div>
          <h2>Ready when you are.</h2>
          <p className="lead cta__p">Book a free 15-minute consultation. No pressure, no commitment — just a conversation to help you find the right fit.</p>
          <div className="cta__btns">
            <a className="solid btn" href="mailto:hello@everwell.example"><span className="label">Book an appointment</span></a>
            <a className="textbtn textbtn--dark" href="mailto:hello@everwell.example"><span className="label">Send a message</span><i /></a>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer__cols">
          <p className="footer__tagline">Warm, confidential online therapy with qualified psychologists in Thailand for adults, teens, couples and families.</p>
          <div className="footer__links">
            <div><h4 className="label">Menu</h4><a href="#psychologists">Psychologists</a><a href="#fees">Service fees</a><a href="#services">Services</a><a href="#contact">Contact us</a></div>
            <div><h4 className="label">Contact us</h4><a href="mailto:hello@everwell.example">hello@everwell.example</a><a href="tel:021234567">02 123 4567</a><span>Mon–Sat · 08:00–20:00 (ICT)</span></div>
            <div><h4 className="label">Team</h4><a href="mailto:hello@everwell.example">hello@everwell.example</a><a href="#" className="theme-purchase"><span>Buy this theme</span></a></div>
            <div><h4 className="label">Follow</h4>{['Facebook', 'Instagram', 'LINE', 'YouTube'].map((s) => <a key={s} href="#">{s}</a>)}</div>
          </div>
        </div>
        <p className="footer__theme-info">Interested in this design? <a href="mailto:hello@everwell.example" className="theme-contact-btn">Contact us</a> to purchase this theme.</p>
        <p className="footer__crisis">If you are in crisis or need immediate help, call the Department of Mental Health hotline <a href="tel:1323">1323</a> (24 hours) or <a href="tel:1669">1669</a></p>
        <p className="footer__word" aria-hidden="true">Everwell</p>
        <hr className="footer__rule" />
        <div className="footer__bottom"><span>© 2026 Everwell Therapy Co., Ltd. · Licence No. [to be added] · Privacy Policy · Terms of Service</span><a className="label" href="#top">Back to top</a></div>
      </footer>
    </>
  );
}
