import fs from 'fs';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function shuffleCSV(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        const rows = [];
        let headers;
        fs.createReadStream(inputFile)
            .pipe(parse())
            .on('data', (row) => {
                if (!headers) {
                    headers = row;
                } else {
                    rows.push(row);
                }
            })
            .on('end', () => {
                // 提取序号列
                const indexes = rows.map(row => row[0]);
                
                // 提取除序号外的其他列数据并打乱顺序
                const otherColumns = rows.map(row => row.slice(1));
                const shuffledData = shuffleArray(otherColumns);
                
                // 重新组合数据
                const shuffledRows = indexes.map((index, i) => [
                    index,
                    ...shuffledData[i]
                ]);

                stringify([headers, ...shuffledRows], (err, output) => {
                    if (err) {
                        reject(err);
                    } else {
                        fs.writeFile(outputFile, output, (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                console.log(`已将打乱顺序后的数据保存到 ${outputFile}`);
                                resolve();
                            }
                        });
                    }
                });
            })
            .on('error', reject);
    });
}

async function main() {
    if (process.argv.length !== 4) {
        console.log("使用方法: node shuffle_csv.js <输入文件名> <输出文件名>");
        process.exit(1);
    }

    const inputFile = process.argv[2];
    const outputFile = process.argv[3];

    try {
        await shuffleCSV(inputFile, outputFile);
    } catch (error) {
        console.error('处理 CSV 文件时出错:', error);
    }
}

main();

export { shuffleCSV, shuffleArray }; 