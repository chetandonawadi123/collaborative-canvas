// src/tests/integration-test.ts
import { ShapeDetector } from '../main';

export async function runIntegrationTests() {
    console.log('=== INTEGRATION TESTS ===\n');
    
    const detector = new ShapeDetector();
    detector.enableDebug(); // Enable visual debugging
    
    const testSuite = [
      {
        name: 'Single Circle',
        expected: { count: 1, types: ['circle'] }
      },
      {
        name: 'Multiple Shapes',
        expected: { count: 3, types: ['circle', 'square', 'triangle'] }
      },
      {
        name: 'Complex Scene',
        expected: { count: 5, types: ['circle', 'rectangle', 'square', 'triangle', 'pentagon'] }
      }
    ];
    
    let totalTests = 0;
    let passedTests = 0;
    
    for (const test of testSuite) {
      console.log(`Running: ${test.name}`);
      totalTests++;
      
      const image = await createTestScenario(test.name);
      const result = await detector.detectShapes(image);
      
      // Validate results
      const countCorrect = result.shapes.length === test.expected.count;
      const typesCorrect = test.expected.types.every(type => 
        result.shapes.some(s => s.type === type)
      );
      
      if (countCorrect && typesCorrect) {
        console.log(`✓ PASSED - Detected ${result.shapes.length} shapes`);
        passedTests++;
      } else {
        console.log(`✗ FAILED`);
        console.log(`  Expected: ${test.expected.count} shapes`);
        console.log(`  Got: ${result.shapes.length} shapes`);
        console.log(`  Expected types: ${test.expected.types.join(', ')}`);
        console.log(`  Got types: ${result.shapes.map(s => s.type).join(', ')}`);
      }
      
      console.log(`  Processing time: ${result.processingTime.toFixed(2)}ms\n`);
      
      // Wait a bit for visualization
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n=== RESULTS: ${passedTests}/${totalTests} tests passed ===\n`);
  }
  
  async function createTestScenario(name: string): Promise<ImageData> {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = 'black';
    
    switch (name) {
      case 'Single Circle':
        ctx.beginPath();
        ctx.arc(200, 200, 60, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'Multiple Shapes':
        // Circle
        ctx.beginPath();
        ctx.arc(100, 100, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // Square
        ctx.fillRect(220, 60, 80, 80);
        
        // Triangle
        ctx.beginPath();
        ctx.moveTo(200, 250);
        ctx.lineTo(150, 350);
        ctx.lineTo(250, 350);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'Complex Scene':
        // Add all 5 shape types
        // ... (draw all shapes)
        break;
    }
    
    return ctx.getImageData(0, 0, 400, 400);
  }