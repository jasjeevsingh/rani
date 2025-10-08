const { screen } = require('electron');

/**
 * 
 * @param {BrowserWindow} window 
 * @returns {Display}
 */
function getCurrentDisplay(window) {
    if (!window || window.isDestroyed()) return screen.getPrimaryDisplay();

    const windowBounds = window.getBounds();
    const windowCenter = {
        x: windowBounds.x + windowBounds.width / 2,
        y: windowBounds.y + windowBounds.height / 2,
    };

    return screen.getDisplayNearestPoint(windowCenter);
}

class WindowLayoutManager {
    /**
     * @param {Map<string, BrowserWindow>} windowPool - 관리할 창들의 맵
     */
    constructor(windowPool) {
        this.windowPool = windowPool;
        this.isUpdating = false;
        this.PADDING = 80;
    }

    getHeaderPosition = () => {
        const header = this.windowPool.get('header');
        if (header) {
            const [x, y] = header.getPosition();
            return { x, y };
        }
        return { x: 0, y: 0 };
    };


    /**
     * 
     * @returns {{name: string, primary: string, secondary: string}}
     */
    determineLayoutStrategy(headerBounds, screenWidth, screenHeight, relativeX, relativeY, workAreaX, workAreaY) {
        const headerRelX = headerBounds.x - workAreaX;
        const headerRelY = headerBounds.y - workAreaY;

        const spaceBelow = screenHeight - (headerRelY + headerBounds.height);
        const spaceAbove = headerRelY;
        const spaceLeft = headerRelX;
        const spaceRight = screenWidth - (headerRelX + headerBounds.width);

        if (spaceBelow >= 400) {
            return { name: 'below', primary: 'below', secondary: relativeX < 0.5 ? 'right' : 'left' };
        } else if (spaceAbove >= 400) {
            return { name: 'above', primary: 'above', secondary: relativeX < 0.5 ? 'right' : 'left' };
        } else if (relativeX < 0.3 && spaceRight >= 800) {
            return { name: 'right-side', primary: 'right', secondary: spaceBelow > spaceAbove ? 'below' : 'above' };
        } else if (relativeX > 0.7 && spaceLeft >= 800) {
            return { name: 'left-side', primary: 'left', secondary: spaceBelow > spaceAbove ? 'below' : 'above' };
        } else {
            return { name: 'adaptive', primary: spaceBelow > spaceAbove ? 'below' : 'above', secondary: spaceRight > spaceLeft ? 'right' : 'left' };
        }
    }



    /**
     * @returns {{x: number, y: number} | null}
     */
    calculateSettingsWindowPosition() {
        const header = this.windowPool.get('header');
        const settings = this.windowPool.get('settings');

        if (!header || header.isDestroyed() || !settings || settings.isDestroyed()) {
            return null;
        }

        const headerBounds = header.getBounds();
        const settingsBounds = settings.getBounds();
        const display = getCurrentDisplay(header);
        const { x: workAreaX, y: workAreaY, width: screenWidth, height: screenHeight } = display.workArea;

        const PAD = 8;
        
        // Settings button is at the top-right of the header
        // Position settings window directly below the header top (not bottom)
        const buttonGap = 18; // Gap from right edge of header to align with button
        
        // Align right edge of settings window with settings button
        const x = headerBounds.x + headerBounds.width - settingsBounds.width - buttonGap;
        // Position at the top of the header (below the header bar)
        const y = headerBounds.y + 54 + PAD; // 54px is the header bar height

        // Clamp to screen bounds
        const clampedX = Math.max(workAreaX + 10, Math.min(workAreaX + screenWidth - settingsBounds.width - 10, x));
        const clampedY = Math.max(workAreaY + 10, Math.min(workAreaY + screenHeight - settingsBounds.height - 10, y));

        console.log('[LayoutManager] Settings window position:', { 
            headerBounds, 
            settingsBounds, 
            buttonGap,
            calculated: { x, y }, 
            clamped: { x: clampedX, y: clampedY } 
        });

        return { x: Math.round(clampedX), y: Math.round(clampedY) };
    }


    calculateHeaderResize(header, { width, height }) {
        if (!header) return null;
        const currentBounds = header.getBounds();
        const centerX = currentBounds.x + currentBounds.width / 2;
        const newX = Math.round(centerX - width / 2);
        const display = getCurrentDisplay(header);
        const { x: workAreaX, width: workAreaWidth } = display.workArea;
        const clampedX = Math.max(workAreaX, Math.min(workAreaX + workAreaWidth - width, newX));
        return { x: clampedX, y: currentBounds.y, width, height };
    }
    
