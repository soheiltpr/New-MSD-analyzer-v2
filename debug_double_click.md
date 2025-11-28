# 🔧 DEBUG: Double-Click Issue

I've added **extensive console logging** to help us diagnose why items aren't appearing.

## What to Do

### Step 1: Refresh Browser
**Hard refresh:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Step 2: Open Developer Console
Press **F12** or **Cmd+Option+I** (Mac) or **Ctrl+Shift+I** (Windows)

### Step 3: Test the Feature
1. Click **"🎨 Layout Builder"** button
2. **Double-click** anywhere on the canvas
3. **Click any item** from the modal (e.g., "Plate Schematic")
4. **Watch the console** for detailed logs

## What to Look For in Console

You should see logs like this:

```
Canvas double-clicked at: 450 320
Showing content selector at canvas position: 450 320
🎯 addContentToCanvas called: {type: 'plate-schematic', x: 450, y: 320, cytokineIndex: null}
Closing content selector modal
Adding item: plate-schematic
📦 addItemToCanvasAtSpecificPosition called: {itemType: 'plate-schematic', x: 450, y: 320, cytokineIndex: null}
Canvas element: <div id="canvasGrid" style="...">
Empty state element: <div id="canvasEmptyState" style="...">
Hiding empty state
Creating item with ID: canvas_item_1
Item config: {icon: '🧪', title: 'Plate Schematic', ...}
Appending item to canvas...
Item appended successfully
Item dimensions: {id: 'canvas_item_1', x: '450px', y: '320px', width: '500px', height: '400px', ...}
Making item draggable...
Making item resizable...
✅ Item added successfully: canvas_item_1 with cytokineIndex: null
Total canvas items: 1
✅ Item added successfully
```

## Possible Issues & Solutions

### Issue 1: "Canvas not found!"
**Problem:** The canvas element doesn't exist
**Solution:** The Layout Builder modal didn't initialize properly
- Close modal
- Click "🎨 Layout Builder" again
- Try again

### Issue 2: Item dimensions show rect: {width: 0, height: 0}
**Problem:** Item is created but has no size
**Solution:** CSS issue or canvas positioning problem
- **Tell me the exact console output**

### Issue 3: Item appended but not visible
**Problem:** Item might be off-screen or behind something
**Solution:** 
- Try scrolling the canvas area
- Try adding at position (100, 100) instead
- **Tell me what the console shows for "Item dimensions"**

### Issue 4: Error before "Item appended"
**Problem:** JavaScript error during creation
**Solution:**
- Look for red error messages in console
- **Copy and paste the error here**

### Issue 5: Modal doesn't close
**Problem:** Item isn't actually being added
**Solution:**
- Check if you see "🎯 addContentToCanvas called"
- If not, the button onclick isn't working
- **Tell me if you see this log**

## What to Report Back

Please copy and paste:

1. **All console output** after clicking an item (from "Canvas double-clicked" onwards)

2. **Any error messages** (in red in console)

3. **What you see visually:**
   - Does modal close?
   - Do you see any item appear?
   - Can you scroll the canvas?

4. **Browser details:**
   - Which browser? (Chrome, Safari, Firefox, etc.)
   - Version?

## Quick Tests

### Test A: Check if canvas exists
Open console and type:
```javascript
document.getElementById('canvasGrid')
```
Should return: `<div id="canvasGrid" ...>`

### Test B: Check canvasItemCounter
Open console and type:
```javascript
canvasItemCounter
```
Should return a number (starts at 1)

### Test C: Check canvasItems array
Open console and type:
```javascript
canvasItems
```
Should return an array (might be empty or have items)

### Test D: Manually add test item
Open console and type:
```javascript
addItemToCanvasAtSpecificPosition('text-box', 100, 100)
```
Does a text box appear at top-left?

## Expected Behavior

When working correctly:
1. ✅ Modal closes
2. ✅ Item appears at click position
3. ✅ Item has header with title and ✕ button
4. ✅ Item has content area
5. ✅ Item has 4 corner resize handles
6. ✅ You can drag item by header
7. ✅ You can resize from corners

---

**Please run these tests and send me the console output so I can fix the exact issue!** 🔍

