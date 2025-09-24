# Grayscale Focus - Advanced Productivity Extension

A comprehensive Firefox extension designed to boost productivity and reduce visual distractions through multiple visual focus modes, advanced timing features, and intelligent site management.

## 🚀 Features

### Visual Focus Modes
- **Grayscale**: Classic black and white mode for reduced visual distraction
- **Sepia**: Warm, vintage look that's easier on the eyes
- **Blur**: Subtle background blur for focus on content structure
- **Contrast**: Reduced contrast for gentler viewing
- **Desaturate**: Removes color saturation while maintaining some visual appeal
- **Invert**: High contrast inverted colors for specific use cases

### Advanced Controls
- **Adjustable Intensity**: Fine-tune visual effects from 10% to 100%
- **Site Whitelist**: Exempt specific websites from visual effects (supports wildcards)
- **Keyboard Shortcuts**: Quick toggle with Ctrl+Shift+G
- **Context Menu Integration**: Right-click access to common functions

### Pomodoro Timer
- **Built-in Focus Timer**: Standard 25-minute work sessions with 5-minute breaks
- **Customizable Durations**: Adjust work and break periods to your preference
- **Desktop Notifications**: Get notified when sessions start and end
- **Timer Controls**: Start, pause, and reset functionality

### Usage Analytics
- **Daily Focus Time**: Track your productive hours each day
- **Weekly Overview**: Visual chart of your focus patterns
- **Session Counting**: Monitor completed focus sessions
- **Historical Data**: Long-term productivity insights

### Smart Compatibility
- **Universal Support**: Works on all websites with intelligent CSS handling
- **Problematic Site Optimization**: Special handling for Netflix, YouTube, Pandora, Spotify, Twitch
- **Dynamic Content Support**: Handles SPAs and dynamically loaded content
- **Cross-frame Compatibility**: Affects iframes and embedded content

## 📦 Installation

### Development Installation

1. **Build the extension:**
   ```bash
   # Development build
   ./build.sh

   # Development build with clean
   ./build.sh --clean
   ```

2. **Load in Firefox:**
   - Open Firefox and navigate to `about:debugging`
   - Click on "This Firefox" in the sidebar
   - Click on "Load Temporary Add-on"
   - Navigate to `build/` folder and select `manifest.json`

### Production Build

1. **Create production package:**
   ```bash
   # Production build with ZIP package
   ./build.sh prod

   # Clean production build
   ./build.sh prod --clean
   ```

2. **The script will create:**
   - `dist/` folder with production files
   - `grayscale-focus-v{version}.zip` ready for Mozilla Add-ons

### Build Script Options

```bash
./build.sh [mode] [options]

Modes:
  dev, development  Build for development (default)
  prod, production  Build for production with ZIP package ready for Mozilla Add-ons

Options:
  --clean, -c       Clean previous builds first
  --help, -h        Show help message
```

**Production build features:**
- 🗜️ Optimized ZIP package for Mozilla Add-ons submission
- 📄 Package contents listing and size information
- 📋 Complete submission checklist with Mozilla Add-ons steps
- 🚀 Professional submission guidance

1. **Create production package:**
   ```bash
   ./package.sh
   ```

2. **Install the package:**
   - The extension will be packaged as `grayscale-focus-extension.zip`
   - Submit to Firefox Add-ons store or install manually

## 🎯 Usage

### Quick Start
1. Click the extension icon in the toolbar to open the popup
2. Toggle the main switch to enable visual focus mode
3. Choose your preferred visual mode (grayscale, sepia, blur, etc.)
4. Adjust intensity using the slider