    calculateClampedPosition(header, { x: newX, y: newY }) {
        if (!header) return null;
        const targetDisplay = screen.getDisplayNearestPoint({ x: newX, y: newY });
        const { x: workAreaX, y: workAreaY, width, height } = targetDisplay.workArea;
        const headerBounds = header.getBounds();
        const clampedX = Math.max(workAreaX, Math.min(newX, workAreaX + width - headerBounds.width));
        const clampedY = Math.max(workAreaY, Math.min(newY, workAreaY + height - headerBounds.height));
        return { x: clampedX, y: clampedY };
    }
    
    calculateWindowHeightAdjustment(senderWindow, targetHeight) {
        if (!senderWindow) return null;
        const currentBounds = senderWindow.getBounds();
        const minHeight = senderWindow.getMinimumSize()[1];
        const maxHeight = senderWindow.getMaximumSize()[1];
        let adjustedHeight = Math.max(minHeight, targetHeight);
        if (maxHeight > 0) {
            adjustedHeight = Math.min(maxHeight, adjustedHeight);
        }
        console.log(`[Layout Debug] calculateWindowHeightAdjustment: targetHeight=${targetHeight}`);
        return { ...currentBounds, height: adjustedHeight };
    }
    
    // 기존 getTargetBoundsForFeatureWindows를 이 함수로 대체합니다.
    calculateFeatureWindowLayout(visibility, headerBoundsOverride = null) {
        const header = this.windowPool.get('header');
        const headerBounds = headerBoundsOverride || (header ? header.getBounds() : null);

        if (!headerBounds) return {};

        let display;
        if (headerBoundsOverride) {
            const boundsCenter = {
                x: headerBounds.x + headerBounds.width / 2,
                y: headerBounds.y + headerBounds.height / 2,
            };
            display = screen.getDisplayNearestPoint(boundsCenter);
        } else {
            display = getCurrentDisplay(header);
        }
    
        const { width: screenWidth, height: screenHeight, x: workAreaX, y: workAreaY } = display.workArea;
    
        const ask = this.windowPool.get('ask');
        const listen = this.windowPool.get('listen');
        const research = this.windowPool.get('research');
    
        // Skip ask window in sidebar mode - it's embedded in header
        const askVis = false; // Ask is always embedded in sidebar now
        const listenVis = visibility.listen && listen && !listen.isDestroyed();
        const researchVis = visibility.research && research && !research.isDestroyed();
    
        if (!askVis && !listenVis && !researchVis) return {};
    
        const PAD = 8;
        const headerTopRel = headerBounds.y - workAreaY;
        const headerBottomRel = headerTopRel + headerBounds.height;
        const headerCenterXRel = headerBounds.x - workAreaX + headerBounds.width / 2;
        
        const relativeX = headerCenterXRel / screenWidth;
        const relativeY = (headerBounds.y - workAreaY) / screenHeight;
        const strategy = this.determineLayoutStrategy(headerBounds, screenWidth, screenHeight, relativeX, relativeY, workAreaX, workAreaY);
    
        const askB = askVis ? ask.getBounds() : null;
        const listenB = listenVis ? listen.getBounds() : null;
        const researchB = researchVis ? research.getBounds() : null;

        if (askVis) {
            console.log(`[Layout Debug] Ask Window Bounds: height=${askB.height}, width=${askB.width}`);
        }
        if (listenVis) {
            console.log(`[Layout Debug] Listen Window Bounds: height=${listenB.height}, width=${listenB.width}`);
        }
        if (researchVis) {
            console.log(`[Layout Debug] Research Window Bounds: height=${researchB.height}, width=${researchB.width}`);
        }
    
        const layout = {};
        
        // Handle research window - position to LEFT of sidebar
        if (researchVis) {
            // Position Research to the left of the sidebar (similar to Listen)
            const sidebarX = headerBounds.x; // Left edge of sidebar
            let xRel = sidebarX - researchB.width - PAD - workAreaX; // Position to the left with padding
            
            // Ensure it doesn't go off-screen
            xRel = Math.max(PAD, xRel);
            
            // Vertically center with the header
            let yPos = (headerBounds.y - workAreaY) + (headerBounds.height / 2) - (researchB.height / 2);
            
            // Ensure vertical position is within bounds
            yPos = Math.max(PAD, Math.min(screenHeight - researchB.height - PAD, yPos));
            
            layout.research = { 
                x: Math.round(xRel + workAreaX), 
                y: Math.round(yPos + workAreaY), 
                width: researchB.width, 
                height: researchB.height 
            };
            
            console.log('[Layout Debug] Research positioned to left of sidebar:', layout.research);
        }
    
        // Handle Listen + Research both visible - stack vertically on the left
        if (listenVis && researchVis) {
            const sidebarX = headerBounds.x; // Left edge of sidebar
            
            // Position Research window
            let researchXRel = sidebarX - researchB.width - PAD - workAreaX;
            researchXRel = Math.max(PAD, researchXRel);
            
            // Position Listen window above Research (or below if not enough space above)
            let listenXRel = sidebarX - listenB.width - PAD - workAreaX;
            listenXRel = Math.max(PAD, listenXRel);
            
            // Calculate vertical positions - try to center both around header
            const totalHeight = researchB.height + PAD + listenB.height;
            const headerCenterY = (headerBounds.y - workAreaY) + (headerBounds.height / 2);
            
            let researchYPos = headerCenterY - (totalHeight / 2);
            let listenYPos = researchYPos + researchB.height + PAD;
            
            // Adjust if it goes off-screen
            if (researchYPos < PAD) {
                researchYPos = PAD;
                listenYPos = researchYPos + researchB.height + PAD;
            }
            if (listenYPos + listenB.height > screenHeight - PAD) {
                listenYPos = screenHeight - PAD - listenB.height;
                researchYPos = listenYPos - researchB.height - PAD;
            }
            
            layout.research = {
                x: Math.round(researchXRel + workAreaX),
                y: Math.round(researchYPos + workAreaY),
                width: researchB.width,
                height: researchB.height
            };
            
            layout.listen = {
                x: Math.round(listenXRel + workAreaX),
                y: Math.round(listenYPos + workAreaY),
                width: listenB.width,
                height: listenB.height
            };
            
            console.log('[Layout Debug] Listen + Research stacked on left:', { listen: layout.listen, research: layout.research });
        } else if (askVis && listenVis && !researchVis) {
            let askXRel = headerCenterXRel - (askB.width / 2);
            let listenXRel = askXRel - listenB.width - PAD;
    
            if (listenXRel < PAD) {
                listenXRel = PAD;
                askXRel = listenXRel + listenB.width + PAD;
            }
            if (askXRel + askB.width > screenWidth - PAD) {
                askXRel = screenWidth - PAD - askB.width;
                listenXRel = askXRel - listenB.width - PAD;
            }
            
            if (strategy.primary === 'above') {
                const windowBottomAbs = headerBounds.y - PAD;
                layout.ask = { x: Math.round(askXRel + workAreaX), y: Math.round(windowBottomAbs - askB.height), width: askB.width, height: askB.height };
                layout.listen = { x: Math.round(listenXRel + workAreaX), y: Math.round(windowBottomAbs - listenB.height), width: listenB.width, height: listenB.height };
            } else { // 'below'
                const yAbs = headerBounds.y + headerBounds.height + PAD;
                layout.ask = { x: Math.round(askXRel + workAreaX), y: Math.round(yAbs), width: askB.width, height: askB.height };
                layout.listen = { x: Math.round(listenXRel + workAreaX), y: Math.round(yAbs), width: listenB.width, height: listenB.height };
            }
        } else if ((askVis || listenVis) && !researchVis) { // Single window (ask or listen, but not research)
            const winName = askVis ? 'ask' : 'listen';
            const winB = askVis ? askB : listenB;
            if (!winB) return {};
            
            let xRel, yPos;
            
            // Position listen window to the left of the sidebar
            if (listenVis) {
                // Get sidebar position (header is at right edge of screen)
                const sidebarX = headerBounds.x; // Left edge of sidebar
                xRel = sidebarX - winB.width - PAD - workAreaX; // Position to the left with padding
                
                // Vertically center with the header
                yPos = (headerBounds.y - workAreaY) + (headerBounds.height / 2) - (winB.height / 2);
            } else {
                // Original centered positioning for ask window
                xRel = headerCenterXRel - winB.width / 2;
                xRel = Math.max(PAD, Math.min(screenWidth - winB.width - PAD, xRel));
                
                if (strategy.primary === 'above') {
                    yPos = (headerBounds.y - workAreaY) - PAD - winB.height;
                } else { // 'below'
                    yPos = (headerBounds.y - workAreaY) + headerBounds.height + PAD;
                }
            }
            
            layout[winName] = { 
                x: Math.round(Math.max(PAD, xRel) + workAreaX), 
                y: Math.round(Math.max(PAD, Math.min(screenHeight - winB.height - PAD, yPos)) + workAreaY), 
                width: winB.width, 
                height: winB.height 
            };
        }
        return layout;
    }
    
