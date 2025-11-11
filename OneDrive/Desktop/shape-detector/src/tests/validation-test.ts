// src/tests/validation-test.ts
import { ShapeDetector, type Shape } from '../main';
import { TestUtils } from '../test-utils';

export async function validateAgainstExpected() {
  console.log('=== VALIDATION AGAINST EXPECTED RESULTS ===\n');
  
  try {
    const response = await fetch('/expected_results.json');
    if (!response.ok) {
      throw new Error('expected_results.json not found');
    }
    const expectedResults = await response.json();
    
    const detector = new ShapeDetector();
    const testImages = Object.keys(expectedResults);
    
    let totalShapes = 0;
    let correctDetections = 0;
    let correctClassifications = 0;
    
    for (const imageName of testImages) {
      console.log(`Testing: ${imageName}`);
      
      // Try to load image - if not available, skip
      try {
        const imageData = await loadTestImage(imageName);
        const result = await detector.detectShapes(imageData);
        
        const expected = expectedResults[imageName];
        totalShapes += expected.shapes.length;
        
        console.log(`  Expected: ${expected.shapes.length} shapes`);
        console.log(`  Detected: ${result.shapes.length} shapes`);
        
        // Match each expected shape with detected
        for (const expShape of expected.shapes) {
          const match = findBestMatch(expShape, result.shapes);
          
          if (match) {
            correctDetections++;
            
            const comparison = TestUtils.compareShapes(match.shape, expShape);
            console.log(`  ${expShape.type}:`);
            console.log(`    Type: ${match.shape.type === expShape.type ? '✓' : '✗'} ${match.shape.type}`);
            console.log(`    IoU: ${comparison.iou.toFixed(3)} ${comparison.iou > 0.7 ? '✓' : '✗'}`);
            console.log(`    Center Error: ${comparison.centerDistance.toFixed(2)}px ${comparison.centerDistance < 10 ? '✓' : '✗'}`);
            console.log(`    Area Error: ${(comparison.areaError * 100).toFixed(1)}% ${comparison.areaError < 0.15 ? '✓' : '✗'}`);
            
            if (match.shape.type === expShape.type) {
              correctClassifications++;
            }
          } else {
            console.log(`  ✗ Missing: ${expShape.type}`);
          }
        }
      } catch (error) {
        console.log(`  ⚠️  Skipped: ${imageName} (image not available)`);
      }
      
      console.log('');
    }
    
    if (totalShapes > 0) {
      console.log('=== OVERALL RESULTS ===');
      console.log(`Detection Rate: ${(correctDetections / totalShapes * 100).toFixed(1)}%`);
      console.log(`Classification Accuracy: ${(correctClassifications / totalShapes * 100).toFixed(1)}%`);
    }
  } catch (error) {
    console.log('⚠️  Validation test skipped: expected_results.json not found or invalid');
  }
}

async function loadTestImage(imageName: string): Promise<ImageData> {
  // This is a placeholder - implement based on your image loading mechanism
  const img = new Image();
  img.src = `/test-images/${imageName}`;
  await new Promise((resolve) => { img.onload = resolve; });
  
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

function findBestMatch(expected: Shape, detected: Shape[]): { shape: Shape, score: number } | null {
  let bestMatch: Shape | null = null;
  let bestScore = 0;
  
  for (const shape of detected) {
    const iou = TestUtils.calculateIoU(shape.boundingBox, expected.boundingBox);
    
    if (iou > 0.5 && iou > bestScore) {
      bestMatch = shape;
      bestScore = iou;
    }
  }
  
  return bestMatch ? { shape: bestMatch, score: bestScore } : null;
}