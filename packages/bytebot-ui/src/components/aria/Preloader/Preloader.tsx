"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import "./preloader.css";

interface PreloaderProps {
  onComplete?: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Safety check for SSR
    if (typeof window === 'undefined') return;
    
    // Prevent scrolling during preloader
    document.body.style.overflow = "hidden";

    const tl = gsap.timeline({
      delay: 0.3,
      onComplete: () => {
        setIsComplete(true);
        document.body.style.overflow = "";
        // Call the callback after a small delay to ensure DOM is ready
        setTimeout(() => {
          onComplete?.();
        }, 100);
      },
    });

    // Animate progress bar
    tl.to(".preloader-progress-bar", {
      scaleX: 1,
      duration: 3,
      ease: "power3.out",
    })
      // Fade out progress
      .to(
        ".preloader-progress",
        {
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
        },
        "+=0.2"
      )
      // Scale up mask
      .to(
        ".preloader-mask",
        {
          scale: 6,
          duration: 2.5,
          ease: "power3.out",
        },
        "<"
      )
      // Fade out mask
      .to(
        ".preloader-mask",
        {
          opacity: 0,
          duration: 0.5,
        },
        "+=0.5"
      );

    return () => {
      tl.kill();
      document.body.style.overflow = "";
    };
  }, []);

  if (isComplete) return null;

  return (
    <div className="preloader-wrapper">
      <div className="preloader-progress">
        <div className="preloader-progress-bar"></div>
        <div className="preloader-logo">
          <h1 suppressHydrationWarning dangerouslySetInnerHTML={{ __html: 'Aria' }} />
        </div>
      </div>

      <div className="preloader-mask"></div>

      <div className="preloader-content">
        <div className="preloader-footer">
          <p className="text-sm">
            Meet ARIA®—an AI computer use agent
            <br />
            powered by multi-agent intelligence.
          </p>
        </div>
      </div>
    </div>
  );
}
