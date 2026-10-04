/* Error State, light build. No dependencies, no build step. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* analytics hook. Swap the body when Plausible or GA4 goes in. */
  function track(name, props) {
    props = props || {};
    if (window.plausible) return window.plausible(name, { props: props });
    if (window.gtag) return window.gtag("event", name, props);
    if (window.dataLayer) return window.dataLayer.push(Object.assign({ event: name }, props));
    if (window.ES_DEBUG) console.log("[track]", name, props);
  }
  window.esTrack = track;

  /* the outbound campaign, captured once so a booking traces back to it.
     Internal links never carry utm: GA4 reads those as a new campaign and
     resets session attribution. */
  try {
    if (!sessionStorage.getItem("es_outbound")) {
      var q = new URLSearchParams(location.search);
      if (q.get("utm_source") || q.get("utm_campaign")) {
        sessionStorage.setItem("es_outbound", [
          q.get("utm_source") || "", q.get("utm_medium") || "",
          q.get("utm_campaign") || "", q.get("utm_content") || ""
        ].join("|"));
      }
    }
  } catch (e) {}

  /* ---------- smooth scrolling -------------------------------------------
     The wheel sets a target and the page eases toward it, which is what makes
     GSAP's ScrollSmoother feel the way it does.

     Written against the real window scroll rather than the transformed wrapper
     ScrollSmoother uses, because everything else on this page depends on the
     scroll position being real: the sticky header, the scrubbed hero video,
     and every IntersectionObserver. A transform wrapper breaks position:sticky
     and would mean rewriting all of it.

     Off for touch, where the platform's own momentum is better, and off for
     anyone who asked for reduced motion. */
  (function () {
    if (reduce) return;
    if (!window.matchMedia("(pointer:fine)").matches) return;
    if (!("requestAnimationFrame" in window)) return;

    var target = window.scrollY, current = target, running = false, last = 0;
    // Damping is time based, not per frame. A fixed 11.5% per frame ran twice
    // as fast on a 120Hz screen as on 60Hz, and any dropped frame made the
    // page lurch to catch up. This settles at the same rate on every display.
    // RATE 0.125 at 60fps; the exponent rescales it to the real frame time.
    var RATE = 0.125, STEP = 100;                 // STEP: one line-mode notch
    var root = document.documentElement;

    // CSS asks for smooth anchor scrolling. Left on, every scrollTo below
    // starts its own animation and the two fight, so the script takes the
    // easing over entirely, anchors included.
    root.style.scrollBehavior = "auto";

    function limit() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }
    function frame(now) {
      var dt = last ? Math.min(now - last, 64) : 16.667;   // clamp after a stall
      last = now;
      var d = target - current;
      if (Math.abs(d) < 0.5) {
        current = target; running = false; last = 0; window.scrollTo(0, current); return;
      }
      current += d * (1 - Math.pow(1 - RATE, dt / 16.667));
      window.scrollTo(0, current);
      requestAnimationFrame(frame);
    }
    function start() {
      if (!running) {
        // pick up wherever the page really is, in case something else moved it
        if (Math.abs(window.scrollY - current) > 2) current = window.scrollY;
        running = true; last = 0; requestAnimationFrame(frame);
      }
    }

    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey) return;                                   // pinch zoom
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;     // a horizontal rail
      // a rail only owns the wheel while it actually has somewhere to scroll
      var ns = e.target.closest && e.target.closest("[data-native-scroll]");
      if (ns && ns.scrollWidth > ns.clientWidth + 1) return;
      e.preventDefault();
      var dy = e.deltaMode === 1 ? e.deltaY * STEP : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      // Reversing direction mid glide starts from where the page is, not from
      // a target that may still be hundreds of pixels ahead.
      if ((dy > 0) !== (target > current) && running) target = current;
      target = Math.max(0, Math.min(limit(), target + dy));
      start();
    }, { passive: false });

    // anchors ease to their destination through the same loop
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      var el = document.getElementById(id.slice(1));
      if (!el) return;
      e.preventDefault();
      var head = document.querySelector(".hdr");
      var off = head ? head.getBoundingClientRect().height : 0;
      target = Math.max(0, Math.min(limit(), window.scrollY + el.getBoundingClientRect().top - off - 12));
      start();
      if (history.replaceState) history.replaceState(null, "", id);
    });

    // keyboard, scrollbar drags and find-in-page all move the real scroll
    // position. When they do, adopt it rather than fight it.
    window.addEventListener("scroll", function () {
      if (!running) { target = current = window.scrollY; }
    }, { passive: true });
    window.addEventListener("resize", function () { target = current = window.scrollY; });
  })();

  /* ---------- scroll scrubbed hero plate --------------------------------
     The video never plays. Its currentTime is driven by how far the hero has
     scrolled, so it runs forward on the way down and backward on the way up.
     Encoded with a keyframe every 5 frames, otherwise every seek would jump
     to the previous keyframe and the motion would stutter. */
  (function () {
    var hero = document.querySelector(".hero");
    var vid = document.getElementById("scrub");
    if (!hero || !vid) return;

    if (reduce) { vid.removeAttribute("preload"); return; }   // poster stands in

    var target = 0, current = 0, primed = false;

    // Some mobile browsers will not decode a frame until the element has
    // played once. Prime it muted, then stop immediately.
    function prime() {
      if (primed) return;
      primed = true;
      var pr = vid.play();
      if (pr && pr.then) pr.then(function () { vid.pause(); }).catch(function () {});
      else { try { vid.pause(); } catch (e) {} }
    }

    function progress() {
      var r = hero.getBoundingClientRect();
      var span = r.height || 1;
      var p = -r.top / span;
      return p < 0 ? 0 : p > 1 ? 1 : p;
    }

    // The loop only runs while there is somewhere to go. It used to run every
    // frame the hero was on screen and write currentTime each time, so the
    // decoder was seeking sixty times a second even with the page at rest,
    // and that load is what made scrolling near the top stutter.
    var visible = false, looping = false, last = 0;
    var FRAME = 1 / 25;                                    // the plate is 25fps

    function frame(now) {
      var dur = vid.duration;
      if (!visible || !dur || !isFinite(dur)) { looping = false; return; }
      var dt = last ? Math.min(now - last, 64) : 16.667;
      last = now;
      target = progress() * dur;
      current += (target - current) * (1 - Math.pow(1 - 0.16, dt / 16.667));
      var settled = Math.abs(target - current) < 0.004;
      if (settled) current = target;
      // Seek only when the wanted frame differs from the one on screen, and
      // never while the previous seek is still decoding.
      if (vid.readyState >= 1 && !vid.seeking && Math.abs(vid.currentTime - current) >= FRAME * 0.5) {
        try { vid.currentTime = current; } catch (e) {}
      }
      if (settled && !vid.seeking) { looping = false; last = 0; return; }
      requestAnimationFrame(frame);
    }

    function kick() { if (visible && !looping) { looping = true; last = 0; requestAnimationFrame(frame); } }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) { prime(); kick(); }
      }, { threshold: 0 }).observe(hero);
    } else { visible = true; prime(); }

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    vid.addEventListener("loadedmetadata", kick);
    vid.addEventListener("seeked", kick);                  // finish the glide once a seek lands
  })();

  /* ---------- theme switch ----------------------------------------------
     theme.js has already set data-theme before paint. This only handles the
     click, remembers the choice, and keeps following the system setting for
     anyone who has not made one. */
  (function () {
    var btn = document.getElementById("themeBtn");
    var root = document.documentElement;
    var cfg = window.__esTheme || { key: "es-theme", saved: null };
    var meta = document.querySelector('meta[name="theme-color"]');

    function paint(t) {
      root.setAttribute("data-theme", t);
      if (meta) meta.setAttribute("content", t === "dark" ? "#000000" : "#F7F7F7");
      if (btn) btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
    paint(root.getAttribute("data-theme") || "light");

    if (btn) {
      btn.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        paint(next);
        cfg.saved = next;
        try { localStorage.setItem(cfg.key, next); } catch (e) {}
      });
    }

    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onSystem = function (e) { if (!cfg.saved) paint(e.matches ? "dark" : "light"); };
    mq.addEventListener ? mq.addEventListener("change", onSystem) : mq.addListener(onSystem);
  })();

  /* mobile menu */
  var menuBtn = document.querySelector(".menu-btn");
  var menu = document.getElementById("menu");
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    });
    menu.addEventListener("click", function (e) { if (e.target.tagName === "A") menuBtn.click(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) menuBtn.click();
    });
  }

  /* reveal. Nothing is hidden by default: the script arms only what is below
     the fold, so if it never runs the page still reads. */
  var reveals = document.querySelectorAll(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); ro.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    var vh = window.innerHeight;
    reveals.forEach(function (el) {
      if (el.getBoundingClientRect().top > vh * 0.92) el.classList.add("is-armed");
      ro.observe(el);
    });
  }

  /* ---------- the steps -------------------------------------------------
     Each row is a tab that swaps the illustration beside it. Until someone
     clicks, scrolling still advances the selection the way the reference
     does; the first click hands control over for good. */
  (function () {
    var steps = [].slice.call(document.querySelectorAll(".steps__list .step"));
    var panes = [].slice.call(document.querySelectorAll(".steps__vis .vis"));
    var out = document.querySelector(".step__body");
    if (!steps.length) return;
    var claimed = false;

    // Compact layout hides the copy inside the tab and reads it below the
    // illustration instead, so it is mirrored rather than duplicated in markup.
    function project(b) {
      if (!out) return;
      var t = b.querySelector(".d3"), p = b.querySelector(".body");
      out.innerHTML = "";
      if (t) { var h = document.createElement("p"); h.className = "d3"; h.textContent = t.textContent; out.appendChild(h); }
      if (p) { var c = document.createElement("p"); c.className = "body"; c.textContent = p.textContent; out.appendChild(c); }
    }

    function select(i) {
      steps.forEach(function (b, n) {
        var on = n === i;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
      });
      panes.forEach(function (p, n) {
        var on = n === i;
        p.classList.toggle("is-shown", on);
        p.hidden = !on;
      });
      project(steps[i]);
    }

    project(steps[0]);

    steps.forEach(function (b, i) {
      b.addEventListener("click", function () { claimed = true; select(i); });
      b.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1
              : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        claimed = true;
        var n = (i + d + steps.length) % steps.length;
        select(n);
        steps[n].focus();
      });
    });

    if (!reduce && "IntersectionObserver" in window) {
      var so = new IntersectionObserver(function (entries) {
        if (claimed) return;
        entries.forEach(function (en) {
          if (en.isIntersecting) select(steps.indexOf(en.target));
        });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      steps.forEach(function (b) { so.observe(b); });
    }
  })();

  /* ---------- counters ---------------------------------------------------
     Each figure counts up the first time it comes into view. The final text
     in the markup is the source of truth, so a script failure just leaves the
     real number on the page. */
  (function () {
    var stats = [].slice.call(document.querySelectorAll(".stat"));
    if (!stats.length || reduce || !("IntersectionObserver" in window)) return;

    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        co.unobserve(en.target);
        run(en.target);
      });
    }, { threshold: 0.4 });

    stats.forEach(function (el) {
      var m = /^(\D*?)([\d,]+(?:\.\d+)?)(\D*)$/.exec(el.textContent.trim());
      if (!m) return;                              // not a number, leave it alone
      el.__es = { pre: m[1], to: parseFloat(m[2].replace(/,/g, "")), suf: m[3],
                  dp: (m[2].split(".")[1] || "").length,
                  grp: m[2].indexOf(",") > -1 };
      co.observe(el);
    });

    function run(el) {
      var c = el.__es, dur = 1100, t0 = 0;
      function fmt(v) {
        var n = v.toFixed(c.dp);
        if (c.grp) n = n.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return c.pre + n + c.suf;
      }
      function tick(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var e = 1 - Math.pow(1 - p, 3);            // ease out, settles rather than stops
        el.textContent = fmt(c.to * e);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = fmt(c.to);
      }
      el.textContent = fmt(0);
      requestAnimationFrame(tick);
    }
  })();

  /* ---------- looping clips -----------------------------------------------
     Autoplay is the default, but anyone who asked for reduced motion gets the
     poster frame instead, and a clip off screen is not worth decoding. */
  (function () {
    var clips = [].slice.call(document.querySelectorAll("video[data-loop]"));
    if (!clips.length) return;
    if (reduce) {
      clips.forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });
      return;
    }
    if (!("IntersectionObserver" in window)) return;
    var vo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.play().catch(function () {}); }
        else { en.target.pause(); }
      });
    }, { threshold: 0.15 });
    clips.forEach(function (v) { vo.observe(v); });
  })();

  /* ---------- scroll filled headline --------------------------------------
     The fill starts as the headline's top enters the lower 90% of the screen
     and completes when it reaches 45%, so it is fully red by the time the
     button is in view. It runs both ways: scroll back up and it drains. */
  (function () {
    var els = [].slice.call(document.querySelectorAll("[data-ink-fill]"));
    if (!els.length || reduce) return;
    var START = 0.9, END = 0.45, queued = false;
    function update() {
      queued = false;
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var top = el.getBoundingClientRect().top;
        var p = (START * vh - top) / ((START - END) * vh);
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        el.style.setProperty("--fill", (p * 100).toFixed(2) + "%");
      });
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    // Only track scroll while a headline is near the screen; the rest of the
    // page scrolls without this doing any layout reads.
    var near = [], on = false;
    function listen(want) {
      if (want === on) return;
      on = want;
      window[want ? "addEventListener" : "removeEventListener"]("scroll", queue, { passive: true });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          var k = near.indexOf(e.target);
          if (e.isIntersecting && k < 0) near.push(e.target);
          if (!e.isIntersecting && k > -1) near.splice(k, 1);
        });
        listen(near.length > 0);
        queue();                                  // settle at 0 or 100 on the way out
      }, { rootMargin: "25% 0px 25% 0px" });
      els.forEach(function (el) { io.observe(el); });
    } else { listen(true); }
    window.addEventListener("resize", queue);
    update();
  })();

  /* ---------- accordions -------------------------------------------------
     <details> snaps open, so the panel height is animated by hand. In the
     audience list (.acc) one row is open at a time: opening a row closes its
     open sibling, both animating together. FAQ rows stay independent. */
  (function () {
    var rows = [].slice.call(document.querySelectorAll(".acc details, .faq details"));
    var DUR = 340, EASE = "cubic-bezier(.22,.75,.28,1)";

    rows.forEach(function (d) {
      var sum = d.querySelector("summary");
      var body = d.querySelector(".panel-body, .a");
      if (!sum || !body) return;
      var anim = null, pad = null;

      function height() { return body.getBoundingClientRect().height + "px"; }

      // The panel carries its own padding, so collapsing height alone would
      // leave that padding standing and the row would jump shut at the end.
      // Read it once while the panel is open, then animate it alongside.
      function pads() {
        if (!pad) {
          var c = getComputedStyle(body);
          pad = { t: c.paddingTop, b: c.paddingBottom };
        }
        return pad;
      }

      function clear() { body.style.height = body.style.paddingTop = body.style.paddingBottom = ""; }

      d._play = play;

      function siblings() {
        var group = d.closest(".acc");
        if (!group) return [];
        return [].slice.call(group.querySelectorAll("details")).filter(function (o) { return o !== d && o.open; });
      }

      function play(opening) {
        if (opening) siblings().forEach(function (o) { o._play ? o._play(false) : (o.open = false); });
        if (anim) { anim.cancel(); clear(); }
        var p = pads();
        var h = opening ? (d.open = true, height()) : height();
        var from = opening ? ["0px", "0px", "0px"] : [h, p.t, p.b];
        var to   = opening ? [h, p.t, p.b] : ["0px", "0px", "0px"];

        body.style.height = from[0];
        body.style.paddingTop = from[1];
        body.style.paddingBottom = from[2];

        d.classList.toggle("is-closing", !opening);   // accents drop the moment a row starts to shut
        d.classList.add(opening ? "is-expanding" : "is-collapsing");
        requestAnimationFrame(function () { d.classList.remove("is-expanding", "is-collapsing"); });

        anim = body.animate(
          { height: [from[0], to[0]], paddingTop: [from[1], to[1]], paddingBottom: [from[2], to[2]] },
          { duration: DUR, easing: EASE }
        );
        anim.onfinish = function () {
          anim = null;
          clear();
          if (!opening) { d.open = false; d.classList.remove("is-closing"); }
        };
        anim.oncancel = function () { anim = null; };
      }

      // Reduced motion lets the browser toggle natively, so enforce the single
      // open row there too, without animation.
      d.addEventListener("toggle", function () {
        if (reduce && d.open) siblings().forEach(function (o) { o.open = false; });
      });

      sum.addEventListener("click", function (e) {
        if (reduce) return;                        // let the browser do its thing
        e.preventDefault();
        play(!d.open);
      });
    });
  })();

  /* ---------- the hero token demo ---------------------------------------
     One custom property drives every accent in the mock, so picking a colour
     is genuinely the same move the pitch describes: change the token, watch
     the surfaces follow. The presets are plain buttons; the last swatch is a
     native colour input, so there is no hex to type and nothing to validate. */
  (function () {
    var mock = document.querySelector(".hero__mock");
    if (!mock) return;
    var toks = [].slice.call(mock.querySelectorAll(".tok[data-tok]"));
    var pickWrap = mock.querySelector(".tok--pick");
    var pick = pickWrap && pickWrap.querySelector("input");
    if (!toks.length) return;

    function rgb(hex) {
      hex = hex.replace("#", "");
      if (hex.length === 3) hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    }
    function luminance(c) {
      var s = c.map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
    }

    function apply(hex, fromPicker) {
      var c = rgb(hex);
      if (c.some(isNaN)) return;
      mock.style.setProperty("--demo", hex);
      mock.style.setProperty("--demo-soft", "rgba(" + c.join(",") + ",.12)");

      // Someone can pick white, or black. A hairline keeps the filled blocks
      // readable against either card without altering the colour they chose.
      var l = luminance(c);
      mock.style.setProperty("--demo-ring",
        l > 0.62 ? "rgba(23,23,23,.22)" : l < 0.05 ? "rgba(252,252,252,.26)" : "transparent");

      var matched = false;
      toks.forEach(function (b) {
        var on = b.getAttribute("data-tok").toLowerCase() === hex.toLowerCase();
        if (on) matched = true;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (pickWrap) pickWrap.classList.toggle("is-on", !matched);
      if (pick && !fromPicker) pick.value = hex;
      track("token_preview", { color: hex });
    }

    toks.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.getAttribute("data-tok"), false); });
    });
    if (pick) {
      pick.addEventListener("input", function () { apply(pick.value, true); });
    }
  })();

  /* booking clicks */
  document.querySelectorAll("a[data-book]").forEach(function (a) {
    a.addEventListener("click", function () {
      track("book_click", { from: a.getAttribute("data-book") || "unknown" });
    });
  });
})();

