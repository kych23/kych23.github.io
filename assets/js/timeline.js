/*
	Career timeline (experience.html).

	Behavior:
	  1. Scroll reveal: entries below the "open line" (60% down the viewport)
	     start collapsed and expand once you scroll them up to that line.
	     Once open, an entry stays open.
	  2. Active role: the sticky index highlights the role crossing a line
	     near the top of the viewport and fills its progress bar to match.
	  3. Jump links: clicking a role in the index opens every entry above it
	     (so the page doesn't shift mid-scroll) and scrolls to it.

	Without JavaScript, or without IntersectionObserver, every entry
	simply stays open and the index links work as normal anchors.
	With reduced motion, entries stay open (no reveal) but the active
	role still updates.
*/
(function () {
	"use strict";

	// Fraction of the viewport height where entries open.
	var OPEN_LINE = 0.6;

	var timeline = document.querySelector("[data-timeline]");
	if (!timeline) {
		return;
	}

	var indexNav = timeline.querySelector(".timeline-index");
	var indexList = timeline.querySelector(".timeline-index-list");
	var indexLinks = timeline.querySelectorAll(".timeline-index-link");
	var entries = timeline.querySelectorAll(".timeline-entry");

	if (entries.length === 0 || indexLinks.length !== entries.length) {
		// Markup is out of sync; leave the static page alone.
		console.warn("timeline.js: index links and entries don't match; skipping enhancement.");
		return;
	}

	var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	var hasObserver = "IntersectionObserver" in window;

	// True once the scroll reveal is running and entries can be collapsed.
	var revealActive = false;
	var openObserver = null;

	// opened[i] is true once entry i has been revealed. Every entry starts
	// with the is-open class in the HTML, so the class alone can't tell us.
	var opened = [];
	for (var e = 0; e < entries.length; e++) {
		opened.push(false);
	}

	// ---------- Helpers ----------

	// Returns the position of an entry in the list, or -1.
	function indexOfEntry(entry) {
		for (var i = 0; i < entries.length; i++) {
			if (entries[i] === entry) {
				return i;
			}
		}
		return -1;
	}

	// Opens an entry and stops watching it, since it never closes again.
	function openEntry(entry) {
		opened[indexOfEntry(entry)] = true;
		entry.classList.add("is-open");
		if (openObserver) {
			openObserver.unobserve(entry);
		}
	}

	// Pauses transitions until the next frame, so state changes snap into place.
	function holdStill() {
		timeline.classList.add("is-still");
	}

	function releaseStill() {
		// Read layout once so the browser commits the "still" styles first.
		// Without this, the collapse could animate on first paint.
		void timeline.offsetHeight;
		window.requestAnimationFrame(function () {
			timeline.classList.remove("is-still");
		});
	}

	// Highlights one role in the index and fills the progress line to it.
	function setActive(activeIndex) {
		for (var i = 0; i < indexLinks.length; i++) {
			if (i === activeIndex) {
				indexLinks[i].setAttribute("aria-current", "true");
			} else {
				indexLinks[i].removeAttribute("aria-current");
			}
		}

		var progress = 1;
		if (entries.length > 1) {
			progress = activeIndex / (entries.length - 1);
		}
		indexList.style.setProperty("--progress", progress);
	}

	// ---------- 1. Center the sticky index vertically ----------

	// The CSS needs the index's height to center it; keep it current.
	if (indexNav && "ResizeObserver" in window) {
		var resizeObserver = new ResizeObserver(function () {
			indexNav.style.setProperty("--index-h", indexNav.offsetHeight + "px");
		});
		resizeObserver.observe(indexNav);
	}

	// Older browsers: leave everything open and use plain anchor links.
	if (!hasObserver) {
		timeline.classList.remove("is-still");
		return;
	}

	// ---------- 2. Scroll reveal ----------

	if (!reducedMotion) {
		openObserver = new IntersectionObserver(
			function (records) {
				// Open entries that reached the line, or were scrolled past it
				// (for example, when the page loads partway down).
				for (var i = 0; i < records.length; i++) {
					var record = records[i];
					if (record.isIntersecting || record.boundingClientRect.top < 0) {
						openEntry(record.target);
					}
				}

				// First callback: every entry has reported in, so collapse the
				// ones still below the line. Transitions are paused (is-still)
				// so this happens before the first visible frame.
				if (!revealActive) {
					revealActive = true;
					for (var j = 0; j < entries.length; j++) {
						if (!opened[j]) {
							entries[j].classList.remove("is-open");
						}
					}
					releaseStill();
				}
			},
			// Shrink the viewport's bottom edge up to the open line.
			{ rootMargin: "0px 0px -" + (1 - OPEN_LINE) * 100 + "% 0px" }
		);

		for (var i = 0; i < entries.length; i++) {
			openObserver.observe(entries[i]);
		}

		// Safety net for tall screens: the last entries may never reach the
		// open line before the page runs out of scroll. Once the footer is
		// visible, open everything that's still collapsed.
		var footer = document.getElementById("footer");
		if (footer) {
			var endObserver = new IntersectionObserver(function (records) {
				if (!records[0].isIntersecting || !revealActive) {
					return;
				}
				for (var j = 0; j < entries.length; j++) {
					if (!opened[j]) {
						openEntry(entries[j]);
					}
				}
				endObserver.disconnect();
			});
			endObserver.observe(footer);
		}
	} else {
		// Reduced motion: no reveal, so entries stay open from the start.
		timeline.classList.remove("is-still");
	}

	// ---------- 3. Active role ----------

	// A thin band near the top of the viewport (25% down, at most 280px).
	var activeLinePx = Math.min(window.innerHeight * 0.25, 280);
	var bottomInset = window.innerHeight - activeLinePx - 2;

	// Entries currently crossing the band.
	var onLine = [];
	for (var n = 0; n < entries.length; n++) {
		onLine.push(false);
	}

	var activeObserver = new IntersectionObserver(
		function (records) {
			for (var i = 0; i < records.length; i++) {
				var position = indexOfEntry(records[i].target);
				if (position !== -1) {
					onLine[position] = records[i].isIntersecting;
				}
			}

			// The topmost entry on the band wins.
			for (var j = 0; j < onLine.length; j++) {
				if (onLine[j]) {
					setActive(j);
					return;
				}
			}
		},
		{ rootMargin: "-" + activeLinePx + "px 0px -" + bottomInset + "px 0px" }
	);

	for (var m = 0; m < entries.length; m++) {
		activeObserver.observe(entries[m]);
	}

	// ---------- 4. Jump links ----------

	function jumpTo(event, targetIndex) {
		var target = entries[targetIndex];

		// Before the reveal starts, everything is open: let the anchor work normally.
		if (!revealActive || !target) {
			return;
		}
		event.preventDefault();

		// Open the target and everything above it instantly, so the layout
		// above the target doesn't grow while the page is scrolling.
		holdStill();
		for (var i = 0; i <= targetIndex; i++) {
			openEntry(entries[i]);
		}

		target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
		history.replaceState(null, "", "#" + target.id);

		// Move keyboard focus to the entry, as a normal anchor jump would.
		target.setAttribute("tabindex", "-1");
		target.focus({ preventScroll: true });

		releaseStill();
	}

	for (var p = 0; p < indexLinks.length; p++) {
		// Wrap in a function so each listener keeps its own index.
		(function (linkIndex) {
			indexLinks[linkIndex].addEventListener("click", function (event) {
				jumpTo(event, linkIndex);
			});
		})(p);
	}
})();