### Keyboard Shortcuts
- `Ctrl+Shift+G` (Windows/Linux) or `Cmd+Shift+G` (Mac): Toggle visual focus
- `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac): Start focus timer

### Context Menu
Right-click on any page to access:
- Toggle site whitelist
- Switch visual mode
- Start focus timer

### Tabs Overview

#### Main Tab
- **Toggle Switch**: Enable/disable visual focus mode
- **Visual Modes**: Choose from 6 different visual effects
- **Intensity Slider**: Adjust effect strength (10-100%)

#### Timer Tab
- **Pomodoro Timer**: 25-minute focus sessions with 5-minute breaks
- **Custom Durations**: Set your own work and break periods
- **Timer Controls**: Start, pause, and reset functionality

#### Sites Tab
- **Whitelist Management**: Add/remove sites that should be exempt
- **Quick Add**: Enter domain names to whitelist
- **Wildcard Support**: Use patterns like `*.example.com` to match all subdomains

#### Stats Tab
- **Focus Metrics**: Today's time, weekly total, session count
- **Weekly Chart**: Visual representation of your focus patterns

## 🛠️ Development

### Project Structure
```
grayscale-firefox-plugin/
├── manifest.json           # Extension manifest
├── src/
│   ├── js/
│   │   ├── background.js   # Background script (timer, context menus)
│   │   ├── content.js      # Content script (visual effects)
│   │   └── popup.js        # Popup interface logic
│   ├── html/
│   │   └── popup.html      # Popup interface
│   ├── css/
│   │   └── grayscale.css   # Visual effect styles
│   └── assets/
│       └── icons/          # Extension icons
├── build/                  # Development build (generated)
├── dist/                   # Production build (generated)
├── build.sh               # Unified build & packaging script
└── test-sites.sh          # Site testing utility
```

### Building
```bash
# Development build
./build.sh

# Production build with ZIP package
./build.sh prod

# Clean builds
./build.sh --clean
./build.sh prod --clean

# Test problematic sites
./test-sites.sh
```

### Key Technologies
- **Manifest V2**: Firefox extension API
- **WebExtensions**: Cross-browser compatibility
- **CSS Filters**: Visual effect implementation
- **Local Storage**: Settings and analytics persistence
- **Alarms API**: Timer functionality
- **Notifications API**: Desktop notifications

## 🔧 Configuration

### Default Settings
- **Visual Mode**: Grayscale
- **Intensity**: 100%
- **Work Duration**: 25 minutes
- **Break Duration**: 5 minutes
- **Whitelist**: Empty

### Storage
All settings are stored locally using the WebExtensions storage API:
- User preferences persist across browser sessions
- Analytics data is kept locally (never transmitted)
- Whitelist entries support both exact domains and wildcard patterns

### Whitelist Patterns
The extension supports two types of whitelist patterns:

1. **Exact Domain**: `example.com` - matches only that specific domain
2. **Wildcard Pattern**: `*.example.com` - matches the domain and all its subdomains
   - `api.example.com` ✅ matches
   - `admin.example.com` ✅ matches
   - `deep.sub.example.com` ✅ matches
   - `example.com` ✅ matches (root domain)
   - `notexample.com` ❌ does not match

Examples:
- `*.atlassian.net` matches `confluence.atlassian.net`, `jira.atlassian.net`, etc.
- `*.github.com` matches `api.github.com`, `gist.github.com`, etc.

## 🚨 Troubleshooting

### Common Issues

#### Extension not working on certain sites
- Some sites may use complex CSS that interferes with filters
- Try different visual modes or adjust intensity
- Add problematic sites to whitelist if needed

#### Timer not showing notifications
- Ensure Firefox notifications are enabled
- Check system notification permissions
- Verify the extension has notification permission

#### Visual effects not applying
- Refresh the page after enabling the extension
- Check if the site is in your whitelist
- Try toggling the extension off and on

### Debug Mode
Enable debug logging by:
1. Opening Firefox Developer Tools (F12)
2. Going to Console tab
3. Looking for "Grayscale Focus" messages

## 📊 Analytics & Privacy

### What We Track
- **Local Only**: All data stays on your device
- **Focus Time**: Duration of focus sessions
- **Usage Patterns**: When and how you use the extension
- **Site Whitelist**: Your exempted domains

### What We Don't Track
- **Personal Data**: No personal information collected
- **Browsing History**: No tracking of visited websites
- **External Transmission**: No data sent to servers

## 🤝 Contributing

### Bug Reports
1. Check existing issues on GitHub
2. Provide detailed reproduction steps
3. Include Firefox version and OS information

### Feature Requests
1. Search existing feature requests
2. Describe the use case and benefit
3. Consider implementation complexity

### Code Contributions
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Firefox WebExtensions API documentation
- CSS Filter specifications
- Pomodoro Technique methodology
- Open source community feedback

## 📚 Resources

- [Firefox Extension Development](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [WebExtensions API Reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API)
- [CSS Filter Effects](https://developer.mozilla.org/en-US/docs/Web/CSS/filter)
- [Pomodoro Technique](https://francescocirillo.com/products/the-pomodoro-technique)

---

**Compatibility**: Firefox 89+