/* Blog index tag filter.
   The chips are already links to /blog/tag/<tag>/, which is what works with
   script off and what search engines follow. This only upgrades them to filter
   in place, so the list never reloads. */
(function () {
  var list = document.getElementById("postList");
  if (!list) return;
  var bar = document.querySelector(".tagbar");
  if (!bar) return;
  var cards = [].slice.call(list.querySelectorAll(".pcard"));
  var empty = document.getElementById("postEmpty");

  function apply(tag, push) {
    var shown = 0;
    cards.forEach(function (card) {
      var tags = (card.getAttribute("data-tags") || "").split(",");
      var on = tag === "all" || tags.indexOf(tag) > -1;
      card.hidden = !on;
      if (on) shown++;
    });
    [].forEach.call(bar.querySelectorAll(".chip"), function (chip) {
      chip.classList.toggle("is-on", chip.getAttribute("data-tag") === tag);
    });
    if (empty) empty.hidden = shown !== 0;
    if (push) {
      var url = tag === "all" ? "/blog/" : bar.querySelector('[data-tag="' + tag + '"]').getAttribute("href");
      history.pushState({ tag: tag }, "", url);
    }
  }

  bar.addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    e.preventDefault();
    apply(chip.getAttribute("data-tag"), true);
  });

  window.addEventListener("popstate", function (e) {
    apply((e.state && e.state.tag) || "all", false);
  });
})();
