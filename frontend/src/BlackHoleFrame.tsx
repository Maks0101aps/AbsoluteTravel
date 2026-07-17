interface BlackHoleFrameProps {
  size: number;
}

// Free animated "Чорна діра" (Black Hole) avatar frame.
// Uses the supplied artwork (public/assets/blackhole_frame.avif — a swirling
// blue/orange event-horizon ring, chroma-keyed to a transparent center and
// transparent black background) as two counter-rotating copies for parallax
// depth, plus a pulsing glow layer and twinkling sparks drawn in CSS.
//
// The source art's inner cutout sits exactly centered in the 1024x1024
// image, spanning ~59.8% of the width (206..818px) — FRAME_SCALE below is
// 1 / 0.598, i.e. how much larger than the avatar the frame image must be
// rendered so the cutout lines up with the avatar underneath it.
const FRAME_SCALE = 1024 / (818 - 206);

function BlackHoleFrame({ size }: BlackHoleFrameProps) {
  const frameSize = size * FRAME_SCALE;

  return (
    <div className="bhf-ring" style={{ width: size, height: size }} aria-hidden="true">
      <div className="bhf-glow" />
      <img
        className="bhf-img bhf-img-a"
        src="/assets/blackhole_frame.avif"
        alt=""
        style={{ width: frameSize, height: frameSize }}
      />
      <img
        className="bhf-img bhf-img-b"
        src="/assets/blackhole_frame.avif"
        alt=""
        style={{ width: frameSize * 0.86, height: frameSize * 0.86 }}
      />
      <div className="bhf-sparks">
        <span className="bhf-spark" />
        <span className="bhf-spark" />
        <span className="bhf-spark" />
        <span className="bhf-spark" />
      </div>
    </div>
  );
}

export default BlackHoleFrame;
