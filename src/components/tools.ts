import { Dices, Eraser, Hand, Move, PaintBucket, Pipette, Stamp, WandSparkles, ZoomIn, type LucideIcon } from 'lucide-react';
import type { ToolId } from '../types';

export interface ToolDef { id: ToolId; name: string; key: string; icon: LucideIcon; hint: string }

export const TOOLS: ToolDef[] = [
  { id: 'move', name: 'Move Tool', key: 'V', icon: Move, hint: 'Select and drag hand-placed stamps' },
  { id: 'hand', name: 'Hand Tool', key: 'H', icon: Hand, hint: 'Pan the canvas (or hold Space)' },
  { id: 'zoom', name: 'Zoom Tool', key: 'Z', icon: ZoomIn, hint: 'Click to zoom in, Alt-click to zoom out' },
  { id: 'stamp', name: 'Logo Stamp Tool', key: 'S', icon: Stamp, hint: 'Click to place a logo by hand' },
  { id: 'eraser', name: 'Stamp Eraser Tool', key: 'E', icon: Eraser, hint: 'Click or drag to remove stamps' },
  { id: 'eyedropper', name: 'Eyedropper Tool', key: 'I', icon: Pipette, hint: 'Sample a color from the canvas' },
  { id: 'bucket', name: 'Paint Bucket Tool', key: 'G', icon: PaintBucket, hint: 'Fill the background with the foreground color' },
  { id: 'wand', name: 'Background Eraser Wand', key: 'W', icon: WandSparkles, hint: 'Remove a solid background from the active logo' },
  { id: 'dice', name: 'Randomize Tool', key: 'R', icon: Dices, hint: 'Click the canvas to roll a new variation' },
];
