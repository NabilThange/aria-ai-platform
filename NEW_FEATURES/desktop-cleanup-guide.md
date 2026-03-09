# ARIA Desktop Environment - Optimized Configuration

## Overview
Streamlined desktop setup for ARIA agent with only essential applications to reduce visual clutter and improve agent focus.

---

## Application Inventory

### ✅ Installed & Available
| Application | Desktop File | Purpose | Access Method |
|------------|--------------|---------|---------------|
| Firefox ESR | `firefox.desktop` | Web browsing | Desktop icon, `computer_application` |
| XFCE Terminal | `terminal.desktop` | Command line | Desktop icon, `computer_application` |
| Thunar | Built-in | File manager | `computer_application("directory")` |
| Mousepad | Built-in | Text editor | Via file manager or terminal |
| Galculator | Built-in | Calculator | Via applications menu |

### ❌ Not Installed (Remove Desktop Files)
- `1password.desktop` - 1Password not installed
- `code.desktop` - VSCode not installed  
- `thunderbird.desktop` - Thunderbird not installed

---

## Cleanup Instructions

### Quick Cleanup (Recommended)
```bash
# Navigate to desktop files directory
cd packages/ariad/root/usr/share/applications/

# Remove orphaned entries
rm -f 1password.desktop code.desktop thunderbird.desktop

# Verify only essential apps remain
ls -la
# Expected output: firefox.desktop, terminal.desktop
```

### Verification
```bash
# Check desktop icons
ls -la packages/ariad/root/home/user/Desktop/
# Expected: Firefox.desktop, Terminal.desktop

# Verify no broken references
grep -r "1password\|code\|thunderbird" packages/ariad/root/usr/share/applications/
# Should return no results
```

---

## Desktop Layout

```
/home/user/Desktop/
├── Firefox.desktop      → /usr/bin/firefox-esr
└── Terminal.desktop     → xfce4-terminal
```

**Benefits:**
- Clean, distraction-free desktop
- Faster screenshot analysis (fewer elements)
- Reduced token usage (less visual noise)
- Clear application switching paths

---

## Agent Integration

### Application Switching
```json
// Firefox
{"name": "computer_application", "input": {"application": "firefox"}}

// Terminal
{"name": "computer_application", "input": {"application": "terminal"}}

// File Manager
{"name": "computer_application", "input": {"application": "directory"}}

// Desktop
{"name": "computer_application", "input": {"application": "desktop"}}
```

### Best Practices
1. **Terminal First**: Use terminal commands when possible (200 tokens vs 1500 for GUI)
2. **Desktop Icons**: Double-click for launching apps
3. **No Shortcuts**: Never use keyboard shortcuts (Alt+Tab, etc.) - use `computer_application` tool
4. **Screenshot Verify**: Always screenshot before and after actions

---

## Maintenance

### Adding New Applications
If you need to add applications:

1. Install via Dockerfile:
```dockerfile
RUN apt-get update && apt-get install -y <package-name>
```

2. Create desktop file in `packages/ariad/root/usr/share/applications/`:
```desktop
[Desktop Entry]
Version=1.0
Type=Application
Name=App Name
Exec=/usr/bin/app-command
Icon=app-icon
Terminal=false
Categories=Category;
```

3. Update this documentation

### Removing Applications
1. Delete desktop file from `packages/ariad/root/usr/share/applications/`
2. Remove from Dockerfile if installed there
3. Update this documentation

---

## Troubleshooting

### Desktop Icons Not Appearing
```bash
# Rebuild container
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Application Won't Launch
```bash
# Check if binary exists
which firefox-esr
which xfce4-terminal

# Check desktop file syntax
desktop-file-validate /usr/share/applications/firefox.desktop
```

### Orphaned Desktop Files
```bash
# Find all .desktop files
find packages/ariad/root -name "*.desktop"

# Check each for valid Exec path
for f in packages/ariad/root/usr/share/applications/*.desktop; do
  echo "Checking $f"
  grep "^Exec=" "$f"
done
```
