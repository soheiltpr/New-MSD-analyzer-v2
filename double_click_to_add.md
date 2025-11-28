# ✅ DOUBLE-CLICK TO SELECT CONTENT!

## What's New

I've added a **double-click feature** to the Layout Builder canvas! Now you can double-click anywhere on the canvas to see a beautiful modal with **all your currently available analysis results** and choose exactly what you want to add!

## How It Works

### Step 1: Open Layout Builder
Click the **"🎨 Layout Builder"** button in the toolbar

### Step 2: Double-Click on Canvas
**Double-click anywhere** on the canvas area (the gray grid background)

### Step 3: Content Selector Modal Opens!
A beautiful modal appears with organized sections:

#### 📈 **Charts & Graphs**
Shows available visualizations:
- **🧪 Plate Schematic** - Your 96-well plate layout
- **📈 Standard Curve** - Current cytokine's standard curve
- **🧬 Compounds Chart** - Analysis visualization

#### 📉 **Cytokine Plots**
Shows **ALL analyzed cytokines**:
- Each cytokine gets its own button
- Scrollable list if you have many
- Shows the cytokine name on each button
- Click any one to add that specific plot!

**Example buttons:**
```
📊 IL-1β
📊 IL-6
📊 TNF-α
📊 IFN-γ
... (all your cytokines)
```

#### 📊 **Tables**
- **📊 Results Table** - Complete analysis data

#### 📝 **Other Content**
- **📝 Text Box** - Add notes or labels

### Step 4: Click What You Want
- Click any button to add that content
- It appears exactly where you double-clicked!
- Modal closes automatically
- Content is ready to move/resize

### Step 5: Customize Your Layout
- **Drag** items to reposition
- **Resize** from corner handles
- **Delete** with ✕ button
- **Double-click again** to add more!

## Smart Features

### ✅ Shows Only Available Data
The modal is **smart** and only shows what's currently available:
- If you haven't analyzed yet → fewer options
- After analysis → all cytokines appear
- Each cytokine plot is individually selectable

### ✅ Organized Categories
Content is grouped logically:
- Charts & Graphs (big visualizations)
- Cytokine Plots (individual plots)
- Tables (data tables)
- Other Content (text boxes, etc.)

### ✅ Beautiful Design
- **Purple gradient header** matches Layout Builder theme
- **Grid layout** for easy browsing
- **Hover effects** on buttons
- **Color-coded** by content type
- **Icons** for visual recognition

### ✅ Easy to Use
- **Double-click** is intuitive (like Windows/Mac)
- **Click anywhere** to close (or ✕ button)
- **One click** adds content
- **Shows names** so you know what you're adding

## Visual Guide

### Modal Layout:
```
┌─────────────────────────────────────────────────────┐
│ 📊 Select Content to Add                        ✕  │
│ Choose from currently available analysis results    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 📈 Charts & Graphs                                  │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│ │   🧪    │  │   📈    │  │   🧬    │             │
│ │  Plate  │  │Standard │  │Compounds│             │
│ └─────────┘  └─────────┘  └─────────┘             │
│                                                      │
│ 📉 Cytokine Plots                                   │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │  📊    │ │  📊    │ │  📊    │ │  📊    │       │
│ │ IL-1β  │ │  IL-6  │ │ TNF-α  │ │ IFN-γ  │       │
│ └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                      │
│ 📊 Tables                                           │
│ ┌─────────┐                                         │
│ │   📊    │                                         │
│ │ Results │                                         │
│ └─────────┘                                         │
│                                                      │
│ 📝 Other Content                                    │
│ ┌─────────┐                                         │
│ │   📝    │                                         │
│ │Text Box │                                         │
│ └─────────┘                                         │
└─────────────────────────────────────────────────────┘
```

## Use Cases

### Scenario 1: Adding Specific Cytokine
1. You analyzed 10 cytokines
2. Want to add **only IL-6** plot to layout
3. **Double-click** canvas
4. Scroll to cytokine plots
5. Click **"📊 IL-6"**
6. IL-6 plot appears at that position!

### Scenario 2: Building Custom Report
1. **Double-click** → Add Standard Curve
2. **Double-click** → Add IL-1β plot
3. **Double-click** → Add TNF-α plot
4. **Double-click** → Add Results Table
5. **Double-click** → Add Text Box for notes
6. Arrange and resize everything
7. **Save** your layout!

### Scenario 3: Comparing Multiple Cytokines
1. **Double-click** → IL-6
2. Move it to top-left
3. **Double-click** → TNF-α
4. Move it to top-right
5. **Double-click** → IFN-γ
6. Move it to bottom-left
7. Side-by-side comparison ready!

