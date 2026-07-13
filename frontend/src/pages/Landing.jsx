import React from 'react';
import LandingNav from '../components/landing/LandingNav';
import Hero from '../components/landing/Hero';
import TrustedBy from '../components/landing/TrustedBy';
import Features from '../components/landing/Features';
import WhyDeployly from '../components/landing/WhyDeployly';
import Pricing from '../components/landing/Pricing';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';
import '../index.css';

export default function Landing() {
  return (
    <div className="landing-container">
      <LandingNav />
      <Hero />
      <TrustedBy />
      <Features />
      <WhyDeployly />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}

