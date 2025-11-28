# 🎨 Layout 1 Tab - Complete Guide

## What's New

I've created a **brand new "Layout 1" tab** with a completely different design inspired by **Prism and OneNote**!

## How to Access

1. **Refresh your browser** (Cmd+Shift+R or Ctrl+Shift+R)
2. **Click the "🎨 Layout 1" tab** at the top (new tab, rightmost position)

## What You'll See

### **1. Purple Gradient Toolbar** (Top)
- Title: "🎨 Layout Builder (Prism Style)"
- Three action buttons:
  - 🗑️ **Clear** - Remove all items
  - 💾 **Save** - Download layout as JSON
  - 📄 **Export PDF** - Export (coming soon)

### **2. Left Sidebar** (280px wide, scrollable)
**Categories:**

**Charts & Graphs:**
- 🧪 Plate Schematic
- 📈 Standard Curve
- 🧬 Compounds Chart
- 📉 Cytokine Plot

**Tables:**
- 📊 Results Table

**Content:**
- 📝 Text Box
- 📌 Title / Header

### **3. Canvas Area** (Main area with grid background)
- Dotted grid pattern
- Empty state message initially
- Infinite canvas where items are placed

## How to Use

### **Add Items to Canvas**
**Method 1:** Click any item in the sidebar
- Example: Click "📈 Standard Curve"
- A blue-bordered box appears on canvas
- Positioned automatically with slight cascade

### **Move Items**
- **Click and drag the colored header** of any item
- Drag anywhere on the canvas
- Item follows your mouse
- Cannot drag outside canvas bounds

### **Resize Items**
Each item has **4 circular handles** at corners:
- **Top-left** (NW): Resize from top-left corner
- **Top-right** (NE): Resize from top-right corner
- **Bottom-left** (SW): Resize from bottom-left corner
- **Bottom-right** (SE): Resize from bottom-right corner

**To resize:**
1. Hover over a corner handle (cursor changes)
2. Click and drag
3. Minimum size: 200x150px

### **Delete Items**
- Click the **✕** button in the item's header
- Item removed immediately

### **Clear Everything**
- Click **🗑️ Clear** in toolbar
- Confirms before clearing
- All items removed at once

### **Save Layout**
- Click **💾 Save** in toolbar
- Downloads `canvas_layout.json`
- Contains position and size of all items

## Item Types & Sizes

| Type | Icon | Default Size | Border Color | Features |
|------|------|--------------|--------------|----------|
| Plate Schematic | 🧪 | 500x400 | Green | Placeholder for plate view |
| Standard Curve | 📈 | 600x450 | Blue | Placeholder for chart |
| Compounds Chart | 🧬 | 600x450 | Purple | Placeholder for chart |
| Cytokine Plot | 📉 | 550x400 | Red | Placeholder for plot |
| Results Table | 📊 | 700x400 | Orange | Placeholder for table |
| Text Box | 📝 | 400x200 | Gray | **Editable textarea** |
| Title/Header | 📌 | 600x80 | Blue | **Editable input field** |

## Features

### ✅ **What Works Now:**
1. **Click to add** items from sidebar
2. **Drag to move** items around canvas
3. **4-corner resize** - all corners work
4. **Hover effects** - Items lift on hover
5. **Delete individual items** - ✕ button
6. **Clear all** - 🗑️ button
7. **Save layout** - 💾 downloads JSON
8. **Text editing** - Text boxes are editable
9. **Grid background** - Visual alignment aid
10. **Empty state** - Shows when canvas is empty

### 🚧 **Coming Soon:**
1. **Actual data rendering** - Real charts/tables instead of placeholders
2. **Drag from sidebar** - Drag items from sidebar to canvas
3. **Snap to grid** - Align items to grid
4. **Copy/duplicate** - Clone items
5. **Undo/redo** - Action history
6. **Load saved layouts** - Import JSON files
7. **Real PDF export** - Generate actual PDFs
8. **Zoom in/out** - Canvas zoom controls
9. **Multi-select** - Select and move multiple items
10. **Alignment tools** - Align items to each other

## Design Philosophy

**Inspired by:**
- **Prism** - Drag-and-drop figure arrangement
- **OneNote** - Free-form canvas layout
- **Modern web apps** - Clean, professional UI

**Key Differences from Layout Tab:**
- Layout tab: Section-based, vertical stacking
- **Layout 1**: Canvas-based, free positioning
- Layout tab: Simple add/remove
- **Layout 1**: Full drag-drop with resize

## Tips & Tricks

1. **Cascade effect**: New items appear slightly offset, preventing overlap
2. **Hover handles**: Handles only visible on hover to reduce clutter
3. **Color-coded**: Each item type has unique color for easy identification
4. **Sidebar categories**: Items organized by type for easy finding
5. **Grid background**: Use grid lines for visual alignment
6. **Smooth animations**: Hover effects provide visual feedback

## Keyboard Shortcuts (Coming Soon)

- `Delete` - Delete selected item
- `Cmd/Ctrl + S` - Save layout
- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + A` - Select all
- `Cmd/Ctrl + D` - Duplicate selected

## Browser Compatibility

Works best in:
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ IE11 (Not supported)

## Testing Checklist

Please verify:
- [ ] Can see "🎨 Layout 1" tab
- [ ] Can click tab and see purple toolbar
- [ ] Can see sidebar with 7 items
- [ ] Can see grid canvas
- [ ] Clicking "Standard Curve" adds a blue box
- [ ] Can drag box by its header
- [ ] Can resize box from corners
- [ ] Handles are visible on hover
- [ ] ✕ button removes item
- [ ] 🗑️ Clear works
- [ ] 💾 Save downloads JSON

## What to Report

If something doesn't work:
1. ✅ or ❌ Can you see the Layout 1 tab?
2. ✅ or ❌ Can you add items?
3. ✅ or ❌ Can you drag items?
4. ✅ or ❌ Can you resize items?
5. 📸 Screenshot if anything looks wrong
6. 📋 Console errors (F12 → Console tab)

This is a **completely different approach** from the Layout tab - it's a true canvas-based layout builder like Prism!

