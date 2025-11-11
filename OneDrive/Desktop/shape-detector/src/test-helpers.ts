// Test individual functions
import type { ShapeDetector } from './main';

export function testGrayscaleConversion(detector: ShapeDetector) {
    // Create a simple test image
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    
    // Draw a red square
    ctx.fillStyle = 'red';
    ctx.fillRect(25, 25, 50, 50);
    
    const imageData = ctx.getImageData(0, 0, 100, 100);
    // Test your detector
    detector.detectShapes(imageData).then(result => {
      console.log('Test result:', result);
    });
  }