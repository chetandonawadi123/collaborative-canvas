// src/test-utils.ts
import type { Shape, BoundingBox, Point } from './main';
export class TestUtils {
    /**
     * Create a simple test image programmatically
     */
    static createTestImage(
      width: number, 
      height: number, 
      drawFunction: (ctx: CanvasRenderingContext2D) => void
    ): ImageData {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      
      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      
      // Draw shape
      drawFunction(ctx);
      
      return ctx.getImageData(0, 0, width, height);
    }
    
    /**
     * Load image from file
     */
    static async loadImageFromFile(file: File): Promise<ImageData> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
          };
          img.onerror = reject;
          img.src = e.target!.result as string;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    
    /**
     * Compare two shapes for similarity
     */
    static compareShapes(detected: Shape, expected: Shape): ComparisonResult {
      const iou = this.calculateIoU(detected.boundingBox, expected.boundingBox);
      const centerDistance = this.calculateDistance(detected.center, expected.center);
      const areaError = Math.abs(detected.area - expected.area) / expected.area;
      
      return {
        iou,
        centerDistance,
        areaError,
        typeMatch: detected.type === expected.type,
        passed: iou > 0.7 && centerDistance < 10 && areaError < 0.15
      };
    }
    
    static calculateIoU(box1: BoundingBox, box2: BoundingBox): number {
      const x1 = Math.max(box1.x, box2.x);
      const y1 = Math.max(box1.y, box2.y);
      const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
      const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
      
      if (x2 < x1 || y2 < y1) return 0;
      
      const intersection = (x2 - x1) * (y2 - y1);
      const area1 = box1.width * box1.height;
      const area2 = box2.width * box2.height;
      const union = area1 + area2 - intersection;
      
      return intersection / union;
    }
    
    static calculateDistance(p1: Point, p2: Point): number {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
  }
  
  interface ComparisonResult {
    iou: number;
    centerDistance: number;
    areaError: number;
    typeMatch: boolean;
    passed: boolean;
  }