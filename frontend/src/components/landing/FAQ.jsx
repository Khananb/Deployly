import React, { useState } from 'react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    { q: "What is Deployly?", a: "Deployly is a cloud hosting platform that simplifies deploying Node.js apps, PHP scripts, and Static websites. It abstracts the complexity of VPS management so you can focus on writing code." },
    { q: "How is Deployly different from traditional VPS?", a: "Unlike a raw VPS where you have to manually configure Nginx, SSL, PM2, and MySQL, Deployly handles all infrastructure orchestration automatically in the background." },
    { q: "Do I get a Free SSL Certificate?", a: "Yes. Every custom domain you connect to Deployly receives an automated Let's Encrypt SSL certificate." },
    { q: "What is the Founder Edition plan?", a: "The Founder Edition is our exclusive introductory offer. It provides you with our premium features at a heavily discounted rate. Due to capacity, it is strictly limited to the first 20 customers." },
    { q: "What happens if I exceed my bandwidth?", a: "Deployly includes 1000 GB of monthly bandwidth subject to our Fair Usage Policy. If you consistently exceed this limit, our team will reach out to help you upgrade to a custom enterprise tier." }
  ];

  return (
    <section id="faq" className="landing-section fade-up delay-200" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '8rem' }}>
      <h2 className="text-center text-gradient" style={{ fontSize: '3rem', marginBottom: '3rem' }}>Frequently Asked Questions</h2>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        {faqs.map((faq, i) => (
          <div key={i} className="faq-item" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
            <div className="faq-question">
              {faq.q}
              <span style={{ color: 'var(--accent)', fontSize: '1.5rem', lineHeight: 1 }}>{openIndex === i ? '−' : '+'}</span>
            </div>
            {openIndex === i && (
              <div className="faq-answer">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
