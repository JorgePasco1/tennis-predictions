/**
 * Shared layout constants for mobile bracket components
 * These values must stay synchronized across MobileRoundView, BracketConnectors,
 * and MobileBracketWithConnectors to ensure proper alignment
 */

// Match card dimensions
export const MATCH_HEIGHT = 80; // Taller than desktop (56px)
export const MATCH_GAP = 24;

// Padding
export const TOP_PADDING = 16; // Space above first match
export const BOTTOM_PADDING = 80; // Space below last match (includes shadows/borders)

// Connector positioning
// Card positioning uses: right: 76px (CARD_RIGHT_MARGIN)
// Connectors must align with card edge
export const CARD_RIGHT_MARGIN = 76; // Match card right margin
export const H_LINE_WIDTH = 20; // Horizontal line from card edge
export const CONNECTOR_RIGHT_OFFSET = 56; // Card margin - horizontal line overlap (76 - 20)
export const NEXT_ROUND_CONNECTOR_RIGHT = 16; // Position for line to next round
export const NEXT_ROUND_CONNECTOR_WIDTH = 40; // Width of line to next round
