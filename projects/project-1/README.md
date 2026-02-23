# Project 1: A World of Data

An interactive visualization application to help a general audience explore country-level data from around the world.

## Overview

Build an interactive web application using **D3.js, JavaScript, HTML, and CSS** that presents multiple coordinated views of world data, enabling users to explore patterns and relationships across countries.

## Data Source

[Our World in Data](https://ourworldindata.org/search) — country-level data on poverty, health, education, energy, food, politics, and more.

### Data Pre-processing

- You will likely need to combine multiple CSV downloads, which share a common country identifier (`FIPS` code, first column).
- Pre-processing can be done in Python, Excel, or any tool of your choice.

## Theme

Choose a theme that interests you, such as:
- Exploring poverty and education
- Understanding population change
- How health and poverty intersect

Spend time exploring the data and pick something meaningful to you.

## Project Setup

- **Individual project** — you may collaborate on debugging, but must submit your own work.
- **Tech stack:** D3.js, JavaScript, HTML, CSS
- **Deployment:** Host publicly (e.g., Vercel)
- **Version control:** Use GitHub with regular commits and descriptive messages. Commit and push after every feature or bug fix.

## Deadlines

| Component | Due Date |
|---|---|
| Code & deployed app | Tue, Feb 24 — 11:59 PM |
| Presentations | Wed, Feb 25 |
| Documentation | Thu, Feb 26 — 11:59 PM |

> 10% penalty per day late for each component.

### Suggested Pace

| Week | Target |
|---|---|
| Week 1 | Level 1 & 2 goals |
| Week 2 | Level 3 & 4 goals |
| Week 3 | Level 5 & 6 goals |

## Grading Breakdown

| Component | Weight |
|---|---|
| Application | 75% |
| Documentation | 20% |
| Presentation | 5% |

> Grading is holistic. An excellent project with fewer features is better than a feature-packed project that doesn't work well. Document any attempted but incomplete features in your write-up.

---

## Requirements

### Level 1 — Foundation

1. Create a visualization page with a project title, your name, and data attribution.
2. Select **2 quantitative** country-level data measures that fit your theme.
    - Use the most current year available for both attributes; indicate the year(s) on the page.
    - Exclude categorical/binary attributes for now.
3. Download and (optionally) pre-process CSVs so both attributes are in one file.
4. **Visualization 1 & 2:** Distribution views (histograms or bar charts) for each attribute.
5. **Visualization 3:** Correlation view (scatterplot) showing the relationship between attributes.

### Level 2 — Spatial Views & Layout

6. **Visualization 4 (& possibly 5):** Choropleth map(s) showing spatial distribution of attributes.
    - Options: two side-by-side maps, or one map with a toggle button.
    - Resources:
        - [Tutorial 10: Choropleth Maps](https://github.com/UBC-InfoVis/2021-436V-examples/tree/master/d3-choropleth-map)
        - [World GeoJSON](https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson)
        - [Choropleth example](https://d3-graph-gallery.com/graph/choropleth_basic.html)
7. Use **appropriate color schemes** — justify your choices in documentation.
    - [d3-scale-chromatic](https://github.com/d3/d3-scale-chromatic)
    - [ColorBrewer](https://colorbrewer2.org/)
8. Design an **intentional layout** — sketch before coding. Related visualizations should be near each other for easy comparison. Aim for a single-page dashboard (no scrolling).

### Level 3 — Multiple Attributes

9. Allow users to **select from multiple attributes** (beyond the initial 2) using UI controls (dropdowns, buttons, etc.).
10. Visualizations should **update dynamically** when the user changes attributes.
11. Provide clear guidance/labels for user controls.
12. Apply appropriate color for every data attribute shown.

### Level 4 — Detail on Demand

13. **Tooltips on the map** — show info about the hovered/selected country.
14. **Tooltips on distributions** — show value and range of the selected bar.
15. **Tooltips on the scatterplot** — show info about the hovered/selected country.

### Level 5 — Brushing & Linking

16. **Brush on distributions** — selecting a range of bars highlights or filters countries across all views.
17. **Brush on scatterplot** — selecting points highlights or filters countries across all views.
18. Decide and justify: **filter vs. highlight**, and whether to **adjust scales** or keep them fixed.
19. Dashboard layout is strongly recommended here so all views update visibly.

### Level 6 — Choose Your Own Adventure

Pick one or more:

- **Brush on the map** — select countries geographically and update all views.
- **Time-varying data:**
    - Multi-line chart showing trends over time (consider grouping countries or letting users select specific ones).
    - Year selector that updates all views for the chosen year.
- **Something novel** — a creative visualization type or interaction that adds value.

---

## Documentation

Post on your portfolio site. Assume the reader is encountering the project for the first time.

### Required Sections

1. **Motivation** — What can your application help someone understand?
2. **Data** — Describe the data and link to the source.
3. **Sketches** — Design sketches used to plan your layout.
4. **Visualization Components** — Explain each view, the GUI, interactions, and how views respond. Include screenshots.
5. **Discoveries** — Findings you arrived at using your application, with screenshots.
6. **Process** — Libraries used, code structure, how to access/run the project. Link to code and live app.
7. **Challenges & Future Work** — Difficulties encountered, lessons learned, and what you'd do next.
8. **AI & Collaboration** — How you used AI tools; peers who helped with debugging or learning.
9. **Demo Video** — 2–3 minute screen recording with voiceover or captions. Include project name, your name, components, and how the app works.

## Presentation

5-minute presentation to a small group, any format you prefer.

---

## Design Guidelines

- **Professional appearance** — appropriate labels, fonts, UI elements, colors, and layout.
- **UI elements** — HTML controls (checkboxes, dropdowns, sliders) are fine. Libraries like Bootstrap are allowed. See [W3Schools](https://www.w3schools.com/html/default.asp).
- **Layout** — coherent, appropriately sized visualizations. Aim for no-scroll on a modern laptop. Responsive layout is nice but not required (note assumed page size in docs).
- **Labels & legends** — all visualizations must have legible titles, legends, and axis labels.
- **Color:**
    - Use color to highlight data; keep backgrounds neutral (white, grey, black).
    - Avoid pure RGB primaries (`rgb(255,0,0)`, `rgb(0,255,0)`, `rgb(0,0,255)`).
    - Use [d3 color scales](https://github.com/d3/d3-scale-chromatic) or [ColorBrewer](https://colorbrewer2.org/) for data encoding.
    - Steel blue (`#4682B4`) is a safe default.
- **Testing** — app will be tested in Chrome via the public deployment.
- **Documentation** — must be publicly accessible (no private settings on images/videos).