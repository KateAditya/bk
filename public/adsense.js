(function () {
  try {
    var client = "ca-pub-8664296437390910";

    // If AMP auto-ads already present, skip
    if (document.querySelector('script[src*="amp-auto-ads-"]')) return;

    // Inject AMP auto-ads script
    var s = document.createElement("script");
    s.async = true;
    s.setAttribute("custom-element", "amp-auto-ads");
    s.src = "https://cdn.ampproject.org/v0/amp-auto-ads-0.1.js";
    document.head.appendChild(s);

    // Inject amp-auto-ads tag
    var tag = document.createElement("amp-auto-ads");
    tag.setAttribute("type", "adsense");
    tag.setAttribute("data-ad-client", client);
    document.body.insertBefore(tag, document.body.firstChild);
  } catch (e) {
    // Silently handle adsense initialization errors
  }
})();
