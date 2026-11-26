export function goldCoinMarkup(){return '<svg class="game-gold-coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9h5M9 15h5"/></svg>';}

// Shared native film player for the result screens. No looping or extra rewards.
export function celebrationMarkup() {
  return `<figure class="reward-scene reward-film">
    <img class="reward-poster" data-celebration-poster src="./assets/celebration/mo-ni-jubelfilm-poster.png" alt="MO und Ni freuen sich neben der geöffneten Goldtaler-Truhe." hidden />
    <video class="reward-video" data-celebration-video controls muted playsinline preload="auto" poster="./assets/celebration/mo-ni-jubelfilm-poster.png" aria-label="MO und Ni öffnen die Goldtaler-Truhe, hüpfen vor Freude und winken dir zu. Zehn Sekunden, ohne Ton."><source src="./assets/celebration/mo-ni-jubelfilm.mp4" type="video/mp4" />MO und Ni feiern mit dir!</video>
    <figcaption class="reward-caption">MO und Ni feiern mit dir!</figcaption>
  </figure>`;
}

// Timed/practice rounds only celebrate gold actually earned in that round.
// Solved puzzles use celebrationMarkup directly, even when replay earns no new gold.
export function roundCelebrationMarkup(coins) {
  return coins>0?celebrationMarkup():'<img class="whirl-pause-mascots" src="./assets/mo-ni-reise.png" alt="MO und Ni begleiten dich beim Üben" />';
}

export function createCelebrationPlayer({scope=globalThis}={}) {
  const document=scope.document, preference=scope.matchMedia?.('(prefers-reduced-motion: reduce)');
  let video=null, poster=null, visible=false, wantsPlayback=false, manual=false, pending=false;
  const onScreen=()=>visible&&document?.visibilityState!=='hidden'&&video?.isConnected;
  function play() {
    if(!video||!onScreen()||(!manual&&preference?.matches))return;
    video.hidden=false;if(poster)poster.hidden=true;
    const current=video;pending=true;wantsPlayback=true;
    // Muted playback usually starts automatically. Native controls remain available
    // if the browser requires the child to start playback themselves.
    try {Promise.resolve(current.play()).then(()=>{if(current===video)pending=false;}).catch(()=>{if(current===video){pending=false;wantsPlayback=false;}});}
    catch {pending=false;wantsPlayback=false;}
  }
  function sync() {
    if(!video)return;
    if(!onScreen()) {wantsPlayback=wantsPlayback||!video.paused||pending;video.pause();return;}
    if(preference?.matches&&!manual){video.pause();video.hidden=true;if(poster)poster.hidden=false;return;}
    if(wantsPlayback)play();
  }
  const onPlay=()=>{if(!onScreen()){video?.pause();return;}wantsPlayback=true;};
  const onPause=()=>{if(onScreen()&&!pending)wantsPlayback=false;};
  const onEnd=()=>{wantsPlayback=false;pending=false;};
  const onPreference=()=>{manual=false;sync();};
  document?.addEventListener('visibilitychange',sync);
  preference?.addEventListener?.('change',onPreference);
  function detach() {
    if(video){video.removeEventListener('play',onPlay);video.removeEventListener('pause',onPause);video.removeEventListener('ended',onEnd);video.pause();}
    video=null;poster=null;pending=false;wantsPlayback=false;manual=false;
  }
  return {
    mount(root) {
      detach();video=root?.querySelector?.('[data-celebration-video]')||null;poster=root?.querySelector?.('[data-celebration-poster]')||null;
      if(typeof video?.play!=='function'){video=null;return;}
      video.muted=true;video.addEventListener('play',onPlay);video.addEventListener('pause',onPause);video.addEventListener('ended',onEnd);
      wantsPlayback=!preference?.matches;sync();
    },
    setVisible(value){visible=Boolean(value);sync();},
    replay(){if(!video)return;manual=true;video.currentTime=0;wantsPlayback=true;play();},
    destroy(){detach();document?.removeEventListener('visibilitychange',sync);preference?.removeEventListener?.('change',onPreference);}
  };
}