    calculateShortcutSettingsWindowPosition() {
        const header = this.windowPool.get('header');
        const shortcutSettings = this.windowPool.get('shortcut-settings');
        if (!header || !shortcutSettings) return null;
    
        const headerBounds = header.getBounds();
        const shortcutBounds = shortcutSettings.getBounds();
        const { workArea } = getCurrentDisplay(header);
    
        let newX = Math.round(headerBounds.x + (headerBounds.width / 2) - (shortcutBounds.width / 2));
        let newY = Math.round(headerBounds.y);
    
        newX = Math.max(workArea.x, Math.min(newX, workArea.x + workArea.width - shortcutBounds.width));
        newY = Math.max(workArea.y, Math.min(newY, workArea.y + workArea.height - shortcutBounds.height));
    
        return { x: newX, y: newY, width: shortcutBounds.width, height: shortcutBounds.height };
    }

    calculateStepMovePosition(header, direction) {
        if (!header) return null;
        const currentBounds = header.getBounds();
        const stepSize = 80; // 이동 간격
        let targetX = currentBounds.x;
        let targetY = currentBounds.y;
    
        switch (direction) {
            case 'left': targetX -= stepSize; break;
            case 'right': targetX += stepSize; break;
            case 'up': targetY -= stepSize; break;
            case 'down': targetY += stepSize; break;
        }
    
        return this.calculateClampedPosition(header, { x: targetX, y: targetY });
    }
    
