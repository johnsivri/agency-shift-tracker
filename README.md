# Agency Shift Tracker

A small browser-based tracker for agency shift operations.

## Features

- Shift log with hour totals
- Fixed A/B/C/D shift assignments
- A and B shifts run 0600-1800
- C and D shifts run 1800-0600
- Overtime tracking with approval status and court-related flags
- Traffic court schedule rules for Tuesdays at 1330 and Thursdays at 0900
- Traffic court hours are tracked separately from overtime hours
- Court appearance tracking with case numbers, subpoena status, duration, and notes
- Shift swap tracking with requester, covering officer, dates, status, and notes
- Patrol-unit scoped views for each unit's own shifts, OT, court, and swap information
- Open shift swap request sidebar shared across patrol units
- Month and search filters
- CSV export and print view
- Local browser storage

## Run Locally

Open `index.html` directly in a browser, or run:

```bash
node server.mjs
```

Then visit:

```text
http://127.0.0.1:4173
```
