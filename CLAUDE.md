# الفرقة الزلزالية السابعة — Seismic Crew VII
## Claude Code Project Configuration

### Project Overview
This project is an interactive bilingual (Arabic/English) AI video generation brief tool for the Seventh Seismic Party oil exploration operations. It generates scene-by-scene prompts for AI video tools (Runway Gen-3, Luma Dream Machine, Sora, Universal/Generic).

**Live artifact:** https://claude.ai/artifact/LaJLw5H7KxZdzsaXnM5vMm

---

### Project Structure
```
husen/
├── CLAUDE.md                    # This file — project config & workflow guide
└── seismic-crew.html            # Main interactive artifact (also in scratchpad)
```

The primary deliverable is a single self-contained HTML artifact published to claude.ai. All CSS, JS, and data are inline — no external dependencies except Google Fonts.

---

### Scene Data Format
Each scene in the `SCENES` array follows this structure:

```javascript
{
  time:   "04:30",           // 24-hour time (Arabic numerals)
  timeEn: "04:30",           // Same time for English display
  ar:     "عنوان المشهد",    // Arabic scene title
  en:     "Scene Title",     // English scene title
  p: {
    runway:  "...",           // Runway Gen-3 Alpha optimized prompt
    luma:    "...",           // Luma Dream Machine optimized prompt
    sora:    "...",           // Sora / OpenAI optimized prompt
    generic: "...",           // Universal / platform-agnostic prompt
  }
}
```

**Current scenes (16 total):**
| Time  | Scene (AR)                | Scene (EN)                        |
|-------|---------------------------|-----------------------------------|
| 04:30 | الاستيقاظ قبل الفجر       | Pre-Dawn Wake-Up                  |
| 05:00 | صلاة الفجر والإفطار       | Fajr Prayer & Breakfast           |
| 05:45 | التجمع والتفتيش            | Muster & Equipment Inspection     |
| 06:15 | المسير إلى موقع العمل     | March to Work Site                |
| 06:45 | نشر الجيوفونات            | Geophone Array Deployment         |
| 07:30 | ربط الكابلات وتوصيل الخطوط | Cable & Line Connection           |
| 08:30 | اختبار الجهاز وضبط المعدات | Instrument Test & Calibration     |
| 09:30 | التفجير الأول وقراءة البيانات | First Shot & Data Recording     |
| 11:00 | استراحة الضحى وشاي الحقل  | Mid-Morning Break & Field Tea     |
| 12:00 | صلاة الظهر وغداء الحقل    | Dhuhr Prayer & Field Lunch        |
| 13:00 | استئناف العمل — الوردية الثانية | Resumption — Second Shift      |
| 14:30 | معالجة البيانات الميدانية  | Field Data Processing             |
| 15:30 | صلاة العصر وراحة قصيرة    | Asr Prayer & Short Rest           |
| 16:00 | جمع المعدات وطي الخطوط    | Equipment Collection & Line Fold  |
| 17:00 | العودة إلى المعسكر         | Return to Camp                    |
| 18:00 | المراجعة اليومية والتقرير  | Daily Review & Report             |

---

### Design System

**Visual Identity:** Petroleum / desert cinema — amber on near-black.

```css
/* Core tokens (dark-first) */
--bg:          #0C0E12;   /* near-black base */
--surface:     #12161C;
--surface-2:   #181D24;
--surface-3:   #1E2430;
--accent:      #C8872A;   /* amber/ochre — petroleum gold */
--accent-low:  #7A5118;
--text:        #E2DBD0;   /* warm off-white */
--text-mid:    #9C9080;
--text-dim:    #52504A;
```

**Fonts:**
- Display: `Barlow Condensed` (English headings, times)
- Body Arabic: `Cairo` (all Arabic text)
- Code/Prompts: `JetBrains Mono` (prompt pre blocks)

---

### How to Extend

#### Add a new scene
Append to the `SCENES` array in the `<script>` section of the HTML. Follow the data format above. The timeline renders automatically from the array.

#### Update a prompt
Find the scene by time in the `SCENES` array, then edit the relevant platform key inside `p: {}`.

#### Add a new platform tab
1. Add a key to every scene's `p` object (e.g., `kling: "..."`)
2. Add a button in the `.platform-bar` HTML section
3. Add a `.prompt-block` div in the `tl-panel` template inside `render()`
4. Update the `TOOLS` array and tab rendering logic in `syncTabs()`

---

### Workflow with Claude Code

#### Concept: Subagent-driven scene expansion
Use a subagent to generate new platform-optimized prompts for all 16 scenes:

```
/subagent: For each of the 16 SCENES in seismic-crew.html, 
generate an optimized prompt for [platform] following the 
cinematic style: golden-hour desert Iraq, UE5 photorealistic,
35mm anamorphic lens, handheld documentary aesthetic.
Write the prompts as a JSON array matching the SCENES order.
```

#### Concept: Loop-driven prompt iteration
```
/loop: Review each scene's Runway prompt against the master 
narrative continuity. Flag any scenes where camera angle or 
lighting setup would create a jarring cut from the previous scene.
Suggest a revised prompt that improves narrative flow.
```

#### Concept: Hooks for auto-validation
Add to `.claude/settings.json`:
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit",
      "hooks": [{
        "type": "command",
        "command": "grep -c 'SCENES' /home/user/husen/seismic-crew.html"
      }]
    }]
  }
}
```

---

### Git Workflow

**Branch:** `claude/laughing-ritchie-p27uou`  
**Remote:** `huseny80-gif/husen`

```bash
# Push updates
git add -A
git commit -m "feat: update scene prompts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push -u origin claude/laughing-ritchie-p27uou
```

---

### Master Video Prompt

The full 24-hour narrative prompt for a single continuous cinematic piece:

> A full workday at the Seventh Seismic Party oil exploration camp in the Iraqi desert. Shot in cinematic 4K with anamorphic lens compression, golden-hour desert light. The film follows the crew from pre-dawn prayers through geophone deployment, explosive shots, data processing, and evening debrief. Documentary-realist aesthetic with photorealistic rendering — dust in the air, heat shimmer, the deep quiet of the open desert interrupted by the percussion of seismic detonations. Men of discipline and expertise, working a craft few understand, in a landscape that has held these secrets for millennia.

---

*Project initialized by Claude Code — session https://claude.ai/code/session_01KpvYgdphQFEq8SGR5vUabT*
