# Multi-Plate Quick Reference Guide

## 🎯 Quick Start

### Single Plate Mode (Default)
- Works just like before
- All tabs show data for the currently active plate only
- No changes to existing workflow

### Multi-Plate Mode
- Add multiple plates using "+ Add Plate" button
- Switch between plates using tabs or dropdown
- Enable "Show All Plates" to see everything at once

---

## 🔄 Switching Plates

### Method 1: Plate Tabs
```
[Plate 1] [Plate 2] [Plate 3]
   ↑         ↑         ↑
 Active    Click     Click
```

### Method 2: Dropdown
```
Current Plate: [Plate 1 ▼]
               [Plate 2  ]
               [Plate 3  ]
```

**What Happens:**
- ✅ Previous plate data is saved
- ✅ All displays are cleared
- ✅ New plate data is loaded
- ✅ All tabs update to show new plate
- ✅ NO leftover data from previous plate

---

## 📊 Master View Mode

### Enable Master View
☑️ **Show All Plates**

### What You See:

#### 1. Plate Schematic Tab
```
┌─────────────────┐
│ Plate 1         │
│ [96-well grid]  │
└─────────────────┘
┌─────────────────┐
│ Plate 2         │
│ [96-well grid]  │
└─────────────────┘
```

#### 2. Standard Curve Tab
```
┌─────────────────┐
│ Plate 1 Curve   │
│ [Chart]         │
└─────────────────┘
┌─────────────────┐
│ Plate 2 Curve   │
│ [Chart]         │
└─────────────────┘
```

#### 3. Compound Analysis Tab
```
┌─────────────────┐
│ Plate 1 Analysis│
│ [Data]          │
└─────────────────┘
┌─────────────────┐
│ Plate 2 Analysis│
│ [Data]          │
└─────────────────┘
```

#### 4. Table Results Tab
```
┌─────┬──────────┬───────┬────┐
│ Well│ Plate    │ Group │... │
├─────┼──────────┼───────┼────┤
│ A1  │ Plate 1  │ Std1  │... │
│ A2  │ Plate 1  │ Std2  │... │
│ A1  │ Plate 2  │ Std1  │... │
│ A2  │ Plate 2  │ Std2  │... │
└─────┴──────────┴───────┴────┘
        ↑
    New Column!
```

**Features:**
- ✅ All table features work (sort, filter, search, export)
- ✅ Plate column is sortable and filterable
- ✅ Export includes plate information

---

## 🎨 Plot Filters

### Location
Plots Tab → Filter Controls

### Available Filters

#### 1. Plate Filter
```
Filter by Plate:
☐ Plate 1
☑ Plate 2  ← Selected
☐ Plate 3
```

#### 2. Compound Filter
```
Filter by Compound:
☐ Standard
☑ Drug A   ← Selected
☐ Drug B
```

#### 3. Cytokine Filter
```
Filter by Cytokine:
☐ IL-5
☑ IL-6     ← Selected
☐ IL-10
```

### How to Use

**Example 1: Compare Drug A across all plates**
1. Leave Plate filter on "All Plates"
2. Select "Drug A" in Compound filter
3. Leave Cytokine filter on "All Cytokines"
4. Plot shows Drug A data from all plates

**Example 2: View IL-6 for Plate 2 only**
1. Select "Plate 2" in Plate filter
2. Leave Compound filter on "All Compounds"
3. Select "IL-6" in Cytokine filter
4. Plot shows only IL-6 data from Plate 2

**Example 3: Complex comparison**
1. Select "Plate 1" and "Plate 2" (hold Ctrl)
2. Select "Drug A" and "Drug B" (hold Ctrl)
3. Select "IL-6"
4. Plot shows IL-6 levels for Drug A and Drug B from Plate 1 and 2

### Tips
- 💡 Hold **Ctrl** (Windows) or **Cmd** (Mac) to select multiple items
- 💡 Click "Clear Filters" to reset everything
- 💡 Filters update plots immediately

---

## ⚠️ Important Behaviors

### When You Switch Plates:
1. ✅ Current plate data is saved automatically
2. ✅ All displays are completely cleared
3. ✅ New plate data is loaded
4. ✅ All tabs update to show new plate

### When You Add a New Plate:
1. ✅ New empty plate is created
2. ✅ Automatically switches to the new plate
3. ✅ Ready to import data

### When You Enable "Show All Plates":
1. ✅ ALL tabs switch to master view
2. ✅ Plate schematic: Stacked panels
3. ✅ Standard curves: Stacked panels
4. ✅ Compound analysis: Stacked panels
5. ✅ Table results: Master table with plate column
6. ✅ Plots: Filterable by plate

### When You Disable "Show All Plates":
1. ✅ Returns to single-plate view
2. ✅ Shows currently active plate
3. ✅ All tabs show single plate data

---

## 🔍 Troubleshooting

### "I switched plates but still see old data"
**Solution:** 
- Check that you're not in "Show All Plates" mode
- Try clicking the plate tab again
- Refresh the page if issue persists

### "Master table doesn't show plate column"
**Solution:**
- Ensure "Show All Plates" is checked
- Make sure you have run analysis on multiple plates
- Check browser console (F12) for error messages

### "Plot filters don't show my plates"
**Solution:**
- Run analysis on your plates first
- Filters populate from analyzed data only
- Click "Clear Filters" and try again

### "Some plates show no data"
**Solution:**
- Make sure you've imported data for those plates
- Run analysis for each plate
- Check that analysis completed successfully

---

## 📤 Export in Master Mode

### What Gets Exported:

**CSV Export:**
```
Well, Plate Name, Group, Signal, Concentration, ...
A1,  Plate 1,    Std1,  1234,   10.5,         ...
A2,  Plate 1,    Std2,  2345,   5.2,          ...
A1,  Plate 2,    Std1,  1456,   11.2,         ...
A2,  Plate 2,    Std2,  2567,   5.8,          ...
```

**Excel Export:**
- Same structure as CSV
- Includes formatting
- Plate column included

**Features:**
- ✅ Plate information preserved
- ✅ All columns included
- ✅ Sorted by plate, then well

---

## ✨ Best Practices

### Workflow 1: Comparing Treatments Across Plates
1. Import data for all plates
2. Run analysis on all plates
3. Enable "Show All Plates"
4. View master table to compare
5. Use plot filters to visualize specific comparisons

### Workflow 2: Processing Multiple Experiments
1. Create separate plate for each experiment
2. Switch between plates as needed
3. Analyze each plate individually
4. Use master view for final comparison

### Workflow 3: Quality Control
1. View all plates in master mode
2. Check standard curves side-by-side
3. Review plate schematics for consistency
4. Export master table for record keeping

---

## 🎓 Tips & Tricks

### Keyboard Shortcuts
- **Ctrl/Cmd + Click**: Select multiple filter items
- **F12**: Open browser console for debugging
- **Ctrl/Cmd + S**: Save current state (browser)

### Performance Tips
- Master view renders plates with staggering (100ms delay each)
- This prevents UI freezing with many plates
- Wait for all panels to load before interacting

### Data Management
- Each plate maintains independent state
- Switching plates doesn't affect other plates
- All data is saved in memory (export regularly!)

---

## 🎉 You're Ready!

The multi-plate system is now fully functional with:
- ✅ Complete data isolation between plates
- ✅ Master view for comprehensive analysis
- ✅ Flexible plot filters for custom visualizations
- ✅ Export capabilities for all modes

**Need Help?**
- Check browser console (F12) for detailed logs
- All actions are logged with emojis for easy tracking
- Refer to MULTI_PLATE_FIXES_SUMMARY.md for technical details

