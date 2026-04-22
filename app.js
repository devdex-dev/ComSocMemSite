// Implementing academic year loading from academic_year.csv

const fs = require('fs');
const path = require('path');

function loadAcademicYears() {
    const filePath = path.join(__dirname, 'academic_year.csv');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            return;
        }
        const academicYears = parseCSV(data);
        console.log(academicYears);
    });
}

function parseCSV(data) {
    const lines = data.split('\n');
    return lines.map(line => line.split(','));
}

loadAcademicYears();