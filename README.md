# Kids Skill Set – גלגל כישורים

A local web app for tracking kids' skills in a skateboarding school.  
Private skills wheel with assessments (1–100 per skill), radar charts, and compare mode.  
Default UI in **Hebrew** with a switch to **English**.

---

## How to run on Windows (step by step)

### 1. Open Command Prompt

- Press the **Windows** key, type **cmd**, then press Enter.  
- Or: Press **Windows + R**, type **cmd**, press Enter.

### 2. Go to the project folder

Type (adjust the path if your project is elsewhere):

```text
cd "C:\Users\97252\CODE projects\KidsSkillSet"
```

Press Enter.

### 3. Install dependencies (first time only)

Type:

```text
npm install
```

Press Enter and wait until it finishes.

### 4. Start the app

Type:

```text
npm run dev
```

Press Enter. You should see something like:

```text
  VITE ready in ...
  Local:   http://localhost:5173/
```

### 5. Open the app in your browser

- Open **Chrome**, **Edge**, or another browser.
- In the address bar type: **http://localhost:5173**
- Press Enter.

The app will load. To stop the server later, go back to the Command Prompt window and press **Ctrl + C**.

---

## First-time setup: import sample data

1. On the dashboard, under **Import / Export**:
2. Click **skills.csv** and choose the file:  
   `KidsSkillSet\public\sample-data\skills.csv`
3. Click **students.csv** and choose:  
   `KidsSkillSet\public\sample-data\students.csv`
4. Click **assessments.csv** and choose:  
   `KidsSkillSet\public\sample-data\assessments.csv`
5. Click **Import all three files**.

You can now open groups, click a kid, and see assessments and radar charts.

---

## Project structure

- **Dashboard** – list of groups; add / rename / delete groups.
- **Group view** – table of kids (first name, last name, last assessment date, two lowest skills). Search by name.
- **Kid profile** – header (name, group, general note), latest assessment summary (skills sorted low to high), radar chart, compare two assessments, next/previous kid in group.
- **Assessments** – create new assessment with date, 1–100 per skill (slider + number in sync), optional note per skill. Data is stored in app state and in CSV export.

## Data (CSV)

- **skills.csv** – `skill_id`, `name_he`, `desc_he`, `name_en`, `desc_en`, `order_index`.  
  The app supports a **dynamic** number of skills from this file (no hardcoding).
- **students.csv** – `student_id`, `first_name`, `last_name`, `group_name`, `general_note`, `active`.
- **assessments.csv** – long format: `assessment_id`, `student_id`, `date_iso`, `skill_id`, `score`, `note`.

Import/export uses these three files. Missing IDs are auto-generated. Data is also persisted in **localStorage** so work is kept between sessions until you export.

---

## Hebrew guide

See **HOW-TO-USE-HE.md** for a short “How to use” guide in Hebrew (הפעלה, ייבוא, ניווט, פרופיל תלמיד, קבוצות, ייצוא והדפסה).

---

## Tech

- **React 19** + **Vite 7** + **TypeScript**
- **Recharts** for radar charts
- **React Router** for navigation
- No backend; runs in the browser with CSV import/export and localStorage.

---

## Build for production (optional)

```text
npm run build
```

Output is in the `dist` folder. You can serve it with any static file server or open `dist/index.html` locally.
