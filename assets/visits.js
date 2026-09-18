(() => {
  "use strict";

  const dataUrl = new URL("../data/public-visits.json", window.location.href);
  const mapElement = document.getElementById("visit-map");
  const mapEmpty = document.getElementById("visit-map-empty");
  const listElement = document.getElementById("visit-list");
  const demoNote = document.getElementById("visit-demo-note");

  const demoRequested =
    new URLSearchParams(window.location.search).get("demo") === "1" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

  const demoVisits = [
    {
      date: "2027-01-14",
      institution: "Desert Research University (Demo)",
      city: "Tucson",
      country: "United States",
      latitude: 32.2226,
      longitude: -110.9747,
      lecture: "PFAS Fate and Transport in Soils and Groundwater",
      summary: "Synthetic entry used to test a short timeline record and a single map marker.",
      publish_status: "published",
    },
    {
      date: "2027-02-09",
      institution: "Pacific Institute for Groundwater Research with a Deliberately Long Name (Demo)",
      city: "Palo Alto",
      country: "United States",
      latitude: 37.4419,
      longitude: -122.143,
      lecture: "Simplicity Out of Complexity",
      summary: "Synthetic entry used to check wrapping for long institution names and summaries.",
      publish_status: "published",
    },
    {
      date: "2027-03-18",
      institution: "Central European Water Institute (Demo)",
      city: "Stuttgart",
      country: "Germany",
      latitude: 48.7758,
      longitude: 9.1829,
      lecture: "PFAS Fate and Transport in Soils and Groundwater",
      summary: "Synthetic European visit used to test automatic map bounds.",
      publish_status: "published",
    },
    {
      date: "2027-03-22",
      institution: "Rhine Valley Hydrology Center (Demo)",
      city: "Karlsruhe",
      country: "Germany",
      latitude: 49.0069,
      longitude: 8.4037,
      lecture: "Simplicity Out of Complexity",
      summary: "Synthetic nearby visit used to check markers that appear close together.",
      publish_status: "published",
    },
    {
      date: "2027-04-11",
      institution: "Low Countries Subsurface Center (Demo)",
      city: "Utrecht",
      country: "Netherlands",
      latitude: 52.0907,
      longitude: 5.1214,
      lecture: "PFAS Fate and Transport in Soils and Groundwater",
      summary: "Synthetic entry used to test a multi-country chronological timeline.",
      publish_status: "published",
    },
  ];

  if (!mapElement || !listElement) return;

  const createElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  const formatDate = (value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  };

  const visitLocation = (visit) =>
    [visit.city, visit.country].filter(Boolean).join(", ");

  const addVisitLink = (parent, visit, text) => {
    if (!visit.url) {
      parent.append(createElement("span", null, text));
      return;
    }

    const url = new URL(visit.url, window.location.href);
    if (!["http:", "https:"].includes(url.protocol)) {
      parent.append(createElement("span", null, text));
      return;
    }

    const link = createElement("a", null, text);
    link.href = url.href;
    parent.append(link);
  };

  const buildPopup = (visit) => {
    const popup = createElement("div", "map-popup");
    const date = createElement("time", "map-popup-date", formatDate(visit.date));
    date.dateTime = visit.date;
    popup.append(date);

    const title = createElement("strong", "map-popup-title");
    addVisitLink(title, visit, visit.institution);
    popup.append(title);
    popup.append(createElement("span", "map-popup-location", visitLocation(visit)));
    return popup;
  };

  const renderMap = (visits) => {
    if (typeof window.L === "undefined") {
      mapEmpty.textContent = "The map could not be loaded. The chronological list is still available below.";
      return;
    }

    if (visits.length > 0) mapElement.classList.add("has-visits");

    const map = window.L.map(mapElement, {
      scrollWheelZoom: false,
      worldCopyJump: true,
    }).setView([20, 0], 2);

    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (visits.length === 0) return;

    mapEmpty.hidden = true;
    const bounds = [];
    const markerIcon = window.L.divIcon({
      className: "visit-map-marker",
      html: "<span></span>",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -10],
    });

    visits.forEach((visit) => {
      const coordinates = [visit.latitude, visit.longitude];
      bounds.push(coordinates);
      window.L.marker(coordinates, {
        alt: `Map marker for ${visit.institution}`,
        icon: markerIcon,
        keyboard: true,
        title: visit.institution,
      })
        .addTo(map)
        .bindPopup(buildPopup(visit));
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 6);
    } else {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 7 });
    }
  };

  const renderTimeline = (visits) => {
    if (visits.length === 0) return;
    listElement.replaceChildren();

    visits.forEach((visit) => {
      const entry = createElement("article", "timeline-entry");
      const date = createElement("time", "timeline-date", formatDate(visit.date));
      date.dateTime = visit.date;
      entry.append(date);

      const content = createElement("div", "timeline-content");
      const title = createElement("h3", "timeline-title");
      addVisitLink(title, visit, visit.institution);
      content.append(title);
      content.append(createElement("p", "timeline-location", visitLocation(visit)));

      if (visit.summary) {
        content.append(createElement("p", "timeline-summary", visit.summary));
      }
      if (visit.lecture) {
        content.append(createElement("p", "timeline-lecture", `Lecture: ${visit.lecture}`));
      }

      entry.append(content);
      listElement.append(entry);
    });
  };

  const loadVisits = async () => {
    try {
      let records;
      if (demoRequested) {
        records = demoVisits;
        if (demoNote) demoNote.hidden = false;
      } else {
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        records = await response.json();
      }

      const visits = records
        .filter(
          (visit) =>
            visit.publish_status === "published" &&
            visit.date &&
            visit.institution &&
            Number.isFinite(visit.latitude) &&
            Number.isFinite(visit.longitude),
        )
        .sort((a, b) => a.date.localeCompare(b.date));

      renderMap(visits);
      renderTimeline(visits);
    } catch (error) {
      mapEmpty.textContent = "The map is temporarily unavailable.";
      listElement.replaceChildren(
        createElement("p", "timeline-empty", "The visit timeline is temporarily unavailable."),
      );
    }
  };

  loadVisits();
})();
