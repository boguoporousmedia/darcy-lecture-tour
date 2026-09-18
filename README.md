# Darcy Lecture Tour 2027

Public documentation site for Bo Guo's 2027 Darcy Lecture tour.

The public site intentionally has only two sections: **Home** and **Visits**.

The website is intentionally separate from the private Google Drive archive. Only reviewed public text and approved web images belong in this repository.

## Local preview

```bash
quarto preview
```

## Build

```bash
quarto render
```

The rendered site is written to `_site/`. GitHub Actions publishes the rendered site to GitHub Pages after changes are pushed to `main`.

Validate the public output before publishing:

```bash
python3 scripts/validate_public_site.py
```

## Public visit data

The map and chronological timeline both read from `data/public-visits.json`. A visit appears only when `publish_status` is `published` and the record includes a date, institution, latitude, and longitude.

This JSON file is itself public. It must contain only completed, reviewed visits and must never be used to store drafts or future itinerary rows from the private spreadsheet.

For local visual testing with five synthetic records, open `/visits/?demo=1`. Demo mode works only on `localhost` or `127.0.0.1`; it cannot activate on the published website.

```json
{
  "date": "2027-03-15",
  "institution": "Institution name",
  "city": "City",
  "country": "Country",
  "latitude": 0.0,
  "longitude": 0.0,
  "lecture": "Lecture title",
  "summary": "Short public summary.",
  "url": "visit-page/",
  "publish_status": "published"
}
```

## Publishing boundary

- Do not add future travel itineraries.
- Do not add private notes, contact details, or Google Drive file links.
- Add a visit only after its public draft and photographs have been reviewed.
- Remove location metadata from photographs before adding them to `assets/images/published/`.
