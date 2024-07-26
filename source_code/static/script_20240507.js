document.addEventListener('DOMContentLoaded', function() {
    const table = document.getElementById('fmeaTable');
    const addButton = document.getElementById('addNewEntryButton');
    const autoCompleteFailure = document.getElementById('autoCompleteFailure');
    const autoCompleteCause = document.getElementById('autoCompleteCause');
    const autoCompleteAction = document.getElementById('autoCompleteAction');


    let clickTimer = null;
    let fmea_data = {};

    // Fetch FMEA data from the backend
    fetch('/get_fmea_data')
    .then(response => response.json())
    .then(data => {
        fmea_data = data.table;  // Save the fetched data
        populateTable(fmea_data);
    })
    .catch(error => console.error('Error loading the FMEA data:', error));

    addButton.addEventListener('click', function() {
        addNewEntry();
    });

    autoCompleteFailure.addEventListener('click', function() {
        autoCompleteListener('failure');
    });

    autoCompleteCause.addEventListener('click', function() {
        autoCompleteListener('cause');
    });

    autoCompleteAction.addEventListener('click', function() {
        autoCompleteListener('action');
    });

    function autoCompleteListener(part) {
        const tableBody = document.getElementById('fmeaTable').getElementsByTagName('tbody')[0];
        const lastRowIndex = tableBody.rows.length - 1;
        if (lastRowIndex >= 0) {
            fetch('/auto_complete_a_row', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rowIndex: lastRowIndex, part: part })
            })
            .then(response => response.json())
            .then(updatedRowData => {
                updateLastRow(tableBody, updatedRowData);
            })
            .catch(error => console.error('Error auto-completing row:', error));
        }
    }

    function updateLastRow(tableBody, rowData) {
        const lastRow = tableBody.rows[tableBody.rows.length - 1];
        rowData.forEach((cellData, index) => {
            lastRow.cells[index].textContent = cellData;
        });
    }

    function addNewEntry() {
        fetch('/add_new_row', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            // Assuming the backend returns the complete updated table data
            fmea_data = data.table;
            clearTable();
            populateTable(fmea_data);  // Re-populate table with new data
        })
        .catch(error => console.error('Error adding new entry:', error));
    }

    function clearTable() {
        const tableBody = document.getElementById('fmeaTable').getElementsByTagName('tbody')[0];
        // Remove all existing rows in the table body
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
    }

    function populateTable(data) {
        const tableBody = document.getElementById('fmeaTable').getElementsByTagName('tbody')[0];
        data.rows.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            row.data.forEach((cell, cellIndex) => {
                const td = document.createElement('td');
                td.textContent = cell;
                // Bind click event to fetch details from server or local storage
                td.onclick = () => {
                    if (!clickTimer) {
                        clickTimer = setTimeout(function() {
                            fetchDetailsFromServer(rowIndex, cellIndex, td);
                            clickTimer = null;
                        }, 300); // Ensure it's not a double-click
                    }
                };
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    }

    function fetchDetailsFromServer(rowIndex, cellIndex, tdElement) {
        fetch('/get_details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rowIndex: rowIndex, cellIndex: cellIndex })
        })
        .then(response => response.json())
        .then(details => {
            if (details.status && details.status === 'processing') {
                // Handling data processing notification
                showTemporaryTooltip(tdElement, "Generating...");
                pollForDetails(rowIndex, cellIndex, tdElement);  // Start polling for details
            } else {
                // Data is ready, display the first-level tooltip
                showFirstLevelTooltip(tdElement, details, rowIndex, cellIndex);
            }
        })
        .catch(error => console.error('Error fetching details:', error));
    }

    function showFirstLevelTooltip(tdElement, details, rowIndex, cellIndex) {
        clearTooltips();  // Clear any existing tooltips
        let tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
        tooltip.innerHTML = '';

        details.forEach(detail => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'tooltip-item';
            itemDiv.textContent = detail.content;
            itemDiv.onclick = () => {
                updateTableWithNewRow(detail.content, cellIndex, rowIndex, tdElement);
            };

            itemDiv.onmouseenter = () => showSecondLevelTooltip(itemDiv, detail);
            itemDiv.onmouseleave = hideSecondTooltip;
            tooltip.appendChild(itemDiv);
        });

        tooltip.style.left = `${tdElement.getBoundingClientRect().left}px`;
        tooltip.style.top = `${tdElement.getBoundingClientRect().top + tdElement.offsetHeight}px`;
        tooltip.classList.add('visible');
    }


    function updateTableWithNewRow(detailContent, cellIndex, rowIndex, tdElement) {
        // Update the frontend display and data model
        clearTooltips();

        // Send a POST request to the server to add a new row
        fetch('/add_content_in_the_new_row', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: detailContent,
                cellIndex: cellIndex
            })
        })
        .then(response => response.json())
        .then(updatedData => {
            fmea_data = updatedData.table; // Assuming the backend returns the entire updated table
            clearTable();
            populateTable(fmea_data); // Re-populate table with new data
        })
        .catch(error => console.error('Error updating table with new row:', error));
    }



    function showSecondLevelTooltip(itemDiv, detail) {
        let secondTooltip = document.createElement('div');
        secondTooltip.className = 'second-tooltip';
        document.body.appendChild(secondTooltip);
        secondTooltip.innerHTML = `Recommendation: ${detail.reason},<br> Comment: ${detail.comment}`;

        secondTooltip.style.left = `${itemDiv.getBoundingClientRect().right + 10}px`;
        secondTooltip.style.top = `${itemDiv.getBoundingClientRect().top}px`;
        secondTooltip.classList.add('visible');
    }

    function hideSecondTooltip() {
        let secondTooltip = document.querySelector('.second-tooltip');
        if (secondTooltip) {
            secondTooltip.remove();
        }
    }

    function clearTooltips() {
        let tooltips = document.querySelectorAll('.tooltip, .second-tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
    }

    function showTemporaryTooltip(tdElement, message) {
        clearTooltips();
        let tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
        tooltip.textContent = message;

        tooltip.style.left = `${tdElement.getBoundingClientRect().left}px`;
        tooltip.style.top = `${tdElement.getBoundingClientRect().top + tdElement.offsetHeight}px`;
        tooltip.classList.add('visible');
    }

    function pollForDetails(rowIndex, cellIndex, tdElement, attempt = 1) {
        if (attempt > 20) {  // Stop polling after 20 attempts
            console.log("Maximum polling attempts reached, stopping further requests.");
            showTemporaryTooltip(tdElement, "Failed to load data after multiple attempts.");
            return;
        }

        setTimeout(() => {
            fetch('/get_details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rowIndex: rowIndex, cellIndex: cellIndex })
            })
            .then(response => response.json())
            .then(details => {
                if (details.status && details.status === 'processing') {
                    // If still processing, continue polling
                    console.log(`Polling attempt ${attempt}: Data still processing.`);
                    pollForDetails(rowIndex, cellIndex, tdElement, attempt + 1);
                } else {
                    // Data is ready, display the first-level tooltip
                    showFirstLevelTooltip(tdElement, details, rowIndex, cellIndex);
                }
            })
            .catch(error => {
                console.error('Polling error:', error);
                showTemporaryTooltip(tdElement, "Error fetching data.");
            });
        }, 500); // Poll every 0.5 seconds
    }

    table.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'TD') {
            e.preventDefault();  // stop default right click  menu
            makeEditable(e.target);
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.classList.contains('tooltip-item') && !e.target.closest('.tooltip')) {
            clearTooltips();
        }
    }, true);


});


function makeEditable(cell) {
    if (cell.querySelector('textarea')) return;  // Avoid recreating textarea

    const textarea = document.createElement('textarea');
    textarea.className = 'editable-textarea';
    textarea.style.height = `${cell.offsetHeight - 30}px`;

    textarea.value = cell.textContent.trim(); //Remove any extra spaces
    cell.textContent = '';
    cell.appendChild(textarea);
    textarea.focus();

    textarea.addEventListener('blur', function() {
        cell.textContent = textarea.value.trim();
        cell.removeChild(textarea);
    });
}


