// Create test file: src/tests/test-grayscale.ts
import { ShapeDetector } from '../main';
import { TestUtils } from '../test-utils';

export function testGrayscaleConversion() {
  console.log('=== Testing Grayscale Conversion ===');
  
  const detector = new ShapeDetector();
  
  // Test 1: Pure red should convert to specific gray value
  const redImage = TestUtils.createTestImage(100, 100, (ctx) => {
    ctx.fillStyle = 'rgb(255, 0, 0)';
    ctx.fillRect(0, 0, 100, 100);
  });
  
  const grayscale = detector['convertToGrayscale'](redImage);
  const expectedGray = Math.round(0.299 * 255); // 76
  
  console.log(`✓ Red (255,0,0) → Gray: ${grayscale[0]} (expected ~${expectedGray})`);
  
  // Test 2: White should be 255
  const whiteImage = TestUtils.createTestImage(100, 100, (ctx) => {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 100, 100);
  });
  
  const whiteGray = detector['convertToGrayscale'](whiteImage);
  console.log(`✓ White (255,255,255) → Gray: ${whiteGray[0]} (expected 255)`);
  
  // Test 3: Black should be 0
  const blackImage = TestUtils.createTestImage(100, 100, (ctx) => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 100, 100);
  });
  
  const blackGray = detector['convertToGrayscale'](blackImage);
  console.log(`✓ Black (0,0,0) → Gray: ${blackGray[0]} (expected 0)`);
  
  console.log('Grayscale conversion tests passed!\n');
}