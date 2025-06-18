# Release Notes v2.6.0

**Release Date:** June 18, 2025

## 🎯 Key Features

### User Ranking System Enhancement
- **Special Header Effects**: Top 3 performers now get unique visual effects in the header
  - 🥇 **Gold (1st Place)**: Golden flashing balls with sparkle effects
  - 🥈 **Silver (2nd Place)**: Metallic silver shimmer effects  
  - 🥉 **Bronze (3rd Place)**: Rich brown flashing ball effects
- **Performance-Based Theming**: Header colors change based on user ranking
- **Avatar Enhancements**: Crown, medal, and award icons for top performers

### Delay Calculation System
- **Smart Delay Logic**: Fixed shift delay calculations with proper overtime handling
- **Three-Tier System**: 
  - Early checkout penalty calculation
  - Full shift completion recognition
  - Overtime compensation logic
- **Database Integration**: Enhanced performance tracking with delay metrics

### UI/UX Improvements
- **Navigation Performance**: Implemented caching system to eliminate header flickering
- **Professional Scrollbar**: Added custom styled scrollbar for navigation menu
- **Floating Strategy Button**: Enhanced visibility across all pages for media buyers
- **Bronze Theme**: Updated to use proper brown colors for 3rd place ranking

### Order Management
- **Custom Discount Integration**: Fixed WooCommerce integration for custom discounts
- **Currency Display**: Updated all monetary values to use SAR riyal symbols
- **Database Schema**: Added custom discount columns and tracking

## 🔧 Technical Improvements
- Fixed SidebarNavigation syntax errors and component structure
- Enhanced ranking data caching with 5-minute persistence
- Improved mobile responsiveness for ranking effects
- Optimized header effects positioning and performance

## 🐛 Bug Fixes
- Resolved navigation flickering during page transitions
- Fixed missing closing tags in SidebarNavigation component
- Corrected delay calculation formulas for different shift types
- Fixed custom discount column integration errors

---

**Migration Notes:** This update includes database schema changes. Run the provided SQL migration scripts before deployment.

**Compatibility:** Requires minimum version 1.0.0 