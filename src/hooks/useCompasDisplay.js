import { useEffect, useRef, useState } from "react";

// Read the audio clock; rendering never schedules sound or advances the transport.
export function useCompasDisplay(audioRef, timelineRef, isPlaying) {
  const [beat, setBeat] = useState(-1);
  const [offbeat, setOffbeat] = useState(-1);
  const cursorRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      setBeat(-1);
      setOffbeat(-1);
      return;
    }
    let frame;
    function draw() {
      const now = audioRef.current?.currentTime ?? 0;
      const timeline = timelineRef.current;
      while (timeline.length > 1 && timeline[1].time <= now) timeline.shift();
      const event = timeline[0];
      if (event && event.time <= now && now < event.time + event.duration) {
        const progress = (now - event.time) / event.duration;
        setBeat(event.beat);
        const offbeatPhase = event.offbeatPhase ?? 0.5;
        setOffbeat(event.offbeat && progress >= offbeatPhase && progress < offbeatPhase + 0.25 ? event.beat : -1);
        cursorRef.current?.setAttribute("transform", `rotate(${((event.beat + progress) / event.beats) * 360} 170 170)`);
      } else {
        setBeat(-1);
        setOffbeat(-1);
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [audioRef, timelineRef, isPlaying]);

  return { beat, offbeat, cursorRef };
}
