import { useId } from 'react';

interface BlackHoleFrameProps {
  size: number;
}

// Premium animated "Горизонт Подій" (Event Horizon) avatar frame.
// Pure CSS + SVG (no canvas, no images); all motion runs on transform/opacity
// plus a couple of small SMIL animations for the spiralling particles and the
// gravitational-lensing turbulence. Styling lives in index.css under
// "BLACK HOLE AVATAR FRAME" — this component only supplies structure and
// per-instance-unique ids (several can be on screen at once: navbar avatar,
// profile editor, shop preview, loot-case reel).
//
// Below `SIMPLE_THRESHOLD` (tiny previews, e.g. the 64-tile case-opening reel)
// the two feTurbulence/feDisplacementMap layers and the spiral particles are
// skipped — they're imperceptible at that size and not worth the filter cost
// when dozens of tiles can be on screen simultaneously.
const SIMPLE_THRESHOLD = 44;

function BlackHoleFrame({ size }: BlackHoleFrameProps) {
  const uid = useId().replace(/:/g, '');
  const warpOuterId = `bhf-warp-out-${uid}`;
  const warpInnerId = `bhf-warp-in-${uid}`;
  const rimGradId = `bhf-rim-${uid}`;
  const spiralId = `bhf-spiral-${uid}`;
  const detailed = size >= SIMPLE_THRESHOLD;

  return (
    <div className="bhf-ring" style={{ width: size, height: size }} aria-hidden="true">
      <div className="bhf-glow" />

      <svg className="bhf-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          {detailed && (
            <>
              {/* gravitational lensing: warped light on the outer band */}
              <filter id={warpOuterId} x="-30%" y="-30%" width="160%" height="160%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n">
                  <animate attributeName="baseFrequency" values="0.85;1.05;0.85" dur="16s" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
              </filter>
              {/* faint space warp right at the inner edge, next to the avatar */}
              <filter id={warpInnerId} x="-30%" y="-30%" width="160%" height="160%">
                <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="11" result="n">
                  <animate attributeName="baseFrequency" values="1.4;1.8;1.4" dur="11s" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="n" scale="0.9" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </>
          )}

          <radialGradient id={rimGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e6dbff" stopOpacity=".9" />
            <stop offset="100%" stopColor="#8a5cff" stopOpacity=".25" />
          </radialGradient>

          {detailed && (
            // guide path for infalling particles: r 48→38.5 over 1.5 turns,
            // sampled at 45° steps (see design notes in index.css section header)
            <path
              id={spiralId}
              d="M 98.00,50.00 L 83.39,83.39 L 50.00,96.42 L 17.73,82.27 L 5.16,50.00
                 L 18.85,18.85 L 50.00,6.74 L 80.03,19.97 L 91.68,50.00 L 78.92,78.92
                 L 50.00,90.10 L 22.20,77.80 L 11.48,50.00"
            />
          )}
        </defs>

        {detailed && (
          <>
            {/* space dust: two layers, opposite slow rotation for depth */}
            <g className="bhf-dust-a" fill="#a996e6" opacity=".5">
              <circle cx="92.00" cy="50.00" r=".55" />
              <circle cx="71.00" cy="86.37" r=".45" />
              <circle cx="29.00" cy="86.37" r=".6" />
              <circle cx="8.00" cy="50.00" r=".5" />
              <circle cx="29.00" cy="13.63" r=".45" />
              <circle cx="71.00" cy="13.63" r=".55" />
            </g>
            <g className="bhf-dust-b" fill="#6f8bff" opacity=".35">
              <circle cx="94.17" cy="66.07" r=".4" />
              <circle cx="48.36" cy="96.97" r=".35" />
              <circle cx="5.19" cy="62.95" r=".45" />
              <circle cx="23.72" cy="10.96" r=".35" />
              <circle cx="78.94" cy="12.96" r=".4" />
            </g>

            <g className="bhf-lens-out">
              <circle
                cx="50" cy="50" r="44.5" fill="none"
                stroke={`url(#${rimGradId})`} strokeWidth="2.1" opacity=".3"
                filter={`url(#${warpOuterId})`} vectorEffect="non-scaling-stroke"
              />
            </g>

            {/* particles spiralling into the hole, two lanes for depth */}
            <g className="bhf-particles">
              <g>
                <circle r=".62" fill="#e6dbff">
                  <animateMotion dur="12s" begin="-1.5s" repeatCount="indefinite">
                    <mpath href={`#${spiralId}`} xlinkHref={`#${spiralId}`} />
                  </animateMotion>
                  <animate attributeName="opacity" values="0;.9;.85;0;0" keyTimes="0;.12;.6;.8;1" dur="12s" begin="-1.5s" repeatCount="indefinite" />
                </circle>
              </g>
              <g>
                <circle r=".48" fill="#c3b2ff">
                  <animateMotion dur="15s" begin="-6s" repeatCount="indefinite">
                    <mpath href={`#${spiralId}`} xlinkHref={`#${spiralId}`} />
                  </animateMotion>
                  <animate attributeName="opacity" values="0;.85;.8;0;0" keyTimes="0;.12;.6;.8;1" dur="15s" begin="-6s" repeatCount="indefinite" />
                </circle>
              </g>
              <g>
                <circle r=".55" fill="#93b4ff">
                  <animateMotion dur="18s" begin="-11s" repeatCount="indefinite">
                    <mpath href={`#${spiralId}`} xlinkHref={`#${spiralId}`} />
                  </animateMotion>
                  <animate attributeName="opacity" values="0;.8;.75;0;0" keyTimes="0;.12;.6;.8;1" dur="18s" begin="-11s" repeatCount="indefinite" />
                </circle>
              </g>
              <g className="bhf-lane-b">
                <circle r=".5" fill="#e6dbff">
                  <animateMotion dur="13s" begin="-4s" repeatCount="indefinite">
                    <mpath href={`#${spiralId}`} xlinkHref={`#${spiralId}`} />
                  </animateMotion>
                  <animate attributeName="opacity" values="0;.85;.8;0;0" keyTimes="0;.12;.6;.8;1" dur="13s" begin="-4s" repeatCount="indefinite" />
                </circle>
                <circle r=".42" fill="#a996e6">
                  <animateMotion dur="16.5s" begin="-9s" repeatCount="indefinite">
                    <mpath href={`#${spiralId}`} xlinkHref={`#${spiralId}`} />
                  </animateMotion>
                  <animate attributeName="opacity" values="0;.75;.7;0;0" keyTimes="0;.12;.6;.8;1" dur="16.5s" begin="-9s" repeatCount="indefinite" />
                </circle>
              </g>
            </g>

            <g className="bhf-lens-in">
              <circle
                cx="50" cy="50" r="40.8" fill="none"
                stroke="#c3b2ff" strokeWidth="1.1" opacity=".28"
                filter={`url(#${warpInnerId})`} vectorEffect="non-scaling-stroke"
              />
            </g>

            <g fill="#f3ecff">
              <circle className="bhf-spark" cx="83.59" cy="73.52" r=".9" />
              <circle className="bhf-spark" cx="14.49" cy="70.50" r=".8" />
              <circle className="bhf-spark" cx="11.47" cy="35.98" r=".85" />
              <circle className="bhf-spark" cx="70.50" cy="14.49" r=".75" />
            </g>
          </>
        )}

        {/* crisp thin rim exactly at the avatar edge */}
        <circle
          cx="50" cy="50" r="40.3" fill="none"
          stroke={`url(#${rimGradId})`} strokeWidth=".4" opacity=".85"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="bhf-accretion" />
    </div>
  );
}

export default BlackHoleFrame;
