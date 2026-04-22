fetch('academic_year.csv')
    .then(response => response.blob())
    .then(blob => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const text = event.target.result;
            // Assuming CSV has a single line with the academic year
            const academicYear = text.split('\n')[0];
            document.querySelector('.stats-strip').innerText += ` Academic Year: ${academicYear}`;
        };
        reader.readAsText(blob);
    })
    .catch(error => console.error('Error fetching academic year:', error));