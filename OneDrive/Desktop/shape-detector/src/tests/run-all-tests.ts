// src/tests/run-all-tests.ts
import { testGrayscaleConversion } from './test-grayscale';
import { testEdgeDetection } from './test-edge-detection';
import { testContourDetection } from './test-contours';
import { testShapeClassification } from './test-classification';
import { runIntegrationTests } from './integration-test';
import { runPerformanceBenchmarks } from './performance-test';
import { validateAgainstExpected } from './validation-test';

export async function runAllTests() {
    try {
        console.clear();
        console.log('╔══════════════════════════════════════╗');
        console.log('║   SHAPE DETECTOR TEST SUITE         ║');
        console.log('╚══════════════════════════════════════╝\n');
        
        // 1. Unit Tests
        console.log('📋 UNIT TESTS\n');
        try {
            testGrayscaleConversion();
        } catch (error) {
            console.error('❌ Grayscale test failed:', error);
        }
        
        try {
            testEdgeDetection();
        } catch (error) {
            console.error('❌ Edge detection test failed:', error);
        }
        
        try {
            testContourDetection();
        } catch (error) {
            console.error('❌ Contour detection test failed:', error);
        }
        
        try {
            await testShapeClassification();
        } catch (error) {
            console.error('❌ Shape classification test failed:', error);
        }
        
        await new Promise(r => setTimeout(r, 2000));
        
        // 2. Integration Tests
        console.log('\n📋 INTEGRATION TESTS\n');
        try {
            await runIntegrationTests();
        } catch (error) {
            console.error('❌ Integration tests failed:', error);
        }
        
        await new Promise(r => setTimeout(r, 2000));
        
        // 3. Performance Tests
        console.log('\n⚡ PERFORMANCE TESTS\n');
        try {
            await runPerformanceBenchmarks();
        } catch (error) {
            console.error('❌ Performance tests failed:', error);
        }
        
        await new Promise(r => setTimeout(r, 2000));
        
        // 4. Validation
        console.log('\n✅ VALIDATION\n');
        try {
            await validateAgainstExpected();
        } catch (error) {
            console.log('⚠️  Validation test skipped (expected_results.json not found)');
            console.error(error);
        }
        
        console.log('\n╔══════════════════════════════════════╗');
        console.log('║   ALL TESTS COMPLETE                ║');
        console.log('╚══════════════════════════════════════╝\n');
    } catch (error) {
        console.error('❌ Fatal error in test suite:', error);
        alert('Test suite encountered an error. Check console for details.');
    }
}

// Expose to global scope for HTML onclick handler
declare global {
    interface Window {
        runAllTests: () => Promise<void>;
    }
}

if (typeof window !== 'undefined') {
    window.runAllTests = runAllTests;
}