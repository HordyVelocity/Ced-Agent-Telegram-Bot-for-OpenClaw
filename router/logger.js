import fs from 'fs';

export class ROILogger {
    static logPerformance(input, output) {
        const stats = {
            timestamp: new Date().toISOString(),
            inputLength: input.length,
            outputLength: output.length,
            efficiencyRatio: (output.length / input.length).toFixed(2),
            status: "No-Theatre Verified"
        };
        
        console.log(`[ROI Metrics]: Output is ${stats.outputLength} chars. Efficiency: ${stats.efficiencyRatio}`);
        fs.appendFileSync('performance_log.json', JSON.stringify(stats) + '\n');
    }
}
