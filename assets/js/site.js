/*
	Site-wide behavior. Load after the template's main.js.

	1. "You are here" in the phone menu. Landed builds #navPanel by copying
	   the navbar's links, but drops their attributes, so aria-current="page"
	   is lost. Copy it back over.
*/
(function () {
	"use strict";

	// ---------- 1. Current page in the phone menu ----------

	function markCurrentInPanel() {
		var current = document.querySelector('#nav a[aria-current="page"]');
		if (!current) {
			return;
		}
		var currentHref = current.getAttribute("href");

		var panelLinks = document.querySelectorAll("#navPanel a.link");
		for (var i = 0; i < panelLinks.length; i++) {
			if (panelLinks[i].getAttribute("href") === currentHref) {
				panelLinks[i].setAttribute("aria-current", "page");
			}
		}
	}

	// main.js (jQuery) builds #navPanel on DOM ready; run after it.
	function init() {
		markCurrentInPanel();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
