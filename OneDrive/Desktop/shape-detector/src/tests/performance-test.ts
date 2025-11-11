// src/tests/performance-test.ts
import { ShapeDetector } from '../main';
import { TestUtils } from '../test-utils';

export async function runPerformanceBenchmarks() {
    console.log('=== PERFORMANCE BENCHMARKS ===\n');
    
    const detector = new ShapeDetector();
    const imageSizes = [
      { width: 200, height: 200, name: 'Small' },
      { width: 500, height: 500, name: 'Medium' },
      { width: 1000, height: 1000, name: 'Large' }
    ];
    
    for (const size of imageSizes) {
      console.log(`Testing ${size.name} (${size.width}x${size.height}):`);
      
      const times: number[] = [];
      const iterations = 5;
      
      for (let i = 0; i < iterations; i++) {
        const testImage = TestUtils.createTestImage(size.width, size.height, (ctx) => {
          // Draw random shapes
          for (let j = 0; j < 3; j++) {
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(
              Math.random() * size.width,
              Math.random() * size.height,
              20 + Math.random() * 40,
              0, Math.PI * 2
            );
            ctx.fill();
          }
        });
        
        const result = await detector.detectShapes(testImage);
        times.push(result.processingTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Min: ${minTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);
      console.log(`  ${avgTime < 2000 ? '✓' : '✗'} Under 2000ms requirement\n`);
    }
  }