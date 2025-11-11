// src/tests/test-classification.ts
import { ShapeDetector } from '../main';
import { TestUtils } from '../test-utils';

export async function testShapeClassification() {
    console.log('=== Testing Shape Classification ===');
    
    const detector = new ShapeDetector();
    
    const testCases = [
      {
        name: 'Circle',
        draw: (ctx: CanvasRenderingContext2D) => {
          ctx.beginPath();
          ctx.arc(100, 100, 40, 0, Math.PI * 2);
          ctx.fillStyle = 'black';
          ctx.fill();
        },
        expectedType: 'circle'
      },
      {
        name: 'Square',
        draw: (ctx: CanvasRenderingContext2D) => {
          ctx.fillStyle = 'black';
          ctx.fillRect(60, 60, 80, 80);
        },
        expectedType: 'square'
      },
      {
        name: 'Rectangle',
        draw: (ctx: CanvasRenderingContext2D) => {
          ctx.fillStyle = 'black';
          ctx.fillRect(50, 70, 100, 60);
        },
        expectedType: 'rectangle'
      },
      {
        name: 'Triangle',
        draw: (ctx: CanvasRenderingContext2D) => {
          ctx.beginPath();
          ctx.moveTo(100, 50);
          ctx.lineTo(50, 150);
          ctx.lineTo(150, 150);
          ctx.closePath();
          ctx.fillStyle = 'black';
          ctx.fill();
        },
        expectedType: 'triangle'
      },
      {
        name: 'Pentagon',
        draw: (ctx: CanvasRenderingContext2D) => {
          ctx.beginPath();
          const centerX = 100, centerY = 100, radius = 40;
          for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = 'black';
          ctx.fill();
        },
        expectedType: 'pentagon'
      }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of testCases) {
      const image = TestUtils.createTestImage(200, 200, test.draw);
      
      const result = await detector.detectShapes(image);
      if (result.shapes.length > 0) {
        const detected = result.shapes[0];
        const isCorrect = detected.type === test.expectedType;
        
        if (isCorrect) {
          console.log(`✓ ${test.name}: Correctly detected as ${detected.type} (confidence: ${detected.confidence.toFixed(2)})`);
          passed++;
        } else {
          console.log(`✗ ${test.name}: Expected ${test.expectedType}, got ${detected.type}`);
          failed++;
        }
      } else {
        console.log(`✗ ${test.name}: No shapes detected`);
        failed++;
      }
    }
    
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    console.log('');
  }