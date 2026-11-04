import React, { useEffect, useState, useRef } from 'react';

const LOWER_GLYPHS = 'abcdefghijklmnopqrstuvwxyz';
const UPPER_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGIT_GLYPHS = '0123456789';

// Case-matched and punctuation-preserving character scrambler
// Guarantees consistent text length and proportional character widths so multi-line text never jumps in line count
function getScrambledChar(char: string): string {
  if (
    char === ' ' ||
    char === '\n' ||
    char === '\t' ||
    char === '.' ||
    char === ',' ||
    char === '%' ||
    char === '&' ||
    char === '-' ||
    char === '/' ||
    char === '#' ||
    char === ':' ||
    char === '(' ||
    char === ')'
  ) {
    return char;
  }
  if (char >= 'a' && char <= 'z') {
    return LOWER_GLYPHS[Math.floor(Math.random() * LOWER_GLYPHS.length)];
  }
  if (char >= 'A' && char <= 'Z') {
    return UPPER_GLYPHS[Math.floor(Math.random() * UPPER_GLYPHS.length)];
  }
  if (char >= '0' && char <= '9') {
    return DIGIT_GLYPHS[Math.floor(Math.random() * DIGIT_GLYPHS.length)];
  }
  return char;
}

interface TextScrambleProps {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
  trigger?: boolean;
}

export const TextScramble: React.FC<TextScrambleProps> = ({
  text,
  className = '',
  duration = 1200,
  delay = 100,
  trigger = true,
}) => {
  const [displayText, setDisplayText] = useState<string>(text);
  const completedRef = useRef(false);

  useEffect(() => {
    // If not triggered or already completed the full animation, stay resolved
    if (!trigger || completedRef.current) return;

    let startTimestamp: number | null = null;
    let animId: number;
    let timeoutId: NodeJS.Timeout;

    // Start with initial case-matched scrambled characters
    setDisplayText(
      text
        .split('')
        .map((char) => getScrambledChar(char))
        .join('')
    );

    timeoutId = setTimeout(() => {
      let lastUpdate = 0;
      const updateInterval = 42; // ~24 updates/sec for smooth, readable letter cycling

      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);

        // Throttle character shuffling to ~42ms so text is comfortably readable
        if (timestamp - lastUpdate >= updateInterval || progress >= 1) {
          lastUpdate = timestamp;
          const scrambled = text
            .split('')
            .map((char, index) => {
              if (index / text.length < progress) {
                return char;
              }
              return getScrambledChar(char);
            })
            .join('');

          setDisplayText(scrambled);
        }

        if (progress < 1) {
          animId = requestAnimationFrame(step);
        } else {
          completedRef.current = true;
          setDisplayText(text);
        }
      };

      animId = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (animId) cancelAnimationFrame(animId);
      if (completedRef.current) {
        setDisplayText(text);
      }
    };
  }, [trigger, text, duration, delay]);

  return <span className={className}>{displayText}</span>;
};

export default TextScramble;