    calculateEdgePosition(header, direction) {
        if (!header) return null;
        const display = getCurrentDisplay(header);
        const { workArea } = display;
        const currentBounds = header.getBounds();
    
        let targetX = currentBounds.x;
        let targetY = currentBounds.y;
    
        switch (direction) {
            case 'left': targetX = workArea.x; break;
            case 'right': targetX = workArea.x + workArea.width - currentBounds.width; break;
            case 'up': targetY = workArea.y; break;
            case 'down': targetY = workArea.y + workArea.height - currentBounds.height; break;
        }
        return { x: targetX, y: targetY };
    }
    
    calculateNewPositionForDisplay(window, targetDisplayId) {
        if (!window) return null;
    
        const targetDisplay = screen.getAllDisplays().find(d => d.id === targetDisplayId);
        if (!targetDisplay) return null;
    
        const currentBounds = window.getBounds();
        const currentDisplay = getCurrentDisplay(window);
    
        if (currentDisplay.id === targetDisplay.id) return { x: currentBounds.x, y: currentBounds.y };
    
        const relativeX = (currentBounds.x - currentDisplay.workArea.x) / currentDisplay.workArea.width;
        const relativeY = (currentBounds.y - currentDisplay.workArea.y) / currentDisplay.workArea.height;
        
        const targetX = targetDisplay.workArea.x + targetDisplay.workArea.width * relativeX;
        const targetY = targetDisplay.workArea.y + targetDisplay.workArea.height * relativeY;
    
        const clampedX = Math.max(targetDisplay.workArea.x, Math.min(targetX, targetDisplay.workArea.x + targetDisplay.workArea.width - currentBounds.width));
        const clampedY = Math.max(targetDisplay.workArea.y, Math.min(targetY, targetDisplay.workArea.y + targetDisplay.workArea.height - currentBounds.height));
    
        return { x: Math.round(clampedX), y: Math.round(clampedY) };
    }
    
    /**
     * @param {Rectangle} bounds1
     * @param {Rectangle} bounds2
     * @returns {boolean}
     */
    boundsOverlap(bounds1, bounds2) {
        const margin = 10;
        return !(
            bounds1.x + bounds1.width + margin < bounds2.x ||
            bounds2.x + bounds2.width + margin < bounds1.x ||
            bounds1.y + bounds1.height + margin < bounds2.y ||
            bounds2.y + bounds2.height + margin < bounds1.y
        );
    }
}

module.exports = WindowLayoutManager;