## Technical Details

### Data Detection
The modal checks for:
- **CYTOKINES array** - Lists all analyzed cytokines
- **wellPlate element** - Checks if plate data exists
- **standardCurveChartCanvas** - Checks if curve is available
- **compoundsChartCanvas** - Checks if compounds chart exists

### Cytokine Index Storage
When you select a specific cytokine:
- The **cytokine index** is saved with the item
- The **title** shows the cytokine name (e.g., "IL-6 Plot")
- Later, when rendering, it knows **which cytokine** to display

### Modal Styling
```javascript
z-index: 20000  // Appears above Layout Builder (z-index: 10000)
background: rgba(0,0,0,0.7)  // Semi-transparent overlay
max-width: 800px  // Comfortable reading width
max-height: 80vh  // Fits on screen with scrolling
```

## Advantages Over Old System

### Before (Default Auto-Load):
- ❌ All 6 items loaded at once
- ❌ Can't choose specific cytokines
- ❌ Generic "Cytokine Plot" - which one?
- ❌ Have to delete unwanted items

### After (Double-Click Selector):
- ✅ Choose exactly what you want
- ✅ Select specific cytokines by name
- ✅ See all available options
- ✅ Add incrementally as needed
- ✅ No cleanup required

## Keyboard Shortcuts

- **Double-click canvas** → Open content selector
- **Click background** → Close modal
- **Click ✕** → Close modal
- **ESC** → (Could add this if needed)

## What You'll See in Console

When you double-click:
```
Canvas double-clicked at: 450 320
Showing content selector at canvas position: 450 320
```

When you select content:
```
Adding content to canvas: cytokine-plot at 450 320 cytokine: 3
Adding item to canvas: cytokine-plot at 450 320 cytokineIndex: 3
Item added: canvas_item_7 with cytokineIndex: 3
```

## Tips & Tricks

### ✅ Strategic Placement
Double-click **where you want** the item to appear:
- Top-left for important charts
- Bottom for notes
- Side-by-side for comparisons

### ✅ Multiple Cytokines
Add the same cytokine multiple times if needed:
- Different views
- Duplicate for comparison
- One for report, one for notes

### ✅ Empty Canvas Strategy
Instead of auto-loading:
1. Start with **empty canvas** (clear all)
2. **Double-click** to add only what you need
3. Build **custom reports** from scratch

### ✅ Template Building
1. Add items via double-click
2. Arrange perfectly
3. **Save layout** as template
4. Reuse for future analyses!

## Still Works: Right-Click Menu
The **right-click menu** is still there:
- Generic options (no cytokine choice)
- Quick add from fixed menu
- Use **double-click** for more control!

## Comparison

| Feature | Right-Click | Double-Click |
|---------|-------------|--------------|
| Opens | Context menu | Full modal |
| Shows | Generic types | Specific data |
| Cytokines | "Cytokine Plot" | Each by name |
| Selection | Limited | All available |
| UI | Small menu | Large organized |
| Best For | Quick add | Precise choice |

## What to Test

1. ✅ **Open Layout Builder** button
2. ✅ **Double-click** on gray canvas area
3. ✅ Modal appears with sections
4. ✅ See your **cytokines listed** individually
5. ✅ Click a specific cytokine (e.g., IL-6)
6. ✅ Item appears at double-click position
7. ✅ Title shows **cytokine name** in header
8. ✅ **Double-click again** to add more
9. ✅ Try different cytokines
10. ✅ Close modal by clicking background

## Example Workflow

**Building a Cytokine Comparison Report:**

1. Click **"🎨 Layout Builder"**
2. Clear default items (🗑️ Clear All)
3. **Double-click** top-left → Select **IL-6**
4. **Double-click** top-right → Select **TNF-α**
5. **Double-click** bottom-left → Select **IFN-γ**
6. **Double-click** bottom-right → Select **Results Table**
7. Resize all to same size
8. Add text boxes for annotations
9. **Save** layout!

**Result:** Custom 2x2 grid comparing 3 cytokines + data table!

## Future Enhancements

Could add:
- **Search box** in modal (filter cytokines)
- **Favorites** (star frequently used items)
- **Recent** section (last added items)
- **Preview thumbnails** (show actual charts)
- **Multi-select** (add multiple at once)

**But for now, this gives you complete control over your layout!** 🎨✨

---

**Ready to try?**
1. Refresh page
2. Analyze some data
3. Click **🎨 Layout Builder**
4. **Double-click** the canvas
5. Choose your content!

