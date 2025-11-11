// src/tests/test-contours.ts
import { ShapeDetector } from '../main';
import { TestUtils } from '../test-utils';

export function testContourDetection() {
    console.log('=== Testing Contour Detection ===');
    
    const detector = new ShapeDetector();
    
    // Simple square
    const testImage = TestUtils.createTestImage(200, 200, (ctx) => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = 'black';
      ctx.fillRect(50, 50, 100, 100);
    });
    
    const grayscale = detector['convertToGrayscale'](testImage);
    const edges = detector['detectEdges'](grayscale, 200, 200);
    const contours = detector['findContours'](edges, 200, 200);
    
    console.log(`✓ Number of contours found: ${contours.length}`);
    
    if (contours.length > 0) {
      const mainContour = contours[0];
      console.log(`✓ Main contour has ${mainContour.points.length} points`);
      
      // Calculate bounding box
      const bbox = detector['calculateBoundingBox'](mainContour);
      console.log(`✓ Bounding box: x=${bbox.x}, y=${bbox.y}, w=${bbox.width}, h=${bbox.height}`);
      
      // Expected: ~50, 50, 100, 100
      const errors = {
        x: Math.abs(bbox.x - 50),
        y: Math.abs(bbox.y - 50),
        w: Math.abs(bbox.width - 100),
        h: Math.abs(bbox.height - 100)
      };
      
      console.log(`  Errors: x=${errors.x}px, y=${errors.y}px, w=${errors.w}px, h=${errors.h}px`);
      
      const allGood = Object.values(errors).every(e => e < 10);
      console.log(allGood ? '✓ Bounding box accurate' : '✗ Bounding box has large errors');
    }
    
    console.log('');
  }